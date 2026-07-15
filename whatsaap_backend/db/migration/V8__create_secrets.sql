-- Context: automation | Business traceability: encrypted credentials referenced by name from RUN_SCRIPT rule actions.

CREATE TABLE IF NOT EXISTS automation_schema.secrets (
    pkid_secrets BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_secrets UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    tenant_id VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL,
    ciphertext BYTEA NOT NULL,
    key_version INTEGER DEFAULT 1 NOT NULL,
    created_by VARCHAR(128) NULL,
    rotated_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_secrets PRIMARY KEY (pkid_secrets),
    CONSTRAINT uk_secrets_uuid UNIQUE (uuid_secrets),
    CONSTRAINT ck_secrets_name_format CHECK (name ~ '^[A-Z][A-Z0-9_]{1,127}$')
);

CREATE INDEX IF NOT EXISTS idx_secrets_uuid
    ON automation_schema.secrets(uuid_secrets);

CREATE UNIQUE INDEX IF NOT EXISTS uk_secrets_tenant_name_active
    ON automation_schema.secrets(tenant_id, name)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE automation_schema.secrets IS 'Encrypted credentials referenced by name from RUN_SCRIPT rule actions; values are never stored in business_rules.actions_json.';
COMMENT ON COLUMN automation_schema.secrets.pkid_secrets IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.secrets.uuid_secrets IS 'External immutable UUID exposed through APIs.';
COMMENT ON COLUMN automation_schema.secrets.creation_date IS 'Record creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.secrets.expiration_date IS 'Retention soft-delete timestamp; NULL means active.';
COMMENT ON COLUMN automation_schema.secrets.tenant_id IS 'Tenant owner identifier.';
COMMENT ON COLUMN automation_schema.secrets.name IS 'Logical name a RUN_SCRIPT action references via os.environ; unique per tenant while active.';
COMMENT ON COLUMN automation_schema.secrets.ciphertext IS 'pgp_sym_encrypt(value, app passphrase) output; never queried, returned, or logged in plaintext outside SqlAlchemySecretsRepository.get_value().';
COMMENT ON COLUMN automation_schema.secrets.key_version IS 'Encryption passphrase generation; bump on passphrase rotation to support staged re-encryption.';
COMMENT ON COLUMN automation_schema.secrets.created_by IS 'Actor/service that created the secret, when known.';
COMMENT ON COLUMN automation_schema.secrets.rotated_at IS 'Timestamp of the most recent value rotation; NULL if never rotated.';
COMMENT ON COLUMN automation_schema.secrets.updated_at IS 'Last mutation timestamp in UTC.';
