"""CRUD for configurable WhatsApp JID aliases (`@lid` ↔ phone JID)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status

from whatsaap_backend.domain.models import ContactIdentity

from .auth import require_tenant
from .errors import ContactIdentityNotFoundError
from .schemas import ContactIdentityCreate, ContactIdentityOut, ContactIdentityUpdate

router = APIRouter(prefix="/api/v1/contact-identities", tags=["contact-identities"])


@router.get("", response_model=list[ContactIdentityOut])
async def list_contact_identities(
    request: Request,
    session_id: str | None = Query(default=None, max_length=64),
    tenant_id: str = Depends(require_tenant),
) -> list[ContactIdentityOut]:
    async with request.app.state.uow_factory() as uow:
        identities = await uow.contact_identities.list(tenant_id, session_id)
        return [ContactIdentityOut.from_domain(identity) for identity in identities]


@router.post("", response_model=ContactIdentityOut, status_code=status.HTTP_201_CREATED)
async def create_contact_identity(
    payload: ContactIdentityCreate,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> ContactIdentityOut:
    async with request.app.state.uow_factory() as uow:
        created = await uow.contact_identities.add(payload.to_domain(tenant_id))
        await uow.commit()
        return ContactIdentityOut.from_domain(created)


@router.get("/{identity_id}", response_model=ContactIdentityOut)
async def get_contact_identity(
    identity_id: UUID,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> ContactIdentityOut:
    async with request.app.state.uow_factory() as uow:
        identity = await uow.contact_identities.get(tenant_id, identity_id)
        if identity is None:
            raise ContactIdentityNotFoundError(str(identity_id))
        return ContactIdentityOut.from_domain(identity)


@router.patch("/{identity_id}", response_model=ContactIdentityOut)
async def update_contact_identity(
    identity_id: UUID,
    payload: ContactIdentityUpdate,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> ContactIdentityOut:
    async with request.app.state.uow_factory() as uow:
        existing = await uow.contact_identities.get(tenant_id, identity_id)
        if existing is None:
            raise ContactIdentityNotFoundError(str(identity_id))

        fields_set = payload.model_fields_set
        updated = ContactIdentity(
            uuid=existing.uuid,
            tenant_id=existing.tenant_id,
            session_id=payload.session_id if "session_id" in fields_set else existing.session_id,
            lid_jid=payload.lid_jid if payload.lid_jid is not None else existing.lid_jid,
            phone_jid=payload.phone_jid if payload.phone_jid is not None else existing.phone_jid,
            display_name=(
                payload.display_name
                if "display_name" in fields_set
                else existing.display_name
            ),
            enabled=payload.enabled if payload.enabled is not None else existing.enabled,
            creation_date=existing.creation_date,
            expiration_date=existing.expiration_date,
        )
        saved = await uow.contact_identities.update(updated)
        await uow.commit()
        return ContactIdentityOut.from_domain(saved)


@router.delete("/{identity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_identity(
    identity_id: UUID,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> None:
    async with request.app.state.uow_factory() as uow:
        deleted = await uow.contact_identities.soft_delete(tenant_id, identity_id)
        if not deleted:
            raise ContactIdentityNotFoundError(str(identity_id))
        await uow.commit()
