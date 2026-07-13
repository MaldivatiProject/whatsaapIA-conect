from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from whatsaap_backend.application.contracts import (
    OutboxDraft,
    ScriptRunResult,
    ScriptSandboxUnavailableError,
)
from whatsaap_backend.application.services import (
    DEFAULT_RUN_SCRIPT_ACK_TEXT,
    ProcessIncomingMessageService,
)
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

    async def update_status(
        self, *, tenant_id: str, execution_id: Any, status: str, metadata_patch: dict[str, Any]
    ) -> bool:
        for row in self.rows:
            if row["tenant_id"] == tenant_id and row["execution_id"] == execution_id:
                row["status"] = status
                row["input_metadata"] = {**row["input_metadata"], **metadata_patch}
                return True
        return False


class _FakeOutbox:
    def __init__(self) -> None:
        self.drafts: list[OutboxDraft] = []

    async def add(self, draft: OutboxDraft) -> None:
        self.drafts.append(draft)


class _FakeBusinessMessages:
    def __init__(self) -> None:
        self.added: list[BusinessMessage] = []

    async def add(self, message: BusinessMessage) -> BusinessMessage:
        self.added.append(message)
        return message


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
        self.business_messages = _FakeBusinessMessages()
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
        self, *, script_source: str, input_payload: dict[str, Any]
    ) -> ScriptRunResult:
        self.calls.append({"script_source": script_source, "input_payload": input_payload})
        if self._raise_unavailable:
            raise ScriptSandboxUnavailableError("sandbox not verified")
        return self._result


def _script_rule(
    script: str = "def handle(message):\n    return {}", ack_text: str = "off"
) -> BusinessRule:
    # ack_text="off" by default so existing tests can assert on the
    # script's own outbox drafts without the immediate ack in the way —
    # the ack itself is covered by its own tests below.
    return BusinessRule(
        tenant_id="acme",
        name="run-script-rule",
        category="traslado_tienda",
        conditions=(Condition("text", ConditionOperator.CONTAINS, "hola"),),
        actions=(RuleAction(ActionType.RUN_SCRIPT, {"script": script, "ack_text": ack_text}),),
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


async def test_run_script_action_persists_business_data() -> None:
    uow = _FakeUow([_script_rule()])
    fake_sandbox = _FakeScriptSandbox(
        ScriptRunResult(ok=True, business_data={"PROMOTOR": "WOMER", "CEDULA": "1023031587"})
    )

    result = await ProcessIncomingMessageService(
        _FakeFactory(uow), script_sandbox=fake_sandbox
    ).execute(_message(), correlation_id="corr-1")

    assert result.actions_created == 1
    assert len(uow.business_messages.added) == 1
    added = uow.business_messages.added[0]
    assert added.business_category == "traslado_tienda"
    assert added.metadata == {"PROMOTOR": "WOMER", "CEDULA": "1023031587"}
    assert uow.outbox.drafts == []  # no reply_text was returned
    assert uow.executions.rows[0]["status"] == "COMPLETED"  # no send command queued


async def test_run_script_action_queues_reply_command() -> None:
    uow = _FakeUow([_script_rule()])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True, reply_text="Gracias, procesando."))

    result = await ProcessIncomingMessageService(
        _FakeFactory(uow), script_sandbox=fake_sandbox
    ).execute(_message(), correlation_id="corr-1")

    assert result.actions_created == 1
    assert uow.business_messages.added == []
    assert len(uow.outbox.drafts) == 1
    assert uow.outbox.drafts[0].envelope.payload["text"] == "Gracias, procesando."
    assert uow.executions.rows[0]["status"] == "ACTIONS_PENDING"


async def test_run_script_sandbox_unavailable_does_not_raise() -> None:
    uow = _FakeUow([_script_rule()])
    fake_sandbox = _FakeScriptSandbox(raise_unavailable=True)

    result = await ProcessIncomingMessageService(
        _FakeFactory(uow), script_sandbox=fake_sandbox
    ).execute(_message(), correlation_id="corr-1")

    assert result.actions_created == 1
    assert uow.business_messages.added == []
    assert uow.outbox.drafts == []


async def test_run_script_failure_does_not_persist_or_queue_reply() -> None:
    uow = _FakeUow([_script_rule()])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=False, error="ValueError: bad format"))

    await ProcessIncomingMessageService(_FakeFactory(uow), script_sandbox=fake_sandbox).execute(
        _message(), correlation_id="corr-1"
    )

    assert uow.business_messages.added == []
    assert uow.outbox.drafts == []


async def test_run_script_sends_default_ack_before_script_result() -> None:
    uow = _FakeUow([_script_rule(ack_text="")])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True, reply_text="Listo."))

    await ProcessIncomingMessageService(_FakeFactory(uow), script_sandbox=fake_sandbox).execute(
        _message(), correlation_id="corr-1"
    )

    # The ack must be enqueued (and its transaction committed) before the
    # script even runs, so it reaches WhatsApp while the script is still
    # going — that ordering is the whole point of this feature.
    assert uow.outbox.drafts[0].envelope.payload["text"] == DEFAULT_RUN_SCRIPT_ACK_TEXT
    assert uow.outbox.drafts[1].envelope.payload["text"] == "Listo."
    assert uow.commits == 2


async def test_run_script_ack_uses_custom_text_and_templates() -> None:
    uow = _FakeUow([_script_rule(ack_text="Un momento {{ push_name }}...")])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True))

    await ProcessIncomingMessageService(_FakeFactory(uow), script_sandbox=fake_sandbox).execute(
        _message(), correlation_id="corr-1"
    )

    assert len(uow.outbox.drafts) == 1
    assert uow.outbox.drafts[0].envelope.payload["text"] == "Un momento ..."


async def test_run_script_ack_can_reference_category_and_correo() -> None:
    uow = _FakeUow([_script_rule(ack_text="{{ category }}: {{ correo }}")])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True))

    await ProcessIncomingMessageService(_FakeFactory(uow), script_sandbox=fake_sandbox).execute(
        _message(text="hola CORREO jesus.quinonestem@movilpt.co"), correlation_id="corr-1"
    )

    assert len(uow.outbox.drafts) == 1
    assert (
        uow.outbox.drafts[0].envelope.payload["text"]
        == "traslado_tienda: jesus.quinonestem@movilpt.co"
    )


async def test_run_script_ack_off_sends_nothing_upfront() -> None:
    uow = _FakeUow([_script_rule(ack_text="off")])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=True))

    await ProcessIncomingMessageService(_FakeFactory(uow), script_sandbox=fake_sandbox).execute(
        _message(), correlation_id="corr-1"
    )

    assert uow.outbox.drafts == []


async def test_run_script_ack_is_sent_even_when_script_later_fails() -> None:
    uow = _FakeUow([_script_rule(ack_text="")])
    fake_sandbox = _FakeScriptSandbox(ScriptRunResult(ok=False, error="boom"))

    await ProcessIncomingMessageService(_FakeFactory(uow), script_sandbox=fake_sandbox).execute(
        _message(), correlation_id="corr-1"
    )

    assert len(uow.outbox.drafts) == 1
    assert uow.outbox.drafts[0].envelope.payload["text"] == DEFAULT_RUN_SCRIPT_ACK_TEXT
