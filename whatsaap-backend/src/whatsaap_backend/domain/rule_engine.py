"""Deterministic and side-effect-free rule evaluation."""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from typing import Any

from .models import (
    BusinessRule,
    Condition,
    ConditionOperator,
    EvaluationResult,
    IncomingMessage,
    RuleMatch,
)

ALLOWED_FIELDS = {
    "text",
    "message_type",
    "is_group",
    "sender",
    "raw_sender",
    "sender_lid_jid",
    "sender_phone_jid",
    "sender_aliases",
    "reply_to_jid",
    "push_name",
    "session_id",
    "conversation_id",
    "state",
}
# Extra placeholders usable in templates (send_text/run_script ack_text) but
# not meaningful as rule condition fields, so kept out of ALLOWED_FIELDS.
TEMPLATE_ONLY_FIELDS = {
    "category",  # the matched rule's own category
    "correo",  # best-effort email auto-extracted from the inbound text
}
TEMPLATE_PATTERN = re.compile(r"\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}")


class InvalidRuleError(ValueError):
    """Raised when a rule contains unsupported or unsafe configuration."""


class RuleEvaluator:
    """Evaluate active rules in deterministic priority order."""

    def validate(self, rule: BusinessRule) -> None:
        if not rule.name.strip():
            raise InvalidRuleError("Rule name cannot be empty")
        if not rule.conditions:
            raise InvalidRuleError("At least one condition is required")
        if not rule.actions:
            raise InvalidRuleError("At least one action is required")
        for condition in rule.conditions:
            if condition.field not in ALLOWED_FIELDS:
                raise InvalidRuleError(f"Unsupported condition field: {condition.field}")
            if condition.operator is ConditionOperator.IN and not isinstance(
                condition.value, (list, tuple, set)
            ):
                raise InvalidRuleError("Operator 'in' requires an array value")

    def evaluate(
        self,
        rules: Iterable[BusinessRule],
        message: IncomingMessage,
        conversation_state: Mapping[str, Any] | None = None,
    ) -> EvaluationResult:
        context = self._context(message, conversation_state or {})
        matches: list[RuleMatch] = []
        ordered = sorted(rules, key=lambda rule: (rule.priority, str(rule.uuid)))
        for rule in ordered:
            if not rule.is_active:
                continue
            if rule.tenant_id != message.tenant_id:
                continue
            if rule.session_id is not None and rule.session_id != message.session_id:
                continue
            self.validate(rule)
            if all(self._matches(condition, context) for condition in rule.conditions):
                matches.append(RuleMatch(rule.uuid, rule.version, rule.actions))
                if rule.stop_on_match:
                    break
        return EvaluationResult(tuple(matches))

    @staticmethod
    def _context(message: IncomingMessage, state: Mapping[str, Any]) -> dict[str, Any]:
        return {
            "text": message.text,
            "message_type": message.message_type,
            "is_group": message.is_group,
            "sender": message.sender,
            "raw_sender": message.raw_sender or message.sender,
            "sender_lid_jid": message.sender_lid_jid,
            "sender_phone_jid": message.sender_phone_jid,
            "sender_aliases": message.sender_aliases or (message.sender,),
            "reply_to_jid": message.resolved_reply_to_jid,
            "push_name": message.push_name,
            "session_id": message.session_id,
            "conversation_id": message.conversation_id,
            "state": dict(state),
        }

    @staticmethod
    def _normalize(value: Any, case_sensitive: bool) -> Any:
        if isinstance(value, str) and not case_sensitive:
            return value.casefold()
        return value

    def _matches(self, condition: Condition, context: Mapping[str, Any]) -> bool:
        actual = context.get(condition.field)
        expected = condition.value
        operator = condition.operator
        if operator is ConditionOperator.EXISTS:
            return (actual is not None) is bool(expected)

        if condition.field == "sender":
            aliases = context.get("sender_aliases")
            if isinstance(aliases, (list, tuple, set)):
                normalized_aliases = {
                    self._normalize(alias, condition.case_sensitive)
                    for alias in aliases
                    if isinstance(alias, str)
                }
                normalized_expected = self._normalize(expected, condition.case_sensitive)
                if operator is ConditionOperator.EQUALS:
                    return normalized_expected in normalized_aliases
                if operator is ConditionOperator.NOT_EQUALS:
                    return normalized_expected not in normalized_aliases
                if operator is ConditionOperator.IN:
                    values = {
                        self._normalize(item, condition.case_sensitive) for item in expected
                    }
                    return bool(normalized_aliases & values)

        actual = self._normalize(actual, condition.case_sensitive)
        expected = self._normalize(expected, condition.case_sensitive)
        if operator is ConditionOperator.EQUALS:
            return bool(actual == expected)
        if operator is ConditionOperator.NOT_EQUALS:
            return bool(actual != expected)
        if operator is ConditionOperator.CONTAINS:
            return isinstance(actual, str) and isinstance(expected, str) and expected in actual
        if operator is ConditionOperator.STARTS_WITH:
            return (
                isinstance(actual, str)
                and isinstance(expected, str)
                and actual.startswith(expected)
            )
        if operator is ConditionOperator.ENDS_WITH:
            return (
                isinstance(actual, str) and isinstance(expected, str) and actual.endswith(expected)
            )
        if operator is ConditionOperator.IN:
            expected_values = [
                self._normalize(item, condition.case_sensitive) for item in expected
            ]
            return actual in expected_values
        raise InvalidRuleError(f"Unsupported operator: {operator}")


def render_template(template: str, context: Mapping[str, Any]) -> str:
    """Render allow-listed scalar placeholders without evaluating code."""
    if len(template) > 4096:
        raise InvalidRuleError("Template exceeds 4096 characters")

    allowed = (ALLOWED_FIELDS - {"state"}) | TEMPLATE_ONLY_FIELDS

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in allowed:
            raise InvalidRuleError(f"Unsupported template variable: {key}")
        value = context.get(key, "")
        return str(value) if value is not None else ""

    return TEMPLATE_PATTERN.sub(replace, template)
