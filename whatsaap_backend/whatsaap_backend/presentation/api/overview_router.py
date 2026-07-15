"""Executive overview for the dashboard, backed by durable PostgreSQL audit data."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request

from .auth import require_tenant
from .errors import ProblemDetailsError
from .schemas import OverviewOut

router = APIRouter(prefix="/api/v1/overview", tags=["overview"])

DEFAULT_RANGE = timedelta(days=7)
MAX_RANGE = timedelta(days=90)


class InvalidOverviewRangeError(ProblemDetailsError):
    def __init__(self, detail: str) -> None:
        super().__init__(422, "InvalidOverviewRangeError", detail)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


async def _overview_filters(
    from_date: Annotated[datetime | None, Query(alias="from")] = None,
    to_date: Annotated[datetime | None, Query(alias="to")] = None,
    session_id: Annotated[str | None, Query(max_length=64)] = None,
    bucket: Annotated[Literal["hour", "day"], Query()] = "day",
) -> tuple[datetime, datetime, str | None, Literal["hour", "day"]]:
    end = _aware(to_date) or datetime.now(UTC)
    start = _aware(from_date) or end - DEFAULT_RANGE

    if start >= end:
        raise InvalidOverviewRangeError("The 'from' query parameter must be before 'to'.")
    if end - start > MAX_RANGE:
        raise InvalidOverviewRangeError("The overview range cannot exceed 90 days.")

    return start, end, session_id, bucket


@router.get("", response_model=OverviewOut)
async def overview(
    request: Request,
    filters: tuple[datetime, datetime, str | None, Literal["hour", "day"]] = Depends(
        _overview_filters
    ),
    tenant_id: str = Depends(require_tenant),
    limit: int = Query(default=6, ge=1, le=12),
) -> OverviewOut:
    start, end, session_id, bucket = filters
    async with request.app.state.uow_factory() as uow:
        row = await uow.reports.overview(
            tenant_id,
            start,
            end,
            session_id,
            bucket,
            limit,
        )
        return OverviewOut(**row)
