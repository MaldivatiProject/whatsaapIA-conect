"""Admin CRUD for encrypted credentials referenced by name from RUN_SCRIPT
rule actions. The plaintext value is accepted on create/rotate and never
returned again — GET/list only ever expose SecretOut metadata."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status

from .auth import require_tenant
from .errors import SecretAlreadyExistsError, SecretNotFoundError
from .schemas import SecretCreate, SecretOut, SecretRotate

router = APIRouter(prefix="/api/v1/secrets", tags=["secrets"])


@router.get("", response_model=list[SecretOut])
async def list_secrets(
    request: Request, tenant_id: str = Depends(require_tenant)
) -> list[SecretOut]:
    async with request.app.state.uow_factory() as uow:
        secrets = await uow.secrets.list_metadata(tenant_id)
        return [SecretOut.from_domain(secret) for secret in secrets]


@router.post("", response_model=SecretOut, status_code=status.HTTP_201_CREATED)
async def create_secret(
    payload: SecretCreate, request: Request, tenant_id: str = Depends(require_tenant)
) -> SecretOut:
    async with request.app.state.uow_factory() as uow:
        try:
            created = await uow.secrets.create(tenant_id, payload.name, payload.value)
        except ValueError as error:
            raise SecretAlreadyExistsError(payload.name) from error
        await uow.commit()
        return SecretOut.from_domain(created)


@router.patch("/{name}/rotate", response_model=SecretOut)
async def rotate_secret(
    name: str, payload: SecretRotate, request: Request, tenant_id: str = Depends(require_tenant)
) -> SecretOut:
    async with request.app.state.uow_factory() as uow:
        try:
            rotated = await uow.secrets.rotate(tenant_id, name, payload.value)
        except LookupError as error:
            raise SecretNotFoundError(name) from error
        await uow.commit()
        return SecretOut.from_domain(rotated)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(
    name: str, request: Request, tenant_id: str = Depends(require_tenant)
) -> None:
    async with request.app.state.uow_factory() as uow:
        deleted = await uow.secrets.delete(tenant_id, name)
        if not deleted:
            raise SecretNotFoundError(name)
        await uow.commit()
