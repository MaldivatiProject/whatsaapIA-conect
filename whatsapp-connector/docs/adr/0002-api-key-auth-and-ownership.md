# ADR 0002 — API-key authentication and per-owner session ownership

**Status:** Accepted · **Date:** 2026-06-30

## Context
Before this change every endpoint was unauthenticated and any caller could create,
read, control or send from any `sessionId` — a textbook BOLA/IDOR (OWASP API1:2023).

## Decision
1. **Authentication:** a global `ApiKeyAuthGuard` requires a valid key in the
   `x-api-key` header (or `?api_key=` query for browser QR/monitor pages). Keys are
   configured as `API_KEYS="ownerId:secret,..."`, compared in constant time. Each
   key maps to an **ownerId** (tenant). `/health` is `@Public`; `/metrics` stays
   behind the guard.
2. **Authorization (ownership):** the `Session` aggregate carries an `ownerId` set at
   creation. The repository exposes `findByIdAndOwner` / `findAllByOwner`, and every
   session-scoped use case resolves through them. Cross-owner access returns **404**
   (not 403) so existence is not revealed.
3. **WebSocket:** the gateway authenticates the socket handshake and joins an
   `owner:<ownerId>` room; events are emitted only to the owning tenant's room — no
   global broadcast.

## Consequences
- `AUTH_ENABLED=true` requires at least one key or the service refuses to boot.
- JWT (RS256/ES256) can replace API keys later behind the same guard seam; the
  ownership model in the domain does not change.
