"""Configuration for the Google Drive read-only integration: which file to
read and how long to cache it. The service-account credential itself is
never accepted here — it's set/rotated through the existing encrypted
/api/v1/secrets endpoints, referenced by name (see
DriveIntegrationConfigOut.credentials_secret_name)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from whatsaap_backend.domain.models import DriveIntegrationConfig
from whatsaap_backend.infrastructure.integrations.google_drive_client import DriveAccessError

from .auth import require_tenant
from .errors import DriveCredentialsMissingError, DriveIntegrationNotConfiguredError
from .schemas import DriveConnectionTestResult, DriveIntegrationConfigIn, DriveIntegrationConfigOut

router = APIRouter(prefix="/api/v1/integrations/google-drive", tags=["integrations"])


@router.get("", response_model=DriveIntegrationConfigOut | None)
async def get_config(
    request: Request, tenant_id: str = Depends(require_tenant)
) -> DriveIntegrationConfigOut | None:
    async with request.app.state.uow_factory() as uow:
        config = await uow.drive_integration.get(tenant_id)
        if config is None:
            return None
        secret_value = await uow.secrets.get_value(tenant_id, config.credentials_secret_name)
        return DriveIntegrationConfigOut.from_domain(
            config, has_credentials=secret_value is not None
        )


@router.put("", response_model=DriveIntegrationConfigOut)
async def upsert_config(
    payload: DriveIntegrationConfigIn,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> DriveIntegrationConfigOut:
    async with request.app.state.uow_factory() as uow:
        saved = await uow.drive_integration.upsert(
            DriveIntegrationConfig(
                tenant_id=tenant_id,
                file_id=payload.file_id,
                credentials_secret_name=payload.credentials_secret_name,
                enabled=payload.enabled,
                cache_ttl_seconds=payload.cache_ttl_seconds,
            )
        )
        await uow.commit()
        secret_value = await uow.secrets.get_value(tenant_id, saved.credentials_secret_name)
        return DriveIntegrationConfigOut.from_domain(
            saved, has_credentials=secret_value is not None
        )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(request: Request, tenant_id: str = Depends(require_tenant)) -> None:
    async with request.app.state.uow_factory() as uow:
        deleted = await uow.drive_integration.delete(tenant_id)
        if not deleted:
            raise DriveIntegrationNotConfiguredError
        await uow.commit()


@router.post("/test", response_model=DriveConnectionTestResult)
async def test_connection(
    request: Request, tenant_id: str = Depends(require_tenant)
) -> DriveConnectionTestResult:
    async with request.app.state.uow_factory() as uow:
        config = await uow.drive_integration.get(tenant_id)
        if config is None:
            raise DriveIntegrationNotConfiguredError
        secret_value = await uow.secrets.get_value(tenant_id, config.credentials_secret_name)
        if secret_value is None:
            raise DriveCredentialsMissingError(config.credentials_secret_name)

    try:
        content = await request.app.state.drive_document_client.read_file(
            file_id=config.file_id,
            service_account_json=secret_value,
            cache_ttl_seconds=0,
        )
    except DriveAccessError as error:
        return DriveConnectionTestResult.from_error(error.detail)
    return DriveConnectionTestResult.from_content(content)
