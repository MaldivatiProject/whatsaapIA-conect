# Security controls — whatsapp-connector

Technical security controls implemented in the service. Companion to the ISO 27001
checklist in [`iso27001-checklist.md`](./iso27001-checklist.md).

## Authentication & authorization
- **API-key authentication** (`ApiKeyAuthGuard`, global). Constant-time comparison
  (`crypto.timingSafeEqual`). `x-api-key` header (or `?api_key=` for browser pages).
- **Per-tenant ownership** (BOLA/IDOR prevention): sessions carry `ownerId`; all
  session-scoped use cases use `findByIdAndOwner` and return **404** on cross-owner
  access. Covered by unit tests and an e2e isolation test.
- **WebSocket auth**: handshake token validated; clients join `owner:<id>` rooms and
  receive only their own tenant's events.

## Input validation
- `class-validator` DTOs at the HTTP edge with `whitelist` + `forbidNonWhitelisted`;
  validation failures return RFC 7807 `ProblemDetail` (422).
- Environment validated at boot with `zod`; the process exits on invalid config.
- Domain-level validation for JIDs, media size and MIME type.

## Transport & headers
- `helmet` security headers.
- CORS driven by `CORS_ORIGINS` (REST and WebSocket); `*` only for development.
- Body size limited and derived from `MAX_MEDIA_SIZE_MB`.

## Rate limiting
- `@nestjs/throttler` global guard (`HTTP_RATE_LIMIT_MAX` per `HTTP_RATE_LIMIT_TTL_MS`).
  `/health` is exempt.
- Outbound limits are captured in each session configuration. Distributed enforcement
  remains a production hardening item; the HTTP throttler is the active control today.

## Secrets
- No secrets in code or repo; `.env` is git-ignored. `API_KEYS`, `WEBHOOK_SECRET`,
  `DATABASE_URL`, `VALKEY_URL` are environment-injected.
- Webhook payloads signed with HMAC-SHA256 (`X-Webhook-Signature`).
- Temporary disconnect and graceful shutdown preserve auth state. Permanent deletion
  removes the filesystem directory or all session-scoped Valkey credential keys.

## Logging / PII
- Structured `pino` logs. Phone numbers / JIDs are **hashed** (`hashJid`, SHA-256/12)
  and never logged in clear; message bodies are never logged.
- Stack traces never returned to clients (centralized exception filters).

## Observability exposure
- `/metrics` requires authentication (not public).
- `/health/events-monitor` requires a key and is owner-scoped over WebSocket.

## Known residual risks
- API keys are static secrets; rotation is manual (rotate `API_KEYS` + redeploy).
  Migrating to short-lived JWT (RS256/ES256) is the planned next step.
- `?api_key=` query fallback for browser QR pages can appear in proxy/access logs;
  prefer the header for machine clients.
- WebSocket owner-routing uses an in-memory `sessionId → ownerId` cache with no TTL.
- Outbound per-session rate limiting is not distributed across replicas.
