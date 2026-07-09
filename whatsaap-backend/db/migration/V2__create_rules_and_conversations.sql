-- Context: automation | Aggregates: business_rules, conversation_states

CREATE TABLE IF NOT EXISTS automation_schema.business_rules (
    pkid_business_rules BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_business_rules UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    tenant_id VARCHAR(128) NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    session_id VARCHAR(64) NULL,
    priority INTEGER DEFAULT 100 NOT NULL,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    stop_on_match BOOLEAN DEFAULT FALSE NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    conditions_json JSONB NOT NULL,
    actions_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_business_rules PRIMARY KEY (pkid_business_rules),
    CONSTRAINT uk_business_rules_uuid UNIQUE (uuid_business_rules),
    CONSTRAINT ck_business_rules_priority CHECK (priority BETWEEN 0 AND 100000),
    CONSTRAINT ck_business_rules_version CHECK (version > 0),
    CONSTRAINT ck_business_rules_conditions_array CHECK (jsonb_typeof(conditions_json) = 'array'),
    CONSTRAINT ck_business_rules_actions_array CHECK (jsonb_typeof(actions_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_business_rules_uuid
    ON automation_schema.business_rules(uuid_business_rules);
CREATE INDEX IF NOT EXISTS idx_business_rules_tenant_active
    ON automation_schema.business_rules(tenant_id, priority, uuid_business_rules)
    WHERE expiration_date IS NULL AND enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_business_rules_session_active
    ON automation_schema.business_rules(tenant_id, session_id, priority)
    WHERE expiration_date IS NULL AND enabled = TRUE;

COMMENT ON TABLE automation_schema.business_rules IS 'Aggregate Root: versioned automation business rule.';
COMMENT ON COLUMN automation_schema.business_rules.pkid_business_rules IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.business_rules.uuid_business_rules IS 'External immutable UUID exposed through APIs.';
COMMENT ON COLUMN automation_schema.business_rules.creation_date IS 'Immutable creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.business_rules.expiration_date IS 'Soft delete timestamp; NULL means active.';
COMMENT ON COLUMN automation_schema.business_rules.tenant_id IS 'Tenant owner identifier derived from authentication.';
COMMENT ON COLUMN automation_schema.business_rules.name IS 'Human-readable rule name.';
COMMENT ON COLUMN automation_schema.business_rules.description IS 'Optional business description.';
COMMENT ON COLUMN automation_schema.business_rules.session_id IS 'Optional WhatsApp session scope; NULL applies to all tenant sessions.';
COMMENT ON COLUMN automation_schema.business_rules.priority IS 'Ascending evaluation priority.';
COMMENT ON COLUMN automation_schema.business_rules.enabled IS 'Whether the rule participates in evaluation.';
COMMENT ON COLUMN automation_schema.business_rules.stop_on_match IS 'Stops lower-priority evaluation after a match.';
COMMENT ON COLUMN automation_schema.business_rules.version IS 'Optimistic business version incremented on update.';
COMMENT ON COLUMN automation_schema.business_rules.conditions_json IS 'Validated declarative condition DSL.';
COMMENT ON COLUMN automation_schema.business_rules.actions_json IS 'Validated declarative action list.';
COMMENT ON COLUMN automation_schema.business_rules.updated_at IS 'Last mutation timestamp in UTC.';

CREATE TABLE IF NOT EXISTS automation_schema.conversation_states (
    pkid_conversation_states BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_conversation_states UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    tenant_id VARCHAR(128) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    state_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_conversation_states PRIMARY KEY (pkid_conversation_states),
    CONSTRAINT uk_conversation_states_uuid UNIQUE (uuid_conversation_states),
    CONSTRAINT ck_conversation_states_version CHECK (version > 0),
    CONSTRAINT ck_conversation_states_state_object CHECK (jsonb_typeof(state_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_conversation_states_uuid
    ON automation_schema.conversation_states(uuid_conversation_states);
CREATE UNIQUE INDEX IF NOT EXISTS uk_conversation_states_active
    ON automation_schema.conversation_states(tenant_id, session_id, conversation_id)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE automation_schema.conversation_states IS 'Aggregate Root: current state for one WhatsApp conversation.';
COMMENT ON COLUMN automation_schema.conversation_states.pkid_conversation_states IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.conversation_states.uuid_conversation_states IS 'External immutable UUID.';
COMMENT ON COLUMN automation_schema.conversation_states.creation_date IS 'Immutable creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.conversation_states.expiration_date IS 'Soft delete timestamp; NULL means active.';
COMMENT ON COLUMN automation_schema.conversation_states.tenant_id IS 'Tenant owner identifier.';
COMMENT ON COLUMN automation_schema.conversation_states.session_id IS 'WhatsApp connector session identifier.';
COMMENT ON COLUMN automation_schema.conversation_states.conversation_id IS 'Private sender or group conversation key.';
COMMENT ON COLUMN automation_schema.conversation_states.state_json IS 'Validated state object used by rules.';
COMMENT ON COLUMN automation_schema.conversation_states.version IS 'Optimistic locking version.';
COMMENT ON COLUMN automation_schema.conversation_states.updated_at IS 'Last state transition timestamp in UTC.';

