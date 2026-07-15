from __future__ import annotations

import httpx
import pytest

from whatsaap_backend.infrastructure.integrations.connector_client import (
    ConnectorDeliveryError,
    HttpConnectorMessageSender,
)


def _sender(handler: httpx.MockTransport) -> HttpConnectorMessageSender:
    return HttpConnectorMessageSender(
        base_url="http://connector:3000",
        api_key="secret-key",
        timeout_seconds=5,
        transport=handler,
    )


async def test_send_text_posts_expected_payload_and_returns_message_id() -> None:
    captured: dict[str, object] = {}

    def handle(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["body"] = request.content
        return httpx.Response(200, json={"messageId": "3EB0FAKE", "sessionId": "test"})

    sender = _sender(httpx.MockTransport(handle))
    message_id = await sender.send_text(
        session_id="test", to="573243744739@s.whatsapp.net", text="hola", quoted_message_id="abc"
    )

    assert message_id == "3EB0FAKE"
    assert captured["url"] == "http://connector:3000/messages/send"
    assert captured["headers"]["x-api-key"] == "secret-key"


async def test_send_text_raises_connector_delivery_error_on_4xx() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        del request
        return httpx.Response(
            409,
            json={"title": "SessionNotConnectedError", "detail": "Session 'test' not connected"},
        )

    sender = _sender(httpx.MockTransport(handle))

    with pytest.raises(ConnectorDeliveryError) as excinfo:
        await sender.send_text(session_id="test", to="573243744739@s.whatsapp.net", text="hola")

    assert excinfo.value.status_code == 409
    assert "not connected" in excinfo.value.detail


async def test_send_text_raises_on_transport_error() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        del request
        raise httpx.ConnectError("boom")

    sender = _sender(httpx.MockTransport(handle))

    with pytest.raises(ConnectorDeliveryError):
        await sender.send_text(session_id="test", to="573243744739@s.whatsapp.net", text="hola")
