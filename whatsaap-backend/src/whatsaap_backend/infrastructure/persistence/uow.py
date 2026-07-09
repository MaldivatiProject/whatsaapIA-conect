"""SQLAlchemy unit of work composition."""

from __future__ import annotations

from types import TracebackType
from typing import Self

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from whatsaap_backend.application.ports import (
    BusinessMessageRepository,
    ContactIdentityRepository,
    ConversationRepository,
    ExecutionRepository,
    InboxRepository,
    OutboxRepository,
    ReportRepository,
    RuleRepository,
)

from .repositories import (
    SqlAlchemyBusinessMessageRepository,
    SqlAlchemyContactIdentityRepository,
    SqlAlchemyConversationRepository,
    SqlAlchemyExecutionRepository,
    SqlAlchemyInboxRepository,
    SqlAlchemyOutboxRepository,
    SqlAlchemyReportRepository,
    SqlAlchemyRuleRepository,
)


class SqlAlchemyUnitOfWork:
    """Transaction boundary exposing repositories through application ports.

    Attributes are typed as the application-layer Protocols (not the concrete
    SqlAlchemy* classes) so this satisfies AutomationUnitOfWork structurally —
    mypy checks Protocol attributes invariantly, so a narrower concrete type
    here would NOT be considered a match even though it implements the Protocol.
    """

    rules: RuleRepository
    contact_identities: ContactIdentityRepository
    business_messages: BusinessMessageRepository
    inbox: InboxRepository
    conversations: ConversationRepository
    executions: ExecutionRepository
    reports: ReportRepository
    outbox: OutboxRepository

    def __init__(self, factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = factory
        self._session: AsyncSession | None = None

    async def __aenter__(self) -> Self:
        self._session = self._factory()
        self.rules = SqlAlchemyRuleRepository(self._session)
        self.contact_identities = SqlAlchemyContactIdentityRepository(self._session)
        self.business_messages = SqlAlchemyBusinessMessageRepository(self._session)
        self.inbox = SqlAlchemyInboxRepository(self._session)
        self.conversations = SqlAlchemyConversationRepository(self._session)
        self.executions = SqlAlchemyExecutionRepository(self._session)
        self.reports = SqlAlchemyReportRepository(self._session)
        self.outbox = SqlAlchemyOutboxRepository(self._session)
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if self._session is None:
            return
        if exc_type is not None:
            await self._session.rollback()
        await self._session.close()

    async def commit(self) -> None:
        if self._session is None:
            raise RuntimeError("Unit of work has not been entered")
        await self._session.commit()

    async def rollback(self) -> None:
        if self._session is None:
            raise RuntimeError("Unit of work has not been entered")
        await self._session.rollback()


class SqlAlchemyUnitOfWorkFactory:
    def __init__(self, factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = factory

    def __call__(self) -> SqlAlchemyUnitOfWork:
        return SqlAlchemyUnitOfWork(self._factory)
