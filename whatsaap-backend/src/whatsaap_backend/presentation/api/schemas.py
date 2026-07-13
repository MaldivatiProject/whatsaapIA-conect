"""Pydantic request/response schemas for the rules API. Map 1:1 to domain/models.py."""

from __future__ import annotations

import ast
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from whatsaap_backend.config import get_settings
from whatsaap_backend.domain.models import (
    ActionType,
    BusinessMessage,
    BusinessRule,
    Condition,
    ConditionOperator,
    ContactIdentity,
    RuleAction,
)

# Defense-in-depth only: rejects obviously-wrong/accidental uploads early
# with a clear message. This is trivially bypassable (e.g. string
# concatenation to build "import subprocess") and is NOT a real security
# boundary. The actual protections are enforced by
# infrastructure/sandbox/SubprocessScriptSandbox: no DB/AMQP/API
# credentials in the process environment, resource limits, and a hard
# wall-clock timeout. Network access is *intentionally* not restricted
# (scripts may need it, e.g. Selenium driving headless Chrome) — so
# "import socket" is not denylisted.
_RUN_SCRIPT_DENYLIST = (
    "import subprocess",
    "import ctypes",
    "import multiprocessing",
    "os.system",
    "os.fork",
    "os.exec",
    "__import__",
    "eval(",
    "exec(",
    "importlib",
)


class ConditionSchema(BaseModel):
    field: str
    operator: ConditionOperator
    value: Any = None
    case_sensitive: bool = False

    def to_domain(self) -> Condition:
        return Condition(
            field=self.field,
            operator=self.operator,
            value=self.value,
            case_sensitive=self.case_sensitive,
        )

    @classmethod
    def from_domain(cls, condition: Condition) -> ConditionSchema:
        return cls(
            field=condition.field,
            operator=condition.operator,
            value=condition.value,
            case_sensitive=condition.case_sensitive,
        )


class RuleActionSchema(BaseModel):
    type: ActionType
    params: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_run_script(self) -> RuleActionSchema:
        if self.type is not ActionType.RUN_SCRIPT:
            return self

        script = self.params.get("script")
        if not isinstance(script, str) or not script.strip():
            raise ValueError("run_script action requires a non-empty string params.script")

        max_bytes = get_settings().SCRIPT_MAX_SOURCE_BYTES
        if len(script.encode("utf-8")) > max_bytes:
            raise ValueError(f"script exceeds the maximum allowed size ({max_bytes} bytes)")

        try:
            tree = ast.parse(script)
        except SyntaxError as error:
            raise ValueError(f"script has invalid Python syntax: {error}") from error

        if not any(
            isinstance(node, ast.FunctionDef) and node.name == "handle" for node in tree.body
        ):
            raise ValueError("script must define a top-level `def handle(message):`")

        for pattern in _RUN_SCRIPT_DENYLIST:
            if pattern in script:
                raise ValueError(f"script contains a disallowed pattern: {pattern!r}")

        ack_text = self.params.get("ack_text")
        if ack_text is not None:
            if not isinstance(ack_text, str):
                raise ValueError("run_script action params.ack_text must be a string when present")
            if len(ack_text) > 4096:
                raise ValueError(
                    "run_script action params.ack_text must be at most 4096 characters"
                )

        return self

    def to_domain(self) -> RuleAction:
        return RuleAction(type=self.type, params=self.params)

    @classmethod
    def from_domain(cls, action: RuleAction) -> RuleActionSchema:
        return cls(type=action.type, params=action.params)


class RuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    category: str = Field(default="general", min_length=1, max_length=80)
    session_id: str | None = Field(default=None, max_length=64)
    priority: int = Field(default=100, ge=0, le=100_000)
    enabled: bool = True
    stop_on_match: bool = False
    conditions: list[ConditionSchema] = Field(min_length=1)
    actions: list[RuleActionSchema] = Field(min_length=1)


class RuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    category: str | None = Field(default=None, min_length=1, max_length=80)
    session_id: str | None = Field(default=None, max_length=64)
    priority: int | None = Field(default=None, ge=0, le=100_000)
    enabled: bool | None = None
    stop_on_match: bool | None = None
    conditions: list[ConditionSchema] | None = None
    actions: list[RuleActionSchema] | None = None


class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: str
    name: str
    description: str | None
    category: str
    session_id: str | None
    priority: int
    enabled: bool
    stop_on_match: bool
    version: int
    conditions: list[ConditionSchema]
    actions: list[RuleActionSchema]
    created_at: datetime

    @classmethod
    def from_domain(cls, rule: BusinessRule) -> RuleOut:
        return cls(
            id=rule.uuid,
            tenant_id=rule.tenant_id,
            name=rule.name,
            description=rule.description,
            category=rule.category,
            session_id=rule.session_id,
            priority=rule.priority,
            enabled=rule.enabled,
            stop_on_match=rule.stop_on_match,
            version=rule.version,
            conditions=[ConditionSchema.from_domain(c) for c in rule.conditions],
            actions=[RuleActionSchema.from_domain(a) for a in rule.actions],
            created_at=rule.creation_date,
        )


class IncomingMessageSchema(BaseModel):
    message_id: str = Field(default="simulation-message", min_length=1, max_length=128)
    session_id: str = Field(default="default", min_length=1, max_length=64)
    conversation_id: str | None = Field(default=None, max_length=255)
    sender: str = Field(default="user@s.whatsapp.net", min_length=1, max_length=255)
    text: str = ""
    message_type: str = "text"
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_group: bool = False
    push_name: str = ""
    state: dict[str, Any] = Field(default_factory=dict)


