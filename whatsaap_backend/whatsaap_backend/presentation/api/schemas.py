"""Pydantic request/response schemas for the rules API. Map 1:1 to domain/models.py."""

from __future__ import annotations

import ast
import re
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from whatsaap_backend.application.contracts import DriveFileContent
from whatsaap_backend.config import get_settings
from whatsaap_backend.domain.models import (
    ActionType,
    BusinessMessage,
    BusinessRule,
    Condition,
    ConditionOperator,
    ContactIdentity,
    DriveIntegrationConfig,
    RuleAction,
    SecretMetadata,
)
from whatsaap_backend.infrastructure import security_settings

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

# Same defense-in-depth caveat as _RUN_SCRIPT_DENYLIST above: heuristic,
# bypassable (e.g. base64-encoding the value), not a security boundary.
# Purpose: catch the common case of an admin pasting a real credential
# into the script instead of referencing it by name — RUN_SCRIPT scripts
# never receive credentials via the sandbox environment (see
# infrastructure/sandbox/SubprocessScriptSandbox), so a literal secret
# in the source is usually a mistake. Can be disabled platform-wide via
# the security settings toggle (see infrastructure/security_settings.py)
# for the rare legitimate case of grandfathering an existing script.
_SECRET_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS access key ID"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "PEM private key"),
    (re.compile(r"sk_live_[0-9a-zA-Z]{16,}"), "Stripe live secret key"),
    (re.compile(r"xox[baprs]-[0-9a-zA-Z-]{10,}"), "Slack token"),
    (re.compile(r"gh[pousr]_[0-9a-zA-Z]{36,}"), "GitHub token"),
    (re.compile(r"AIza[0-9A-Za-z\-_]{35,}"), "Google API key"),
    (
        re.compile(
            r"(?i)\b(api[_-]?key|secret|password|passwd|token|access[_-]?key)\b"
            r"\s*(?::\s*\w+)?\s*[:=]\s*['\"][^'\"]{6,}['\"]"
        ),
        "hardcoded credential-like assignment",
    ),
)


def _find_hardcoded_secret(script: str) -> str | None:
    for pattern, label in _SECRET_PATTERNS:
        if pattern.search(script):
            return label
    return None


