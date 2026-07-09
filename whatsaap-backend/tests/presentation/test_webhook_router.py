from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from fastapi.testclient import TestClient

from whatsaap_backend.bootstrap.api import create_app
from whatsaap_backend.config import Settings

WEBHOOK_SECRET = "a-webhook-secret-at-least-32-characters-long"


def _sign(body: bytes, secret: str = WEBHOOK_SECRET) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


class _RecordingDirectDeliveryService:
    def __init__(self) -> None:
        self.calls: list[Any] = []

    async def execute(self, message: Any) -> Any:
        self.calls.append(message)

        class _Result:
            duplicate = False
            matched_rule_ids: tuple[str, ...] = ()
            actions_sent = 0
            delivery_errors: tuple[str, ...] = ()

        return _Result()


def _client_with_recorder() -> tuple[TestClient, _RecordingDirectDeliveryService]:
    settings = Settings(
        WEBHOOK_SECRET=WEBHOOK_SECRET,
        WEBHOOK_DEFAULT_TENANT_ID="acme",
        WEBHOOK_PROCESSING_MODE="direct",
        AUTH_ENABLED=False,
    )
    app = create_app(settings)
    recorder = _RecordingDirectDeliveryService()
    app.state.direct_delivery_service = recorder
    return TestClient(app), recorder


def _message_received_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "eventName": "MESSAGE_RECEIVED",
        "occurredAt": "2026-07-09T12:00:00.000Z",
        "sessionId": "test",
        "messageId": "3EB0FAKE",
        "from": "573243744739@s.whatsapp.net",
        "isGroup": False,
        "type": "conversation",
        "timestamp": 1749902400,
        "text": "hola",
        "pushName": "Cliente",
    }
    payload.update(overrides)
    return payload


def test_rejects_missing_signature() -> None:
    client, recorder = _client_with_recorder()
    body = json.dumps(_message_received_payload()).encode()

    response = client.post(
        "/webhooks/whatsapp-connector", content=body, headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 401
    assert recorder.calls == []


def test_rejects_wrong_signature() -> None:
    client, recorder = _client_with_recorder()
    body = json.dumps(_message_received_payload()).encode()

    response = client.post(
        "/webhooks/whatsapp-connector",
        content=body,
        headers={"X-Webhook-Signature": "sha256=" + "0" * 64},
    )

    assert response.status_code == 401
    assert recorder.calls == []


def test_accepts_valid_signature_and_processes_message_received() -> None:
    client, recorder = _client_with_recorder()
    body = json.dumps(_message_received_payload()).encode()

    response = client.post(
        "/webhooks/whatsapp-connector", content=body, headers={"X-Webhook-Signature": _sign(body)}
    )

    assert response.status_code == 202
    assert len(recorder.calls) == 1
    assert recorder.calls[0].sender == "573243744739@s.whatsapp.net"
    assert recorder.calls[0].session_id == "test"


def test_ignores_non_message_received_events() -> None:
    client, recorder = _client_with_recorder()
    body = json.dumps({"eventName": "SESSION_CONNECTED", "sessionId": "test"}).encode()

    response = client.post(
        "/webhooks/whatsapp-connector", content=body, headers={"X-Webhook-Signature": _sign(body)}
    )

    assert response.status_code == 202
    assert recorder.calls == []


def test_group_message_maps_is_group_and_group_jid_as_sender() -> None:
    client, recorder = _client_with_recorder()
    payload = _message_received_payload(isGroup=True, **{"from": "123-456@g.us"})
    body = json.dumps(payload).encode()

    response = client.post(
        "/webhooks/whatsapp-connector", content=body, headers={"X-Webhook-Signature": _sign(body)}
    )

    assert response.status_code == 202
    assert recorder.calls[0].is_group is True
    assert recorder.calls[0].sender == "123-456@g.us"
