# whatsaapIA-conect

Plataforma de automatización de WhatsApp: conecta sesiones reales de WhatsApp
(vía Baileys), evalúa reglas de negocio sobre los mensajes entrantes y
responde automáticamente, con un panel de administración para operarlo todo.

El sistema se compone de **tres servicios independientes** (cada uno su
propio repositorio/lenguaje) más un **orquestador de despliegue** que los
levanta juntos:

| Repo | Rol | Stack | Puerto local |
|---|---|---|---|
| [`whatsapp-connector`](./whatsapp-connector) | Gateway de WhatsApp (sesiones, QR, envío/recepción de mensajes) | NestJS + Baileys | `3000` |
| [`whatsaap-backend`](./whatsaap-backend) | Motor de reglas y automatización (evalúa mensajes, decide respuestas, audita ejecuciones) | Python + FastAPI | `8000` |
| [`whatsapp-dashboard`](./whatsapp-dashboard) | Panel de administración (sesiones, mensajes, reglas, reportes, actividad en vivo) | Next.js + React | `3001` |
| [`deploy-project`](./deploy-project) | Orquestador único (Docker Compose + `deploy.py`) que levanta toda la plataforma | Python + Docker Compose | — |

`whatsapp-connector` **no** ejecuta lógica de negocio (no decide qué
responder); `whatsaap-backend` **no** habla directo con WhatsApp — todo pasa
por el connector. Esa separación es la base de la arquitectura.

---

## Arquitectura general

```mermaid
graph TB
    WA(("WhatsApp"))

    subgraph Cliente
        DASH["whatsapp-dashboard<br/>Next.js · :3001"]
    end

    subgraph Gateway
        CONN["whatsapp-connector<br/>NestJS + Baileys · :3000"]
        VALKEY[(Valkey<br/>sesiones Baileys)]
    end

    subgraph Automatización
        API["whatsaap-backend-api<br/>FastAPI · :8000"]
        WR["worker-rules"]
        WD["worker-delivery"]
        RELAY["outbox-relay"]
        BRIDGE["connector-bridge"]
        PG[(PostgreSQL<br/>reglas · ejecuciones · outbox)]
        MQ{{RabbitMQ<br/>whatsapp.events / whatsapp.commands}}
    end

    WA <-->|Baileys / multi-device| CONN
    CONN <--> VALKEY

    DASH -->|REST directo<br/>x-api-key| CONN
    DASH -->|WebSocket<br/>socket.io| CONN
    DASH -->|"/rules-api/* (proxy Next.js)"| API

    CONN -->|"webhook MESSAGE_RECEIVED<br/>firmado HMAC-SHA256"| API
    API -->|escribe en la misma transacción| PG
    RELAY -->|lee outbox pendiente| PG
    RELAY -->|publica| MQ
    MQ -->|whatsapp.message.received.v1| WR
    WR -->|evalúa BusinessRule| PG
    WR -->|encola respuesta| PG
    MQ -->|whatsapp.message.send.v1| BRIDGE
    BRIDGE -->|"POST /messages/send<br/>x-api-key"| CONN
    CONN -->|MESSAGE_SENT / FAILED| MQ
    MQ -->|whatsapp.message.sent/failed.v1| WD
    WD -->|actualiza auditoría| PG

    style WA fill:#25D366,color:#000
    style DASH fill:#FA8514,color:#000
    style CONN fill:#5B9FD9,color:#000
    style API fill:#102552,color:#fff
```

**Reglas de dependencia:**
- El dashboard nunca escribe directo en las bases de datos; todo pasa por
  las APIs REST de connector y backend.
- El connector nunca conoce las reglas de negocio; solo emite eventos y
  ejecuta comandos de envío.
- El backend nunca abre una sesión de WhatsApp; solo le pide al connector
  que envíe, vía `connector-bridge`.

---

## Flujo de un mensaje entrante (modo `outbox` + RabbitMQ)

