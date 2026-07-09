"""SQLAlchemy mappings for the automation schema."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

SCHEMA = "automation_schema"


class Base(DeclarativeBase):
    pass


class StandardColumns:
    creation_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expiration_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BusinessRuleModel(StandardColumns, Base):
    __tablename__ = "business_rules"
    __table_args__ = (
        UniqueConstraint("uuid_business_rules", name="uk_business_rules_uuid"),
        Index("idx_business_rules_uuid", "uuid_business_rules"),
        Index(
            "idx_business_rules_tenant_active",
            "tenant_id",
            "priority",
            postgresql_where=text("expiration_date IS NULL AND enabled = TRUE"),
        ),
        {"schema": SCHEMA},
    )

    pkid_business_rules: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_business_rules: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80), nullable=False, default="general")
    session_id: Mapped[str | None] = mapped_column(String(64))
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    stop_on_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    conditions_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    actions_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ConversationStateModel(StandardColumns, Base):
    __tablename__ = "conversation_states"
    __table_args__ = (
        UniqueConstraint("uuid_conversation_states", name="uk_conversation_states_uuid"),
        Index("idx_conversation_states_uuid", "uuid_conversation_states"),
        Index(
            "uk_conversation_states_active",
            "tenant_id",
            "session_id",
            "conversation_id",
            unique=True,
            postgresql_where=text("expiration_date IS NULL"),
        ),
        {"schema": SCHEMA},
    )

    pkid_conversation_states: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_conversation_states: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    state_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ContactIdentityModel(StandardColumns, Base):
    __tablename__ = "contact_identities"
    __table_args__ = (
        UniqueConstraint("uuid_contact_identities", name="uk_contact_identities_uuid"),
        Index("idx_contact_identities_uuid", "uuid_contact_identities"),
        Index(
            "idx_contact_identities_lookup_active",
            "tenant_id",
            "session_id",
            "lid_jid",
            "phone_jid",
            postgresql_where=text("expiration_date IS NULL AND enabled = TRUE"),
        ),
        {"schema": SCHEMA},
    )

    pkid_contact_identities: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_contact_identities: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False)
    session_id: Mapped[str | None] = mapped_column(String(64))
    lid_jid: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_jid: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(160))
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class BusinessMessageModel(StandardColumns, Base):
    __tablename__ = "business_messages"
    __table_args__ = (
        UniqueConstraint("uuid_business_messages", name="uk_business_messages_uuid"),
        Index("idx_business_messages_uuid", "uuid_business_messages"),
        Index(
            "idx_business_messages_tenant_received",
            "tenant_id",
            "received_at",
            postgresql_where=text("expiration_date IS NULL"),
        ),
        Index(
            "idx_business_messages_tenant_category_received",
            "tenant_id",
            "business_category",
            "received_at",
            postgresql_where=text("expiration_date IS NULL"),
        ),
        Index(
            "idx_business_messages_tenant_origin_received",
            "tenant_id",
            "source_origin",
            "received_at",
            postgresql_where=text("expiration_date IS NULL"),
        ),
        Index(
            "uk_business_messages_source_message_active",
            "tenant_id",
            "source_origin",
            "message_id",
            unique=True,
            postgresql_where=text("expiration_date IS NULL AND message_id IS NOT NULL"),
        ),
        Index(
            "uk_business_messages_source_reference_active",
            "tenant_id",
            "source_origin",
            "source_reference",
            unique=True,
            postgresql_where=text("expiration_date IS NULL AND source_reference IS NOT NULL"),
        ),
        {"schema": SCHEMA},
    )

    pkid_business_messages: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_business_messages: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, server_default=func.gen_random_uuid()
    )
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_origin: Mapped[str] = mapped_column(String(32), nullable=False)
    business_category: Mapped[str] = mapped_column(String(80), nullable=False)
    source_reference: Mapped[str | None] = mapped_column(String(160))
    session_id: Mapped[str | None] = mapped_column(String(64))
    conversation_id: Mapped[str | None] = mapped_column(String(255))
    message_id: Mapped[str | None] = mapped_column(String(128))
    raw_sender: Mapped[str | None] = mapped_column(String(255))
    sender: Mapped[str | None] = mapped_column(String(255))
    reply_to_jid: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str | None] = mapped_column(String(240))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    raw_text_hash: Mapped[str | None] = mapped_column(String(64))
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    processing_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="CAPTURED"
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str | None] = mapped_column(String(128))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class RuleExecutionModel(StandardColumns, Base):
    __tablename__ = "rule_executions"
    __table_args__ = (
        UniqueConstraint("uuid_rule_executions", name="uk_rule_executions_uuid"),
        UniqueConstraint("tenant_id", "message_id", name="uk_rule_executions_message"),
        Index("idx_rule_executions_uuid", "uuid_rule_executions"),
        Index("idx_rule_executions_tenant_creation", "tenant_id", "creation_date"),
        {"schema": SCHEMA},
    )

    pkid_rule_executions: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_rule_executions: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    message_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    matched_rule_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    input_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class InboxMessageModel(StandardColumns, Base):
    __tablename__ = "inbox_messages"
    __table_args__ = (
        UniqueConstraint("uuid_inbox_messages", name="uk_inbox_messages_uuid"),
        UniqueConstraint("message_id", name="uk_inbox_messages_message_id"),
        Index("idx_inbox_messages_uuid", "uuid_inbox_messages"),
        Index("idx_inbox_messages_tenant", "tenant_id", "creation_date"),
        {"schema": SCHEMA},
    )

    pkid_inbox_messages: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_inbox_messages: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, server_default=func.gen_random_uuid()
    )
    message_id: Mapped[str] = mapped_column(String(128), nullable=False)
    message_type: Mapped[str] = mapped_column(String(128), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PROCESSING")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)


class OutboxMessageModel(StandardColumns, Base):
    __tablename__ = "outbox_messages"
    __table_args__ = (
        UniqueConstraint("uuid_outbox_messages", name="uk_outbox_messages_uuid"),
        UniqueConstraint("message_id", name="uk_outbox_messages_message_id"),
        Index("idx_outbox_messages_uuid", "uuid_outbox_messages"),
        Index(
            "idx_outbox_messages_pending",
            "status",
            "next_attempt_at",
            "creation_date",
            postgresql_where=text("expiration_date IS NULL"),
        ),
        {"schema": SCHEMA},
    )

    pkid_outbox_messages: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    uuid_outbox_messages: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, server_default=func.gen_random_uuid()
    )
    message_id: Mapped[str] = mapped_column(String(128), nullable=False)
    aggregate_type: Mapped[str] = mapped_column(String(64), nullable=False)
    aggregate_uuid: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True))
    exchange_name: Mapped[str] = mapped_column(String(128), nullable=False)
    routing_key: Mapped[str] = mapped_column(String(160), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    headers_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
