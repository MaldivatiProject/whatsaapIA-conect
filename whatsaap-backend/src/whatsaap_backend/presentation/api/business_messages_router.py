"""Read-only listing of business_messages — the structured output RUN_SCRIPT
actions persist (e.g. a TRASLADO TIENDA result: GUARDADO/YA_CORRECTA/
NO_ENCONTRADO/...). This is the only place that outcome is visible without
querying Postgres directly.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from .auth import require_tenant
from .schemas import BusinessMessageOut

router = APIRouter(prefix="/api/v1/business-messages", tags=["business-messages"])


@router.get("", response_model=list[BusinessMessageOut])
async def list_business_messages(
    request: Request,
    category: str | None = Query(default=None, alias="category", max_length=80),
    source_origin: str | None = Query(default=None, max_length=20),
    limit: int = Query(default=100, ge=1, le=500),
    tenant_id: str = Depends(require_tenant),
) -> list[BusinessMessageOut]:
    async with request.app.state.uow_factory() as uow:
        rows = await uow.business_messages.list(
            tenant_id,
            business_category=category,
            source_origin=source_origin,
            limit=limit,
        )
        return [BusinessMessageOut.from_domain(row) for row in rows]
