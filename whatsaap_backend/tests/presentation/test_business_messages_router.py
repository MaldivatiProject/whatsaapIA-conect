from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from whatsaap_backend.bootstrap.api import create_app
from whatsaap_backend.config import Settings
from whatsaap_backend.domain.models import BusinessMessage, BusinessMessageOrigin

API_KEY = "acme-secret-at-least-16-chars"


class _FakeBusinessMessageRepository:
    def __init__(self, messages: list[BusinessMessage]) -> None:
        self._messages = messages

    async def add(self, message: BusinessMessage) -> BusinessMessage:
        self._messages.append(message)
        return message

    async def list(
        self,
        tenant_id: str,
        *,
        business_category: str | None = None,
        source_origin: str | None = None,
        limit: int = 100,
    ) -> list[BusinessMessage]:
        rows = [m for m in self._messages if m.tenant_id == tenant_id]
        if business_category is not None:
            rows = [m for m in rows if m.business_category == business_category]
        if source_origin is not None:
            rows = [m for m in rows if m.source_origin.value == source_origin]
        return rows[:limit]


class _FakeUow:
    def __init__(self, repo: _FakeBusinessMessageRepository) -> None:
        self.business_messages = repo

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def commit(self) -> None:
        return None


def _message(**overrides: object) -> BusinessMessage:
    defaults: dict[str, object] = {
        "tenant_id": "acme",
        "source_origin": BusinessMessageOrigin.WHATSAPP,
        "business_category": "traslado_tienda",
        "metadata": {"resultado": "GUARDADO", "CORREO": "vendedor@example.com"},
        "sender": "573001112233@s.whatsapp.net",
        "received_at": datetime.now(UTC),
    }
    defaults.update(overrides)
    return BusinessMessage(**defaults)  # type: ignore[arg-type]


def _client(messages: list[BusinessMessage]) -> TestClient:
    settings = Settings(API_KEYS=f"acme:{API_KEY}", AUTH_ENABLED=True)
    app = create_app(settings)
    repo = _FakeBusinessMessageRepository(messages)
    app.state.uow_factory = lambda: _FakeUow(repo)
    return TestClient(app)


def _headers() -> dict[str, str]:
    return {"x-api-key": API_KEY}


def test_requires_api_key() -> None:
    client = _client([])
    response = client.get("/api/v1/business-messages")
    assert response.status_code == 401


def test_lists_business_messages_for_the_authenticated_tenant() -> None:
    client = _client([_message(), _message(tenant_id="other-tenant")])

    response = client.get("/api/v1/business-messages", headers=_headers())

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["business_category"] == "traslado_tienda"
    assert body[0]["metadata"]["resultado"] == "GUARDADO"


def test_filters_by_category() -> None:
    client = _client(
        [_message(business_category="traslado_tienda"), _message(business_category="otra")]
    )

    response = client.get(
        "/api/v1/business-messages", params={"category": "otra"}, headers=_headers()
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["business_category"] == "otra"
