"""Ports required by the application layer."""

from __future__ import annotations

from datetime import datetime
from types import TracebackType
from typing import Any, Protocol, Self
from uuid import UUID

from whatsaap_backend.domain.models import BusinessMessage, BusinessRule, ContactIdentity

from .contracts import OutboxDraft


class RuleRepository(Protocol):
    async def list_active(
        self, tenant_id: str, session_id: str | None = None
    ) -> list[BusinessRule]: ...

    async def list_all(self, tenant_id: str) -> list[BusinessRule]: ...

    async def get(self, tenant_id: str, rule_id: UUID) -> BusinessRule | None: ...

    async def add(self, rule: BusinessRule) -> BusinessRule: ...

    async def update(self, rule: BusinessRule) -> BusinessRule: ...

    async def soft_delete(self, tenant_id: str, rule_id: UUID) -> bool: ...


class ContactIdentityRepository(Protocol):
    async def list(
        self, tenant_id: str, session_id: str | None = None
    ) -> list[ContactIdentity]: ...

    async def get(self, tenant_id: str, identity_id: UUID) -> ContactIdentity | None: ...

    async def find_for_jid(
        self, tenant_id: str, session_id: str, jid: str
    ) -> ContactIdentity | None: ...

    async def add(self, identity: ContactIdentity) -> ContactIdentity: ...

    async def update(self, identity: ContactIdentity) -> ContactIdentity: ...

    async def soft_delete(self, tenant_id: str, identity_id: UUID) -> bool: ...


class BusinessMessageRepository(Protocol):
    async def add(self, message: BusinessMessage) -> BusinessMessage: ...

    async def list(
        self,
        tenant_id: str,
        *,
        business_category: str | None = None,
        source_origin: str | None = None,
        limit: int = 100,
    ) -> list[BusinessMessage]: ...


class InboxRepository(Protocol):
    async def register(self, message_id: str, message_type: str, tenant_id: str) -> bool: ...

    async def mark_processed(self, message_id: str) -> None: ...


class ConversationRepository(Protocol):
    async def get_for_update(
        self, tenant_id: str, session_id: str, conversation_id: str
    ) -> tuple[dict[str, Any], int]: ...

    async def save(
        self,
        tenant_id: str,
        session_id: str,
        conversation_id: str,
        state: dict[str, Any],
        expected_version: int,
    ) -> None: ...


class ExecutionRepository(Protocol):
    async def add(
        self,
        *,
        execution_id: UUID,
        tenant_id: str,
        session_id: str,
        conversation_id: str,
        message_id: str,
        matched_rule_ids: list[str],
        status: str,
        input_metadata: dict[str, Any],
    ) -> None: ...

    async def list(self, tenant_id: str, limit: int = 100) -> list[dict[str, Any]]: ...

    async def get(self, tenant_id: str, execution_id: UUID) -> dict[str, Any] | None: ...

    async def update_status(
        self,
        *,
        tenant_id: str,
        execution_id: UUID,
        status: str,
        metadata_patch: dict[str, Any],
    ) -> bool: ...


class ReportRepository(Protocol):
    async def summary(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> dict[str, Any]: ...

    async def messages(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
        limit: int,
    ) -> list[dict[str, Any]]: ...

    async def categories(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> list[dict[str, Any]]: ...

    async def rules(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> list[dict[str, Any]]: ...

    async def deliveries(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> list[dict[str, Any]]: ...


class OutboxRepository(Protocol):
    async def add(self, draft: OutboxDraft) -> None: ...


class MessageSenderPort(Protocol):
    """Delivers a text reply through whatsapp-connector. Phase 1: direct HTTP,
    no RabbitMQ hop — see application/direct_delivery_service.py."""

    async def send_text(
        self,
        *,
        session_id: str,
        to: str,
        text: str,
        quoted_message_id: str | None = None,
    ) -> str: ...


class AutomationUnitOfWork(Protocol):
    rules: RuleRepository
    contact_identities: ContactIdentityRepository
    business_messages: BusinessMessageRepository
    inbox: InboxRepository
    conversations: ConversationRepository
    executions: ExecutionRepository
    reports: ReportRepository
    outbox: OutboxRepository

    async def __aenter__(self) -> Self: ...

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None: ...

    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...


class UnitOfWorkFactory(Protocol):
    def __call__(self) -> AutomationUnitOfWork: ...
