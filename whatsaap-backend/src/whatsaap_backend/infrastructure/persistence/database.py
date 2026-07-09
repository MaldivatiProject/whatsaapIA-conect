"""SQLAlchemy engine and session factory."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from whatsaap_backend.config import Settings


def create_engine(settings: Settings) -> AsyncEngine:
    return create_async_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_POOL_SIZE,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


async def session_dependency(
    factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with factory() as session:
        yield session
