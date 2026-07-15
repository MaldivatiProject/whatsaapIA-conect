-- Context: automation | Reliability: inbox/outbox and execution audit.

CREATE TABLE IF NOT EXISTS automation_schema.inbox_messages (
    pkid_inbox_messages BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_inbox_messages UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    message_id VARCHAR(128) NOT NULL,
    message_type VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'PROCESSING' NOT NULL,
    processed_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    CONSTRAINT pk_inbox_messages PRIMARY KEY (pkid_inbox_messages),
    CONSTRAINT uk_inbox_messages_uuid UNIQUE (uuid_inbox_messages),
    CONSTRAINT uk_inbox_messages_message_id UNIQUE (message_id),
    CONSTRAINT ck_inbox_messages_status CHECK (status IN ('PROCESSING', 'PROCESSED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_uuid
    ON automation_schema.inbox_messages(uuid_inbox_messages);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_tenant
    ON automation_schema.inbox_messages(tenant_id, creation_date DESC)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE automation_schema.inbox_messages IS 'Idempotent consumer inbox for at-least-once RabbitMQ delivery.';
COMMENT ON COLUMN automation_schema.inbox_messages.pkid_inbox_messages IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.inbox_messages.uuid_inbox_messages IS 'External immutable UUID.';
COMMENT ON COLUMN automation_schema.inbox_messages.creation_date IS 'First receipt timestamp in UTC.';
COMMENT ON COLUMN automation_schema.inbox_messages.expiration_date IS 'Retention soft-delete timestamp; NULL means retained.';
COMMENT ON COLUMN automation_schema.inbox_messages.message_id IS 'Globally unique AMQP envelope identifier and idempotency key.';
COMMENT ON COLUMN automation_schema.inbox_messages.message_type IS 'Version-independent semantic message type.';
COMMENT ON COLUMN automation_schema.inbox_messages.tenant_id IS 'Tenant owning the consumed message.';
COMMENT ON COLUMN automation_schema.inbox_messages.status IS 'Consumer processing status.';
COMMENT ON COLUMN automation_schema.inbox_messages.processed_at IS 'Successful durable processing timestamp.';
COMMENT ON COLUMN automation_schema.inbox_messages.last_error IS 'Sanitized terminal error without payload or secret.';

CREATE TABLE IF NOT EXISTS automation_schema.outbox_messages (
    pkid_outbox_messages BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_outbox_messages UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    message_id VARCHAR(128) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_uuid UUID NULL,
    exchange_name VARCHAR(128) NOT NULL,
    routing_key VARCHAR(160) NOT NULL,
    payload_json JSONB NOT NULL,
    headers_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' NOT NULL,
    attempt_count INTEGER DEFAULT 0 NOT NULL,
    next_attempt_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    locked_at TIMESTAMPTZ NULL,
    published_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    CONSTRAINT pk_outbox_messages PRIMARY KEY (pkid_outbox_messages),
    CONSTRAINT uk_outbox_messages_uuid UNIQUE (uuid_outbox_messages),
    CONSTRAINT uk_outbox_messages_message_id UNIQUE (message_id),
    CONSTRAINT ck_outbox_messages_status CHECK (status IN ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED')),
    CONSTRAINT ck_outbox_messages_attempt_count CHECK (attempt_count >= 0),
    CONSTRAINT ck_outbox_messages_payload_object CHECK (jsonb_typeof(payload_json) = 'object'),
    CONSTRAINT ck_outbox_messages_headers_object CHECK (jsonb_typeof(headers_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_outbox_messages_uuid
    ON automation_schema.outbox_messages(uuid_outbox_messages);
CREATE INDEX IF NOT EXISTS idx_outbox_messages_pending
    ON automation_schema.outbox_messages(status, next_attempt_at, creation_date)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE automation_schema.outbox_messages IS 'Transactional outbox awaiting confirmed RabbitMQ publication.';
COMMENT ON COLUMN automation_schema.outbox_messages.pkid_outbox_messages IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.outbox_messages.uuid_outbox_messages IS 'External immutable UUID.';
COMMENT ON COLUMN automation_schema.outbox_messages.creation_date IS 'Outbox creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.outbox_messages.expiration_date IS 'Retention soft-delete timestamp; NULL means retained.';
COMMENT ON COLUMN automation_schema.outbox_messages.message_id IS 'Globally unique envelope identifier.';
COMMENT ON COLUMN automation_schema.outbox_messages.aggregate_type IS 'Domain aggregate category causing the message.';
COMMENT ON COLUMN automation_schema.outbox_messages.aggregate_uuid IS 'External aggregate UUID when one exists.';
COMMENT ON COLUMN automation_schema.outbox_messages.exchange_name IS 'RabbitMQ target exchange.';
COMMENT ON COLUMN automation_schema.outbox_messages.routing_key IS 'Versioned RabbitMQ routing key.';
COMMENT ON COLUMN automation_schema.outbox_messages.payload_json IS 'Validated complete message envelope.';
COMMENT ON COLUMN automation_schema.outbox_messages.headers_json IS 'Sanitized AMQP application headers.';
COMMENT ON COLUMN automation_schema.outbox_messages.status IS 'Publication state machine status.';
COMMENT ON COLUMN automation_schema.outbox_messages.attempt_count IS 'Number of claimed publication attempts.';
COMMENT ON COLUMN automation_schema.outbox_messages.next_attempt_at IS 'Earliest next retry timestamp.';
COMMENT ON COLUMN automation_schema.outbox_messages.locked_at IS 'Relay claim timestamp used for stale claim recovery.';
COMMENT ON COLUMN automation_schema.outbox_messages.published_at IS 'Broker-confirmed publication timestamp.';
COMMENT ON COLUMN automation_schema.outbox_messages.last_error IS 'Sanitized last publisher error.';

CREATE TABLE IF NOT EXISTS automation_schema.rule_executions (
    pkid_rule_executions BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_rule_executions UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    tenant_id VARCHAR(128) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    matched_rule_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    input_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT pk_rule_executions PRIMARY KEY (pkid_rule_executions),
    CONSTRAINT uk_rule_executions_uuid UNIQUE (uuid_rule_executions),
    CONSTRAINT uk_rule_executions_message UNIQUE (tenant_id, message_id),
    CONSTRAINT ck_rule_executions_status CHECK (status IN ('COMPLETED', 'ACTIONS_PENDING', 'FAILED')),
    CONSTRAINT ck_rule_executions_rule_ids_array CHECK (jsonb_typeof(matched_rule_ids) = 'array'),
    CONSTRAINT ck_rule_executions_input_object CHECK (jsonb_typeof(input_metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_rule_executions_uuid
    ON automation_schema.rule_executions(uuid_rule_executions);
CREATE INDEX IF NOT EXISTS idx_rule_executions_tenant_creation
    ON automation_schema.rule_executions(tenant_id, creation_date DESC)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE automation_schema.rule_executions IS 'Audit entity for one inbound message rule evaluation.';
COMMENT ON COLUMN automation_schema.rule_executions.pkid_rule_executions IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.rule_executions.uuid_rule_executions IS 'External execution UUID exposed through APIs.';
COMMENT ON COLUMN automation_schema.rule_executions.creation_date IS 'Execution creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.rule_executions.expiration_date IS 'Retention soft-delete timestamp; NULL means retained.';
COMMENT ON COLUMN automation_schema.rule_executions.tenant_id IS 'Tenant owner identifier.';
COMMENT ON COLUMN automation_schema.rule_executions.session_id IS 'WhatsApp connector session identifier.';
COMMENT ON COLUMN automation_schema.rule_executions.conversation_id IS 'Private sender or group conversation key.';
COMMENT ON COLUMN automation_schema.rule_executions.message_id IS 'Inbound AMQP message identifier.';
COMMENT ON COLUMN automation_schema.rule_executions.status IS 'Execution lifecycle status.';
COMMENT ON COLUMN automation_schema.rule_executions.matched_rule_ids IS 'External UUIDs and versions of matched rules.';
COMMENT ON COLUMN automation_schema.rule_executions.input_metadata IS 'PII-minimized input metadata; message body is stored only as SHA-256.';

