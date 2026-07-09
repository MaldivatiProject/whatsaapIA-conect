"""SQLAlchemy repository implementations."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import UUID

from sqlalchemy import or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from whatsaap_backend.application.contracts import OutboxDraft, OutboxRecord
from whatsaap_backend.domain.models import (
    ActionType,
    BusinessMessage,
    BusinessMessageOrigin,
    BusinessMessageStatus,
    BusinessRule,
    Condition,
    ConditionOperator,
    ContactIdentity,
    RuleAction,
)

from .models import (
    BusinessMessageModel,
    BusinessRuleModel,
    ContactIdentityModel,
    ConversationStateModel,
    InboxMessageModel,
    OutboxMessageModel,
    RuleExecutionModel,
)


def _rowcount(result: Any) -> int:
    return int(cast(CursorResult[Any], result).rowcount or 0)


def _metadata_int(metadata: dict[str, Any], *keys: str) -> int:
    for key in keys:
        value = metadata.get(key)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)
    return 0


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None]


class SqlAlchemyRuleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @staticmethod
    def _to_domain(model: BusinessRuleModel) -> BusinessRule:
        return BusinessRule(
            uuid=model.uuid_business_rules,
            tenant_id=model.tenant_id,
            name=model.name,
            description=model.description,
            category=model.category,
            session_id=model.session_id,
            priority=model.priority,
            enabled=model.enabled,
            stop_on_match=model.stop_on_match,
            version=model.version,
            conditions=tuple(
                Condition(
                    field=item["field"],
                    operator=ConditionOperator(item["operator"]),
                    value=item.get("value"),
                    case_sensitive=bool(item.get("case_sensitive", False)),
                )
                for item in model.conditions_json
            ),
            actions=tuple(
                RuleAction(type=ActionType(item["type"]), params=dict(item.get("params", {})))
                for item in model.actions_json
            ),
            creation_date=model.creation_date,
            expiration_date=model.expiration_date,
        )

    @staticmethod
    def _conditions(rule: BusinessRule) -> list[dict[str, Any]]:
        return [
            {
                "field": item.field,
                "operator": item.operator.value,
                "value": item.value,
                "case_sensitive": item.case_sensitive,
            }
            for item in rule.conditions
        ]

    @staticmethod
    def _actions(rule: BusinessRule) -> list[dict[str, Any]]:
        return [{"type": item.type.value, "params": item.params} for item in rule.actions]

    async def list_active(
        self, tenant_id: str, session_id: str | None = None
    ) -> list[BusinessRule]:
        statement = (
            select(BusinessRuleModel)
            .where(
                BusinessRuleModel.tenant_id == tenant_id,
                BusinessRuleModel.enabled.is_(True),
                BusinessRuleModel.expiration_date.is_(None),
            )
            .order_by(BusinessRuleModel.priority, BusinessRuleModel.uuid_business_rules)
        )
        if session_id is not None:
            statement = statement.where(
                (BusinessRuleModel.session_id.is_(None))
                | (BusinessRuleModel.session_id == session_id)
            )
        models = (await self._session.scalars(statement)).all()
        return [self._to_domain(model) for model in models]

    async def list_all(self, tenant_id: str) -> list[BusinessRule]:
        models = (
            await self._session.scalars(
                select(BusinessRuleModel)
                .where(
                    BusinessRuleModel.tenant_id == tenant_id,
                    BusinessRuleModel.expiration_date.is_(None),
                )
                .order_by(BusinessRuleModel.priority, BusinessRuleModel.creation_date)
            )
        ).all()
        return [self._to_domain(model) for model in models]

    async def get(self, tenant_id: str, rule_id: UUID) -> BusinessRule | None:
        model = await self._session.scalar(
            select(BusinessRuleModel).where(
                BusinessRuleModel.tenant_id == tenant_id,
                BusinessRuleModel.uuid_business_rules == rule_id,
                BusinessRuleModel.expiration_date.is_(None),
            )
        )
        return self._to_domain(model) if model else None

    async def add(self, rule: BusinessRule) -> BusinessRule:
        self._session.add(
            BusinessRuleModel(
                uuid_business_rules=rule.uuid,
                tenant_id=rule.tenant_id,
                name=rule.name,
                description=rule.description,
                category=rule.category,
                session_id=rule.session_id,
                priority=rule.priority,
                enabled=rule.enabled,
                stop_on_match=rule.stop_on_match,
                version=rule.version,
                conditions_json=self._conditions(rule),
                actions_json=self._actions(rule),
            )
        )
        await self._session.flush()
        return rule

    async def update(self, rule: BusinessRule) -> BusinessRule:
        result = await self._session.execute(
            update(BusinessRuleModel)
            .where(
                BusinessRuleModel.tenant_id == rule.tenant_id,
                BusinessRuleModel.uuid_business_rules == rule.uuid,
                BusinessRuleModel.expiration_date.is_(None),
            )
            .values(
                name=rule.name,
                description=rule.description,
                category=rule.category,
                session_id=rule.session_id,
                priority=rule.priority,
                enabled=rule.enabled,
                stop_on_match=rule.stop_on_match,
                version=BusinessRuleModel.version + 1,
                conditions_json=self._conditions(rule),
                actions_json=self._actions(rule),
                updated_at=datetime.now(UTC),
            )
        )
        if _rowcount(result) == 0:
            raise LookupError("Rule not found")
        rule.version += 1
        return rule

    async def soft_delete(self, tenant_id: str, rule_id: UUID) -> bool:
        result = await self._session.execute(
            update(BusinessRuleModel)
            .where(
                BusinessRuleModel.tenant_id == tenant_id,
                BusinessRuleModel.uuid_business_rules == rule_id,
                BusinessRuleModel.expiration_date.is_(None),
            )
            .values(expiration_date=datetime.now(UTC), enabled=False)
        )
        return _rowcount(result) > 0


class SqlAlchemyContactIdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @staticmethod
    def _to_domain(model: ContactIdentityModel) -> ContactIdentity:
        return ContactIdentity(
            uuid=model.uuid_contact_identities,
            tenant_id=model.tenant_id,
            session_id=model.session_id,
            lid_jid=model.lid_jid,
            phone_jid=model.phone_jid,
            display_name=model.display_name,
            enabled=model.enabled,
            creation_date=model.creation_date,
            expiration_date=model.expiration_date,
        )

    async def list(
        self, tenant_id: str, session_id: str | None = None
    ) -> list[ContactIdentity]:
        statement = (
            select(ContactIdentityModel)
            .where(
                ContactIdentityModel.tenant_id == tenant_id,
                ContactIdentityModel.expiration_date.is_(None),
            )
            .order_by(ContactIdentityModel.creation_date.desc())
        )
        if session_id is not None:
            statement = statement.where(
                (ContactIdentityModel.session_id.is_(None))
                | (ContactIdentityModel.session_id == session_id)
            )
        models = (await self._session.scalars(statement)).all()
        return [self._to_domain(model) for model in models]

    async def get(self, tenant_id: str, identity_id: UUID) -> ContactIdentity | None:
        model = await self._session.scalar(
            select(ContactIdentityModel).where(
                ContactIdentityModel.tenant_id == tenant_id,
                ContactIdentityModel.uuid_contact_identities == identity_id,
                ContactIdentityModel.expiration_date.is_(None),
            )
        )
        return self._to_domain(model) if model else None

    async def find_for_jid(
        self, tenant_id: str, session_id: str, jid: str
    ) -> ContactIdentity | None:
        model = await self._session.scalar(
            select(ContactIdentityModel)
            .where(
                ContactIdentityModel.tenant_id == tenant_id,
                ContactIdentityModel.enabled.is_(True),
                ContactIdentityModel.expiration_date.is_(None),
                (ContactIdentityModel.session_id.is_(None))
                | (ContactIdentityModel.session_id == session_id),
                (ContactIdentityModel.lid_jid == jid) | (ContactIdentityModel.phone_jid == jid),
            )
            .order_by(ContactIdentityModel.session_id.is_(None))
            .limit(1)
        )
        return self._to_domain(model) if model else None

    async def add(self, identity: ContactIdentity) -> ContactIdentity:
        existing = await self._session.scalar(
            select(ContactIdentityModel).where(
                ContactIdentityModel.tenant_id == identity.tenant_id,
                ContactIdentityModel.session_id.is_(None)
                if identity.session_id is None
                else ContactIdentityModel.session_id == identity.session_id,
                ContactIdentityModel.lid_jid == identity.lid_jid,
                ContactIdentityModel.expiration_date.is_(None),
            )
        )
        if existing is not None:
            existing.phone_jid = identity.phone_jid
            existing.display_name = identity.display_name
            existing.enabled = identity.enabled
            existing.updated_at = datetime.now(UTC)
            await self._session.flush()
            return self._to_domain(existing)

        model = ContactIdentityModel(
            uuid_contact_identities=identity.uuid,
            tenant_id=identity.tenant_id,
            session_id=identity.session_id,
            lid_jid=identity.lid_jid,
            phone_jid=identity.phone_jid,
            display_name=identity.display_name,
            enabled=identity.enabled,
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_domain(model)

    async def update(self, identity: ContactIdentity) -> ContactIdentity:
        result = await self._session.execute(
            update(ContactIdentityModel)
            .where(
                ContactIdentityModel.tenant_id == identity.tenant_id,
                ContactIdentityModel.uuid_contact_identities == identity.uuid,
                ContactIdentityModel.expiration_date.is_(None),
            )
            .values(
                session_id=identity.session_id,
                lid_jid=identity.lid_jid,
                phone_jid=identity.phone_jid,
                display_name=identity.display_name,
                enabled=identity.enabled,
                updated_at=datetime.now(UTC),
            )
        )
        if _rowcount(result) == 0:
            raise LookupError("Contact identity not found")
        return identity

    async def soft_delete(self, tenant_id: str, identity_id: UUID) -> bool:
        result = await self._session.execute(
            update(ContactIdentityModel)
            .where(
                ContactIdentityModel.tenant_id == tenant_id,
                ContactIdentityModel.uuid_contact_identities == identity_id,
                ContactIdentityModel.expiration_date.is_(None),
            )
            .values(expiration_date=datetime.now(UTC), enabled=False)
        )
        return _rowcount(result) > 0


class SqlAlchemyBusinessMessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @staticmethod
    def _to_domain(model: BusinessMessageModel) -> BusinessMessage:
        return BusinessMessage(
            uuid=model.uuid_business_messages,
            tenant_id=model.tenant_id,
            source_origin=BusinessMessageOrigin(model.source_origin),
            business_category=model.business_category,
            metadata=dict(model.metadata_json),
            source_reference=model.source_reference,
            session_id=model.session_id,
            conversation_id=model.conversation_id,
            message_id=model.message_id,
            raw_sender=model.raw_sender,
            sender=model.sender,
            reply_to_jid=model.reply_to_jid,
            subject=model.subject,
            raw_text_hash=model.raw_text_hash,
            received_at=model.received_at,
            processing_status=BusinessMessageStatus(model.processing_status),
            processed_at=model.processed_at,
            created_by=model.created_by,
            creation_date=model.creation_date,
            expiration_date=model.expiration_date,
        )

    async def add(self, message: BusinessMessage) -> BusinessMessage:
        model = BusinessMessageModel(
            uuid_business_messages=message.uuid,
            tenant_id=message.tenant_id,
            source_origin=message.source_origin.value,
            business_category=message.business_category,
            source_reference=message.source_reference,
            session_id=message.session_id,
            conversation_id=message.conversation_id,
            message_id=message.message_id,
            raw_sender=message.raw_sender,
            sender=message.sender,
            reply_to_jid=message.reply_to_jid,
            subject=message.subject,
            metadata_json=message.metadata,
            raw_text_hash=message.raw_text_hash,
            received_at=message.received_at,
            processing_status=message.processing_status.value,
            processed_at=message.processed_at,
            created_by=message.created_by,
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_domain(model)

    async def list(
        self,
        tenant_id: str,
        *,
        business_category: str | None = None,
        source_origin: str | None = None,
        limit: int = 100,
    ) -> list[BusinessMessage]:
        statement = (
            select(BusinessMessageModel)
            .where(
                BusinessMessageModel.tenant_id == tenant_id,
                BusinessMessageModel.expiration_date.is_(None),
            )
            .order_by(BusinessMessageModel.received_at.desc())
            .limit(limit)
        )
        if business_category is not None:
            statement = statement.where(
                BusinessMessageModel.business_category == business_category
            )
        if source_origin is not None:
            statement = statement.where(BusinessMessageModel.source_origin == source_origin)
        models = (await self._session.scalars(statement)).all()
        return [self._to_domain(model) for model in models]


class SqlAlchemyInboxRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def register(self, message_id: str, message_type: str, tenant_id: str) -> bool:
        result = await self._session.execute(
            pg_insert(InboxMessageModel)
            .values(message_id=message_id, message_type=message_type, tenant_id=tenant_id)
            .on_conflict_do_nothing(index_elements=["message_id"])
        )
        return _rowcount(result) == 1

    async def mark_processed(self, message_id: str) -> None:
        await self._session.execute(
            update(InboxMessageModel)
            .where(InboxMessageModel.message_id == message_id)
            .values(status="PROCESSED", processed_at=datetime.now(UTC))
        )


class SqlAlchemyConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_for_update(
        self, tenant_id: str, session_id: str, conversation_id: str
    ) -> tuple[dict[str, Any], int]:
        model = await self._session.scalar(
            select(ConversationStateModel)
            .where(
                ConversationStateModel.tenant_id == tenant_id,
                ConversationStateModel.session_id == session_id,
                ConversationStateModel.conversation_id == conversation_id,
                ConversationStateModel.expiration_date.is_(None),
            )
            .with_for_update()
        )
        return (dict(model.state_json), model.version) if model else ({}, 0)

    async def save(
        self,
        tenant_id: str,
        session_id: str,
        conversation_id: str,
        state: dict[str, Any],
        expected_version: int,
    ) -> None:
        if expected_version == 0:
            self._session.add(
                ConversationStateModel(
                    tenant_id=tenant_id,
                    session_id=session_id,
                    conversation_id=conversation_id,
                    state_json=state,
                    version=1,
                )
            )
            await self._session.flush()
            return
        result = await self._session.execute(
            update(ConversationStateModel)
            .where(
                ConversationStateModel.tenant_id == tenant_id,
                ConversationStateModel.session_id == session_id,
                ConversationStateModel.conversation_id == conversation_id,
                ConversationStateModel.version == expected_version,
                ConversationStateModel.expiration_date.is_(None),
            )
            .values(
                state_json=state,
                version=expected_version + 1,
                updated_at=datetime.now(UTC),
            )
        )
        if _rowcount(result) != 1:
            raise RuntimeError("Conversation state was concurrently modified")


class SqlAlchemyExecutionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, **values: Any) -> None:
        self._session.add(
            RuleExecutionModel(
                uuid_rule_executions=values["execution_id"],
                tenant_id=values["tenant_id"],
                session_id=values["session_id"],
                conversation_id=values["conversation_id"],
                message_id=values["message_id"],
                matched_rule_ids=values["matched_rule_ids"],
                status=values["status"],
                input_metadata=values["input_metadata"],
            )
        )
        await self._session.flush()

    async def list(self, tenant_id: str, limit: int = 100) -> list[dict[str, Any]]:
        models = (
            await self._session.scalars(
                select(RuleExecutionModel)
                .where(
                    RuleExecutionModel.tenant_id == tenant_id,
                    RuleExecutionModel.expiration_date.is_(None),
                )
                .order_by(RuleExecutionModel.creation_date.desc())
                .limit(limit)
            )
        ).all()
        return [self._serialize(model) for model in models]

    async def get(self, tenant_id: str, execution_id: UUID) -> dict[str, Any] | None:
        model = await self._session.scalar(
            select(RuleExecutionModel).where(
                RuleExecutionModel.tenant_id == tenant_id,
                RuleExecutionModel.uuid_rule_executions == execution_id,
                RuleExecutionModel.expiration_date.is_(None),
            )
        )
        return self._serialize(model) if model else None

    async def update_status(
        self,
        *,
        tenant_id: str,
        execution_id: UUID,
        status: str,
        metadata_patch: dict[str, Any],
    ) -> bool:
        model = await self._session.scalar(
            select(RuleExecutionModel).where(
                RuleExecutionModel.tenant_id == tenant_id,
                RuleExecutionModel.uuid_rule_executions == execution_id,
                RuleExecutionModel.expiration_date.is_(None),
            )
        )
        if model is None:
            return False
        model.status = status
        model.input_metadata = {**model.input_metadata, **metadata_patch}
        await self._session.flush()
        return True

    @staticmethod
    def _serialize(model: RuleExecutionModel) -> dict[str, Any]:
        return {
            "id": str(model.uuid_rule_executions),
            "session_id": model.session_id,
            "conversation_id": model.conversation_id,
            "message_id": model.message_id,
            "status": model.status,
            "matched_rule_ids": model.matched_rule_ids,
            "input_metadata": model.input_metadata,
            "created_at": model.creation_date.isoformat(),
        }


class SqlAlchemyReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def summary(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> dict[str, Any]:
        rows = await self._load_executions(tenant_id, start, end, session_id)
        processed = len(rows)
        matched = sum(1 for row in rows if row.matched_rule_ids)
        replies = sum(self._reply_count(row) for row in rows)
        statuses = Counter(row.status for row in rows)
        return {
            "processed_messages": processed,
            "matched_messages": matched,
            "unmatched_messages": processed - matched,
            "replies_sent_or_queued": replies,
            "failed_replies": statuses.get("FAILED", 0),
            "pending_replies": statuses.get("ACTIONS_PENDING", 0),
            "completed_messages": statuses.get("COMPLETED", 0),
            "by_status": dict(sorted(statuses.items())),
        }

    async def messages(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        rows = await self._load_executions(tenant_id, start, end, session_id, limit=limit)
        rule_map = await self._rule_map(tenant_id)
        return [self._message_row(row, rule_map) for row in rows]

    async def categories(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> list[dict[str, Any]]:
        rows = await self._load_executions(tenant_id, start, end, session_id)
        rule_map = await self._rule_map(tenant_id)
        grouped: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "category": "",
                "messages": 0,
                "matched_messages": 0,
                "replies_sent_or_queued": 0,
                "failed_replies": 0,
            }
        )
        for row in rows:
            categories = self._categories_for(row, rule_map) or ["unmatched"]
            for category in categories:
                item = grouped[category]
                item["category"] = category
                item["messages"] += 1
                item["matched_messages"] += 1 if row.matched_rule_ids else 0
                item["replies_sent_or_queued"] += self._reply_count(row)
                item["failed_replies"] += 1 if row.status == "FAILED" else 0
        return sorted(grouped.values(), key=lambda item: (-int(item["messages"]), item["category"]))

    async def rules(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> list[dict[str, Any]]:
        rows = await self._load_executions(tenant_id, start, end, session_id)
        rule_map = await self._rule_map(tenant_id)
        grouped: dict[str, dict[str, Any]] = {}
        for row in rows:
            for rule_id in row.matched_rule_ids:
                rule = rule_map.get(str(rule_id), {})
                item = grouped.setdefault(
                    str(rule_id),
                    {
                        "rule_id": str(rule_id),
                        "rule_name": str(rule.get("name") or "Regla no encontrada"),
                        "category": str(rule.get("category") or "general"),
                        "matches": 0,
                        "replies_sent_or_queued": 0,
                        "failed_replies": 0,
                    },
                )
                item["matches"] += 1
                item["replies_sent_or_queued"] += self._reply_count(row)
                item["failed_replies"] += 1 if row.status == "FAILED" else 0
        return sorted(grouped.values(), key=lambda item: (-int(item["matches"]), item["rule_name"]))

    async def deliveries(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
    ) -> list[dict[str, Any]]:
        rows = await self._load_executions(tenant_id, start, end, session_id)
        grouped: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"status": "", "messages": 0, "replies_sent_or_queued": 0}
        )
        for row in rows:
            item = grouped[row.status]
            item["status"] = row.status
            item["messages"] += 1
            item["replies_sent_or_queued"] += self._reply_count(row)
        return sorted(grouped.values(), key=lambda item: item["status"])

    async def _load_executions(
        self,
        tenant_id: str,
        start: datetime | None,
        end: datetime | None,
        session_id: str | None,
        limit: int | None = None,
    ) -> list[RuleExecutionModel]:
        statement = (
            select(RuleExecutionModel)
            .where(
                RuleExecutionModel.tenant_id == tenant_id,
                RuleExecutionModel.expiration_date.is_(None),
            )
            .order_by(RuleExecutionModel.creation_date.desc())
        )
        if start is not None:
            statement = statement.where(RuleExecutionModel.creation_date >= start)
        if end is not None:
            statement = statement.where(RuleExecutionModel.creation_date <= end)
        if session_id is not None:
            statement = statement.where(RuleExecutionModel.session_id == session_id)
        if limit is not None:
            statement = statement.limit(limit)
        return list((await self._session.scalars(statement)).all())

    async def _rule_map(self, tenant_id: str) -> dict[str, dict[str, str]]:
        rules = (
            await self._session.scalars(
                select(BusinessRuleModel).where(BusinessRuleModel.tenant_id == tenant_id)
            )
        ).all()
        return {
            str(rule.uuid_business_rules): {"name": rule.name, "category": rule.category}
            for rule in rules
        }

    @staticmethod
    def _reply_count(row: RuleExecutionModel) -> int:
        metadata = dict(row.input_metadata)
        return _metadata_int(metadata, "actions_sent", "commands_created")

    @staticmethod
    def _categories_for(
        row: RuleExecutionModel, rule_map: dict[str, dict[str, str]]
    ) -> list[str]:
        metadata = dict(row.input_metadata)
        categories = _string_list(metadata.get("matched_rule_categories"))
        if categories:
            return sorted(set(categories))
        fallback = [
            rule_map.get(str(rule_id), {}).get("category", "general")
            for rule_id in row.matched_rule_ids
        ]
        return sorted(set(category for category in fallback if category))

    def _message_row(
        self, row: RuleExecutionModel, rule_map: dict[str, dict[str, str]]
    ) -> dict[str, Any]:
        metadata = dict(row.input_metadata)
        matched_rule_ids = [str(rule_id) for rule_id in row.matched_rule_ids]
        rules = [
            {
                "rule_id": rule_id,
                "rule_name": rule_map.get(rule_id, {}).get("name", "Regla no encontrada"),
                "category": rule_map.get(rule_id, {}).get("category", "general"),
            }
            for rule_id in matched_rule_ids
        ]
        return {
            "id": str(row.uuid_rule_executions),
            "created_at": row.creation_date.isoformat(),
            "session_id": row.session_id,
            "conversation_id": row.conversation_id,
            "message_id": row.message_id,
            "status": row.status,
            "message_type": str(metadata.get("message_type") or "unknown"),
            "is_group": bool(metadata.get("is_group", False)),
            "sender": str(metadata.get("sender") or ""),
            "raw_sender": str(metadata.get("raw_sender") or metadata.get("sender") or ""),
            "reply_to_jid": str(metadata.get("reply_to_jid") or ""),
            "matched_rule_ids": matched_rule_ids,
            "matched_categories": self._categories_for(row, rule_map),
            "matched_rules": rules,
            "replies_sent_or_queued": self._reply_count(row),
        }


class SqlAlchemyOutboxRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, draft: OutboxDraft) -> None:
        await self._session.execute(
            pg_insert(OutboxMessageModel)
            .values(
                message_id=draft.envelope.message_id,
                aggregate_type=draft.aggregate_type,
                aggregate_uuid=draft.aggregate_id,
                exchange_name=draft.exchange,
                routing_key=draft.routing_key,
                payload_json=draft.envelope.to_dict(),
                headers_json={
                    "message_type": draft.envelope.message_type,
                    "schema_version": draft.envelope.schema_version,
                    "correlation_id": draft.envelope.correlation_id,
                },
            )
            .on_conflict_do_nothing(index_elements=["message_id"])
        )


class SqlAlchemyOutboxStore:
    """Outbox relay store with short DB transactions around claims and updates."""

    def __init__(self, factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = factory

    async def claim_batch(
        self,
        *,
        limit: int,
        max_attempts: int,
        stale_lock_seconds: int,
    ) -> list[OutboxRecord]:
        now = datetime.now(UTC)
        stale_before = now - timedelta(seconds=stale_lock_seconds)
        async with self._factory.begin() as session:
            models = (
                await session.scalars(
                    select(OutboxMessageModel)
                    .where(
                        OutboxMessageModel.expiration_date.is_(None),
                        or_(
                            (
                                (OutboxMessageModel.status == "PENDING")
                                & (OutboxMessageModel.next_attempt_at <= now)
                                & (OutboxMessageModel.attempt_count < max_attempts)
                            ),
                            (
                                (OutboxMessageModel.status == "PUBLISHING")
                                & (OutboxMessageModel.locked_at <= stale_before)
                                & (OutboxMessageModel.attempt_count <= max_attempts)
                            ),
                        ),
                    )
                    .order_by(OutboxMessageModel.creation_date, OutboxMessageModel.message_id)
                    .limit(limit)
                    .with_for_update(skip_locked=True)
                )
            ).all()
            records: list[OutboxRecord] = []
            for model in models:
                model.status = "PUBLISHING"
                model.attempt_count += 1
                model.locked_at = now
                model.last_error = None
                records.append(self._to_record(model))
            return records

    async def mark_published(self, message_id: str) -> None:
        async with self._factory.begin() as session:
            await session.execute(
                update(OutboxMessageModel)
                .where(OutboxMessageModel.message_id == message_id)
                .values(
                    status="PUBLISHED",
                    published_at=datetime.now(UTC),
                    locked_at=None,
                    last_error=None,
                )
            )

    async def mark_failed(self, message_id: str, error: str, max_attempts: int) -> None:
        sanitized = error[:500]
        async with self._factory.begin() as session:
            model = await session.scalar(
                select(OutboxMessageModel)
                .where(OutboxMessageModel.message_id == message_id)
                .with_for_update()
            )
            if model is None:
                return
            terminal = model.attempt_count >= max_attempts
            model.status = "FAILED" if terminal else "PENDING"
            model.locked_at = None
            model.last_error = sanitized
            if not terminal:
                delay_seconds = min(300, 2 ** max(model.attempt_count - 1, 0))
                model.next_attempt_at = datetime.now(UTC) + timedelta(seconds=delay_seconds)

    @staticmethod
    def _to_record(model: OutboxMessageModel) -> OutboxRecord:
        return OutboxRecord(
            message_id=model.message_id,
            exchange=model.exchange_name,
            routing_key=model.routing_key,
            payload=dict(model.payload_json),
            headers=dict(model.headers_json),
            attempt_count=model.attempt_count,
        )
