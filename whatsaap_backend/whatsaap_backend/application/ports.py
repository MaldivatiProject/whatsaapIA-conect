"""Ports required by the application layer."""

from __future__ import annotations

from datetime import datetime
from types import TracebackType
from typing import Any, Protocol, Self
from uuid import UUID

from whatsaap_backend.domain.models import (
    BusinessMessage,
    BusinessRule,
    ContactIdentity,
    DriveIntegrationConfig,
    SecretMetadata,
)

from .contracts import DriveFileContent, OutboxDraft, ScriptRunResult


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

    async def overview(
        self,
        tenant_id: str,
        start: datetime,
        end: datetime,
        session_id: str | None,
        bucket: str,
        limit: int,
    ) -> dict[str, Any]: ...


class OutboxRepository(Protocol):
    async def add(self, draft: OutboxDraft) -> None: ...


class SecretsRepository(Protocol):
    """Credentials referenced by name from RUN_SCRIPT actions (params.secrets),
    never embedded in a rule's actions_json. Values are encrypted at rest
    (see infrastructure/persistence/repositories.SqlAlchemySecretsRepository)
    and only decrypted transiently — get_value() is for sandbox-injection use
    only (Phase 2), never for returning to an HTTP client.
    """

    async def create(
        self, tenant_id: str, name: str, value: str, *, created_by: str | None = None
    ) -> SecretMetadata: ...

    async def rotate(self, tenant_id: str, name: str, value: str) -> SecretMetadata: ...

    async def get_value(self, tenant_id: str, name: str) -> str | None: ...

    async def list_metadata(self, tenant_id: str) -> list[SecretMetadata]: ...

    async def delete(self, tenant_id: str, name: str) -> bool: ...


class DriveIntegrationRepository(Protocol):
    """One row per tenant: which Drive file to read and which secret holds
    the service-account credential. See SecretsRepository for the credential
    itself — this repository never touches its value."""

    async def get(self, tenant_id: str) -> DriveIntegrationConfig | None: ...

    async def upsert(self, config: DriveIntegrationConfig) -> DriveIntegrationConfig: ...

    async def delete(self, tenant_id: str) -> bool: ...


class DriveDocumentPort(Protocol):
    """Reads a single Google Drive file's text content using a service-account
    credential resolved by the caller (see SecretsRepository.get_value) —
    this port never touches tenant/DB state itself, only the Drive API."""

    async def read_file(
        self, *, file_id: str, service_account_json: str, cache_ttl_seconds: int
    ) -> DriveFileContent: ...


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


class ScriptSandboxPort(Protocol):
    """Runs an admin-uploaded RUN_SCRIPT action's source in an isolated
    subprocess (see infrastructure/sandbox/SubprocessScriptSandbox). Scripts
    may need real network access (e.g. Selenium driving headless Chrome), so
    network is intentionally *not* restricted — but the implementation must
    never give the script DB/AMQP/API credentials: it only ever receives
    `input_payload` (message + rule metadata) over stdin and returns a
    ScriptRunResult built from the script's stdout.

    `secrets` is the caller-resolved name->value mapping for whatever the
    rule action declared in params.secrets (see
    application.services._resolve_action_secrets) — never the trusted
    process's own environment. The implementation exposes these to the
    script as env vars and must redact their values from any error/log
    text it produces.
    """

    async def run(
        self, *, script_source: str, input_payload: dict[str, Any], secrets: dict[str, str]
    ) -> ScriptRunResult: ...


class AutomationUnitOfWork(Protocol):
    rules: RuleRepository
    contact_identities: ContactIdentityRepository
    business_messages: BusinessMessageRepository
    inbox: InboxRepository
    conversations: ConversationRepository
    executions: ExecutionRepository
    reports: ReportRepository
    outbox: OutboxRepository
    secrets: SecretsRepository
    drive_integration: DriveIntegrationRepository

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