```mermaid
sequenceDiagram
    participant U as Contacto (WhatsApp)
    participant C as whatsapp-connector
    participant A as whatsaap-backend-api
    participant DB as PostgreSQL (outbox)
    participant R as outbox-relay
    participant MQ as RabbitMQ
    participant WR as worker-rules
    participant B as connector-bridge
    participant WD as worker-delivery

    U->>C: Mensaje de WhatsApp
    C->>A: POST /webhooks/whatsapp-connector<br/>(X-Webhook-Signature: HMAC-SHA256)
    A->>A: Verifica firma (hmac.compare_digest)
    A->>DB: INSERT IncomingMessage + outbox row (misma transacción)
    R->>DB: Poll de filas pendientes
    R->>MQ: Publish whatsapp.events<br/>(whatsapp.message.received.v1)
    MQ->>WR: Consume automation.inbound-message.q
    WR->>WR: Evalúa BusinessRule (condiciones → acción)
    WR->>DB: Audita match + encola comando de respuesta (outbox)
    R->>MQ: Publish whatsapp.commands<br/>(whatsapp.message.send.v1)
    MQ->>B: Consume connector.message-send.q
    B->>C: POST /messages/send (x-api-key)
    C->>U: Envía la respuesta por WhatsApp
    C->>MQ: whatsapp.message.sent.v1 / failed.v1
    MQ->>WD: Consume automation.delivery-result.q
    WD->>DB: Marca la ejecución COMPLETED / FAILED
```

El patrón **outbox transaccional** garantiza que un mensaje nunca se marca
como procesado sin que su efecto (auditoría, comando de respuesta) haya
quedado escrito en la misma transacción de base de datos — si RabbitMQ está
caído, la fila simplemente espera en la tabla outbox hasta el próximo poll
de `outbox-relay`. Es *at-least-once*, no *exactly-once*: el consumidor debe
ser idempotente (el dedupe por `message_id` cumple ese rol).

---

## Componentes en detalle

### `whatsapp-connector` — gateway de WhatsApp
Clean Architecture: `api/` (controllers) → `application/` (commands, queries,
ports) → `domain/` (agregados de sesión/mensaje, value objects, eventos) →
`infrastructure/` (Baileys, persistencia, WebSocket, observabilidad).

- **Sesiones**: `GET/POST /sessions`, `GET /sessions/:id/qr`,
  `POST /sessions/:id/disconnect`, `DELETE /sessions/:id`.
- **Mensajes**: `POST /messages/send`, `POST /messages/send-media`.
- **Salud/métricas**: `GET /health` (único endpoint sin auth),
  `GET /metrics` (Prometheus).
- **Persistencia de sesión** configurable: `filesystem` (default),
  `valkey` o `postgres` (`SESSION_PROVIDER`).
- **WebSocket** (`socket.io`) para eventos en tiempo real que consume el
  dashboard (`SESSION_CONNECTED`, `QR_GENERATED`, `MESSAGE_RECEIVED`, ...).
- **Webhooks salientes**: firma cada payload con
  `X-Webhook-Signature: sha256=<HMAC>` (reintenta 3 veces con backoff).
- **Auth**: header `x-api-key` en formato `owner:secret`
  (`API_KEYS=acme:<secret>`), resuelto a un `ownerId` multi-tenant.
- Documentación propia: [`guia.md`](./whatsapp-connector/guia.md),
  ADRs en [`docs/adr/`](./whatsapp-connector/docs/adr/).

### `whatsaap-backend` — motor de reglas y automatización
Hexagonal: `domain/` (puro: `BusinessRule`, `Condition`, `RuleAction`,
`IncomingMessage`) → `application/` (servicios de evaluación/entrega) →
`infrastructure/` (SQLAlchemy, RabbitMQ, cliente HTTP al connector) →
`presentation/` (FastAPI) → `bootstrap/` (entrypoints de cada proceso).

Se despliega como **5 procesos independientes**, todos la misma imagen con
distinto comando:

| Proceso | Qué hace |
|---|---|
| `api` | CRUD de reglas, simulación, ejecuciones, `POST /webhooks/whatsapp-connector`, `GET /api/v1/reports/*` |
| `worker-rules` | Consume mensajes entrantes, evalúa reglas (`RuleEvaluator`) |
| `worker-delivery` | Consume resultados de entrega, cierra la auditoría |
| `outbox-relay` | Publica filas del outbox a RabbitMQ con *publisher confirms* |
| `connector-bridge` | Consume comandos de envío y llama al REST del connector |

