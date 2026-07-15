CREATE INDEX IF NOT EXISTS idx_rule_executions_tenant_session_creation
    ON automation_schema.rule_executions (tenant_id, session_id, creation_date DESC)
    WHERE expiration_date IS NULL;
