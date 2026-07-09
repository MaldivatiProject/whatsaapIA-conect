"""Application services orchestrating domain and ports."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from whatsaap_backend.domain.models import ActionType, IncomingMessage
from whatsaap_backend.domain.rule_engine import RuleEvaluator, render_template

from .contracts import MessageEnvelope, OutboxDraft
from .ports import UnitOfWorkFactory


@dataclass(frozen=True, slots=True)
class ProcessMessageResult:
    duplicate: bool
    execution_id: str | None
    matched_rule_ids: tuple[str, ...] = ()
    actions_created: int = 0


@dataclass(frozen=True, slots=True)
class DeliveryResult:
    duplicate: bool
    execution_updated: bool
    status: str | None = None


def _unique(values: tuple[str | None, ...]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(value for value in values if value))


async def resolve_message_identity(uow: Any, message: IncomingMessage) -> IncomingMessage:
    """Apply tenant-configured JID aliases before rules evaluate/send.

    WhatsApp can emit private senders as `@lid`, while the operator often knows
    the same contact as `@s.whatsapp.net`. The dashboard stores that alias map
    in contact_identities; here we make it effective for both matching and
    replies while preserving the raw sender for audit/templates.
    """

    raw_sender = message.raw_sender or message.sender
    identity = await uow.contact_identities.find_for_jid(
        message.tenant_id, message.session_id, raw_sender
    )
    if identity is None:
        return replace(
            message,
            raw_sender=raw_sender,
            reply_to_jid=message.reply_to_jid or message.sender,
            sender_aliases=message.sender_aliases or (message.sender,),
        )

    aliases = _unique((identity.phone_jid, identity.lid_jid, raw_sender, *message.sender_aliases))
    conversation_id = message.conversation_id
    if not message.is_group and conversation_id in aliases:
        conversation_id = identity.phone_jid

    return replace(
        message,
        conversation_id=conversation_id,
        sender=identity.phone_jid,
        raw_sender=raw_sender,
        sender_lid_jid=identity.lid_jid,
        sender_phone_jid=identity.phone_jid,
        reply_to_jid=identity.phone_jid,
        sender_aliases=aliases,
        raw_payload={
            **message.raw_payload,
            "raw_sender": raw_sender,
            "sender_lid_jid": identity.lid_jid,
            "sender_phone_jid": identity.phone_jid,
            "reply_to_jid": identity.phone_jid,
            "sender_aliases": list(aliases),
        },
    )


def message_template_context(message: IncomingMessage) -> dict[str, Any]:
    return {
        "text": message.text,
        "message_type": message.message_type,
        "is_group": message.is_group,
        "sender": message.sender,
        "raw_sender": message.raw_sender or message.sender,
        "sender_lid_jid": message.sender_lid_jid,
        "sender_phone_jid": message.sender_phone_jid,
        "sender_aliases": message.sender_aliases or (message.sender,),
        "reply_to_jid": message.resolved_reply_to_jid,
        "push_name": message.push_name,
        "session_id": message.session_id,
        "conversation_id": message.conversation_id,
    }


class IngestWebhookService:
    """Persist connector events into the outbox before acknowledging HTTP."""

    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory

    async def execute(self, envelope: MessageEnvelope) -> None:
        draft = OutboxDraft(
            exchange="whatsapp.events",
            routing_key="whatsapp.message.received.v1",
            envelope=envelope,
            aggregate_type="inbound_message",
        )
        async with self._uow_factory() as uow:
            await uow.outbox.add(draft)
            await uow.commit()


class ProcessIncomingMessageService:
    """Deduplicate and evaluate one normalized inbound message atomically."""

    def __init__(
        self, uow_factory: UnitOfWorkFactory, evaluator: RuleEvaluator | None = None
    ) -> None:
        self._uow_factory = uow_factory
        self._evaluator = evaluator or RuleEvaluator()

    async def execute(self, message: IncomingMessage, correlation_id: str) -> ProcessMessageResult:
        execution_id = uuid4()
        async with self._uow_factory() as uow:
            registered = await uow.inbox.register(
                message.message_id, "whatsapp.message.received", message.tenant_id
            )
            if not registered:
                await uow.commit()
                return ProcessMessageResult(duplicate=True, execution_id=None)

            message = await resolve_message_identity(uow, message)
            state, state_version = await uow.conversations.get_for_update(
                message.tenant_id, message.session_id, message.conversation_id
            )
            rules = await uow.rules.list_active(message.tenant_id, message.session_id)
            evaluation = self._evaluator.evaluate(rules, message, state)
            matched_ids = [str(match.rule_id) for match in evaluation.matches]
            rule_lookup = {str(rule.uuid): rule for rule in rules}
            matched_categories = sorted(
                {
                    rule_lookup[rule_id].category
                    for rule_id in matched_ids
                    if rule_id in rule_lookup
                }
            )
            action_count = 0
            command_count = 0
            next_state = dict(state)
            template_context = message_template_context(message)

            for match in evaluation.matches:
                for action in match.actions:
                    if action.type is ActionType.SEND_TEXT:
                        text = render_template(str(action.params.get("text", "")), template_context)
                        action_id = uuid4()
                        envelope = MessageEnvelope(
                            message_type="whatsapp.message.send",
                            tenant_id=message.tenant_id,
                            producer="whatsaap-backend",
                            correlation_id=correlation_id,
                            causation_id=message.message_id,
                            payload={
                                "action_id": str(action_id),
                                "execution_id": str(execution_id),
                                "session_id": message.session_id,
                                "to": message.resolved_reply_to_jid,
                                "text": text,
                                "quoted_message_id": message.message_id,
                            },
                        )
                        await uow.outbox.add(
                            OutboxDraft(
                                exchange="whatsapp.commands",
                                routing_key="whatsapp.message.send.v1",
                                envelope=envelope,
                                aggregate_type="rule_execution",
                                aggregate_id=execution_id,
                            )
                        )
                        action_count += 1
                        command_count += 1
                    elif action.type is ActionType.SET_STATE:
                        configured = action.params.get("state", {})
                        if not isinstance(configured, dict):
                            raise ValueError("set_state action requires an object in params.state")
                        next_state.update(configured)
                        action_count += 1
                    elif action.type is ActionType.NOOP:
                        action_count += 1

            if next_state != state:
                await uow.conversations.save(
                    message.tenant_id,
                    message.session_id,
                    message.conversation_id,
                    next_state,
                    state_version,
                )

            await uow.executions.add(
                execution_id=execution_id,
                tenant_id=message.tenant_id,
                session_id=message.session_id,
                conversation_id=message.conversation_id,
                message_id=message.message_id,
                matched_rule_ids=matched_ids,
                status="ACTIONS_PENDING" if command_count else "COMPLETED",
                input_metadata={
                    "message_type": message.message_type,
                    "is_group": message.is_group,
                    "occurred_at": message.occurred_at.isoformat(),
                    "sender": message.sender,
                    "raw_sender": message.raw_sender or message.sender,
                    "reply_to_jid": message.resolved_reply_to_jid,
                    "sender_aliases": list(message.sender_aliases or (message.sender,)),
                    "matched_rule_categories": matched_categories,
                    "text_sha256": hashlib.sha256(message.text.encode("utf-8")).hexdigest(),
                    "actions_evaluated": action_count,
                    "commands_created": command_count,
                },
            )
            await uow.inbox.mark_processed(message.message_id)
            await uow.commit()
            return ProcessMessageResult(
                duplicate=False,
                execution_id=str(execution_id),
                matched_rule_ids=tuple(matched_ids),
                actions_created=action_count,
            )


class ProcessDeliveryResultService:
    """Consume connector delivery results and close the execution audit loop."""

    def __init__(self, uow_factory: UnitOfWorkFactory) -> None:
        self._uow_factory = uow_factory

    async def execute(self, envelope: dict[str, Any]) -> DeliveryResult:
        message_id = str(envelope.get("message_id") or "")
        message_type = str(envelope.get("message_type") or "")
        tenant_id = str(envelope.get("tenant_id") or "")
        payload = envelope.get("payload")
        if not message_id or not message_type or not tenant_id or not isinstance(payload, dict):
            raise ValueError(
                "Delivery envelope must include message_id, message_type, tenant_id and payload"
            )

        execution_raw = str(payload.get("execution_id") or "")
        if not execution_raw:
            raise ValueError("Delivery payload must include execution_id")
        execution_id = UUID(execution_raw)
        status = "COMPLETED" if message_type == "whatsapp.message.sent" else "FAILED"

        async with self._uow_factory() as uow:
            registered = await uow.inbox.register(message_id, message_type, tenant_id)
            if not registered:
                await uow.commit()
                return DeliveryResult(duplicate=True, execution_updated=False)

            updated = await uow.executions.update_status(
                tenant_id=tenant_id,
                execution_id=execution_id,
                status=status,
                metadata_patch={
                    "delivery_message_type": message_type,
                    "connector_message_id": payload.get("connector_message_id"),
                    "delivery_error": payload.get("error"),
                    "delivered_at": datetime.now(UTC).isoformat(),
                },
            )
            await uow.inbox.mark_processed(message_id)
            await uow.commit()
            return DeliveryResult(duplicate=False, execution_updated=updated, status=status)


def incoming_message_from_envelope(data: dict[str, Any]) -> IncomingMessage:
    """Normalize a v1 AMQP envelope into the domain message."""
    payload = data.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("Envelope payload must be an object")
    occurred_raw = data.get("occurred_at")
    occurred_at = (
        datetime.fromisoformat(str(occurred_raw).replace("Z", "+00:00"))
        if occurred_raw
        else datetime.now(UTC)
    )
    sender = str(payload.get("from") or payload.get("sender") or "")
    session_id = str(payload.get("sessionId") or payload.get("session_id") or "")
    is_group = bool(payload.get("isGroup") or payload.get("is_group", False))
    conversation_id = str(payload.get("groupJid") or payload.get("conversation_id") or sender)
    required = {
        "message_id": str(data.get("message_id") or payload.get("messageId") or ""),
        "tenant_id": str(data.get("tenant_id") or ""),
        "session_id": session_id,
        "conversation_id": conversation_id,
        "sender": sender,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise ValueError(f"Missing required message fields: {', '.join(missing)}")
    return IncomingMessage(
        message_id=required["message_id"],
        tenant_id=required["tenant_id"],
        session_id=required["session_id"],
        conversation_id=required["conversation_id"],
        sender=required["sender"],
        text=str(payload.get("text") or ""),
        message_type=str(payload.get("type") or "unknown"),
        occurred_at=occurred_at,
        is_group=is_group,
        push_name=str(payload.get("pushName") or payload.get("push_name") or ""),
        raw_payload=payload,
    )
