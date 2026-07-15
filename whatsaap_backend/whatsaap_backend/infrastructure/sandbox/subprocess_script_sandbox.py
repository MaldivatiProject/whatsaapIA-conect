"""Trusted-side driver for running RUN_SCRIPT action source in an isolated
subprocess (see _supervisor.py for what runs *inside* the sandbox).

Security-critical invariants this class must uphold:
  - The subprocess never receives the trusted process's environment
    (DATABASE_URL, API_KEYS, WEBHOOK_SECRET, ...): `env` is built from
    scratch, never inherited. It may contain the rule action's *own*
    explicitly-declared `secrets` (resolved by
    application.services.resolve_action_secrets from params.secrets) —
    those are a deliberate, opt-in exception to this rule, not the
    trusted process's credentials.
  - The subprocess never gets a database/AMQP connection or any object
    from the trusted process — only a JSON document over stdin.
  - `run()` fails closed: if `verify()` has not been called yet, or the
    last `verify()` failed, `run()` raises ScriptSandboxUnavailableError
    immediately without spawning anything.

Not enforced here (see _supervisor.py's module docstring for why): network
isolation, a hard memory ceiling, PID/process-tree isolation. Uploaded
scripts may need real network access (e.g. Selenium driving headless
Chrome) — that trade-off is deliberate, not an oversight.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import signal
import sys
import tempfile
from pathlib import Path
from typing import Any

import structlog
from pydantic import ValidationError

from whatsaap_backend.application.contracts import ScriptRunResult, ScriptSandboxUnavailableError
from whatsaap_backend.config import Settings

from .protocol import ScriptSandboxLimits, ScriptSandboxRequest, ScriptSandboxResponse

logger = structlog.get_logger(__name__)

_SUPERVISOR_PATH = Path(__file__).parent / "_supervisor.py"

_VERIFY_SCRIPT_SOURCE = """
def handle(message):
    return {"business_data": {"canary": message.get("canary")}}
"""


class SubprocessScriptSandbox:
    """ScriptSandboxPort implementation: runs the uploaded script in a
    disposable subprocess with a stripped environment and resource limits.
    See infrastructure/sandbox/_supervisor.py for what runs inside it.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._verified: bool | None = None

    async def verify(self) -> bool:
        """Run a fixed, non-user-supplied canary script through the real
        pipeline and confirm the subprocess/stdin/stdout protocol actually
        works end-to-end. Latches the result for the process lifetime —
        called once at startup, never per-request.
        """

        try:
            result = await self._run_unchecked(
                script_source=_VERIFY_SCRIPT_SOURCE,
                input_payload={"message": {"canary": "ok"}},
                secrets={},
            )
        except Exception:  # noqa: BLE001 - any failure here means "not verified"
            logger.error("script_sandbox_verification_failed", exc_info=True)
            self._verified = False
            return False

        ok = result.ok and (result.business_data or {}).get("canary") == "ok"
        if not ok:
            logger.error(
                "script_sandbox_verification_failed",
                ok=result.ok,
                business_data=result.business_data,
                error=result.error,
            )
        self._verified = ok
        return ok

    async def run(
        self, *, script_source: str, input_payload: dict[str, Any], secrets: dict[str, str]
    ) -> ScriptRunResult:
        if not self._verified:
            raise ScriptSandboxUnavailableError(
                "script sandbox has not been verified; refusing to run"
            )
        return await self._run_unchecked(
            script_source=script_source, input_payload=input_payload, secrets=secrets
        )

    async def _run_unchecked(
        self, *, script_source: str, input_payload: dict[str, Any], secrets: dict[str, str]
    ) -> ScriptRunResult:
        settings = self._settings
        request = ScriptSandboxRequest(
            script_source=script_source,
            input=input_payload,
            limits=ScriptSandboxLimits(
                cpu_seconds=settings.SCRIPT_SANDBOX_CPU_SECONDS,
                max_processes=settings.SCRIPT_SANDBOX_MAX_PROCESSES,
                max_open_files=settings.SCRIPT_SANDBOX_MAX_OPEN_FILES,
            ),
        )
        request_bytes = request.model_dump_json().encode("utf-8")

        with tempfile.TemporaryDirectory(prefix="rule-script-") as scratch_dir:
            process = await asyncio.create_subprocess_exec(
                sys.executable,
                # -I: isolated mode (implies -E ignore-env, -s no user site).
                # Deliberately NOT -S: uploaded scripts need real site-packages
                # on sys.path to `import selenium` (installed alongside the
                # app in the same interpreter) — -S skips site.py entirely,
                # which also skips the venv's own site-packages, not just the
                # user one. (Found by a real ModuleNotFoundError in staging,
                # not assumed — see git history for the -I -S variant that
                # broke this.)
                "-I",
                str(_SUPERVISOR_PATH),
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                # `secrets` (resolved by application.services.resolve_action_secrets
                # from the rule's params.secrets, never the trusted process's own
                # environment) come first so PATH/HOME always win if a secret
                # happens to be named one of those — the sandbox's own control
                # over its execution environment must never be overridable.
                # HOME is required by Chrome/chromedriver (profile/cache dirs) —
                # points at the disposable per-invocation scratch dir, never the
                # trusted process's real home.
                env={**secrets, "PATH": "/usr/bin:/bin", "HOME": scratch_dir},
                cwd=scratch_dir,
                start_new_session=True,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(request_bytes),
                    timeout=settings.SCRIPT_SANDBOX_TIMEOUT_SECONDS,
                )
            except TimeoutError:
                self._kill_process_group(process)
                return ScriptRunResult(ok=False, error="script execution timed out")

        max_output = settings.SCRIPT_SANDBOX_MAX_OUTPUT_BYTES
        if len(stdout) > max_output:
            return ScriptRunResult(ok=False, error="script produced too much output")

        if process.returncode != 0:
            return ScriptRunResult(
                ok=False,
                error=self._redact(
                    f"sandbox exited with code {process.returncode}: "
                    f"{stderr[:2048].decode('utf-8', errors='replace')}",
                    secrets,
                ),
            )

        try:
            response = ScriptSandboxResponse.model_validate_json(stdout)
        except (ValidationError, json.JSONDecodeError) as exc:
            return ScriptRunResult(ok=False, error=f"invalid sandbox response: {exc}")

        return ScriptRunResult(
            ok=response.ok,
            business_data=response.business_data,
            reply_text=response.reply_text,
            error=self._redact(response.error, secrets),
        )

    @staticmethod
    def _redact(text: str | None, secrets: dict[str, str]) -> str | None:
        """Scrubs resolved secret values out of text that may end up in logs
        (e.g. a script that crashed while printing a credential it was
        given). Best-effort: a script can still leak a secret through
        business_data/reply_text, which are treated as legitimate output
        and are not scanned here."""
        if text is None:
            return None
        for value in secrets.values():
            if value:
                text = text.replace(value, "***")
        return text

    @staticmethod
    def _kill_process_group(process: asyncio.subprocess.Process) -> None:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(process.pid, signal.SIGKILL)
