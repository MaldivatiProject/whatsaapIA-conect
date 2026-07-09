"""HTTP client that delivers replies through whatsapp-connector's REST API."""

from __future__ import annotations

import contextlib

import httpx
import structlog

from whatsaap_backend.infrastructure.observability.pii import hash_jid

logger = structlog.get_logger(__name__)


class ConnectorDeliveryError(RuntimeError):
    """Raised when whatsapp-connector rejects or fails to process a send request."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(f"connector send failed ({status_code}): {detail}")
        self.status_code = status_code
        self.detail = detail


class HttpConnectorMessageSender:
    """Implements MessageSenderPort by calling POST /messages/send directly.

    Phase 1 bypass of the RabbitMQ whatsapp.commands path documented in
    docs/architecture/event-driven-architecture.md — see application/ports.py.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout_seconds: float,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            timeout=timeout_seconds,
            transport=transport,
        )

    async def send_text(
        self,
        *,
        session_id: str,
        to: str,
        text: str,
        quoted_message_id: str | None = None,
    ) -> str:
        body: dict[str, str] = {"sessionId": session_id, "to": to, "text": text}
        if quoted_message_id:
            body["quotedMessageId"] = quoted_message_id

        try:
            response = await self._client.post("/messages/send", json=body)
        except httpx.HTTPError as error:
            logger.error(
                "connector_send_transport_error",
                session_id=session_id,
                to_hash=hash_jid(to),
                error=str(error),
            )
            raise ConnectorDeliveryError(0, str(error)) from error

        if response.status_code >= 400:
            detail = response.text
            with contextlib.suppress(ValueError):
                detail = response.json().get("detail", detail)
            logger.warning(
                "connector_send_rejected",
                session_id=session_id,
                to_hash=hash_jid(to),
                status_code=response.status_code,
            )
            raise ConnectorDeliveryError(response.status_code, detail)

        message_id = str(response.json().get("messageId", ""))
        logger.info(
            "connector_send_ok", session_id=session_id, to_hash=hash_jid(to), message_id=message_id
        )
        return message_id

    async def aclose(self) -> None:
        await self._client.aclose()
