from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from whatsaap_backend.bootstrap.api import create_app
from whatsaap_backend.config import Settings
from whatsaap_backend.domain.models import BusinessRule

API_KEY = "acme-secret-at-least-16-chars"


class _FakeRuleRepository:
    def __init__(self) -> None:
        self._rules: dict[UUID, BusinessRule] = {}

    async def list_active(
        self, tenant_id: str, session_id: str | None = None
    ) -> list[BusinessRule]:
        del session_id
        return [r for r in self._rules.values() if r.tenant_id == tenant_id and r.enabled]

    async def list_all(self, tenant_id: str) -> list[BusinessRule]:
        return [
            r for r in self._rules.values() if r.tenant_id == tenant_id and r.expiration_date is None
        ]

    async def list_deleted(self, tenant_id: str) -> list[BusinessRule]:
        return [
            r
            for r in self._rules.values()
            if r.tenant_id == tenant_id and r.expiration_date is not None
        ]

    async def get(self, tenant_id: str, rule_id: UUID) -> BusinessRule | None:
        rule = self._rules.get(rule_id)
        if rule and rule.tenant_id == tenant_id and rule.expiration_date is None:
            return rule
        return None

    async def add(self, rule: BusinessRule) -> BusinessRule:
        self._rules[rule.uuid] = rule
        return rule

    async def update(self, rule: BusinessRule) -> BusinessRule:
        if rule.uuid not in self._rules:
            raise LookupError("Rule not found")
        rule.version += 1  # mirrors SqlAlchemyRuleRepository.update()'s server-side increment
        self._rules[rule.uuid] = rule
        return rule

    async def soft_delete(self, tenant_id: str, rule_id: UUID) -> bool:
        rule = self._rules.get(rule_id)
        if not rule or rule.tenant_id != tenant_id or rule.expiration_date is not None:
            return False
        rule.expiration_date = datetime.now(UTC)
        rule.enabled = False
        return True

    async def restore(self, tenant_id: str, rule_id: UUID) -> BusinessRule | None:
        rule = self._rules.get(rule_id)
        if not rule or rule.tenant_id != tenant_id or rule.expiration_date is None:
            return None
        rule.expiration_date = None
        return rule


class _FakeUow:
    def __init__(self, repo: _FakeRuleRepository) -> None:
        self.rules = repo

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def commit(self) -> None:
        return None


def _client() -> TestClient:
    settings = Settings(API_KEYS=f"acme:{API_KEY}", AUTH_ENABLED=True)
    app = create_app(settings)
    repo = _FakeRuleRepository()
    app.state.uow_factory = lambda: _FakeUow(repo)
    return TestClient(app)


def _headers() -> dict[str, str]:
    return {"x-api-key": API_KEY}


_RULE_PAYLOAD = {
    "name": "auto-reply-numero",
    "conditions": [
        {"field": "sender", "operator": "equals", "value": "573243744739@s.whatsapp.net"}
    ],
    "actions": [{"type": "send_text", "params": {"text": "Procesando tu solicitud..."}}],
}


def test_requires_api_key() -> None:
    client = _client()
    response = client.get("/api/v1/rules")
    assert response.status_code == 401


def test_rejects_wrong_api_key() -> None:
    client = _client()
    response = client.get("/api/v1/rules", headers={"x-api-key": "not-the-right-key"})
    assert response.status_code == 401


def test_create_list_get_update_delete_round_trip() -> None:
    client = _client()

    created = client.post("/api/v1/rules", json=_RULE_PAYLOAD, headers=_headers())
    assert created.status_code == 201
    rule_id = created.json()["id"]
    assert created.json()["tenant_id"] == "acme"
    assert created.json()["enabled"] is True

    listed = client.get("/api/v1/rules", headers=_headers())
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    fetched = client.get(f"/api/v1/rules/{rule_id}", headers=_headers())
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "auto-reply-numero"

    updated = client.patch(f"/api/v1/rules/{rule_id}", json={"enabled": False}, headers=_headers())
    assert updated.status_code == 200
    assert updated.json()["enabled"] is False
    assert updated.json()["version"] == 2

    deleted = client.delete(f"/api/v1/rules/{rule_id}", headers=_headers())
    assert deleted.status_code == 204

    after_delete = client.get(f"/api/v1/rules/{rule_id}", headers=_headers())
    assert after_delete.status_code == 404


def test_rejects_rule_with_no_conditions() -> None:
    client = _client()
    payload = {**_RULE_PAYLOAD, "conditions": []}

    response = client.post("/api/v1/rules", json=payload, headers=_headers())

    assert response.status_code == 422
    # Readable message, not pydantic's raw repr dump (loc tuples, ctx, docs URL).
    assert "conditions" in response.json()["detail"]
    assert "loc" not in response.json()["detail"]


