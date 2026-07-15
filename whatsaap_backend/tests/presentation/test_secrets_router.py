from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from whatsaap_backend.bootstrap.api import create_app
from whatsaap_backend.config import Settings
from whatsaap_backend.domain.models import SecretMetadata

API_KEY = "acme-secret-at-least-16-chars"


class _FakeSecretsRepository:
    def __init__(self) -> None:
        self._values: dict[tuple[str, str], str] = {}
        self._metadata: dict[tuple[str, str], SecretMetadata] = {}

    async def create(
        self, tenant_id: str, name: str, value: str, *, created_by: str | None = None
    ) -> SecretMetadata:
        key = (tenant_id, name)
        if key in self._metadata:
            raise ValueError(f"Secret '{name}' already exists for this tenant")
        metadata = SecretMetadata(tenant_id=tenant_id, name=name, created_by=created_by)
        self._metadata[key] = metadata
        self._values[key] = value
        return metadata

    async def rotate(self, tenant_id: str, name: str, value: str) -> SecretMetadata:
        key = (tenant_id, name)
        if key not in self._metadata:
            raise LookupError(f"Secret '{name}' not found")
        existing = self._metadata[key]
        rotated = SecretMetadata(
            uuid=existing.uuid,
            tenant_id=tenant_id,
            name=name,
            created_by=existing.created_by,
            creation_date=existing.creation_date,
            rotated_at=datetime.now(UTC),
        )
        self._metadata[key] = rotated
        self._values[key] = value
        return rotated

    async def get_value(self, tenant_id: str, name: str) -> str | None:
        return self._values.get((tenant_id, name))

    async def list_metadata(self, tenant_id: str) -> list[SecretMetadata]:
        return [meta for (tid, _), meta in self._metadata.items() if tid == tenant_id]

    async def delete(self, tenant_id: str, name: str) -> bool:
        key = (tenant_id, name)
        if key not in self._metadata:
            return False
        del self._metadata[key]
        del self._values[key]
        return True


class _FakeUow:
    def __init__(self, repo: _FakeSecretsRepository) -> None:
        self.secrets = repo

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def commit(self) -> None:
        return None


def _client(repo: _FakeSecretsRepository | None = None) -> TestClient:
    settings = Settings(API_KEYS=f"acme:{API_KEY}", AUTH_ENABLED=True)
    app = create_app(settings)
    repo = repo or _FakeSecretsRepository()
    app.state.uow_factory = lambda: _FakeUow(repo)
    return TestClient(app)


def _headers() -> dict[str, str]:
    return {"x-api-key": API_KEY}


def test_requires_api_key() -> None:
    client = _client()
    response = client.get("/api/v1/secrets")
    assert response.status_code == 401


def test_create_list_rotate_delete_round_trip() -> None:
    client = _client()

    created = client.post(
        "/api/v1/secrets",
        json={"name": "STRIPE_API_KEY", "value": "sk_live_abc123"},
        headers=_headers(),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "STRIPE_API_KEY"
    assert body["tenant_id"] == "acme"
    assert "value" not in body

    listed = client.get("/api/v1/secrets", headers=_headers())
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert "value" not in listed.json()[0]

    rotated = client.patch(
        "/api/v1/secrets/STRIPE_API_KEY/rotate",
        json={"value": "sk_live_def456"},
        headers=_headers(),
    )
    assert rotated.status_code == 200
    assert rotated.json()["rotated_at"] is not None

    deleted = client.delete("/api/v1/secrets/STRIPE_API_KEY", headers=_headers())
    assert deleted.status_code == 204

    listed_after_delete = client.get("/api/v1/secrets", headers=_headers())
    assert listed_after_delete.json() == []


def test_create_duplicate_name_returns_409() -> None:
    client = _client()
    payload = {"name": "STRIPE_API_KEY", "value": "sk_live_abc123"}

    first = client.post("/api/v1/secrets", json=payload, headers=_headers())
    assert first.status_code == 201

    second = client.post("/api/v1/secrets", json=payload, headers=_headers())
    assert second.status_code == 409


def test_rotate_unknown_secret_returns_404() -> None:
    client = _client()
    response = client.patch(
        "/api/v1/secrets/DOES_NOT_EXIST/rotate",
        json={"value": "whatever"},
        headers=_headers(),
    )
    assert response.status_code == 404


def test_delete_unknown_secret_returns_404() -> None:
    client = _client()
    response = client.delete("/api/v1/secrets/DOES_NOT_EXIST", headers=_headers())
    assert response.status_code == 404


def test_create_rejects_lowercase_name() -> None:
    client = _client()
    response = client.post(
        "/api/v1/secrets",
        json={"name": "stripe_api_key", "value": "sk_live_abc123"},
        headers=_headers(),
    )
    assert response.status_code == 422


def test_create_rejects_empty_value() -> None:
    client = _client()
    response = client.post(
        "/api/v1/secrets",
        json={"name": "STRIPE_API_KEY", "value": ""},
        headers=_headers(),
    )
    assert response.status_code == 422
