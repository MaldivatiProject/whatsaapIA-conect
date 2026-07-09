"""Read-only business reports over durable rule execution audit."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from .auth import require_tenant
from .schemas import (
    ReportCategoryOut,
    ReportDeliveryOut,
    ReportMessageOut,
    ReportRuleOut,
    ReportSummaryOut,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


async def _filters(
    from_date: Annotated[datetime | None, Query(alias="from")] = None,
    to_date: Annotated[datetime | None, Query(alias="to")] = None,
    session_id: Annotated[str | None, Query(max_length=64)] = None,
) -> tuple[datetime | None, datetime | None, str | None]:
    return _aware(from_date), _aware(to_date), session_id


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


@router.get("/summary", response_model=ReportSummaryOut)
async def report_summary(
    request: Request,
    filters: tuple[datetime | None, datetime | None, str | None] = Depends(_filters),
    tenant_id: str = Depends(require_tenant),
) -> ReportSummaryOut:
    start, end, session_id = filters
    async with request.app.state.uow_factory() as uow:
        row = await uow.reports.summary(tenant_id, start, end, session_id)
        return ReportSummaryOut(**row)


@router.get("/messages", response_model=list[ReportMessageOut])
async def report_messages(
    request: Request,
    filters: tuple[datetime | None, datetime | None, str | None] = Depends(_filters),
    tenant_id: str = Depends(require_tenant),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[ReportMessageOut]:
    start, end, session_id = filters
    async with request.app.state.uow_factory() as uow:
        rows = await uow.reports.messages(tenant_id, start, end, session_id, limit)
        return [ReportMessageOut(**row) for row in rows]


@router.get("/categories", response_model=list[ReportCategoryOut])
async def report_categories(
    request: Request,
    filters: tuple[datetime | None, datetime | None, str | None] = Depends(_filters),
    tenant_id: str = Depends(require_tenant),
) -> list[ReportCategoryOut]:
    start, end, session_id = filters
    async with request.app.state.uow_factory() as uow:
        rows = await uow.reports.categories(tenant_id, start, end, session_id)
        return [ReportCategoryOut(**row) for row in rows]


@router.get("/rules", response_model=list[ReportRuleOut])
async def report_rules(
    request: Request,
    filters: tuple[datetime | None, datetime | None, str | None] = Depends(_filters),
    tenant_id: str = Depends(require_tenant),
) -> list[ReportRuleOut]:
    start, end, session_id = filters
    async with request.app.state.uow_factory() as uow:
        rows = await uow.reports.rules(tenant_id, start, end, session_id)
        return [ReportRuleOut(**row) for row in rows]


@router.get("/deliveries", response_model=list[ReportDeliveryOut])
async def report_deliveries(
    request: Request,
    filters: tuple[datetime | None, datetime | None, str | None] = Depends(_filters),
    tenant_id: str = Depends(require_tenant),
) -> list[ReportDeliveryOut]:
    start, end, session_id = filters
    async with request.app.state.uow_factory() as uow:
        rows = await uow.reports.deliveries(tenant_id, start, end, session_id)
        return [ReportDeliveryOut(**row) for row in rows]
