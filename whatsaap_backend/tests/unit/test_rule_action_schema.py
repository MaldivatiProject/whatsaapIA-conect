from __future__ import annotations

import pytest
from pydantic import ValidationError

from whatsaap_backend.domain.models import (
    ActionType,
    BusinessRule,
    Condition,
    ConditionOperator,
    RuleAction,
)
from whatsaap_backend.presentation.api.schemas import RuleActionSchema, RuleOut

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


def test_from_domain_does_not_reject_a_previously_stored_script() -> None:
    """A rule already persisted must stay readable even if a later, stricter
    validate_run_script would now reject its script on write — validation
    belongs on the write path (RuleCreate/RuleUpdate), never on read."""
    action = RuleAction(
        type=ActionType.RUN_SCRIPT,
        params={"script": 'def handle(message):\n    token = "ghp_thisWouldFailOnWrite123456"\n    return {}'},
    )
    schema = RuleActionSchema.from_domain(action)
    assert schema.params["script"] == action.params["script"]


def test_rule_out_from_domain_does_not_reject_a_previously_stored_rule() -> None:
    """Reproduces the real regression: GET /api/v1/rules must keep returning a
    rule whose RUN_SCRIPT action was stored before validate_run_script became
    stricter, instead of 500ing the entire list for every tenant."""
    rule = BusinessRule(
        tenant_id="t1",
        name="Traslado con script",
        conditions=(Condition(field="sender", operator=ConditionOperator.EQUALS, value="x"),),
        actions=(
            RuleAction(
                type=ActionType.RUN_SCRIPT,
                params={"script": 'def handle(message):\n    token = "ghp_thisWouldFailOnWrite123456"\n    return {}'},
            ),
        ),
    )
    out = RuleOut.from_domain(rule)
    assert out.actions[0].params["script"] == rule.actions[0].params["script"]
