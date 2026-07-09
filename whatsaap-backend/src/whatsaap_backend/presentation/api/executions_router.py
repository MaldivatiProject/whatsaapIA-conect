"""Read-only execution audit API."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from .auth import require_tenant
from .errors import ProblemDetailsError
from .schemas import ExecutionOut

router = APIRouter(prefix="/api/v1/executions", tags=["executions"])


class ExecutionNotFoundError(ProblemDetailsError):
    def __init__(self, execution_id: str) -> None:
        super().__init__(404, "ExecutionNotFoundError", f"Execution not found: {execution_id}")


@router.get("", response_model=list[ExecutionOut])
async def list_executions(
    request: Request,
    tenant_id: str = Depends(require_tenant),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[ExecutionOut]:
    async with request.app.state.uow_factory() as uow:
        rows = await uow.executions.list(tenant_id, limit)
        return [ExecutionOut(**row) for row in rows]


@router.get("/{execution_id}", response_model=ExecutionOut)
async def get_execution(
    execution_id: UUID,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> ExecutionOut:
    async with request.app.state.uow_factory() as uow:
        row = await uow.executions.get(tenant_id, execution_id)
        if row is None:
            raise ExecutionNotFoundError(str(execution_id))
        return ExecutionOut(**row)
