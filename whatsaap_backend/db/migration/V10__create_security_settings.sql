-- Context: automation | Business traceability: platform-wide (not per-tenant) runtime-toggleable security settings, controlled from the dashboard.

CREATE TABLE IF NOT EXISTS automation_schema.security_settings (
    pkid_security_settings BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_security_settings UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date TIMESTAMPTZ NULL,
    allow_hardcoded_script_secrets BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by VARCHAR(128) NULL,
    CONSTRAINT pk_security_settings PRIMARY KEY (pkid_security_settings),
    CONSTRAINT uk_security_settings_uuid UNIQUE (uuid_security_settings)
);

CREATE INDEX IF NOT EXISTS idx_security_settings_uuid
    ON automation_schema.security_settings(uuid_security_settings);

-- Platform-wide singleton: at most one active row, ever (no tenant_id — this
-- isn't a per-tenant entity, it's one global security posture toggle).
CREATE UNIQUE INDEX IF NOT EXISTS uk_security_settings_singleton
    ON automation_schema.security_settings((true))
    WHERE expiration_date IS NULL;

INSERT INTO automation_schema.security_settings (allow_hardcoded_script_secrets)
VALUES (FALSE);

COMMENT ON TABLE automation_schema.security_settings IS 'Platform-wide runtime security toggles, editable from the dashboard without a redeploy. Exactly one active row.';
COMMENT ON COLUMN automation_schema.security_settings.pkid_security_settings IS 'Internal BIGINT identity PK; never expose through APIs.';
COMMENT ON COLUMN automation_schema.security_settings.uuid_security_settings IS 'External immutable UUID exposed through APIs.';
COMMENT ON COLUMN automation_schema.security_settings.creation_date IS 'Record creation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.security_settings.expiration_date IS 'Retention soft-delete timestamp; NULL means active. Always NULL in practice — this row is updated in place, never replaced.';
COMMENT ON COLUMN automation_schema.security_settings.allow_hardcoded_script_secrets IS 'When true, disables RuleActionSchema''s hardcoded-credential heuristic for RUN_SCRIPT actions on create/update. Default false (recommended) — enable only to grandfather an existing script pending migration to params.secrets.';
COMMENT ON COLUMN automation_schema.security_settings.updated_at IS 'Last mutation timestamp in UTC.';
COMMENT ON COLUMN automation_schema.security_settings.updated_by IS 'Tenant/actor identifier that last changed this setting, when known.';
