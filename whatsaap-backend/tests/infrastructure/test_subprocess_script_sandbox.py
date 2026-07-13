"""Exercises the real sandbox mechanism (a real subprocess with real
rlimits), not a mock. The Selenium test additionally requires chromium +
chromium-driver on PATH (present in the production image's Dockerfile,
typically absent from a bare local dev venv) — skipped automatically where
unavailable rather than failing the whole suite.
"""

from __future__ import annotations

import shutil

import pytest

from whatsaap_backend.application.contracts import ScriptSandboxUnavailableError
from whatsaap_backend.config import Settings
from whatsaap_backend.infrastructure.sandbox.subprocess_script_sandbox import (
    SubprocessScriptSandbox,
)

_CHROMIUM_AVAILABLE = bool(shutil.which("chromium")) and bool(shutil.which("chromedriver"))


def _settings(**overrides: object) -> Settings:
    defaults: dict[str, object] = {
        "SCRIPT_SANDBOX_TIMEOUT_SECONDS": 10,
        "SCRIPT_SANDBOX_CPU_SECONDS": 3,
        "SCRIPT_SANDBOX_MAX_PROCESSES": 64,
        "SCRIPT_SANDBOX_MAX_OPEN_FILES": 256,
        "SCRIPT_SANDBOX_MAX_OUTPUT_BYTES": 65_536,
    }
    defaults.update(overrides)
    return Settings(**defaults)  # type: ignore[arg-type]


async def _verified_sandbox(**overrides: object) -> SubprocessScriptSandbox:
    sandbox = SubprocessScriptSandbox(_settings(**overrides))
    verified = await sandbox.verify()
    assert verified, "sandbox self-test failed in an environment that should support it"
    return sandbox


async def test_verify_succeeds_in_this_environment() -> None:
    sandbox = SubprocessScriptSandbox(_settings())
    assert await sandbox.verify() is True


async def test_run_returns_business_data_from_handle() -> None:
    sandbox = await _verified_sandbox()
    script = """
def handle(message):
    return {"business_data": {"PROMOTOR": message["text"].split(":")[-1].strip()}}
"""
    result = await sandbox.run(
        script_source=script,
        input_payload={"message": {"text": "Promotor: WOMER", "rule": {}}},
    )

    assert result.ok is True
    assert result.business_data == {"PROMOTOR": "WOMER"}
    assert result.error is None


async def test_script_exception_is_captured_not_raised() -> None:
    sandbox = await _verified_sandbox()
    script = """
def handle(message):
    raise ValueError("unexpected format")
"""
    result = await sandbox.run(script_source=script, input_payload={"message": {}})

    assert result.ok is False
    assert result.error is not None
    assert "ValueError" in result.error
    assert "unexpected format" in result.error


async def test_script_without_handle_fails_cleanly() -> None:
    sandbox = await _verified_sandbox()
    result = await sandbox.run(script_source="x = 1", input_payload={"message": {}})

    assert result.ok is False
    assert result.error is not None
    assert "handle" in result.error


async def test_infinite_loop_is_killed_by_timeout() -> None:
    sandbox = await _verified_sandbox(
        SCRIPT_SANDBOX_TIMEOUT_SECONDS=2, SCRIPT_SANDBOX_CPU_SECONDS=1
    )
    script = """
def handle(message):
    while True:
        pass
"""
    result = await sandbox.run(script_source=script, input_payload={"message": {}})

    assert result.ok is False


async def test_network_access_is_allowed() -> None:
    """RUN_SCRIPT deliberately does *not* isolate network (see
    _supervisor.py's module docstring) — scripts may need it, e.g. Selenium
    driving headless Chrome against the public internet. This test documents
    that choice: a socket connect attempt succeeds rather than being
    kernel-blocked.
    """

    sandbox = await _verified_sandbox()
    script = """
import socket

def handle(message):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    try:
        s.connect(("8.8.8.8", 53))
        connected = True
    except OSError:
        connected = False
    finally:
        s.close()
    return {"business_data": {"connected": connected}}
"""
    result = await sandbox.run(script_source=script, input_payload={"message": {}})

    assert result.ok is True
    assert result.business_data == {"connected": True}


async def test_run_raises_when_not_verified() -> None:
    sandbox = SubprocessScriptSandbox(_settings())  # verify() never called

    with pytest.raises(ScriptSandboxUnavailableError):
        await sandbox.run(
            script_source="def handle(message): return {}", input_payload={"message": {}}
        )


async def test_run_raises_after_failed_verification(monkeypatch: pytest.MonkeyPatch) -> None:
    sandbox = SubprocessScriptSandbox(_settings())

    async def _fake_run_unchecked(**_: object) -> object:
        raise RuntimeError("simulated sandbox breakage")

    monkeypatch.setattr(sandbox, "_run_unchecked", _fake_run_unchecked)
    assert await sandbox.verify() is False

    with pytest.raises(ScriptSandboxUnavailableError):
        await sandbox.run(
            script_source="def handle(message): return {}", input_payload={"message": {}}
        )


@pytest.mark.skipif(not _CHROMIUM_AVAILABLE, reason="chromium/chromedriver not on PATH")
async def test_selenium_can_load_a_page() -> None:
    """End-to-end proof that a RUN_SCRIPT action can drive a real headless
    browser — the whole reason network isolation was dropped from this
    sandbox. Loads a self-contained data: URL, no real internet dependency
    for the test itself (network reachability is covered separately by
    test_network_access_is_allowed).
    """

    sandbox = await _verified_sandbox(
        SCRIPT_SANDBOX_TIMEOUT_SECONDS=30, SCRIPT_SANDBOX_CPU_SECONDS=20
    )
    script = """
def handle(message):
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service

    options = Options()
    options.binary_location = "/usr/bin/chromium"
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--user-data-dir=/tmp/chrome-profile")

    service = Service(executable_path="/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    try:
        driver.get("data:text/html,<html><body><h1>hola sandbox</h1></body></html>")
        page_source = driver.page_source
    finally:
        driver.quit()

    return {"business_data": {"found_greeting": "hola sandbox" in page_source}}
"""
    result = await sandbox.run(script_source=script, input_payload={"message": {}})

    assert result.ok is True, result.error
    assert result.business_data == {"found_greeting": True}
