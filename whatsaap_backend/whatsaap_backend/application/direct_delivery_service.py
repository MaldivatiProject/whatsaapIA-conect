"""Phase 1 message processing: evaluate rules and deliver replies synchronously
over HTTP instead of the RabbitMQ whatsapp.commands path used by
ProcessIncomingMessageService (services.py). Dedup (inbox), conversation state
and execution audit are reused as-is — only the SEND_TEXT transport differs.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, replace
from typing import Any
from uuid import uuid4

import structlog

from whatsaap_backend.config import Settings, get_settings
from whatsaap_backend.domain.models import (
    ActionType,
    BusinessMessage,
    BusinessMessageOrigin,
    BusinessMessageStatus,
    BusinessRule,
    IncomingMessage,
    MessageAttachment,
    RuleAction,
    RuleMatch,
)
from whatsaap_backend.domain.rule_engine import RuleEvaluator, render_template
from whatsaap_backend.infrastructure.integrations.connector_client import ConnectorDeliveryError

from .bulk_csv import (
    CsvParseError,
    build_traslado_text,
    format_bulk_summary,
    is_csv_attachment,
    parse_traslado_csv,
)
from .contracts import ScriptRunResult, ScriptSandboxUnavailableError, SecretResolutionError
from .ports import MessageSenderPort, ScriptSandboxPort, UnitOfWorkFactory
from .query_traslado import (
    DEFAULT_QUERY_BUSINESS_CATEGORY,
    SOLICITADO_AT_METADATA_KEY,
    build_traslado_query_reply,
)
from .services import (
    DEFAULT_RUN_SCRIPT_ACK_TEXT,
    build_script_input,
    extract_email,
    message_template_context,
    resolve_action_secrets,
    resolve_message_identity,
)

logger = structlog.get_logger(__name__)


@dataclass(frozen=True, slots=True)
class DirectDeliveryResult:
    duplicate: bool
    execution_id: str | None
    matched_rule_ids: tuple[str, ...] = ()
    actions_sent: int = 0
    delivery_errors: tuple[str, ...] = ()


class ProcessIncomingMessageDirectService:
    """Deduplicate, evaluate active rules and deliver SEND_TEXT actions directly
    through whatsapp-connector's REST API (no outbox/AMQP hop)."""

    def __init__(
        self,
        uow_factory: UnitOfWorkFactory,
        sender: MessageSenderPort,
        evaluator: RuleEvaluator | None = None,
        script_sandbox: ScriptSandboxPort | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._uow_factory = uow_factory
        self._sender = sender
        self._evaluator = evaluator or RuleEvaluator()
        self._script_sandbox = script_sandbox
        self._settings = settings or get_settings()

    async def _run_bulk_traslado_direct(
        self,
        uow: Any,
        *,
        message: IncomingMessage,
        match: RuleMatch,
        action: RuleAction,
        rule: BusinessRule | None,
        attachment: MessageAttachment,
    ) -> tuple[int, list[str]]:
        """Direct-delivery counterpart of
        ProcessIncomingMessageService._run_bulk_traslado_action (services.py) —
        same reasoning (reuse the matched RUN_SCRIPT once per CSV row, one
        consolidated summary instead of a per-row reply), adapted to send
        replies synchronously over HTTP instead of via the outbox.

        Caution: unlike the outbox path, there is no "commit now, run scripts
        after" split here — the whole webhook HTTP request stays open for as
        long as every row takes to run. For large uploads under
        WEBHOOK_PROCESSING_MODE=direct this risks the connector's webhook
        call timing out mid-batch; WEBHOOK_PROCESSING_MODE=outbox does not
        have this limitation (Pass 2 runs after the ack is already committed).
        """
        sent = 0
        errors: list[str] = []

        async def _send(text: str) -> None:
            nonlocal sent
            try:
                await self._sender.send_text(
                    session_id=message.session_id,
                    to=message.resolved_reply_to_jid,
                    text=text,
                    quoted_message_id=message.message_id,
                )
                sent += 1
            except ConnectorDeliveryError as error:
                logger.error(
                    "direct_delivery_send_failed",
                    rule_id=str(match.rule_id),
                    status_code=error.status_code,
                )
                errors.append(f"rule={match.rule_id}: {error.detail}")

        try:
            parse_result = parse_traslado_csv(
                attachment, max_rows=self._settings.MAX_CSV_ROWS_PER_UPLOAD
            )
        except CsvParseError as error:
            await _send(f"No pude procesar tu archivo: {error}")
            return sent, errors

        await _send(
            f"Recibimos tu archivo con {len(parse_result.rows)} traslado(s) de tienda. "
            "Te confirmamos con un resumen cuando terminen todos."
        )

        if self._script_sandbox is None:
            logger.error("script_sandbox_not_configured", rule_id=str(match.rule_id))
            await _send("No pude procesar el archivo: el sandbox de scripts no está disponible.")
            return sent, errors

        try:
            secrets = await resolve_action_secrets(uow, message.tenant_id, action)
        except SecretResolutionError as error:
            logger.error(
                "script_secret_missing", rule_id=str(match.rule_id), secret_name=error.name
            )
            await _send(f"No pude procesar el archivo: falta el secreto {error.name}.")
            return sent, errors

        script_source = str(action.params.get("script", ""))
        successes: list[str] = []
        failures: list[str] = []

        for row in parse_result.rows:
            row_message = replace(
                message,
                text=build_traslado_text(row),
                message_id=f"{message.message_id}:row-{row.index}",
            )
            try:
                result = await self._script_sandbox.run(
                    script_source=script_source,
                    input_payload=build_script_input(row_message, rule),
                    secrets=secrets,
                )
            except ScriptSandboxUnavailableError:
                logger.error(
                    "script_sandbox_unavailable", rule_id=str(match.rule_id), row=row.index
                )
                failures.append(f"Fila {row.index} ({row.correo}): sandbox no disponible")
                continue

            if not result.ok:
                logger.warning(
                    "bulk_row_failed", rule_id=str(match.rule_id), row=row.index, error=result.error
                )
                error_detail = result.error or "error desconocido"
                failures.append(f"Fila {row.index} ({row.correo}): {error_detail}")
                continue

            if result.business_data is not None:
                await uow.business_messages.add(
                    BusinessMessage(
                        tenant_id=message.tenant_id,
                        source_origin=BusinessMessageOrigin.WHATSAPP,
                        business_category=rule.category if rule else "general",
                        metadata={
                            **result.business_data,
                            SOLICITADO_AT_METADATA_KEY: message.occurred_at.isoformat(),
                        },
                        session_id=message.session_id,
                        conversation_id=message.conversation_id,
                        message_id=row_message.message_id,
                        raw_sender=message.raw_sender or message.sender,
                        sender=message.sender,
                        reply_to_jid=message.resolved_reply_to_jid,
                        raw_text_hash=hashlib.sha256(row_message.text.encode("utf-8")).hexdigest(),
                        processing_status=BusinessMessageStatus.PARSED,
                        created_by=f"rule:{match.rule_id}",
                    )
                )

            resultado = str((result.business_data or {}).get("resultado", ""))
            if resultado in {"GUARDADO", "YA_CORRECTA"}:
                successes.append(f"Fila {row.index} ({row.correo})")
            else:
                failures.append(f"Fila {row.index} ({row.correo}): {resultado or 'sin resultado'}")

        await _send(format_bulk_summary(successes, failures, parse_result.skipped))
        return sent, errors

    async def execute(self, message: IncomingMessage) -> DirectDeliveryResult:
        execution_id = uuid4()
        async with self._uow_factory() as uow:
            registered = await uow.inbox.register(
                message.message_id, "whatsapp.message.received", message.tenant_id
            )
            if not registered:
                await uow.commit()
                return DirectDeliveryResult(duplicate=True, execution_id=None)

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
            template_context = message_template_context(message)

            next_state = dict(state)
            actions_sent = 0
            delivery_errors: list[str] = []

            for match in evaluation.matches:
                for action in match.actions:
                    if action.type is ActionType.SEND_TEXT:
                        text = render_template(str(action.params.get("text", "")), template_context)
                        try:
                            await self._sender.send_text(
                                session_id=message.session_id,
                                to=message.resolved_reply_to_jid,
                                text=text,
                                quoted_message_id=message.message_id,
                            )
                            actions_sent += 1
                        except ConnectorDeliveryError as error:
                            logger.error(
                                "direct_delivery_send_failed",
                                execution_id=str(execution_id),
                                rule_id=str(match.rule_id),
                                status_code=error.status_code,
                            )
                            delivery_errors.append(f"rule={match.rule_id}: {error.detail}")
                    elif action.type is ActionType.SET_STATE:
                        configured = action.params.get("state", {})
                        if not isinstance(configured, dict):
                            raise ValueError("set_state action requires an object in params.state")
                        next_state.update(configured)
                    elif action.type is ActionType.NOOP:
                        pass
                    elif action.type is ActionType.RUN_SCRIPT:
                        rule = rule_lookup.get(str(match.rule_id))
                        attachment = message.attachment

                        if attachment is not None and is_csv_attachment(attachment):
                            sent, bulk_errors = await self._run_bulk_traslado_direct(
                                uow,
                                message=message,
                                match=match,
                                action=action,
                                rule=rule,
                                attachment=attachment,
                            )
                            actions_sent += sent
                            delivery_errors.extend(bulk_errors)
                            continue

                        ack_text_raw = str(action.params.get("ack_text") or "").strip()
                        if ack_text_raw.lower() != "off":
                            ack_context = {
                                **template_context,
                                "category": rule.category if rule else "general",
                                "correo": extract_email(message.text),
                            }
                            ack_text = render_template(
                                ack_text_raw or DEFAULT_RUN_SCRIPT_ACK_TEXT, ack_context
                            )
                            try:
                                await self._sender.send_text(
                                    session_id=message.session_id,
                                    to=message.resolved_reply_to_jid,
                                    text=ack_text,
                                    quoted_message_id=message.message_id,
                                )
                                actions_sent += 1
                            except ConnectorDeliveryError as error:
                                logger.error(
                                    "direct_delivery_send_failed",
                                    execution_id=str(execution_id),
                                    rule_id=str(match.rule_id),
                                    status_code=error.status_code,
                                )
                                delivery_errors.append(f"rule={match.rule_id}: {error.detail}")

                        script_source = str(action.params.get("script", ""))
                        if self._script_sandbox is None:
                            logger.error(
                                "script_sandbox_not_configured", rule_id=str(match.rule_id)
                            )
                            result = ScriptRunResult(ok=False, error="sandbox_not_configured")
                        else:
                            try:
                                secrets = await resolve_action_secrets(
                                    uow, message.tenant_id, action
                                )
                            except SecretResolutionError as error:
                                logger.error(
                                    "script_secret_missing",
                                    rule_id=str(match.rule_id),
                                    secret_name=error.name,
                                )
                                result = ScriptRunResult(
                                    ok=False, error=f"missing_secret:{error.name}"
                                )
                            else:
                                try:
                                    result = await self._script_sandbox.run(
                                        script_source=script_source,
                                        input_payload=build_script_input(message, rule),
                                        secrets=secrets,
                                    )
                                except ScriptSandboxUnavailableError:
                                    logger.error(
                                        "script_sandbox_unavailable", rule_id=str(match.rule_id)
                                    )
                                    result = ScriptRunResult(
                                        ok=False, error="sandbox_unavailable"
                                    )

                        if result.ok:
                            if result.business_data is not None:
                                await uow.business_messages.add(
                                    BusinessMessage(
                                        tenant_id=message.tenant_id,
                                        source_origin=BusinessMessageOrigin.WHATSAPP,
                                        business_category=rule.category if rule else "general",
                                        metadata={
                                            **result.business_data,
                                            SOLICITADO_AT_METADATA_KEY: (
                                                message.occurred_at.isoformat()
                                            ),
                                        },
                                        session_id=message.session_id,
                                        conversation_id=message.conversation_id,
                                        message_id=message.message_id,
                                        raw_sender=message.raw_sender or message.sender,
                                        sender=message.sender,
                                        reply_to_jid=message.resolved_reply_to_jid,
                                        raw_text_hash=hashlib.sha256(
                                            message.text.encode("utf-8")
                                        ).hexdigest(),
                                        processing_status=BusinessMessageStatus.PARSED,
                                        created_by=f"rule:{match.rule_id}",
                                    )
                                )
                            if result.reply_text:
                                try:
                                    await self._sender.send_text(
                                        session_id=message.session_id,
                                        to=message.resolved_reply_to_jid,
                                        text=result.reply_text,
                                        quoted_message_id=message.message_id,
                                    )
                                    actions_sent += 1
                                except ConnectorDeliveryError as error:
                                    logger.error(
                                        "direct_delivery_send_failed",
                                        execution_id=str(execution_id),
                                        rule_id=str(match.rule_id),
                                        status_code=error.status_code,
                                    )
                                    delivery_errors.append(f"rule={match.rule_id}: {error.detail}")
                        else:
                            logger.warning(
                                "script_run_failed", rule_id=str(match.rule_id), error=result.error
                            )
                    elif action.type is ActionType.QUERY_TRASLADO_STATUS:
                        correo = extract_email(message.text)
                        if not correo:
                            text = (
                                "No pude identificar el correo en tu mensaje. Escribí, por "
                                "ejemplo:\nCONSULTAR TRASLADO TIENDA\nCORREO tu@correo.com"
                            )
                        else:
                            business_category = str(
                                action.params.get("business_category")
                                or DEFAULT_QUERY_BUSINESS_CATEGORY
                            )
                            records = await uow.business_messages.find_recent_by_correo(
                                message.tenant_id, business_category, correo
                            )
                            text = build_traslado_query_reply(records, correo)
                        try:
                            await self._sender.send_text(
                                session_id=message.session_id,
                                to=message.resolved_reply_to_jid,
                                text=text,
                                quoted_message_id=message.message_id,
                            )
                            actions_sent += 1
                        except ConnectorDeliveryError as error:
                            logger.error(
                                "direct_delivery_send_failed",
                                execution_id=str(execution_id),
                                rule_id=str(match.rule_id),
                                status_code=error.status_code,
                            )
                            delivery_errors.append(f"rule={match.rule_id}: {error.detail}")

            if next_state != state:
                await uow.conversations.save(
                    message.tenant_id,
                    message.session_id,
                    message.conversation_id,
                    next_state,
                    state_version,
                )

            status = "FAILED" if delivery_errors else "COMPLETED"
            await uow.executions.add(
                execution_id=execution_id,
                tenant_id=message.tenant_id,
                session_id=message.session_id,
                conversation_id=message.conversation_id,
                message_id=message.message_id,
                matched_rule_ids=matched_ids,
                status=status,
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
                    "actions_sent": actions_sent,
                },
            )
            await uow.inbox.mark_processed(message.message_id)
            await uow.commit()

            return DirectDeliveryResult(
                duplicate=False,
                execution_id=str(execution_id),
                matched_rule_ids=tuple(matched_ids),
                actions_sent=actions_sent,
                delivery_errors=tuple(delivery_errors),
            )
