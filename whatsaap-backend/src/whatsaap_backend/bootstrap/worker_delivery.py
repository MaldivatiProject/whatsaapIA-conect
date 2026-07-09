"""RabbitMQ consumer that processes connector delivery results."""

from __future__ import annotations

import asyncio
import logging

import structlog

from whatsaap_backend.application.services import ProcessDeliveryResultService
from whatsaap_backend.bootstrap.api import _configure_logging
from whatsaap_backend.config import get_settings
from whatsaap_backend.infrastructure.messaging.rabbitmq import RabbitMQBus, decode_json_message
from whatsaap_backend.infrastructure.persistence.database import (
    create_engine,
    create_session_factory,
)
from whatsaap_backend.infrastructure.persistence.uow import SqlAlchemyUnitOfWorkFactory

logger = structlog.get_logger(__name__)


async def run() -> None:
    settings = get_settings()
    _configure_logging(settings)

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    service = ProcessDeliveryResultService(SqlAlchemyUnitOfWorkFactory(session_factory))
    bus = RabbitMQBus(settings.RABBITMQ_URL, settings.RABBITMQ_PREFETCH)
    await bus.connect()
    if settings.RABBITMQ_TOPOLOGY_ENABLED:
        await bus.declare_topology()

    try:
        queue = await bus.queue(bus.topology.delivery_queue)
        logger.info("worker_delivery_started", queue=bus.topology.delivery_queue)
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False):
                    envelope = decode_json_message(message.body)
                    result = await service.execute(envelope)
                    logger.info(
                        "delivery_result_processed",
                        message_id=envelope.get("message_id"),
                        duplicate=result.duplicate,
                        execution_updated=result.execution_updated,
                        status=result.status,
                    )
    finally:
        await bus.close()
        await engine.dispose()


def main() -> None:
    logging.getLogger("aio_pika").setLevel(logging.WARNING)
    asyncio.run(run())


if __name__ == "__main__":
    main()
