"""Bridge from RabbitMQ whatsapp.commands to the current connector REST API."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import structlog

from whatsaap_backend.application.contracts import MessageEnvelope
from whatsaap_backend.bootstrap.api import _configure_logging
from whatsaap_backend.config import get_settings
from whatsaap_backend.infrastructure.integrations.connector_client import (
    ConnectorDeliveryError,
    HttpConnectorMessageSender,
)
from whatsaap_backend.infrastructure.messaging.rabbitmq import RabbitMQBus, decode_json_message

logger = structlog.get_logger(__name__)


def _result_envelope(
    *,
    command: dict[str, Any],
    message_type: str,
    payload: dict[str, Any],
) -> MessageEnvelope:
    return MessageEnvelope(
        message_type=message_type,
        tenant_id=str(command.get("tenant_id") or ""),
        producer="whatsaap-backend.connector-bridge",
        correlation_id=str(command.get("correlation_id") or ""),
        causation_id=str(command.get("message_id") or ""),
        payload=payload,
    )


async def run() -> None:
    settings = get_settings()
    _configure_logging(settings)

    bus = RabbitMQBus(settings.RABBITMQ_URL, settings.RABBITMQ_PREFETCH)
    sender = HttpConnectorMessageSender(
        base_url=settings.CONNECTOR_BASE_URL,
        api_key=settings.CONNECTOR_API_KEY,
        timeout_seconds=settings.CONNECTOR_TIMEOUT_SECONDS,
    )
    await bus.connect()
    if settings.RABBITMQ_TOPOLOGY_ENABLED:
        await bus.declare_topology()

    try:
        queue = await bus.queue(bus.topology.connector_send_queue)
        logger.info("connector_bridge_started", queue=bus.topology.connector_send_queue)
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process(requeue=False):
                    command = decode_json_message(message.body)
                    payload = command.get("payload")
                    if not isinstance(payload, dict):
                        raise ValueError("Command payload must be a JSON object")

                    execution_id = str(payload.get("execution_id") or "")
                    action_id = str(payload.get("action_id") or "")
                    session_id = str(payload.get("session_id") or payload.get("sessionId") or "")
                    to = str(payload.get("to") or "")
                    text = str(payload.get("text") or "")
                    quoted = payload.get("quoted_message_id") or payload.get("quotedMessageId")
                    try:
                        connector_message_id = await sender.send_text(
                            session_id=session_id,
                            to=to,
                            text=text,
                            quoted_message_id=str(quoted) if quoted else None,
                        )
                        event = _result_envelope(
                            command=command,
                            message_type="whatsapp.message.sent",
                            payload={
                                "execution_id": execution_id,
                                "action_id": action_id,
                                "session_id": session_id,
                                "to": to,
                                "connector_message_id": connector_message_id,
                            },
                        )
                        routing_key = "whatsapp.message.sent.v1"
                    except ConnectorDeliveryError as error:
                        event = _result_envelope(
                            command=command,
                            message_type="whatsapp.message.failed",
                            payload={
                                "execution_id": execution_id,
                                "action_id": action_id,
                                "session_id": session_id,
                                "to": to,
                                "error": error.detail,
                                "status_code": error.status_code,
                            },
                        )
                        routing_key = "whatsapp.message.failed.v1"

                    await bus.publish(
                        exchange_name=bus.topology.whatsapp_events,
                        routing_key=routing_key,
                        payload=event.to_dict(),
                        headers={
                            "message_type": event.message_type,
                            "schema_version": event.schema_version,
                            "correlation_id": event.correlation_id,
                        },
                    )
                    logger.info(
                        "connector_command_bridged",
                        command_message_id=command.get("message_id"),
                        event_message_id=event.message_id,
                        routing_key=routing_key,
                    )
    finally:
        await sender.aclose()
        await bus.close()


def main() -> None:
    logging.getLogger("aio_pika").setLevel(logging.WARNING)
    asyncio.run(run())


if __name__ == "__main__":
    main()
