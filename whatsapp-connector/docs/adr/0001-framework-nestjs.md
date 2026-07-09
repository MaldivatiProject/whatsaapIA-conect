# ADR 0001 — Framework: NestJS

**Status:** Accepted · **Date:** 2026-06-30

## Context
The service is a long-lived, modular WhatsApp gateway with HTTP + WebSocket
transports, DI needs, lifecycle hooks (graceful shutdown of Baileys sockets) and
multiple swappable adapters (filesystem/Valkey/Postgres persistence, WS/webhook
event publishers).

## Decision
Use **NestJS 11** (Express platform). Its module system, native DI and
guards/interceptors/pipes map cleanly onto hexagonal layers, and the framework is
confined to `infrastructure/` and `api/`; `domain/` and `application/` stay
framework-free (enforced by ESLint `no-restricted-imports` and dependency-cruiser).

## Alternatives
- **Fastify** — faster, but the project already needed first-class WebSocket
  gateways and a rich DI container; NestJS-on-Fastify remains a future option since
  the framework is isolated to one layer.
- **Express alone** — too little structure for the number of adapters/use-cases.

## Consequences
- The framework lives only in `infrastructure/http`, `api/` and `websocket/`.
- Swapping to Fastify later is localized to the platform adapter and gateway.
