from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from whatsaap_backend.application.contracts import ScriptRunResult, ScriptSandboxUnavailableError
from whatsaap_backend.application.direct_delivery_service import ProcessIncomingMessageDirectService
from whatsaap_backend.application.services import DEFAULT_RUN_SCRIPT_ACK_TEXT
from whatsaap_backend.domain.models import (
    ActionType,
    BusinessMessage,
    BusinessRule,
    Condition,
    ConditionOperator,
    ContactIdentity,
    IncomingMessage,
    RuleAction,
)
from whatsaap_backend.infrastructure.integrations.connector_client import ConnectorDeliveryError


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


class _FakeBusinessMessages:
    def __init__(self) -> None:
        self.added: list[BusinessMessage] = []

    async def add(self, message: BusinessMessage) -> BusinessMessage:
        self.added.append(message)
        return message


class _FakeSecrets:
    def __init__(self, values: dict[str, str] | None = None) -> None:
        self._values = values or {}

    async def get_value(self, tenant_id: str, name: str) -> str | None:
        del tenant_id
        return self._values.get(name)


class _FakeUow:
    def __init__(
        self,
        rules: list[BusinessRule],
        identities: list[ContactIdentity] | None = None,
        secrets: dict[str, str] | None = None,
    ) -> None:
        self.rules = _FakeRules(rules)
        self.contact_identities = _FakeContactIdentities(identities)
        self.inbox = _FakeInbox()
        self.conversations = _FakeConversations()
        self.executions = _FakeExecutions()
        self.business_messages = _FakeBusinessMessages()
        self.secrets = _FakeSecrets(secrets)
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


class _FakeSender:
    """Fake MessageSenderPort. `fail_with`, if set, is raised on every call."""

    def __init__(self, fail_with: ConnectorDeliveryError | None = None) -> None:
        self.sent: list[dict[str, Any]] = []
        self._fail_with = fail_with

    async def send_text(
        self, *, session_id: str, to: str, text: str, quoted_message_id: str | None = None
    ) -> str:
        if self._fail_with is not None:
            raise self._fail_with
        self.sent.append(
            {
                "session_id": session_id,
                "to": to,
                "text": text,
                "quoted_message_id": quoted_message_id,
            }
        )
        return "3EB0FAKE"


class _FakeScriptSandbox:
    """Fake ScriptSandboxPort. Never actually runs anything — the real
    sandbox mechanism (a real subprocess with rlimits) is covered separately in
    tests/infrastructure/test_subprocess_script_sandbox.py.
    """

    def __init__(
        self, result: ScriptRunResult | None = None, raise_unavailable: bool = False
    ) -> None:
        self._result = result if result is not None else ScriptRunResult(ok=True)
        self._raise_unavailable = raise_unavailable
        self.calls: list[dict[str, Any]] = []

    async def run(
        self, *, script_source: str, input_payload: dict[str, Any], secrets: dict[str, str]
    ) -> ScriptRunResult:
        self.calls.append(
            {"script_source": script_source, "input_payload": input_payload, "secrets": secrets}
        )
        if self._raise_unavailable:
            raise ScriptSandboxUnavailableError("sandbox not verified")
        return self._result


def _script_rule(
    target_sender: str,
    script: str = "def handle(message):\n    return {}",
    ack_text: str = "off",
    secrets: list[str] | None = None,
) -> BusinessRule:
    # ack_text="off" by default so existing tests can assert on the
    # script's own sends without the immediate ack in the way — the ack
    # itself is covered by its own tests below.
    params: dict[str, Any] = {"script": script, "ack_text": ack_text}
    if secrets is not None:
        params["secrets"] = secrets
    return BusinessRule(
        tenant_id="acme",
        name="run-script-rule",
        category="traslado_tienda",
        conditions=(Condition("sender", ConditionOperator.EQUALS, target_sender),),
        actions=(RuleAction(ActionType.RUN_SCRIPT, params),),
    )


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


def _reply_rule(
    target_sender: str, reply_text: str = "Procesando tu solicitud, {{ sender }}"
) -> BusinessRule:
    return BusinessRule(
        tenant_id="acme",
        name="auto-reply",
        conditions=(Condition("sender", ConditionOperator.EQUALS, target_sender),),
        actions=(RuleAction(ActionType.SEND_TEXT, {"text": reply_text}),),
    )


async def test_matching_rule_sends_rendered_reply_through_connector() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_reply_rule(sender)])
    fake_sender = _FakeSender()

    result = await ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender).execute(
        _message(sender=sender)
    )

    assert result.duplicate is False
    assert result.actions_sent == 1
    assert result.delivery_errors == ()
    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["to"] == sender
    assert fake_sender.sent[0]["text"] == f"Procesando tu solicitud, {sender}"
    assert uow.executions.rows[0]["status"] == "COMPLETED"
    assert uow.inbox.processed == ["msg-1"]


async def test_lid_sender_matches_phone_rule_and_replies_to_phone_jid() -> None:
    lid_jid = "99132626702366@lid"
    phone_jid = "573243744739@s.whatsapp.net"
    identity = ContactIdentity(
        tenant_id="acme", session_id="main", lid_jid=lid_jid, phone_jid=phone_jid
    )
    uow = _FakeUow([_reply_rule(phone_jid, "Hola {{ sender }} / raw {{ raw_sender }}")], [identity])
    fake_sender = _FakeSender()

    result = await ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender).execute(
        _message(sender=lid_jid)
    )

    assert result.actions_sent == 1
    assert fake_sender.sent[0]["to"] == phone_jid
    assert fake_sender.sent[0]["text"] == f"Hola {phone_jid} / raw {lid_jid}"
    assert uow.executions.rows[0]["conversation_id"] == phone_jid
    assert uow.executions.rows[0]["input_metadata"]["sender_aliases"] == [phone_jid, lid_jid]


