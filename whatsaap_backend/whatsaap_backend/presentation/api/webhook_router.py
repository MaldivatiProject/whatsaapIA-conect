"""Receives whatsapp-connector's webhook (RestWebhookEventPublisher) and feeds
matching events into rule evaluation. Phase 1: only MESSAGE_RECEIVED is
consumed — it already carries isGroup + the correct reply-to JID (the chat's
remoteJid, group or individual), so GROUP_/PRIVATE_MESSAGE_RECEIVED (emitted
for the same message_id) would only be deduplicated no-ops downstream.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, Request, Response, status

from whatsaap_backend.application.contracts import MessageEnvelope
from whatsaap_backend.application.direct_delivery_service import ProcessIncomingMessageDirectService
from whatsaap_backend.application.services import IngestWebhookService
from whatsaap_backend.config import Settings
from whatsaap_backend.domain.models import IncomingMessage, MessageAttachment

from .errors import ProblemDetailsError

router = APIRouter(tags=["webhook"])
logger = structlog.get_logger(__name__)

_HANDLED_EVENT = "MESSAGE_RECEIVED"


class InvalidWebhookSignatureError(ProblemDetailsError):
    def __init__(self) -> None:
        super().__init__(
            status.HTTP_401_UNAUTHORIZED, "InvalidWebhookSignatureError", "Invalid signature"
        )


def _verify_signature(raw_body: bytes, signature_header: str, secret: str) -> None:
    if not secret:
        raise InvalidWebhookSignatureError
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not signature_header or not hmac.compare_digest(expected, signature_header):
        raise InvalidWebhookSignatureError


def _incoming_message_from_webhook(data: dict[str, Any], tenant_id: str) -> IncomingMessage:
    session_id = str(data.get("sessionId") or "")
    message_id = str(data.get("messageId") or "")
    sender = str(data.get("from") or "")
    missing = [
        name
        for name, value in {
            "sessionId": session_id,
            "messageId": message_id,
            "from": sender,
        }.items()
        if not value
    ]
    if missing:
        raise ValueError(f"Missing required webhook fields: {', '.join(missing)}")

    occurred_raw = data.get("occurredAt")
    occurred_at = (
        datetime.fromisoformat(str(occurred_raw).replace("Z", "+00:00"))
        if occurred_raw
        else datetime.now(UTC)
    )
    return IncomingMessage(
        message_id=message_id,
        tenant_id=tenant_id,
        session_id=session_id,
        conversation_id=sender,
        sender=sender,
        text=str(data.get("text") or ""),
        message_type=str(data.get("type") or "unknown"),
        occurred_at=occurred_at,
        is_group=bool(data.get("isGroup", False)),
        push_name=str(data.get("pushName") or ""),
        raw_payload=data,
        attachment=MessageAttachment.from_payload(data.get("attachment")),
    )


def _envelope_from_webhook(data: dict[str, Any], message: IncomingMessage) -> MessageEnvelope:
    return MessageEnvelope(
        message_id=message.message_id,
        message_type="whatsapp.message.received",
        tenant_id=message.tenant_id,
        producer="whatsapp-connector.webhook",
        causation_id=None,
        payload=data,
    )


@router.post("/webhooks/whatsapp-connector", status_code=status.HTTP_202_ACCEPTED)
async def receive_connector_webhook(request: Request) -> Response:
    settings: Settings = request.app.state.settings
    raw_body = await request.body()
    _verify_signature(
        raw_body, request.headers.get("X-Webhook-Signature", ""), settings.WEBHOOK_SECRET
    )

    data = await request.json()
    event_name = data.get("eventName")
    if event_name != _HANDLED_EVENT:
        return Response(status_code=status.HTTP_202_ACCEPTED)

    try:
        message = _incoming_message_from_webhook(data, settings.WEBHOOK_DEFAULT_TENANT_ID)
    except ValueError as error:
        logger.warning("webhook_malformed_message", error=str(error))
        return Response(status_code=status.HTTP_202_ACCEPTED)

    if settings.WEBHOOK_PROCESSING_MODE == "direct":
        service: ProcessIncomingMessageDirectService = request.app.state.direct_delivery_service
        result = await service.execute(message)
        logger.info(
            "webhook_processed_direct",
            duplicate=result.duplicate,
            matched_rules=len(result.matched_rule_ids),
            actions_sent=result.actions_sent,
            delivery_errors=len(result.delivery_errors),
        )
        return Response(status_code=status.HTTP_202_ACCEPTED)

    ingest_service: IngestWebhookService = request.app.state.webhook_ingest_service
    await ingest_service.execute(_envelope_from_webhook(data, message))
    logger.info("webhook_enqueued", message_id=message.message_id, tenant_id=message.tenant_id)
    return Response(status_code=status.HTTP_202_ACCEPTED)
