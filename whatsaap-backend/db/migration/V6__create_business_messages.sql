-- Context: automation | Business traceability: normalized inbound business messages.

CREATE TABLE IF NOT EXISTS automation_schema.business_messages (
    pkid_business_messages BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_business_messages UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    tenant_id VARCHAR(128) NOT NULL,
    source_origin VARCHAR(32) NOT NULL,
    business_category VARCHAR(80) NOT NULL,
    source_reference VARCHAR(160) NULL,
    session_id VARCHAR(64) NULL,
    conversation_id VARCHAR(255) NULL,
    message_id VARCHAR(128) NULL,
    raw_sender VARCHAR(255) NULL,
    sender VARCHAR(255) NULL,
    reply_to_jid VARCHAR(255) NULL,
    subject VARCHAR(240) NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    raw_text_hash CHAR(64) NULL,
    received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processing_status VARCHAR(32) DEFAULT 'CAPTURED' NOT NULL,
    processed_at TIMESTAMPTZ NULL,
    created_by VARCHAR(128) NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_business_messages PRIMARY KEY (pkid_business_messages),
    CONSTRAINT uk_business_messages_uuid UNIQUE (uuid_business_messages),
    CONSTRAINT ck_business_messages_source_origin CHECK (
        source_origin IN ('WHATSAPP', 'EMAIL', 'MANUAL')
    ),
    CONSTRAINT ck_business_messages_status CHECK (
        processing_status IN ('CAPTURED', 'PARSED', 'PROCESSED', 'FAILED', 'IGNORED')
    ),
    CONSTRAINT ck_business_messages_metadata_object CHECK (
        jsonb_typeof(metadata_json) = 'object'
    ),
    CONSTRAINT ck_business_messages_hash_format CHECK (
        raw_text_hash IS NULL OR raw_text_hash ~ '^[a-f0-9]{64}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_business_messages_uuid
    ON automation_schema.business_messages(uuid_business_messages);

CREATE INDEX IF NOT EXISTS idx_business_messages_tenant_received
    ON automation_schema.business_messages(tenant_id, received_at DESC)
    WHERE expiration_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_messages_tenant_category_received
    ON automation_schema.business_messages(tenant_id, business_category, received_at DESC)
    WHERE expiration_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_messages_tenant_origin_received
    ON automation_schema.business_messages(tenant_id, source_origin, received_at DESC)
    WHERE expiration_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_messages_metadata_gin
    ON automation_schema.business_messages USING GIN (metadata_json)
    WHERE expiration_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_business_messages_source_message_active
    ON automation_schema.business_messages(tenant_id, source_origin, message_id)
    WHERE expiration_date IS NULL AND message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_business_messages_source_reference_active
    ON automation_schema.business_messages(tenant_id, source_origin, source_reference)
    WHERE expiration_date IS NULL AND source_reference IS NOT NULL;

COMMENT ON TABLE automation_schema.business_messages IS 'Traceable inbound business messages captured from WhatsApp, email, or manual entry.';
COMMENT ON COLUMN automation_schema.business_messages.pkid_business_messages IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.business_messages.uuid_business_messages IS 'External immutable UUID exposed through APIs.';
COMMENT ON COLUMN automation_schema.business_messages.creation_date IS 'Record creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.business_messages.expiration_date IS 'Retention soft-delete timestamp; NULL means retained.';
COMMENT ON COLUMN automation_schema.business_messages.tenant_id IS 'Tenant owner identifier.';
COMMENT ON COLUMN automation_schema.business_messages.source_origin IS 'Input channel: WHATSAPP, EMAIL, or MANUAL.';
COMMENT ON COLUMN automation_schema.business_messages.business_category IS 'Decision category such as TRASLADO_TIENDA or CREAR_USUARIO.';
COMMENT ON COLUMN automation_schema.business_messages.source_reference IS 'Optional external source id for email/manual integrations.';
COMMENT ON COLUMN automation_schema.business_messages.session_id IS 'WhatsApp session identifier when source_origin is WHATSAPP.';
COMMENT ON COLUMN automation_schema.business_messages.conversation_id IS 'Conversation key when the source provides one.';
COMMENT ON COLUMN automation_schema.business_messages.message_id IS 'Source message id for idempotency when available.';
COMMENT ON COLUMN automation_schema.business_messages.raw_sender IS 'Raw sender identifier as received from the source.';
COMMENT ON COLUMN automation_schema.business_messages.sender IS 'Normalized sender identifier.';
COMMENT ON COLUMN automation_schema.business_messages.reply_to_jid IS 'Resolved WhatsApp JID to reply when source_origin is WHATSAPP.';
COMMENT ON COLUMN automation_schema.business_messages.subject IS 'Optional email/manual subject or short business title.';
COMMENT ON COLUMN automation_schema.business_messages.metadata_json IS 'Structured extracted business metadata used for decisions and reporting.';
COMMENT ON COLUMN automation_schema.business_messages.raw_text_hash IS 'SHA-256 hash of the original text; raw text is not stored by default.';
COMMENT ON COLUMN automation_schema.business_messages.received_at IS 'Source receipt timestamp in UTC.';
COMMENT ON COLUMN automation_schema.business_messages.processing_status IS 'Business-message processing lifecycle status.';
COMMENT ON COLUMN automation_schema.business_messages.processed_at IS 'Timestamp when downstream processing completed.';
COMMENT ON COLUMN automation_schema.business_messages.created_by IS 'Actor/user/service that captured manual records when applicable.';
COMMENT ON COLUMN automation_schema.business_messages.updated_at IS 'Last mutation timestamp in UTC.';