async def test_non_matching_rule_does_not_send() -> None:
    uow = _FakeUow([_reply_rule("other-number@s.whatsapp.net")])
    fake_sender = _FakeSender()

    result = await ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender).execute(
        _message(sender="573243744739@s.whatsapp.net")
    )

    assert result.actions_sent == 0
    assert fake_sender.sent == []
    assert uow.executions.rows[0]["status"] == "COMPLETED"


async def test_duplicate_message_id_is_not_processed_twice() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_reply_rule(sender)])
    fake_sender = _FakeSender()
    service = ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender)

    first = await service.execute(_message(sender=sender))
    second = await service.execute(_message(sender=sender))

    assert first.duplicate is False
    assert second.duplicate is True
    assert len(fake_sender.sent) == 1  # not sent twice


async def test_connector_delivery_failure_is_recorded_but_does_not_raise() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_reply_rule(sender)])
    fake_sender = _FakeSender(fail_with=ConnectorDeliveryError(409, "SessionNotConnectedError"))

    result = await ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender).execute(
        _message(sender=sender)
    )

    assert result.actions_sent == 0
    assert len(result.delivery_errors) == 1
    assert "SessionNotConnectedError" in result.delivery_errors[0]
    assert uow.executions.rows[0]["status"] == "FAILED"
    # dedup/audit still committed even though the WhatsApp send failed
    assert uow.commits == 1
    assert uow.inbox.processed == ["msg-1"]


async def test_is_group_condition_matches_group_messages() -> None:
    rule = BusinessRule(
        tenant_id="acme",
        name="group-notice",
        conditions=(Condition("is_group", ConditionOperator.EQUALS, True),),
        actions=(RuleAction(ActionType.SEND_TEXT, {"text": "Grupo detectado"}),),
    )
    uow = _FakeUow([rule])
    fake_sender = _FakeSender()
    message = IncomingMessage(
        message_id="msg-group",
        tenant_id="acme",
        session_id="main",
        conversation_id="123-456@g.us",
        sender="123-456@g.us",
        text="hola a todos",
        message_type="text",
        occurred_at=datetime.now(UTC),
        is_group=True,
    )

    result = await ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender).execute(
        message
    )

    assert result.actions_sent == 1
    assert fake_sender.sent[0]["to"] == "123-456@g.us"


async def test_run_script_action_persists_business_data() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender)])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(
        ScriptRunResult(ok=True, business_data={"PROMOTOR": "WOMER", "CEDULA": "1023031587"})
    )

    await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert len(uow.business_messages.added) == 1
    added = uow.business_messages.added[0]
    assert added.business_category == "traslado_tienda"
    assert added.metadata == {"PROMOTOR": "WOMER", "CEDULA": "1023031587"}
    assert added.sender == sender
    assert fake_sender.sent == []  # no reply_text was returned, nothing sent
    assert len(fake_sandbox.calls) == 1
    rule_payload = fake_sandbox.calls[0]["input_payload"]["message"]["rule"]
    assert rule_payload["category"] == "traslado_tienda"


async def test_run_script_action_sends_reply_text() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender)])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True, reply_text="Gracias, procesando."))

    await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert uow.business_messages.added == []  # no business_data returned, nothing persisted
    assert len(fake_sender.sent) == 1
    assert fake_sender.sent[0]["text"] == "Gracias, procesando."


async def test_run_script_resolves_declared_secrets_into_sandbox_env() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow(
        [_script_rule(sender, secrets=["STRIPE_API_KEY"])], secrets={"STRIPE_API_KEY": "sk_x"}
    )
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True))

    await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert fake_sandbox.calls[0]["secrets"] == {"STRIPE_API_KEY": "sk_x"}


async def test_run_script_fails_closed_when_declared_secret_is_missing() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender, secrets=["MISSING_KEY"])])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True))

    result = await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert result.duplicate is False
    assert fake_sandbox.calls == []  # never invoked — fails before reaching the sandbox
    assert uow.business_messages.added == []


async def test_run_script_sandbox_unavailable_does_not_raise() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender)])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(raise_unavailable=True)

    result = await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert result.duplicate is False
    assert uow.business_messages.added == []
    assert fake_sender.sent == []
    # dispatch failure isn't a delivery error
    assert uow.executions.rows[0]["status"] == "COMPLETED"


async def test_run_script_failure_does_not_persist_or_reply() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender)])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=False, error="ValueError: bad format"))

    await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert uow.business_messages.added == []
    assert fake_sender.sent == []


async def test_run_script_sends_default_ack_before_script_result() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender, ack_text="")])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True, reply_text="Listo."))

    await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert len(fake_sender.sent) == 2
    assert fake_sender.sent[0]["text"] == DEFAULT_RUN_SCRIPT_ACK_TEXT
    assert fake_sender.sent[1]["text"] == "Listo."


async def test_run_script_ack_off_sends_nothing_upfront() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender, ack_text="off")])
    fake_sender = _FakeSender()
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True))

    await ProcessIncomingMessageDirectService(
        _FakeFactory(uow), fake_sender, script_sandbox=fake_sandbox
    ).execute(_message(sender=sender))

    assert fake_sender.sent == []


async def test_run_script_without_sandbox_configured_does_not_raise() -> None:
    sender = "573243744739@s.whatsapp.net"
    uow = _FakeUow([_script_rule(sender)])
    fake_sender = _FakeSender()

    result = await ProcessIncomingMessageDirectService(_FakeFactory(uow), fake_sender).execute(
        _message(sender=sender)
    )

    assert result.duplicate is False
    assert uow.business_messages.added == []
