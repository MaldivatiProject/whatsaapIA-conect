# ADR 0003 — Persistence schema deviates from the ZNS Dual-Key standard

**Status:** Accepted · **Date:** 2026-06-30

## Context
The ZNS DB standard mandates a Dual Key (`pkid_` BIGINT + `uuid_` UUID), the four
mandatory columns (`pkid_`, `uuid_`, `creation_date`, `expiration_date`) and soft
delete via `expiration_date`. The connector only persists an opaque, serialized
**session snapshot** (status/config JSON) keyed by a caller-supplied `session_id`.

## Decision
Keep a pragmatic schema: `pkid_session BIGINT` (internal), `session_id` (the public,
caller-chosen natural key), `owner_id` (tenant), `status_json`, `config_json`,
`created_at`, `updated_at`, with an index on `owner_id`. We **do not** adopt
`uuid_`/`expiration_date` because:
- The public identifier is the user-supplied `session_id`, not a surrogate UUID.
- Sessions are hard-deleted on logout (no soft-delete/audit-retention requirement);
  WhatsApp credentials must actually be removed.

## Consequences
- This is a conscious, documented deviation from `db-architecture-standards-expert`.
- If session history/audit becomes a requirement, revisit with `expiration_date`
  soft delete and a retention policy.
