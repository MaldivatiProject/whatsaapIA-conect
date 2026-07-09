"""Outbox relay process.

Publishes records previously committed in PostgreSQL to RabbitMQ with publisher
confirms. A failure never rolls back business state; it only reschedules the
outbox row.
"""

from __future__ import annotations

import asyncio
import logging

import structlog

from whatsaap_backend.bootstrap.api import _configure_logging
from whatsaap_backend.config import get_settings
from whatsaap_backend.infrastructure.messaging.rabbitmq import RabbitMQBus
from whatsaap_backend.infrastructure.persistence.database import (
    create_engine,
    create_session_factory,
)
from whatsaap_backend.infrastructure.persistence.repositories import SqlAlchemyOutboxStore

logger = structlog.get_logger(__name__)


async def run() -> None:
    settings = get_settings()
    _configure_logging(settings)

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    store = SqlAlchemyOutboxStore(session_factory)
    bus = RabbitMQBus(settings.RABBITMQ_URL, settings.RABBITMQ_PREFETCH)
    await bus.connect()
    if settings.RABBITMQ_TOPOLOGY_ENABLED:
        await bus.declare_topology()

    try:
        while True:
            records = await store.claim_batch(
                limit=settings.OUTBOX_BATCH_SIZE,
                max_attempts=settings.OUTBOX_MAX_ATTEMPTS,
                stale_lock_seconds=settings.OUTBOX_STALE_LOCK_SECONDS,
            )
            if not records:
                await asyncio.sleep(settings.OUTBOX_POLL_INTERVAL_SECONDS)
                continue

            for record in records:
                try:
                    await bus.publish(
                        exchange_name=record.exchange,
                        routing_key=record.routing_key,
                        payload=record.payload,
                        headers=record.headers,
                    )
                    await store.mark_published(record.message_id)
                    logger.info(
                        "outbox_published",
                        message_id=record.message_id,
                        exchange=record.exchange,
                        routing_key=record.routing_key,
                        attempt=record.attempt_count,
                    )
                except Exception as error:  # noqa: BLE001 - relay must persist failure and continue
                    await store.mark_failed(
                        record.message_id, str(error), settings.OUTBOX_MAX_ATTEMPTS
                    )
                    logger.warning(
                        "outbox_publish_failed",
                        message_id=record.message_id,
                        exchange=record.exchange,
                        routing_key=record.routing_key,
                        attempt=record.attempt_count,
                        error_type=type(error).__name__,
                    )
    finally:
        await bus.close()
        await engine.dispose()


def main() -> None:
    logging.getLogger("aio_pika").setLevel(logging.WARNING)
    asyncio.run(run())


if __name__ == "__main__":
    main()
