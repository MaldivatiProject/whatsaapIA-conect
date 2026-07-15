-- Context: automation | Business traceability: per-tenant pointer to a single Google Drive file the backend may read, plus polling/cache settings.

CREATE TABLE IF NOT EXISTS automation_schema.drive_integration_configs (
    pkid_drive_integration_configs BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_drive_integration_configs UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    tenant_id VARCHAR(128) NOT NULL,
    file_id VARCHAR(128) NOT NULL,
    credentials_secret_name VARCHAR(128) NOT NULL DEFAULT 'GOOGLE_DRIVE_SERVICE_ACCOUNT',
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    cache_ttl_seconds INTEGER DEFAULT 300 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT pk_drive_integration_configs PRIMARY KEY (pkid_drive_integration_configs),
    CONSTRAINT uk_drive_integration_configs_uuid UNIQUE (uuid_drive_integration_configs),
    CONSTRAINT ck_drive_integration_configs_cache_ttl CHECK (cache_ttl_seconds BETWEEN 30 AND 3600)
);

CREATE INDEX IF NOT EXISTS idx_drive_integration_configs_uuid
    ON automation_schema.drive_integration_configs(uuid_drive_integration_configs);

CREATE UNIQUE INDEX IF NOT EXISTS uk_drive_integration_configs_tenant_active
    ON automation_schema.drive_integration_configs(tenant_id)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE automation_schema.drive_integration_configs IS 'Per-tenant Google Drive file pointer + cache settings; the service-account credential itself lives in automation_schema.secrets, referenced by name.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.pkid_drive_integration_configs IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.uuid_drive_integration_configs IS 'External immutable UUID exposed through APIs.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.creation_date IS 'Record creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.expiration_date IS 'Retention soft-delete timestamp; NULL means active.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.tenant_id IS 'Tenant owner identifier.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.file_id IS 'Google Drive file ID (from the file''s share URL), not a full path or URL.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.credentials_secret_name IS 'Name of the automation_schema.secrets row holding the service-account JSON used to read file_id.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.enabled IS 'Whether this tenant''s Drive integration is active.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.cache_ttl_seconds IS 'How long a read file content is cached in-process before re-fetching from Drive.';
COMMENT ON COLUMN automation_schema.drive_integration_configs.updated_at IS 'Last mutation timestamp in UTC.';
