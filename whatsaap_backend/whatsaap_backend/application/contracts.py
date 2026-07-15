"""Stable application contracts used by transports and persistence."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4


@dataclass(frozen=True, slots=True)
class MessageEnvelope:
    message_type: str
    tenant_id: str
    payload: dict[str, Any]
    producer: str
    message_id: str = field(default_factory=lambda: str(uuid4()))
    schema_version: int = 1
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    correlation_id: str = field(default_factory=lambda: str(uuid4()))
    causation_id: str | None = None
    content_type: str = "application/json"

    def to_dict(self) -> dict[str, Any]:
        return {
            "message_id": self.message_id,
            "message_type": self.message_type,
            "schema_version": self.schema_version,
            "occurred_at": self.occurred_at.isoformat(),
            "producer": self.producer,
            "correlation_id": self.correlation_id,
            "causation_id": self.causation_id,
            "tenant_id": self.tenant_id,
            "content_type": self.content_type,
            "payload": self.payload,
        }


@dataclass(frozen=True, slots=True)
class OutboxDraft:
    exchange: str
    routing_key: str
    envelope: MessageEnvelope
    aggregate_type: str
    aggregate_id: UUID | None = None


@dataclass(frozen=True, slots=True)
class OutboxRecord:
    """A claimed outbox row ready to be published by the relay."""

    message_id: str
    exchange: str
    routing_key: str
    payload: dict[str, Any]
    headers: dict[str, Any]
    attempt_count: int


@dataclass(frozen=True, slots=True)
class ScriptRunResult:
    """Outcome of running an admin-uploaded RUN_SCRIPT action in the sandbox.

    `ok=False` means the *script* failed (bad parse, raised an exception,
    timed out, etc.) — this is expected/routine and must never propagate as
    an exception out of ScriptSandboxPort.run(). The only exception that
    port is allowed to raise is ScriptSandboxUnavailableError, reserved for
    "the isolation mechanism itself could not be verified" (see
    SubprocessScriptSandbox.verify()) — a fail-closed condition distinct from
    an ordinary script bug.
    """

    ok: bool
    business_data: dict[str, Any] | None = None
    reply_text: str | None = None
    error: str | None = None


@dataclass(frozen=True, slots=True)
class DriveFileContent:
    """A Google Drive file's text content plus enough metadata to detect
    changes (modified_time) and cache safely. Google Workspace files
    (Docs/Sheets) are exported to text/csv before reaching here — see
    infrastructure/integrations/google_drive_client."""

    file_id: str
    name: str
    mime_type: str
    modified_time: datetime
    text: str


class ScriptSandboxUnavailableError(RuntimeError):
    """Raised when the sandbox's isolation guarantees could not be verified.

    RUN_SCRIPT must fail closed: if this is raised, the caller must treat
    the action as failed rather than fall back to running the script
    unisolated.
    """


class SecretResolutionError(RuntimeError):
    """Raised when a RUN_SCRIPT action references a params.secrets name that
    has no stored value for the rule's tenant. The action must fail rather
    than run with the credential silently missing from os.environ."""

    def __init__(self, name: str) -> None:
        super().__init__(f"secret '{name}' not found")
        self.name = name