**Topología RabbitMQ**: exchanges `whatsapp.events` (topic, publica el
connector-side vía relay), `whatsapp.commands` (direct), `automation.events`,
más `automation.retry` / `automation.dlx` para reintentos y dead-lettering.
Colas: `automation.inbound-message.q`, `automation.delivery-result.q`,
`connector.message-send.q`.

Documentación propia: [`docs/architecture/event-driven-architecture.md`](./whatsaap-backend/docs/architecture/event-driven-architecture.md),
[`docs/adr/0001-rabbitmq-event-bus.md`](./whatsaap-backend/docs/adr/0001-rabbitmq-event-bus.md).

### `whatsapp-dashboard` — panel de administración
Feature-Sliced Design: `app/(dashboard)/{sesiones,mensajes,reglas,
identidades,reportes,actividad}` → `features/` → `entities/` → `shared/`.

- Next.js 16 (App Router) + React 19 + TypeScript estricto + Tailwind v4 +
  shadcn/ui (sobre `@base-ui/react`, no Radix) + TanStack Query + Zustand +
  `socket.io-client`.
- Habla **directo** con `whatsapp-connector` (REST + WebSocket) usando la
  `x-api-key` que el operador ingresa al loguearse (se guarda solo en
  `sessionStorage`, nunca en disco).
- Habla con `whatsaap-backend` **a través de un proxy same-origin**:
  el browser llama a `/rules-api/*` y Next.js reescribe internamente hacia
  `RULES_INTERNAL_API_URL` (la URL interna de Docker), evitando exponer el
  puerto 8000 al navegador.

---

## Despliegue: `deploy-project`

Un único `docker-compose.yml` levanta las 3 apps más su infraestructura
(PostgreSQL, Valkey, RabbitMQ, migraciones Flyway) en una red Docker externa
compartida (`whatsapp-platform`).

```bash
cd projects/whatsaapIA-conect/deploy-project
python3 deploy.py init      # crea .env desde .env.example
python3 deploy.py up --build
```

Orden de arranque: red Docker → `postgres`/`valkey`/`rabbitmq` → migraciones
Flyway → procesos del backend → `whatsapp-connector` (ya con el webhook
apuntando al backend) → build + arranque de `whatsapp-dashboard`.

| Servicio | URL local |
|---|---|
| Dashboard | `http://localhost:3001` |
| Connector (REST) | `http://localhost:3000` |
| Backend (reglas/reportes) | `http://localhost:8000` |
| RabbitMQ Management | `http://localhost:15672` |
| PostgreSQL | `127.0.0.1:5432` (solo loopback por defecto) |

Ver [`deploy-project/README.md`](./deploy-project/README.md) para comandos
(`plan`, `status`, `logs`, `migrate`, `restart`, `down --volumes`) y la guía
de conexión desde DBeaver.

---

## Seguridad (resumen)

- **Webhooks** connector → backend firmados con HMAC-SHA256
  (`WEBHOOK_SECRET` compartido, verificado con `hmac.compare_digest` para
  evitar timing attacks).
- **APIs REST** (connector y backend) protegidas con `x-api-key` en formato
  `tenant:secret` — el mismo par de credenciales (`API_KEY_SECRET`) se
  comparte entre ambos servicios vía `deploy-project/.env`.
- Los secretos (`API_KEY_SECRET`, `WEBHOOK_SECRET`, `POSTGRES_PASSWORD`,
  `RABBITMQ_DEFAULT_PASS`, `AUTH_STATE_ENCRYPTION_KEY`) viven únicamente en
  `deploy-project/.env` (gitignored) — **nunca** se commitean. Usar
  `.env.example` como plantilla y generar valores propios.
- Detalle completo en [`whatsapp-connector/docs/security/`](./whatsapp-connector/docs/security/)
  (incluye checklist ISO 27001).

---

## Dónde seguir leyendo

- [`whatsapp-connector/guia.md`](./whatsapp-connector/guia.md) — cómo
  configurar y conectar una sesión de WhatsApp paso a paso.
- [`whatsaap-backend/docs/architecture/event-driven-architecture.md`](./whatsaap-backend/docs/architecture/event-driven-architecture.md) —
  detalle del bus de eventos y el patrón outbox.
- [`whatsapp-dashboard/AGENTS.md`](./whatsapp-dashboard/AGENTS.md) —
  convenciones del frontend (Next.js 16, base-ui, etc.).
- ADRs de cada repo en su carpeta `docs/adr/`.
