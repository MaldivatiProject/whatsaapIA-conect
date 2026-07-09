from __future__ import annotations

from whatsaap_backend.application.services import incoming_message_from_envelope


def test_incoming_message_from_envelope_accepts_connector_shape() -> None:
    message = incoming_message_from_envelope(
        {
            "message_id": "wamid-1",
            "tenant_id": "acme",
            "occurred_at": "2026-07-08T15:00:00Z",
            "payload": {
                "sessionId": "main",
                "from": "573001112233@s.whatsapp.net",
                "text": "hola",
                "type": "text",
                "isGroup": False,
                "pushName": "Cliente",
            },
        }
    )

    assert message.message_id == "wamid-1"
    assert message.tenant_id == "acme"
    assert message.session_id == "main"
    assert message.conversation_id == "573001112233@s.whatsapp.net"
    assert message.text == "hola"
