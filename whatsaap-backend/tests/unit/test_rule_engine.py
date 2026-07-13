from __future__ import annotations

from datetime import UTC, datetime

import pytest

from whatsaap_backend.domain.models import (
    ActionType,
    BusinessRule,
    Condition,
    ConditionOperator,
    IncomingMessage,
    RuleAction,
)
from whatsaap_backend.domain.rule_engine import InvalidRuleError, RuleEvaluator, render_template


def _message(text: str = "hola, necesito ayuda") -> IncomingMessage:
    return IncomingMessage(
        message_id="m-1",
        tenant_id="acme",
        session_id="sales",
        conversation_id="user@s.whatsapp.net",
        sender="user@s.whatsapp.net",
        text=text,
        message_type="text",
        occurred_at=datetime.now(UTC),
        push_name="Ada",
    )


def test_evaluator_matches_by_priority_and_stops_on_match() -> None:
    first = BusinessRule(
        tenant_id="acme",
        name="priority-1",
        priority=1,
        stop_on_match=True,
        conditions=(Condition("text", ConditionOperator.CONTAINS, "ayuda"),),
        actions=(RuleAction(ActionType.SEND_TEXT, {"text": "primera"}),),
    )
    second = BusinessRule(
        tenant_id="acme",
        name="priority-2",
        priority=2,
        conditions=(Condition("text", ConditionOperator.CONTAINS, "ayuda"),),
        actions=(RuleAction(ActionType.SEND_TEXT, {"text": "segunda"}),),
    )

    result = RuleEvaluator().evaluate([second, first], _message())

    assert [match.rule_id for match in result.matches] == [first.uuid]


def test_template_renders_allow_listed_scalars() -> None:
    rendered = render_template(
        "Hola {{ push_name }}, recibí: {{ text }}",
        {"push_name": "Ada", "text": "hola", "sender": "user@s.whatsapp.net"},
    )

    assert rendered == "Hola Ada, recibí: hola"


def test_template_rejects_unsupported_variables() -> None:
    with pytest.raises(InvalidRuleError):
        render_template("{{ __class__ }}", {})


def test_template_renders_run_script_only_fields() -> None:
    # category/correo are only meaningful for run_script's ack_text, not as
    # rule condition fields, but they must still work as template variables.
    rendered = render_template(
        "{{ category }} / {{ correo }}",
        {"category": "traslado_tienda", "correo": "user@example.com"},
    )

    assert rendered == "traslado_tienda / user@example.com"
