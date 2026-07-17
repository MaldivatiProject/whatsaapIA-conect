"""Domain entities and value objects for automation rules."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4


class ConditionOperator(StrEnum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IN = "in"
    EXISTS = "exists"


class ActionType(StrEnum):
    SEND_TEXT = "send_text"
    SET_STATE = "set_state"
    NOOP = "noop"
    RUN_SCRIPT = "run_script"
    QUERY_TRASLADO_STATUS = "query_traslado_status"


class BusinessMessageOrigin(StrEnum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    MANUAL = "MANUAL"


class BusinessMessageStatus(StrEnum):
    CAPTURED = "CAPTURED"
    PARSED = "PARSED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    IGNORED = "IGNORED"


@dataclass(frozen=True, slots=True)
class Condition:
    field: str
    operator: ConditionOperator
    value: Any = None
    case_sensitive: bool = False


@dataclass(frozen=True, slots=True)
class RuleAction:
    type: ActionType
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class BusinessRule:
    tenant_id: str
    name: str
    conditions: tuple[Condition, ...]
    actions: tuple[RuleAction, ...]
    uuid: UUID = field(default_factory=uuid4)
    description: str | None = None
    category: str = "general"
    session_id: str | None = None
    priority: int = 100
    enabled: bool = True
    stop_on_match: bool = False
    version: int = 1
    creation_date: datetime = field(default_factory=lambda: datetime.now(UTC))
    expiration_date: datetime | None = None

    @property
    def is_active(self) -> bool:
        return self.enabled and self.expiration_date is None


_CSV_MIME_TYPES = frozenset({"text/csv", "application/csv", "application/vnd.ms-excel"})


@dataclass(frozen=True, slots=True)
class MessageAttachment:
    """A downloaded, base64-encoded inbound document (see whatsapp-connector's
    downloadCsvAttachment). Only ever CSV-like today — see
    application.bulk_traslado for the one consumer."""

    mime_type: str
    base64_content: str
    file_name: str | None = None

    @classmethod
    def from_payload(cls, raw: object) -> MessageAttachment | None:
        """Parses the `attachment` field of a connector webhook/AMQP payload.
        Malformed or absent input yields None — an inbound message must never
        fail to process just because its optional attachment looks wrong."""
        if not isinstance(raw, dict):
            return None
        mime_type = raw.get("mimeType")
        base64_content = raw.get("base64")
        if not isinstance(mime_type, str):
            return None
        if not isinstance(base64_content, str) or not base64_content:
            return None
        file_name = raw.get("fileName")
        return cls(
            mime_type=mime_type,
            base64_content=base64_content,
            file_name=file_name if isinstance(file_name, str) else None,
        )

    @property
    def is_csv_like(self) -> bool:
        """Whether this attachment looks like a CSV — by mimetype or filename
        extension. Pure domain logic (no infra dependency) so the rule
        engine's `has_csv_attachment` condition can use it directly."""
        if self.mime_type.lower() in _CSV_MIME_TYPES:
            return True
        return bool(self.file_name and self.file_name.lower().endswith(".csv"))


@dataclass(frozen=True, slots=True)
class IncomingMessage:
    message_id: str
    tenant_id: str
    session_id: str
    conversation_id: str
    sender: str
    text: str
    message_type: str
    occurred_at: datetime
    is_group: bool = False
    push_name: str = ""
    raw_payload: dict[str, Any] = field(default_factory=dict)
    raw_sender: str | None = None
    sender_lid_jid: str | None = None
    sender_phone_jid: str | None = None
    reply_to_jid: str | None = None
    sender_aliases: tuple[str, ...] = ()
    attachment: MessageAttachment | None = None

    @property
    def resolved_reply_to_jid(self) -> str:
        return self.reply_to_jid or self.sender


@dataclass(frozen=True, slots=True)
class ContactIdentity:
    tenant_id: str
    lid_jid: str
    phone_jid: str
    uuid: UUID = field(default_factory=uuid4)
    session_id: str | None = None
    display_name: str | None = None
    enabled: bool = True
    creation_date: datetime = field(default_factory=lambda: datetime.now(UTC))
    expiration_date: datetime | None = None

    @property
    def aliases(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys((self.phone_jid, self.lid_jid)))


@dataclass(frozen=True, slots=True)
class BusinessMessage:
    tenant_id: str
    source_origin: BusinessMessageOrigin
    business_category: str
    metadata: dict[str, Any]
    uuid: UUID = field(default_factory=uuid4)
    source_reference: str | None = None
    session_id: str | None = None
    conversation_id: str | None = None
    message_id: str | None = None
    raw_sender: str | None = None
    sender: str | None = None
    reply_to_jid: str | None = None
    subject: str | None = None
    raw_text_hash: str | None = None
    received_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    processing_status: BusinessMessageStatus = BusinessMessageStatus.CAPTURED
    processed_at: datetime | None = None
    created_by: str | None = None
    creation_date: datetime = field(default_factory=lambda: datetime.now(UTC))
    expiration_date: datetime | None = None


@dataclass(frozen=True, slots=True)
class SecretMetadata:
    """A RUN_SCRIPT-referenceable credential. Deliberately holds no value —
    the plaintext only ever exists transiently at the infrastructure boundary
    (encrypt on write, decrypt on read), never inside a domain object that
    could be logged, serialized, or held longer than one call."""

    tenant_id: str
    name: str
    uuid: UUID = field(default_factory=uuid4)
    created_by: str | None = None
    creation_date: datetime = field(default_factory=lambda: datetime.now(UTC))
    rotated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class DriveIntegrationConfig:
    """Per-tenant pointer to a single Google Drive file the backend may read.
    Holds no credential — the service-account JSON lives in `secrets`
    (see SecretMetadata) under `credentials_secret_name`, so this row is safe
    to return to the dashboard as-is."""

    tenant_id: str
    file_id: str
    uuid: UUID = field(default_factory=uuid4)
    credentials_secret_name: str = "GOOGLE_DRIVE_SERVICE_ACCOUNT"  # noqa: S105 — a secret *name*, not a value
    enabled: bool = True
    cache_ttl_seconds: int = 300
    creation_date: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True, slots=True)
class RuleMatch:
    rule_id: UUID
    rule_version: int
    actions: tuple[RuleAction, ...]


@dataclass(frozen=True, slots=True)
class EvaluationResult:
    matches: tuple[RuleMatch, ...]

    @property
    def matched(self) -> bool:
        return bool(self.matches)