# Matches the os.environ key a RUN_SCRIPT would read a secret from — same
# shape SecretCreate.name enforces, so a script's params.secrets entry can
# only ever name something that could actually exist as a stored secret.
_SECRET_NAME_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]{1,127}$")


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

        if not security_settings.get_allow_hardcoded_script_secrets():
            secret_label = _find_hardcoded_secret(script)
            if secret_label is not None:
                raise ValueError(
                    f"script appears to contain a hardcoded credential ({secret_label}); "
                    "reference it by name in params.secrets and read it via "
                    "os.environ instead of embedding the literal value"
                )

        secret_names = self.params.get("secrets")
        if secret_names is not None:
            if not isinstance(secret_names, list) or not all(
                isinstance(item, str) for item in secret_names
            ):
                raise ValueError("run_script action params.secrets must be a list of strings")
            for item in secret_names:
                if not _SECRET_NAME_PATTERN.match(item):
                    raise ValueError(
                        f"params.secrets contains an invalid name: {item!r} "
                        "(must match a stored secret's UPPER_SNAKE_CASE name)"
                    )

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
        # model_construct bypasses validate_run_script deliberately: this reserializes
        # data already accepted and stored (via RuleCreate/RuleUpdate) for output. A
        # rule must stay readable even if a later, stricter validator would now reject
        # its script on write — validation belongs on the write path, not on every read.
        return cls.model_construct(type=action.type, params=action.params)


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
        # model_construct: same reasoning as RuleActionSchema.from_domain — pydantic
        # revalidates nested model fields (actions) on a normal __init__ even when
        # given already-constructed instances, which would re-trigger
        # validate_run_script on read. This reserializes already-stored data.
        return cls.model_construct(
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


class SecretCreate(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    value: str = Field(min_length=1, max_length=8192)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not _SECRET_NAME_PATTERN.match(value):
            raise ValueError(
                "name must be UPPER_SNAKE_CASE (matches the os.environ key a "
                "script would read), e.g. STRIPE_API_KEY"
            )
        return value


class SecretRotate(BaseModel):
    value: str = Field(min_length=1, max_length=8192)


class SecretOut(BaseModel):
    """Metadata only — the value is never returned by the API once created."""

    id: UUID
    tenant_id: str
    name: str
    created_by: str | None
    created_at: datetime
    rotated_at: datetime | None

    @classmethod
    def from_domain(cls, secret: SecretMetadata) -> SecretOut:
        return cls(
            id=secret.uuid,
            tenant_id=secret.tenant_id,
            name=secret.name,
            created_by=secret.created_by,
            created_at=secret.creation_date,
            rotated_at=secret.rotated_at,
        )


class DriveIntegrationConfigIn(BaseModel):
    """The credential itself is set separately through POST/PATCH
    /api/v1/secrets/{name} — this endpoint only ever handles non-secret
    pointer/settings fields."""

    file_id: str = Field(min_length=10, max_length=128)
    credentials_secret_name: str = Field(default="GOOGLE_DRIVE_SERVICE_ACCOUNT", max_length=128)
    enabled: bool = True
    cache_ttl_seconds: int = Field(default=300, ge=30, le=3600)

    @field_validator("credentials_secret_name")
    @classmethod
    def validate_credentials_secret_name(cls, value: str) -> str:
        if not _SECRET_NAME_PATTERN.match(value):
            raise ValueError(
                "credentials_secret_name must be UPPER_SNAKE_CASE, "
                "e.g. GOOGLE_DRIVE_SERVICE_ACCOUNT"
            )
        return value


class DriveIntegrationConfigOut(BaseModel):
    tenant_id: str
    file_id: str
    credentials_secret_name: str
    enabled: bool
    cache_ttl_seconds: int
    updated_at: datetime
    has_credentials: bool

    @classmethod
    def from_domain(
        cls, config: DriveIntegrationConfig, *, has_credentials: bool
    ) -> DriveIntegrationConfigOut:
        return cls(
            tenant_id=config.tenant_id,
            file_id=config.file_id,
            credentials_secret_name=config.credentials_secret_name,
            enabled=config.enabled,
            cache_ttl_seconds=config.cache_ttl_seconds,
            updated_at=config.updated_at,
            has_credentials=has_credentials,
        )


class DriveConnectionTestResult(BaseModel):
    ok: bool
    name: str | None = None
    mime_type: str | None = None
    modified_time: datetime | None = None
    preview: str | None = None
    error: str | None = None

    @classmethod
    def from_content(cls, content: DriveFileContent) -> DriveConnectionTestResult:
        return cls(
            ok=True,
            name=content.name,
            mime_type=content.mime_type,
            modified_time=content.modified_time,
            preview=content.text[:280],
        )

    @classmethod
    def from_error(cls, detail: str) -> DriveConnectionTestResult:
        return cls(ok=False, error=detail)


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


class OverviewRangeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: datetime = Field(alias="from")
    to: datetime
    bucket: Literal["hour", "day"]


class OverviewTotalsOut(BaseModel):
    processed_messages: int
    matched_messages: int
    unmatched_messages: int
    replies_sent_or_queued: int
    failed_replies: int
    pending_replies: int
    completed_messages: int
    unique_conversations: int
    active_sessions: int
    business_messages: int
    match_rate: float
    reply_rate: float
    failure_rate: float


class OverviewDeltaOut(BaseModel):
    current: int
    previous: int
    change: int
    change_percent: float | None


class OverviewComparisonOut(BaseModel):
    processed_messages: OverviewDeltaOut
    matched_messages: OverviewDeltaOut
    replies_sent_or_queued: OverviewDeltaOut
    failed_replies: OverviewDeltaOut


class OverviewTimeseriesPointOut(BaseModel):
    bucket_start: datetime
    processed_messages: int
    matched_messages: int
    replies_sent_or_queued: int
    failed_replies: int
    completed_messages: int
    pending_replies: int


class OverviewStatusOut(BaseModel):
    status: str
    messages: int
    replies_sent_or_queued: int
    percentage: float


class OverviewCategoryOut(BaseModel):
    category: str
    messages: int
    matched_messages: int
    replies_sent_or_queued: int
    failed_replies: int
    percentage: float


class OverviewRuleOut(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    matches: int
    replies_sent_or_queued: int
    failed_replies: int


class OverviewSessionOut(BaseModel):
    session_id: str
    messages: int
    matched_messages: int
    replies_sent_or_queued: int
    failed_replies: int
    last_activity_at: datetime


class OverviewRecentMessageOut(BaseModel):
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
    matched_categories: list[str]
    replies_sent_or_queued: int


class OverviewOut(BaseModel):
    generated_at: datetime
    range: OverviewRangeOut
    totals: OverviewTotalsOut
    comparison: OverviewComparisonOut
    timeseries: list[OverviewTimeseriesPointOut]
    statuses: list[OverviewStatusOut]
    categories: list[OverviewCategoryOut]
    rules: list[OverviewRuleOut]
    sessions: list[OverviewSessionOut]
    recent_messages: list[OverviewRecentMessageOut]


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


class SecuritySettingsOut(BaseModel):
    allow_hardcoded_script_secrets: bool


class SecuritySettingsUpdate(BaseModel):
    allow_hardcoded_script_secrets: bool
