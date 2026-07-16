"""Platform-wide (not per-tenant) runtime security toggles, editable from the
dashboard without a redeploy. Today: whether RuleActionSchema's
hardcoded-credential heuristic is enforced for RUN_SCRIPT actions on
create/update — see infrastructure/security_settings.py for the in-process
cache this endpoint keeps in sync."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from whatsaap_backend.infrastructure import security_settings

from .auth import require_tenant
from .schemas import SecuritySettingsOut, SecuritySettingsUpdate

router = APIRouter(prefix="/api/v1/security-settings", tags=["security-settings"])


@router.get("", response_model=SecuritySettingsOut)
async def get_security_settings(
    request: Request, tenant_id: str = Depends(require_tenant)
) -> SecuritySettingsOut:
    del tenant_id
    async with request.app.state.uow_factory() as uow:
        allow = await uow.security_settings.get_allow_hardcoded_script_secrets()
        return SecuritySettingsOut(allow_hardcoded_script_secrets=allow)


@router.patch("", response_model=SecuritySettingsOut)
async def update_security_settings(
    payload: SecuritySettingsUpdate,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> SecuritySettingsOut:
    async with request.app.state.uow_factory() as uow:
        await uow.security_settings.set_allow_hardcoded_script_secrets(
            payload.allow_hardcoded_script_secrets, updated_by=tenant_id
        )
        await uow.commit()
    # Update the in-process cache the (synchronous, DB-less) Pydantic
    # validator reads — see infrastructure/security_settings.py's docstring
    # for why a single process's cache is sufficient here.
    allow = payload.allow_hardcoded_script_secrets
    security_settings.set_allow_hardcoded_script_secrets(allow)
    return SecuritySettingsOut(allow_hardcoded_script_secrets=allow)