class RuleValidationResponse(BaseModel):
    valid: bool


class RuleSimulationRequest(BaseModel):
    message: IncomingMessageSchema
    rules: list[RuleCreate] | None = None


class RuleSimulationResponse(BaseModel):
    matched_rule_ids: list[str]
    actions: list[RuleActionSchema]


class ExecutionOut(BaseModel):
    id: str
    session_id: str
    conversation_id: str
    message_id: str
    status: str
    matched_rule_ids: list[str]
    input_metadata: dict[str, Any]
    created_at: datetime


class ContactIdentityCreate(BaseModel):
    session_id: str | None = Field(default=None, max_length=64)
    lid_jid: str = Field(min_length=5, max_length=255)
    phone_jid: str = Field(min_length=16, max_length=255)
    display_name: str | None = Field(default=None, max_length=160)
    enabled: bool = True

    @field_validator("lid_jid")
    @classmethod
    def validate_lid_jid(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.endswith("@lid") or not normalized.removesuffix("@lid").isdigit():
            raise ValueError("lid_jid must look like 99132626702366@lid")
        return normalized

    @field_validator("phone_jid")
    @classmethod
    def validate_phone_jid(cls, value: str) -> str:
        normalized = value.strip()
        suffix = "@s.whatsapp.net"
        if not normalized.endswith(suffix) or not normalized.removesuffix(suffix).isdigit():
            raise ValueError("phone_jid must look like 573243744739@s.whatsapp.net")
        return normalized

    def to_domain(self, tenant_id: str) -> ContactIdentity:
        return ContactIdentity(
            tenant_id=tenant_id,
            session_id=self.session_id,
            lid_jid=self.lid_jid,
            phone_jid=self.phone_jid,
            display_name=self.display_name,
            enabled=self.enabled,
        )


class ContactIdentityUpdate(BaseModel):
    session_id: str | None = Field(default=None, max_length=64)
    lid_jid: str | None = Field(default=None, min_length=5, max_length=255)
    phone_jid: str | None = Field(default=None, min_length=16, max_length=255)
    display_name: str | None = Field(default=None, max_length=160)
    enabled: bool | None = None

    @field_validator("lid_jid")
    @classmethod
    def validate_lid_jid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return ContactIdentityCreate.validate_lid_jid(value)

    @field_validator("phone_jid")
    @classmethod
    def validate_phone_jid(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return ContactIdentityCreate.validate_phone_jid(value)


class ContactIdentityOut(BaseModel):
    id: UUID
    tenant_id: str
    session_id: str | None
    lid_jid: str
    phone_jid: str
    display_name: str | None
    enabled: bool
    created_at: datetime

    @classmethod
    def from_domain(cls, identity: ContactIdentity) -> ContactIdentityOut:
        return cls(
            id=identity.uuid,
            tenant_id=identity.tenant_id,
            session_id=identity.session_id,
            lid_jid=identity.lid_jid,
            phone_jid=identity.phone_jid,
            display_name=identity.display_name,
            enabled=identity.enabled,
            created_at=identity.creation_date,
        )


class ReportSummaryOut(BaseModel):
    processed_messages: int
    matched_messages: int
    unmatched_messages: int
    replies_sent_or_queued: int
    failed_replies: int
    pending_replies: int
    completed_messages: int
    by_status: dict[str, int]


class ReportMatchedRuleOut(BaseModel):
    rule_id: str
    rule_name: str
    category: str


class ReportMessageOut(BaseModel):
    id: str
    created_at: datetime
    session_id: str
    conversation_id: str
    message_id: str
    status: str
    message_type: str
    is_group: bool
    sender: str
    raw_sender: str
    reply_to_jid: str
    matched_rule_ids: list[str]
    matched_categories: list[str]
    matched_rules: list[ReportMatchedRuleOut]
    replies_sent_or_queued: int


class ReportCategoryOut(BaseModel):
    category: str
    messages: int
    matched_messages: int
    replies_sent_or_queued: int
    failed_replies: int


class ReportRuleOut(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    matches: int
    replies_sent_or_queued: int
    failed_replies: int


class ReportDeliveryOut(BaseModel):
    status: str
    messages: int
    replies_sent_or_queued: int


class BusinessMessageOut(BaseModel):
    """A RUN_SCRIPT action's structured output (business_data), persisted so
    the outcome of an execution — e.g. GUARDADO/YA_CORRECTA/NO_ENCONTRADO —
    is visible without a direct database query."""

    id: UUID
    business_category: str
    source_origin: str
    processing_status: str
    metadata: dict[str, Any]
    session_id: str | None
    conversation_id: str | None
    sender: str | None
    received_at: datetime
    created_by: str | None

    @classmethod
    def from_domain(cls, message: BusinessMessage) -> BusinessMessageOut:
        return cls(
            id=message.uuid,
            business_category=message.business_category,
            source_origin=message.source_origin.value,
            processing_status=message.processing_status.value,
            metadata=message.metadata,
            session_id=message.session_id,
            conversation_id=message.conversation_id,
            sender=message.sender,
            received_at=message.received_at,
            created_by=message.created_by,
        )
