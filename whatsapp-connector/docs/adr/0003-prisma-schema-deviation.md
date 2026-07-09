# ADR 0003 — Dual-key persistence and credential deletion

**Status:** Superseded by current implementation · **Updated:** 2026-07-08

## Context
The service persists session metadata separately from sensitive Baileys authentication
state. Metadata needs an audit-friendly lifecycle, while credentials must be physically
removed when a caller permanently deletes a session.

## Decision
Use the ZNS dual-key pattern for PostgreSQL metadata: `pkid_session` as the internal
identity, `uuid_session` as the public surrogate, plus `creation_date` and
`expiration_date`. Repository reads only return active rows and deletion sets
`expiration_date`.

The caller-facing `session_id` remains the operational Baileys identifier, scoped by
`owner_id`. Authentication state is not soft-deleted: permanent deletion logs out the
linked device on a best-effort basis and physically removes filesystem/Valkey credentials.
Temporary disconnect and process shutdown only close sockets and preserve credentials.

## Consequences
- Metadata remains available for an explicit retention period defined by operations.
- Credential material cannot be recovered through the metadata table.
- Recreating the same owner/session pair reactivates the metadata row through the
  repository upsert, with fresh authentication state.
