from __future__ import annotations

import pytest
from pydantic import ValidationError

from whatsaap_backend.domain.models import ActionType
from whatsaap_backend.presentation.api.schemas import RuleActionSchema

_VALID_SCRIPT = """
def handle(message):
    return {"ok": True}
"""


def _run_script(
    script: str, ack_text: str | None = None, secrets: list[str] | None = None
) -> RuleActionSchema:
    params: dict[str, object] = {"script": script}
    if ack_text is not None:
        params["ack_text"] = ack_text
    if secrets is not None:
        params["secrets"] = secrets
    return RuleActionSchema(type=ActionType.RUN_SCRIPT, params=params)


def test_valid_script_without_secrets_is_accepted() -> None:
    action = _run_script(_VALID_SCRIPT)
    assert action.params["script"] == _VALID_SCRIPT


@pytest.mark.parametrize(
    "snippet",
    [
        'aws_key = "AKIAABCDEFGHIJKLMNOP"',
        'key_data = "-----BEGIN RSA PRIVATE KEY-----"',
        'stripe_key = "sk_live_ABCDEFGHIJKLMNOPQRST"',
        'slack_token = "xoxb-1234567890-abcdefghij"',
        'gh_token = "ghp_abcdefghijklmnopqrstuvwxyz0123456789AB"',
        'google_key = "AIzaSyD-1234567890abcdefghijklmnopqrstuv"',
        'password = "correct horse battery staple"',
        "api_key: str = 'sk-not-a-real-prefix-but-long-enough'",
    ],
)
def test_script_with_hardcoded_secret_is_rejected(snippet: str) -> None:
    script = f"""
def handle(message):
    {snippet}
    return {{"ok": True}}
"""
    with pytest.raises(ValidationError, match="hardcoded credential"):
        _run_script(script)


def test_script_referencing_env_var_by_name_is_accepted() -> None:
    script = """
import os

def handle(message):
    token = os.environ["STRIPE_API_KEY"]
    return {"token_present": bool(token)}
"""
    action = _run_script(script)
    assert "STRIPE_API_KEY" in action.params["script"]


def test_script_mentioning_password_without_literal_value_is_accepted() -> None:
    script = """
def handle(message):
    password = message.get("password_hint")
    return {"has_hint": password is not None}
"""
    action = _run_script(script)
    assert action.params["script"] == script


def test_script_can_declare_valid_secret_names() -> None:
    action = _run_script(_VALID_SCRIPT, secrets=["STRIPE_API_KEY", "SELENIUM_LOGIN_PASSWORD"])
    assert action.params["secrets"] == ["STRIPE_API_KEY", "SELENIUM_LOGIN_PASSWORD"]


@pytest.mark.parametrize("bad_name", ["stripe_api_key", "1KEY", "", "key-with-dash"])
def test_script_rejects_invalid_secret_name(bad_name: str) -> None:
    with pytest.raises(ValidationError, match="params.secrets contains an invalid name"):
        _run_script(_VALID_SCRIPT, secrets=[bad_name])


def test_script_rejects_non_list_secrets() -> None:
    with pytest.raises(ValidationError, match="params.secrets must be a list of strings"):
        _run_script(_VALID_SCRIPT, secrets="STRIPE_API_KEY")  # type: ignore[arg-type]
