"""RabbitMQ topology and AMQP helpers.

The connector deployment owns the shared RabbitMQ instance; this backend only
declares idempotent topology and consumes/publishes inside its bounded context.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import AbstractChannel, AbstractExchange, AbstractQueue, AbstractRobustConnection


@dataclass(frozen=True, slots=True)
class RabbitTopology:
    whatsapp_events: str = "whatsapp.events"
    whatsapp_commands: str = "whatsapp.commands"
    automation_events: str = "automation.events"
    automation_retry: str = "automation.retry"
    automation_dlx: str = "automation.dlx"

    inbound_queue: str = "automation.inbound-message.q"
    delivery_queue: str = "automation.delivery-result.q"
    connector_send_queue: str = "connector.message-send.q"
    dead_letter_queue: str = "automation.dead-letter.q"


class RabbitMQBus:
    """Small explicit wrapper around aio-pika robust connections."""

    def __init__(self, url: str, prefetch: int, topology: RabbitTopology | None = None) -> None:
        self._url = url
        self._prefetch = prefetch
        self._topology = topology or RabbitTopology()
        self._connection: AbstractRobustConnection | None = None
        self._channel: AbstractChannel | None = None
        self._exchanges: dict[str, AbstractExchange] = {}

    @property
    def topology(self) -> RabbitTopology:
        return self._topology

    async def connect(self) -> None:
        self._connection = await aio_pika.connect_robust(self._url)
        channel = await self._connection.channel(publisher_confirms=True)
        await channel.set_qos(prefetch_count=self._prefetch)
        self._channel = channel

    async def close(self) -> None:
        if self._connection is not None:
            await self._connection.close()

    async def declare_topology(self) -> None:
        channel = self._require_channel()
        topology = self._topology
        whatsapp_events = await channel.declare_exchange(
            topology.whatsapp_events, ExchangeType.TOPIC, durable=True
        )
        whatsapp_commands = await channel.declare_exchange(
            topology.whatsapp_commands, ExchangeType.DIRECT, durable=True
        )
        automation_events = await channel.declare_exchange(
            topology.automation_events, ExchangeType.TOPIC, durable=True
        )
        automation_retry = await channel.declare_exchange(
            topology.automation_retry, ExchangeType.DIRECT, durable=True
        )
        automation_dlx = await channel.declare_exchange(
            topology.automation_dlx, ExchangeType.DIRECT, durable=True
        )
        self._exchanges = {
            topology.whatsapp_events: whatsapp_events,
            topology.whatsapp_commands: whatsapp_commands,
            topology.automation_events: automation_events,
            topology.automation_retry: automation_retry,
            topology.automation_dlx: automation_dlx,
        }

        queue_arguments: dict[str, Any] = {
            "x-queue-type": "quorum",
            "x-dead-letter-exchange": topology.automation_dlx,
            "x-dead-letter-routing-key": "dead",
        }
        inbound = await channel.declare_queue(
            topology.inbound_queue, durable=True, arguments=queue_arguments
        )
        delivery = await channel.declare_queue(
            topology.delivery_queue, durable=True, arguments=queue_arguments
        )
        connector_send = await channel.declare_queue(
            topology.connector_send_queue, durable=True, arguments=queue_arguments
        )
        dead_letter_arguments: dict[str, Any] = {"x-queue-type": "quorum"}
        dead_letter = await channel.declare_queue(
            topology.dead_letter_queue,
            durable=True,
            arguments=dead_letter_arguments,
        )

        await inbound.bind(whatsapp_events, routing_key="whatsapp.message.received.v1")
        await delivery.bind(whatsapp_events, routing_key="whatsapp.message.sent.v1")
        await delivery.bind(whatsapp_events, routing_key="whatsapp.message.failed.v1")
        await connector_send.bind(whatsapp_commands, routing_key="whatsapp.message.send.v1")
        await dead_letter.bind(automation_dlx, routing_key="dead")

    async def publish(
        self,
        *,
        exchange_name: str,
        routing_key: str,
        payload: dict[str, Any],
        headers: dict[str, Any] | None = None,
    ) -> None:
        exchange = await self._exchange(exchange_name)
        message_id = str(payload.get("message_id") or "")
        message_type = str(payload.get("message_type") or "")
        correlation_id = str(payload.get("correlation_id") or "")
        message = Message(
            body=json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"),
            content_type="application/json",
            delivery_mode=DeliveryMode.PERSISTENT,
            headers=headers or {},
            message_id=message_id or None,
            correlation_id=correlation_id or None,
            type=message_type or None,
            timestamp=datetime.now(UTC),
            app_id="whatsaap-backend",
        )
        await exchange.publish(message, routing_key=routing_key, mandatory=True)

    async def queue(self, queue_name: str) -> AbstractQueue:
        return await self._require_channel().get_queue(queue_name, ensure=True)

    async def _exchange(self, name: str) -> AbstractExchange:
        if name in self._exchanges:
            return self._exchanges[name]
        exchange = await self._require_channel().get_exchange(name, ensure=True)
        self._exchanges[name] = exchange
        return exchange

    def _require_channel(self) -> AbstractChannel:
        if self._channel is None:
            raise RuntimeError("RabbitMQBus.connect() must be called before use")
        return self._channel


def decode_json_message(body: bytes) -> dict[str, Any]:
    decoded = json.loads(body.decode("utf-8"))
    if not isinstance(decoded, dict):
        raise ValueError("AMQP message body must be a JSON object")
    return decoded
