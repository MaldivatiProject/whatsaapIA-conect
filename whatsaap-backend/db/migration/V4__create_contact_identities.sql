CREATE TABLE IF NOT EXISTS automation_schema.contact_identities (
    pkid_contact_identities BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid_contact_identities UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(128) NOT NULL,
    session_id VARCHAR(64),
    lid_jid VARCHAR(255) NOT NULL,
    phone_jid VARCHAR(255) NOT NULL,
    display_name VARCHAR(160),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    creation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expiration_date TIMESTAMPTZ,
    CONSTRAINT uk_contact_identities_uuid UNIQUE (uuid_contact_identities),
    CONSTRAINT ck_contact_identities_lid_format CHECK (lid_jid ~ '^[0-9]+@lid$'),
    CONSTRAINT ck_contact_identities_phone_format CHECK (phone_jid ~ '^[0-9]+@s\.whatsapp\.net$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_contact_identities_lid_active
    ON automation_schema.contact_identities (tenant_id, COALESCE(session_id, ''), lid_jid)
    WHERE expiration_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_identities_lookup_active
    ON automation_schema.contact_identities (tenant_id, session_id, lid_jid, phone_jid)
    WHERE expiration_date IS NULL AND enabled = TRUE;

