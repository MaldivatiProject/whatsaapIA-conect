-- Context: automation | Creates the isolated backend schema and UUID support.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS automation_schema;
COMMENT ON SCHEMA automation_schema IS 'Bounded context for WhatsApp business automation.';

