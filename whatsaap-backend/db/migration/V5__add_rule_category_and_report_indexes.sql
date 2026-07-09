ALTER TABLE automation_schema.business_rules
    ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_business_rules_tenant_category
    ON automation_schema.business_rules (tenant_id, category)
    WHERE expiration_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_rule_executions_tenant_status_creation
    ON automation_schema.rule_executions (tenant_id, status, creation_date)
    WHERE expiration_date IS NULL;

