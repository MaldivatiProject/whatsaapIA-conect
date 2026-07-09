from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from whatsaap_backend.application.contracts import OutboxDraft
from whatsaap_backend.application.services import ProcessIncomingMessageService
from whatsaap_backend.domain.models import (
    ActionType,
    BusinessRule,
    Condition,
    ConditionOperator,
    ContactIdentity,
    IncomingMessage,
    RuleAction,
)


class _FakeRules:
    def __init__(self, rules: list[BusinessRule]) -> None:
        self._rules = rules

    async def list_active(
        self, tenant_id: str, session_id: str | None = None
    ) -> list[BusinessRule]:
        return [
            rule
            for rule in self._rules
            if rule.tenant_id == tenant_id
            and (rule.session_id is None or rule.session_id == session_id)
        ]


class _FakeInbox:
    def __init__(self) -> None:
        self.seen: set[str] = set()
        self.processed: list[str] = []

    async def register(self, message_id: str, message_type: str, tenant_id: str) -> bool:
        del message_type, tenant_id
        if message_id in self.seen:
            return False
        self.seen.add(message_id)
        return True

    async def mark_processed(self, message_id: str) -> None:
        self.processed.append(message_id)


class _FakeContactIdentities:
    def __init__(self, identities: list[ContactIdentity] | None = None) -> None:
        self._identities = identities or []

    async def find_for_jid(
        self, tenant_id: str, session_id: str, jid: str
    ) -> ContactIdentity | None:
        for identity in self._identities:
            if identity.tenant_id != tenant_id:
                continue
            if identity.session_id is not None and identity.session_id != session_id:
                continue
            if jid in identity.aliases:
                return identity
        return None


class _FakeConversations:
    def __init__(self) -> None:
        self.state: dict[str, Any] = {}
        self.version = 0

    async def get_for_update(
        self, tenant_id: str, session_id: str, conversation_id: str
    ) -> tuple[dict[str, Any], int]:
        del tenant_id, session_id, conversation_id
        return dict(self.state), self.version

    async def save(
        self,
        tenant_id: str,
        session_id: str,
        conversation_id: str,
        state: dict[str, Any],
        expected_version: int,
    ) -> None:
        del tenant_id, session_id, conversation_id
        assert expected_version == self.version
        self.state = dict(state)
        self.version += 1


class _FakeExecutions:
    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []

    async def add(self, **values: Any) -> None:
        self.rows.append(values)


class _FakeOutbox:
    def __init__(self) -> None:
        self.drafts: list[OutboxDraft] = []

    async def add(self, draft: OutboxDraft) -> None:
        self.drafts.append(draft)


class _FakeUow:
    def __init__(
        self, rules: list[BusinessRule], identities: list[ContactIdentity] | None = None
    ) -> None:
        self.rules = _FakeRules(rules)
        self.contact_identities = _FakeContactIdentities(identities)
        self.inbox = _FakeInbox()
        self.conversations = _FakeConversations()
        self.executions = _FakeExecutions()
        self.outbox = _FakeOutbox()
        self.commits = 0

    async def __aenter__(self) -> _FakeUow:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def commit(self) -> None:
        self.commits += 1


class _FakeFactory:
    def __init__(self, uow: _FakeUow) -> None:
        self._uow = uow

    def __call__(self) -> _FakeUow:
        return self._uow


def _message(text: str = "hola", sender: str = "573001112233@s.whatsapp.net") -> IncomingMessage:
    return IncomingMessage(
        message_id="msg-1",
        tenant_id="acme",
        session_id="main",
        conversation_id=sender,
        sender=sender,
        text=text,
        message_type="text",
        occurred_at=datetime.now(UTC),
    )


async def test_set_state_action_completes_without_outbox_command() -> None:
    rule = BusinessRule(
        tenant_id="acme",
        name="mark-interested",
        conditions=(Condition("text", ConditionOperator.CONTAINS, "hola"),),
        actions=(RuleAction(ActionType.SET_STATE, {"state": {"stage": "greeting"}}),),
    )
    uow = _FakeUow([rule])
    result = await ProcessIncomingMessageService(_FakeFactory(uow)).execute(
        _message(), correlation_id="corr-1"
    )

    assert result.actions_created == 1
    assert uow.outbox.drafts == []
    assert uow.conversations.state == {"stage": "greeting"}
    assert uow.executions.rows[0]["status"] == "COMPLETED"


async def test_send_text_action_creates_command_and_marks_pending() -> None:
    rule = BusinessRule(
        tenant_id="acme",
        name="reply",
        conditions=(Condition("text", ConditionOperator.CONTAINS, "hola"),),
        actions=(RuleAction(ActionType.SEND_TEXT, {"text": "Hola {{ sender }}"}),),
    )
    uow = _FakeUow([rule])
    result = await ProcessIncomingMessageService(_FakeFactory(uow)).execute(
        _message(), correlation_id="corr-1"
    )

    assert result.actions_created == 1
    assert len(uow.outbox.drafts) == 1
    assert uow.outbox.drafts[0].routing_key == "whatsapp.message.send.v1"
    assert uow.executions.rows[0]["status"] == "ACTIONS_PENDING"


async def test_lid_sender_creates_send_command_to_configured_phone_jid() -> None:
    lid_jid = "99132626702366@lid"
    phone_jid = "573243744739@s.whatsapp.net"
    identity = ContactIdentity(
        tenant_id="acme", session_id="main", lid_jid=lid_jid, phone_jid=phone_jid
    )
    rule = BusinessRule(
        tenant_id="acme",
        name="reply",
        conditions=(Condition("sender", ConditionOperator.EQUALS, phone_jid),),
        actions=(RuleAction(ActionType.SEND_TEXT, {"text": "Hola {{ sender }}"}),),
    )
    uow = _FakeUow([rule], [identity])

    result = await ProcessIncomingMessageService(_FakeFactory(uow)).execute(
        _message(sender=lid_jid), correlation_id="corr-1"
    )

    assert result.actions_created == 1
    assert uow.outbox.drafts[0].envelope.payload["to"] == phone_jid
    assert uow.outbox.drafts[0].envelope.payload["text"] == f"Hola {phone_jid}"
    assert uow.executions.rows[0]["conversation_id"] == phone_jid
