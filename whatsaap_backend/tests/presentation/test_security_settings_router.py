from __future__ import annotations

from fastapi.testclient import TestClient

from whatsaap_backend.bootstrap.api import create_app
from whatsaap_backend.config import Settings
from whatsaap_backend.infrastructure import security_settings

API_KEY = "acme-secret-at-least-16-chars"


class _FakeSecuritySettingsRepository:
    def __init__(self, initial: bool = False) -> None:
        self._allow = initial
        self.set_calls: list[tuple[bool, str | None]] = []

    async def get_allow_hardcoded_script_secrets(self) -> bool:
        return self._allow

    async def set_allow_hardcoded_script_secrets(
        self, value: bool, *, updated_by: str | None
    ) -> None:
        self._allow = value
        self.set_calls.append((value, updated_by))


class _FakeUow:
    def __init__(self, repo: _FakeSecuritySettingsRepository) -> None:
        self.security_settings = repo

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def commit(self) -> None:
        return None


def _client(repo: _FakeSecuritySettingsRepository) -> TestClient:
    settings = Settings(API_KEYS=f"acme:{API_KEY}", AUTH_ENABLED=True)
    app = create_app(settings)
    app.state.uow_factory = lambda: _FakeUow(repo)
    return TestClient(app)


def setup_function() -> None:
    # The router keeps the module-level cache (infrastructure.security_settings)
    # in sync on every PATCH — reset it between tests so they don't leak state.
    security_settings.set_allow_hardcoded_script_secrets(False)


def test_get_returns_current_value() -> None:
    repo = _FakeSecuritySettingsRepository(initial=True)
    client = _client(repo)

    response = client.get("/api/v1/security-settings", headers={"x-api-key": API_KEY})

    assert response.status_code == 200
    assert response.json() == {"allow_hardcoded_script_secrets": True}


def test_patch_updates_repository_and_in_process_cache() -> None:
    repo = _FakeSecuritySettingsRepository(initial=False)
    client = _client(repo)

    response = client.patch(
        "/api/v1/security-settings",
        json={"allow_hardcoded_script_secrets": True},
        headers={"x-api-key": API_KEY},
    )

    assert response.status_code == 200
    assert response.json() == {"allow_hardcoded_script_secrets": True}
    assert repo.set_calls == [(True, "acme")]
    # The Pydantic validator (schemas.py) reads this cache synchronously —
    # confirm the PATCH actually updated it, not just the fake repository.
    assert security_settings.get_allow_hardcoded_script_secrets() is True


def test_patch_can_turn_the_flag_back_off() -> None:
    repo = _FakeSecuritySettingsRepository(initial=True)
    client = _client(repo)

    response = client.patch(
        "/api/v1/security-settings",
        json={"allow_hardcoded_script_secrets": False},
        headers={"x-api-key": API_KEY},
    )

    assert response.status_code == 200
    assert security_settings.get_allow_hardcoded_script_secrets() is False


def test_requires_a_valid_api_key() -> None:
    repo = _FakeSecuritySettingsRepository()
    client = _client(repo)

    response = client.get("/api/v1/security-settings")

    assert response.status_code == 401
