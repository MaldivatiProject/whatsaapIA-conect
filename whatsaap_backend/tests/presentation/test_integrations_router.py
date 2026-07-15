from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient

from whatsaap_backend.application.contracts import DriveFileContent
from whatsaap_backend.bootstrap.api import create_app
from whatsaap_backend.config import Settings
from whatsaap_backend.domain.models import DriveIntegrationConfig, SecretMetadata
from whatsaap_backend.infrastructure.integrations.google_drive_client import DriveAccessError

API_KEY = "acme-secret-at-least-16-chars"


class _FakeDriveIntegrationRepository:
    def __init__(self) -> None:
        self._configs: dict[str, DriveIntegrationConfig] = {}

    async def get(self, tenant_id: str) -> DriveIntegrationConfig | None:
        return self._configs.get(tenant_id)

    async def upsert(self, config: DriveIntegrationConfig) -> DriveIntegrationConfig:
        self._configs[config.tenant_id] = config
        return config

    async def delete(self, tenant_id: str) -> bool:
        return self._configs.pop(tenant_id, None) is not None


class _FakeSecretsRepository:
    def __init__(self) -> None:
        self._values: dict[tuple[str, str], str] = {}

    def seed(self, tenant_id: str, name: str, value: str) -> None:
        self._values[(tenant_id, name)] = value

    async def get_value(self, tenant_id: str, name: str) -> str | None:
        return self._values.get((tenant_id, name))

    # Unused by this router but required to satisfy call sites in fixtures.
    async def create(self, *args: object, **kwargs: object) -> SecretMetadata:
        raise NotImplementedError

    async def rotate(self, *args: object, **kwargs: object) -> SecretMetadata:
        raise NotImplementedError

    async def list_metadata(self, tenant_id: str) -> list[SecretMetadata]:
        return []

    async def delete(self, tenant_id: str, name: str) -> bool:
        return self._values.pop((tenant_id, name), None) is not None


class _FakeUow:
    def __init__(
        self, drive_integration: _FakeDriveIntegrationRepository, secrets: _FakeSecretsRepository
    ) -> None:
        self.drive_integration = drive_integration
        self.secrets = secrets

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def commit(self) -> None:
        return None


class _FakeDriveDocumentClient:
    def __init__(
        self, content: DriveFileContent | None = None, error: DriveAccessError | None = None
    ) -> None:
        self._content = content
        self._error = error
        self.calls: list[dict[str, object]] = []

    async def read_file(
        self, *, file_id: str, service_account_json: str, cache_ttl_seconds: int
    ) -> DriveFileContent:
        self.calls.append(
            {
                "file_id": file_id,
                "service_account_json": service_account_json,
                "cache_ttl_seconds": cache_ttl_seconds,
            }
        )
        if self._error is not None:
            raise self._error
        assert self._content is not None
        return self._content


def _client(
    drive_repo: _FakeDriveIntegrationRepository | None = None,
    secrets_repo: _FakeSecretsRepository | None = None,
    drive_client: _FakeDriveDocumentClient | None = None,
) -> TestClient:
    settings = Settings(API_KEYS=f"acme:{API_KEY}", AUTH_ENABLED=True)
    app = create_app(settings)
    drive_repo = drive_repo or _FakeDriveIntegrationRepository()
    secrets_repo = secrets_repo or _FakeSecretsRepository()
    app.state.uow_factory = lambda: _FakeUow(drive_repo, secrets_repo)
    app.state.drive_document_client = drive_client or _FakeDriveDocumentClient()
    return TestClient(app)


def _headers() -> dict[str, str]:
    return {"x-api-key": API_KEY}


def test_requires_api_key() -> None:
    client = _client()
    response = client.get("/api/v1/integrations/google-drive")
    assert response.status_code == 401


def test_get_returns_null_when_not_configured() -> None:
    client = _client()
    response = client.get("/api/v1/integrations/google-drive", headers=_headers())
    assert response.status_code == 200
    assert response.json() is None


