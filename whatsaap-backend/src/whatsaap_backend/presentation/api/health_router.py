"""Liveness/readiness — distinguishes process-up from DB-reachable."""

from __future__ import annotations

from fastapi import APIRouter, Request, Response, status
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready(request: Request) -> Response:
    engine = request.app.state.engine
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        return Response(status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response(status_code=status.HTTP_200_OK)


@router.get("/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