def test_run_script_missing_handle_function_returns_a_readable_error() -> None:
    client = _client()
    payload = {
        **_RULE_PAYLOAD,
        "actions": [
            {
                "type": "run_script",
                "params": {"script": "print('no handle function here')"},
            }
        ],
    }

    response = client.post("/api/v1/rules", json=payload, headers=_headers())

    assert response.status_code == 422
    detail = response.json()["detail"]
    # No "actions.0:" prefix — the message itself is already a complete,
    # actionable sentence, and that field path means nothing in the dashboard.
    assert detail.startswith("Al script le falta la función `def handle(message):`")
    assert "ctx" not in detail
    assert "errors.pydantic.dev" not in detail
    assert "errors.pydantic.dev" not in detail


def test_get_nonexistent_rule_returns_404() -> None:
    client = _client()
    response = client.get(f"/api/v1/rules/{uuid4()}", headers=_headers())
    assert response.status_code == 404


def test_deleted_rule_appears_in_deleted_list_with_deleted_at_and_disappears_from_active_list() -> None:
    client = _client()

    created = client.post("/api/v1/rules", json=_RULE_PAYLOAD, headers=_headers())
    rule_id = created.json()["id"]
    assert created.json()["deleted_at"] is None

    deleted = client.delete(f"/api/v1/rules/{rule_id}", headers=_headers())
    assert deleted.status_code == 204

    active = client.get("/api/v1/rules", headers=_headers())
    assert active.json() == []

    trashed = client.get("/api/v1/rules/deleted", headers=_headers())
    assert trashed.status_code == 200
    assert len(trashed.json()) == 1
    assert trashed.json()[0]["id"] == rule_id
    assert trashed.json()[0]["deleted_at"] is not None


def test_restore_undeletes_a_rule_but_keeps_it_disabled() -> None:
    client = _client()

    created = client.post("/api/v1/rules", json=_RULE_PAYLOAD, headers=_headers())
    rule_id = created.json()["id"]
    client.delete(f"/api/v1/rules/{rule_id}", headers=_headers())

    restored = client.post(f"/api/v1/rules/{rule_id}/restore", headers=_headers())
    assert restored.status_code == 200
    assert restored.json()["deleted_at"] is None
    # Restoring only undoes the deletion — it doesn't silently re-arm the rule.
    assert restored.json()["enabled"] is False

    active = client.get("/api/v1/rules", headers=_headers())
    assert len(active.json()) == 1
    assert active.json()[0]["id"] == rule_id

    trashed = client.get("/api/v1/rules/deleted", headers=_headers())
    assert trashed.json() == []


def test_restore_nonexistent_rule_returns_404() -> None:
    client = _client()
    response = client.post(f"/api/v1/rules/{uuid4()}/restore", headers=_headers())
    assert response.status_code == 404


def test_restore_a_rule_that_is_not_deleted_returns_404() -> None:
    client = _client()
    created = client.post("/api/v1/rules", json=_RULE_PAYLOAD, headers=_headers())
    rule_id = created.json()["id"]

    response = client.post(f"/api/v1/rules/{rule_id}/restore", headers=_headers())
    assert response.status_code == 404


def test_another_tenant_cannot_see_or_restore_a_deleted_rule() -> None:
    settings = Settings(
        API_KEYS=f"acme:{API_KEY},other:other-secret-16-chars-ok", AUTH_ENABLED=True
    )
    app = create_app(settings)
    repo = _FakeRuleRepository()
    app.state.uow_factory = lambda: _FakeUow(repo)
    client = TestClient(app)

    created = client.post("/api/v1/rules", json=_RULE_PAYLOAD, headers=_headers())
    rule_id = created.json()["id"]
    client.delete(f"/api/v1/rules/{rule_id}", headers=_headers())

    other_headers = {"x-api-key": "other-secret-16-chars-ok"}
    assert client.get("/api/v1/rules/deleted", headers=other_headers).json() == []
    assert (
        client.post(f"/api/v1/rules/{rule_id}/restore", headers=other_headers).status_code == 404
    )


def test_another_tenant_cannot_see_or_modify_the_rule() -> None:
    settings = Settings(
        API_KEYS=f"acme:{API_KEY},other:other-secret-16-chars-ok", AUTH_ENABLED=True
    )
    app = create_app(settings)
    repo = _FakeRuleRepository()
    app.state.uow_factory = lambda: _FakeUow(repo)
    client = TestClient(app)

    created = client.post("/api/v1/rules", json=_RULE_PAYLOAD, headers=_headers())
    rule_id = created.json()["id"]

    other_headers = {"x-api-key": "other-secret-16-chars-ok"}
    assert client.get(f"/api/v1/rules/{rule_id}", headers=other_headers).status_code == 404
    assert client.get("/api/v1/rules", headers=other_headers).json() == []
