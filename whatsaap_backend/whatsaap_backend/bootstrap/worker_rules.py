"""RabbitMQ consumer that evaluates inbound WhatsApp messages."""

from __future__ import annotations

import asyncio
import logging

import structlog
from aio_pika.abc import AbstractIncomingMessage

from whatsaap_backend.application.services import (
    ProcessIncomingMessageService,
    incoming_message_from_envelope,
)
from whatsaap_backend.bootstrap.api import _configure_logging
from whatsaap_backend.config import get_settings
from whatsaap_backend.infrastructure.messaging.rabbitmq import RabbitMQBus, decode_json_message
from whatsaap_backend.infrastructure.persistence.database import (
    create_engine,
    create_session_factory,
)
from whatsaap_backend.infrastructure.persistence.uow import SqlAlchemyUnitOfWorkFactory
from whatsaap_backend.infrastructure.sandbox.subprocess_script_sandbox import (
    SubprocessScriptSandbox,
)

logger = structlog.get_logger(__name__)


async def run() -> None:
    settings = get_settings()
    _configure_logging(settings)

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    script_sandbox = SubprocessScriptSandbox(settings)
    verified = await script_sandbox.verify()
    logger.info("script_sandbox_verified", verified=verified)
    service = ProcessIncomingMessageService(
        SqlAlchemyUnitOfWorkFactory(session_factory, settings.SECRETS_ENCRYPTION_KEY),
        script_sandbox=script_sandbox,
    )
    bus = RabbitMQBus(settings.RABBITMQ_URL, settings.RABBITMQ_PREFETCH)
    await bus.connect()
    if settings.RABBITMQ_TOPOLOGY_ENABLED:
        await bus.declare_topology()

    semaphore = asyncio.Semaphore(settings.WORKER_RULES_MAX_CONCURRENCY)
    in_flight: set[asyncio.Task[None]] = set()

    async def handle(message: AbstractIncomingMessage) -> None:
        async with semaphore, message.process(requeue=False):
            envelope = decode_json_message(message.body)
            inbound = incoming_message_from_envelope(envelope)
            result = await service.execute(
                inbound,
                correlation_id=str(envelope.get("correlation_id") or message.correlation_id or ""),
            )
            logger.info(
                "inbound_message_processed",
                message_id=inbound.message_id,
                duplicate=result.duplicate,
                matched_rules=len(result.matched_rule_ids),
                actions_created=result.actions_created,
            )

    def _log_task_result(task: asyncio.Task[None]) -> None:
        in_flight.discard(task)
        if not task.cancelled() and (error := task.exception()) is not None:
            logger.error("inbound_message_task_failed", error=str(error))

    try:
        queue = await bus.queue(bus.topology.inbound_queue)
        logger.info(
            "worker_rules_started",
            queue=bus.topology.inbound_queue,
            max_concurrency=settings.WORKER_RULES_MAX_CONCURRENCY,
        )
        # Each message is handled as its own task (bounded by `semaphore`)
        # instead of being awaited in-line here, so a slow RUN_SCRIPT
        # (Selenium taking 15-45s) doesn't stall every other message
        # behind it — up to WORKER_RULES_MAX_CONCURRENCY run at once.
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                task = asyncio.create_task(handle(message))
                in_flight.add(task)
                task.add_done_callback(_log_task_result)
    finally:
        if in_flight:
            await asyncio.gather(*in_flight, return_exceptions=True)
        await bus.close()
        await engine.dispose()


def main() -> None:
    logging.getLogger("aio_pika").setLevel(logging.WARNING)
    asyncio.run(run())


if __name__ == "__main__":
    main()