def test_upsert_then_get_round_trip() -> None:
    client = _client()

    created = client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr", "enabled": True, "cache_ttl_seconds": 120},
        headers=_headers(),
    )
    assert created.status_code == 200
    body = created.json()
    assert body["file_id"] == "1AbCdEfGhIjKlMnOpQr"
    assert body["credentials_secret_name"] == "GOOGLE_DRIVE_SERVICE_ACCOUNT"
    assert body["has_credentials"] is False

    fetched = client.get("/api/v1/integrations/google-drive", headers=_headers())
    assert fetched.status_code == 200
    assert fetched.json()["file_id"] == "1AbCdEfGhIjKlMnOpQr"


def test_get_reports_has_credentials_when_secret_present() -> None:
    secrets_repo = _FakeSecretsRepository()
    secrets_repo.seed("acme", "GOOGLE_DRIVE_SERVICE_ACCOUNT", '{"type": "service_account"}')
    client = _client(secrets_repo=secrets_repo)

    client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr"},
        headers=_headers(),
    )
    response = client.get("/api/v1/integrations/google-drive", headers=_headers())
    assert response.json()["has_credentials"] is True


def test_upsert_rejects_invalid_secret_name() -> None:
    client = _client()
    response = client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr", "credentials_secret_name": "lowercase"},
        headers=_headers(),
    )
    assert response.status_code == 422


def test_delete_round_trip() -> None:
    client = _client()
    client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr"},
        headers=_headers(),
    )

    deleted = client.delete("/api/v1/integrations/google-drive", headers=_headers())
    assert deleted.status_code == 204

    fetched = client.get("/api/v1/integrations/google-drive", headers=_headers())
    assert fetched.json() is None


def test_delete_unconfigured_returns_404() -> None:
    client = _client()
    response = client.delete("/api/v1/integrations/google-drive", headers=_headers())
    assert response.status_code == 404


def test_test_connection_without_config_returns_404() -> None:
    client = _client()
    response = client.post("/api/v1/integrations/google-drive/test", headers=_headers())
    assert response.status_code == 404


def test_test_connection_without_credentials_returns_422() -> None:
    client = _client()
    client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr"},
        headers=_headers(),
    )
    response = client.post("/api/v1/integrations/google-drive/test", headers=_headers())
    assert response.status_code == 422


def test_test_connection_success() -> None:
    secrets_repo = _FakeSecretsRepository()
    secrets_repo.seed("acme", "GOOGLE_DRIVE_SERVICE_ACCOUNT", '{"type": "service_account"}')
    content = DriveFileContent(
        file_id="1AbCdEfGhIjKlMnOpQr",
        name="pricing.txt",
        mime_type="text/plain",
        modified_time=datetime(2026, 7, 10, tzinfo=UTC),
        text="lista de precios: producto A $10",
    )
    drive_client = _FakeDriveDocumentClient(content=content)
    client = _client(secrets_repo=secrets_repo, drive_client=drive_client)
    client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr"},
        headers=_headers(),
    )

    response = client.post("/api/v1/integrations/google-drive/test", headers=_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["name"] == "pricing.txt"
    assert body["preview"].startswith("lista de precios")
    assert drive_client.calls[0]["cache_ttl_seconds"] == 0


def test_test_connection_surfaces_drive_access_error() -> None:
    secrets_repo = _FakeSecretsRepository()
    secrets_repo.seed("acme", "GOOGLE_DRIVE_SERVICE_ACCOUNT", '{"type": "service_account"}')
    drive_client = _FakeDriveDocumentClient(
        error=DriveAccessError("1AbCdEfGhIjKlMnOpQr", "file not shared with service account")
    )
    client = _client(secrets_repo=secrets_repo, drive_client=drive_client)
    client.put(
        "/api/v1/integrations/google-drive",
        json={"file_id": "1AbCdEfGhIjKlMnOpQr"},
        headers=_headers(),
    )

    response = client.post("/api/v1/integrations/google-drive/test", headers=_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is False
    assert "not shared" in body["error"]
