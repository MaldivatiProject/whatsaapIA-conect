"""CRUD for BusinessRule, scoped by tenant_id derived from the API key."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, status

from whatsaap_backend.domain.models import BusinessRule, IncomingMessage
from whatsaap_backend.domain.rule_engine import RuleEvaluator

from .auth import require_tenant
from .errors import RuleNotFoundError
from .schemas import (
    RuleActionSchema,
    RuleCreate,
    RuleOut,
    RuleSimulationRequest,
    RuleSimulationResponse,
    RuleUpdate,
    RuleValidationResponse,
)

router = APIRouter(prefix="/api/v1/rules", tags=["rules"])
_evaluator = RuleEvaluator()


@router.get("", response_model=list[RuleOut])
async def list_rules(request: Request, tenant_id: str = Depends(require_tenant)) -> list[RuleOut]:
    async with request.app.state.uow_factory() as uow:
        rules = await uow.rules.list_all(tenant_id)
        return [RuleOut.from_domain(rule) for rule in rules]


@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    payload: RuleCreate, request: Request, tenant_id: str = Depends(require_tenant)
) -> RuleOut:
    rule = BusinessRule(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        session_id=payload.session_id,
        priority=payload.priority,
        enabled=payload.enabled,
        stop_on_match=payload.stop_on_match,
        conditions=tuple(c.to_domain() for c in payload.conditions),
        actions=tuple(a.to_domain() for a in payload.actions),
    )
    _evaluator.validate(rule)

    async with request.app.state.uow_factory() as uow:
        created = await uow.rules.add(rule)
        await uow.commit()
        return RuleOut.from_domain(created)


@router.post("/validate", response_model=RuleValidationResponse)
async def validate_rule(
    payload: RuleCreate, tenant_id: str = Depends(require_tenant)
) -> RuleValidationResponse:
    rule = BusinessRule(
        tenant_id=tenant_id,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        session_id=payload.session_id,
        priority=payload.priority,
        enabled=payload.enabled,
        stop_on_match=payload.stop_on_match,
        conditions=tuple(c.to_domain() for c in payload.conditions),
        actions=tuple(a.to_domain() for a in payload.actions),
    )
    _evaluator.validate(rule)
    return RuleValidationResponse(valid=True)


@router.post("/simulate", response_model=RuleSimulationResponse)
async def simulate_rules(
    payload: RuleSimulationRequest,
    request: Request,
    tenant_id: str = Depends(require_tenant),
) -> RuleSimulationResponse:
    if payload.rules is None:
        async with request.app.state.uow_factory() as uow:
            rules = await uow.rules.list_active(tenant_id, payload.message.session_id)
    else:
        rules = [
            BusinessRule(
                tenant_id=tenant_id,
                name=item.name,
                description=item.description,
                category=item.category,
                session_id=item.session_id,
                priority=item.priority,
                enabled=item.enabled,
                stop_on_match=item.stop_on_match,
                conditions=tuple(c.to_domain() for c in item.conditions),
                actions=tuple(a.to_domain() for a in item.actions),
            )
            for item in payload.rules
        ]

    message = IncomingMessage(
        message_id=payload.message.message_id,
        tenant_id=tenant_id,
        session_id=payload.message.session_id,
        conversation_id=payload.message.conversation_id or payload.message.sender,
        sender=payload.message.sender,
        text=payload.message.text,
        message_type=payload.message.message_type,
        occurred_at=payload.message.occurred_at,
        is_group=payload.message.is_group,
        push_name=payload.message.push_name,
    )
    result = _evaluator.evaluate(rules, message, payload.message.state)
    actions = [action for match in result.matches for action in match.actions]
    return RuleSimulationResponse(
        matched_rule_ids=[str(match.rule_id) for match in result.matches],
        actions=[RuleActionSchema.from_domain(action) for action in actions],
    )


@router.get("/{rule_id}", response_model=RuleOut)
async def get_rule(
    rule_id: UUID, request: Request, tenant_id: str = Depends(require_tenant)
) -> RuleOut:
    async with request.app.state.uow_factory() as uow:
        rule = await uow.rules.get(tenant_id, rule_id)
        if rule is None:
            raise RuleNotFoundError(str(rule_id))
        return RuleOut.from_domain(rule)


@router.patch("/{rule_id}", response_model=RuleOut)
async def update_rule(
    rule_id: UUID, payload: RuleUpdate, request: Request, tenant_id: str = Depends(require_tenant)
) -> RuleOut:
    async with request.app.state.uow_factory() as uow:
        existing = await uow.rules.get(tenant_id, rule_id)
        if existing is None:
            raise RuleNotFoundError(str(rule_id))

        updated = BusinessRule(
            uuid=existing.uuid,
            tenant_id=existing.tenant_id,
            name=payload.name if payload.name is not None else existing.name,
            description=payload.description
            if payload.description is not None
            else existing.description,
            category=payload.category if payload.category is not None else existing.category,
            session_id=payload.session_id
            if payload.session_id is not None
            else existing.session_id,
            priority=payload.priority if payload.priority is not None else existing.priority,
            enabled=payload.enabled if payload.enabled is not None else existing.enabled,
            stop_on_match=(
                payload.stop_on_match
                if payload.stop_on_match is not None
                else existing.stop_on_match
            ),
            version=existing.version,
            conditions=(
                tuple(c.to_domain() for c in payload.conditions)
                if payload.conditions is not None
                else existing.conditions
            ),
            actions=(
                tuple(a.to_domain() for a in payload.actions)
                if payload.actions is not None
                else existing.actions
            ),
            creation_date=existing.creation_date,
            expiration_date=existing.expiration_date,
        )
        _evaluator.validate(updated)

        saved = await uow.rules.update(updated)
        await uow.commit()
        return RuleOut.from_domain(saved)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: UUID, request: Request, tenant_id: str = Depends(require_tenant)
) -> None:
    async with request.app.state.uow_factory() as uow:
        deleted = await uow.rules.soft_delete(tenant_id, rule_id)
        if not deleted:
            raise RuleNotFoundError(str(rule_id))
        await uow.commit()
