from __future__ import annotations

from datetime import UTC, datetime

import pytest

from whatsaap_backend.domain.models import (
    ActionType,
    BusinessRule,
    Condition,
    ConditionOperator,
    IncomingMessage,
    MessageAttachment,
    RuleAction,
)
from whatsaap_backend.domain.rule_engine import InvalidRuleError, RuleEvaluator, render_template


def _message(
    text: str = "hola, necesito ayuda", attachment: MessageAttachment | None = None
) -> IncomingMessage:
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
        attachment=attachment,
    )


def _csv_attachment(file_name: str = "traslados.csv") -> MessageAttachment:
    return MessageAttachment(mime_type="text/csv", base64_content="eA==", file_name=file_name)


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


def _bulk_rule(priority: int = 40) -> BusinessRule:
    return BusinessRule(
        tenant_id="acme",
        name="Traslado de tienda (masivo)",
        priority=priority,
        stop_on_match=True,
        conditions=(
            Condition("text", ConditionOperator.CONTAINS, "TRASLADO TIENDA"),
            Condition("has_csv_attachment", ConditionOperator.EQUALS, True),
        ),
        actions=(RuleAction(ActionType.RUN_SCRIPT, {"script": "..."}),),
    )


def _single_rule(priority: int = 100) -> BusinessRule:
    return BusinessRule(
        tenant_id="acme",
        name="Traslado de tienda",
        priority=priority,
        conditions=(Condition("text", ConditionOperator.CONTAINS, "TRASLADO TIENDA"),),
        actions=(RuleAction(ActionType.RUN_SCRIPT, {"script": "..."}),),
    )


def test_has_csv_attachment_condition_matches_only_with_a_csv_attachment() -> None:
    bulk = _bulk_rule()

    with_csv = RuleEvaluator().evaluate(
        [bulk], _message("TRASLADO TIENDA", attachment=_csv_attachment())
    )
    without_csv = RuleEvaluator().evaluate([bulk], _message("TRASLADO TIENDA"))

    assert with_csv.matched
    assert not without_csv.matched


def test_has_csv_attachment_ignores_non_csv_attachments() -> None:
    bulk = _bulk_rule()
    pdf_attachment = MessageAttachment(
        mime_type="application/pdf", base64_content="eA==", file_name="contrato.pdf"
    )

    result = RuleEvaluator().evaluate(
        [bulk], _message("TRASLADO TIENDA", attachment=pdf_attachment)
    )

    assert not result.matched


def test_bulk_rule_with_stop_on_match_prevents_the_single_row_rule_from_also_firing() -> None:
    bulk = _bulk_rule(priority=40)
    single = _single_rule(priority=100)

    result = RuleEvaluator().evaluate(
        [single, bulk], _message("TRASLADO TIENDA", attachment=_csv_attachment())
    )

    assert len(result.matches) == 1
    assert result.matches[0].rule_id == bulk.uuid


def test_single_row_rule_still_fires_when_no_csv_is_attached() -> None:
    bulk = _bulk_rule(priority=40)
    single = _single_rule(priority=100)

    result = RuleEvaluator().evaluate([single, bulk], _message("TRASLADO TIENDA"))

    assert len(result.matches) == 1
    assert result.matches[0].rule_id == single.uuid
