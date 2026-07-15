from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from whatsaap_backend.config import Settings
from whatsaap_backend.presentation.api.errors import register_exception_handlers
from whatsaap_backend.presentation.api.overview_router import router as overview_router

API_KEY = "acme-secret-at-least-16-chars"


class _FakeReportRepository:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def overview(
        self,
        tenant_id: str,
        start: datetime,
        end: datetime,
        session_id: str | None,
        bucket: str,
        limit: int,
    ) -> dict[str, Any]:
        self.calls.append(
            {
                "tenant_id": tenant_id,
                "start": start,
                "end": end,
                "session_id": session_id,
                "bucket": bucket,
                "limit": limit,
            }
        )
        return _overview_payload(start, end, bucket)


class _FakeUow:
    def __init__(self, repo: _FakeReportRepository) -> None:
        self.reports = repo

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None


def _overview_payload(start: datetime, end: datetime, bucket: str) -> dict[str, Any]:
    generated_at = datetime(2026, 7, 13, 12, tzinfo=UTC)
    return {
        "generated_at": generated_at.isoformat(),
        "range": {"from": start.isoformat(), "to": end.isoformat(), "bucket": bucket},
        "totals": {
            "processed_messages": 18,
            "matched_messages": 15,
            "unmatched_messages": 3,
            "replies_sent_or_queued": 14,
            "failed_replies": 1,
            "pending_replies": 2,
            "completed_messages": 15,
            "unique_conversations": 8,
            "active_sessions": 2,
            "business_messages": 5,
            "match_rate": 83.3,
            "reply_rate": 77.8,
            "failure_rate": 5.6,
        },
        "comparison": {
            "processed_messages": {
                "current": 18,
                "previous": 12,
                "change": 6,
                "change_percent": 50.0,
            },
            "matched_messages": {
                "current": 15,
                "previous": 10,
                "change": 5,
                "change_percent": 50.0,
            },
            "replies_sent_or_queued": {
                "current": 14,
                "previous": 8,
                "change": 6,
                "change_percent": 75.0,
            },
            "failed_replies": {
                "current": 1,
                "previous": 2,
                "change": -1,
                "change_percent": -50.0,
            },
        },
        "timeseries": [
            {
                "bucket_start": start.isoformat(),
                "processed_messages": 18,
                "matched_messages": 15,
                "replies_sent_or_queued": 14,
                "failed_replies": 1,
                "completed_messages": 15,
                "pending_replies": 2,
            }
        ],
        "statuses": [
            {
                "status": "COMPLETED",
                "messages": 15,
                "replies_sent_or_queued": 14,
                "percentage": 83.3,
            }
        ],
        "categories": [
            {
                "category": "traslado_tienda",
                "messages": 12,
                "matched_messages": 12,
                "replies_sent_or_queued": 11,
                "failed_replies": 1,
                "percentage": 66.7,
            }
        ],
        "rules": [
            {
                "rule_id": "rule-1",
                "rule_name": "Traslados",
                "category": "traslado_tienda",
                "matches": 12,
                "replies_sent_or_queued": 11,
                "failed_replies": 1,
            }
        ],
        "sessions": [
            {
                "session_id": "mi-sesion",
                "messages": 18,
                "matched_messages": 15,
                "replies_sent_or_queued": 14,
                "failed_replies": 1,
                "last_activity_at": end.isoformat(),
            }
        ],
        "recent_messages": [
            {
                "id": "execution-1",
                "created_at": end.isoformat(),
                "session_id": "mi-sesion",
                "conversation_id": "573001112233@s.whatsapp.net",
                "message_id": "message-1",
                "status": "COMPLETED",
                "message_type": "conversation",
                "is_group": False,
                "sender": "573001112233@s.whatsapp.net",
                "raw_sender": "573001112233@s.whatsapp.net",
                "matched_categories": ["traslado_tienda"],
                "replies_sent_or_queued": 1,
            }
        ],
    }


def _client() -> tuple[TestClient, _FakeReportRepository]:
    settings = Settings(API_KEYS=f"acme:{API_KEY}", AUTH_ENABLED=True)
    app = FastAPI()
    app.state.settings = settings
    repo = _FakeReportRepository()
    app.state.uow_factory = lambda: _FakeUow(repo)
    register_exception_handlers(app)
    app.include_router(overview_router)
    return TestClient(app), repo


def _headers() -> dict[str, str]:
    return {"x-api-key": API_KEY}


def test_requires_api_key() -> None:
    client, _ = _client()

    response = client.get("/api/v1/overview")

    assert response.status_code == 401


def test_overview_uses_authenticated_tenant_and_filters() -> None:
    client, repo = _client()

    response = client.get(
        "/api/v1/overview",
        params={
            "from": "2026-07-01T00:00:00Z",
            "to": "2026-07-08T00:00:00Z",
            "session_id": "mi-sesion",
            "bucket": "day",
            "limit": "4",
        },
        headers=_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["range"]["from"] == "2026-07-01T00:00:00Z"
    assert body["totals"]["processed_messages"] == 18
    assert body["categories"][0]["category"] == "traslado_tienda"
    assert repo.calls == [
        {
            "tenant_id": "acme",
            "start": datetime(2026, 7, 1, tzinfo=UTC),
            "end": datetime(2026, 7, 8, tzinfo=UTC),
            "session_id": "mi-sesion",
            "bucket": "day",
            "limit": 4,
        }
    ]


def test_rejects_invalid_range() -> None:
    client, repo = _client()

    response = client.get(
        "/api/v1/overview",
        params={"from": "2026-07-08T00:00:00Z", "to": "2026-07-01T00:00:00Z"},
        headers=_headers(),
    )

    assert response.status_code == 422
    assert repo.calls == []
