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
