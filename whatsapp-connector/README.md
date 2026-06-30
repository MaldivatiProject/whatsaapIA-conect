# whatsapp-connector

Microservicio especializado en gestión de conexiones con WhatsApp. Actúa como un **Adapter/Gateway** entre la red de WhatsApp y cualquier sistema externo (orquestadores, MCPs, agentes de IA, aplicaciones), sin contener lógica de negocio.

---

## Índice

- [Descripción](#descripción)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Configuración](#configuración)
- [Instalación y ejecución](#instalación-y-ejecución)
- [API REST](#api-rest)
- [Eventos WebSocket](#eventos-websocket)
- [Persistencia](#persistencia)
- [Observabilidad](#observabilidad)
- [Tests](#tests)
- [Docker](#docker)
- [Manager CLI](#manager-cli)
- [Decisiones de diseño](#decisiones-de-diseño)

---

## Descripción

`whatsapp-connector` es un microservicio **altamente configurable** cuya única responsabilidad es administrar sesiones de WhatsApp mediante la librería [Baileys](https://github.com/WhiskeySockets/Baileys). Puede gestionar múltiples sesiones simultáneas de forma aislada y exponer sus capacidades mediante REST y/o WebSocket.

### Principio central

> **Configuration over Code** — Todo comportamiento es parametrizable vía variables de entorno sin modificar el código fuente.

### Qué hace

- Gestionar múltiples sesiones de WhatsApp simultáneas (multi-tenant)
- Generar y exponer códigos QR para autenticación
- Persistir credenciales de sesión (filesystem, Redis o PostgreSQL)
- Reconectarse automáticamente con backoff configurable
- Recibir mensajes entrantes y publicar eventos
- Enviar mensajes de texto, imágenes, documentos y audio
- Detectar mensajes de grupos y chats individuales

### Qué NO hace

- Responder automáticamente mensajes
- Invocar modelos LLM o agentes de IA
- Ejecutar reglas de negocio
- Almacenar contexto conversacional
- Tomar decisiones — eso es responsabilidad de servicios externos

---

## Stack tecnológico

| Categoría | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Framework | NestJS | 11 |
| Lenguaje | TypeScript | 5.6 (strict mode) |
| WhatsApp | @whiskeysockets/baileys | 6.x |
| WebSocket | socket.io | 4.x |
| Validación de config | Zod | 3.x |
| Logging | Pino + pino-pretty | 9.x |
| ORM (opcional) | Prisma | 6.x |
| Cache/Auth (opcional) | ioredis | 5.x |
| Tests | Jest + ts-jest | 29.x |
| Tests E2E | Supertest | 7.x |
| Contenedores | Docker / Podman | — |
| Linting | ESLint + @typescript-eslint | 9.x / 8.x |
| Formato | Prettier | 3.x |

---

## Arquitectura

El proyecto aplica **Clean Architecture** con separación estricta de capas. Ninguna capa interna depende de las externas.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTES                             │
│          REST Client · WebSocket Client · Webhook           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       CAPA API                              │
│   SessionsController · MessagesController · HealthController│
│              DTOs + ValidationPipe (class-validator)        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   CAPA DE APLICACIÓN                        │
│   Commands: CreateSession · DeleteSession · Disconnect      │
│             SendMessage · SendMedia                         │
│   Queries:  ListSessions · GetSessionQr                     │
│   Ports:    SessionSocketPort · EventPublisherPort          │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
┌──────────────▼──────────┐   ┌────────────▼─────────────────┐
│      CAPA DE DOMINIO    │   │     CAPA DE INFRAESTRUCTURA  │
│  Session Aggregate      │   │  BaileysSessionAdapter        │
│  SessionStatus (DU)     │   │  SessionManager (Map sockets) │
│  SessionConfig VO       │   │  FilesystemAuthState          │
│  SessionId (Branded)    │   │  RedisAuthState               │
│  10 Domain Events       │   │  InMemorySessionRepository    │
│  8 Domain Errors        │   │  FilesystemSessionRepository  │
│  SessionRepository Port │   │  RedisSessionRepository       │
│  SendMessageParams VO   │   │  PrismaSessionRepository      │
│  SendMediaParams VO     │   │  WebSocketEventPublisher      │
└─────────────────────────┘   │  RestWebhookEventPublisher    │
                              │  CompositeEventPublisher      │
                              │  EventsGateway (socket.io)    │
                              └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     CROSS-CUTTING                           │
│  PinoLoggerService · CorrelationIdInterceptor               │
│  LoggingInterceptor · DomainExceptionFilter                 │
│  HttpExceptionFilter · UnexpectedExceptionFilter            │
│  RequestContext (AsyncLocalStorage) · hashJid()             │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de una sesión nueva

```
Cliente          API              Application         Baileys
   │                │                  │                  │
   │ POST /sessions │                  │                  │
   │───────────────>│                  │                  │
   │                │ CreateSession    │                  │
   │                │────────────────->│                  │
   │                │                  │ Session.create() │
   │                │                  │ repo.save()      │
   │                │                  │ socket.connect() │
   │                │                  │────────────────->│
   │ 201 {sessionId}│                  │                  │ makeWASocket()
   │<───────────────│                  │                  │───────────────
   │                │                  │   QR_GENERATED   │
   │                │                  │<─────────────────│ connection.update
   │                │ WebSocket event  │                  │
   │<═══════════════│                  │                  │
   │                │                  │                  │
   │ GET /sessions/{id}/qr             │                  │
   │───────────────>│                  │                  │
   │ {qrCode: "..."}│                  │                  │
   │<───────────────│                  │                  │
   │                │                  │  SESSION_CONNECTED│
   │ [escanea QR]   │                  │<─────────────────│ connection open
   │<═══════════════│ WebSocket event  │                  │
```

### Flujo de mensaje entrante

```
WhatsApp ──► Baileys ──► BaileysSessionAdapter
                                 │
                         Filtros obligatorios:
                         ├─ fromMe === true → ignore
                         ├─ !message → ignore
                         ├─ protocolMessage → ignore
                         ├─ age > 60s → ignore
                         └─ duplicate (Redis/Map) → ignore
                                 │
                         EventPublisher.publishMany()
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            WebSocketGateway        RestWebhookPublisher
            (socket.io emit)        (POST + HMAC-SHA256)
                    │                         │
               Clientes WS              Servicios externos
```

---

## Estructura del proyecto

```
whatsapp-connector/
├── src/
│   ├── config/
│   │   └── app.config.ts              # Validación Zod de variables de entorno
│   │
│   ├── domain/                        # Zero dependencias de frameworks
│   │   ├── shared/
│   │   │   ├── domain-event.ts        # Clase base DomainEvent
│   │   │   └── domain-error.ts        # Clase base DomainError
│   │   ├── session/
│   │   │   ├── session.aggregate.ts   # Session Aggregate (create/reconstitute)
│   │   │   ├── session-id.vo.ts       # SessionId Branded Type
│   │   │   ├── session-status.vo.ts   # Discriminated Union de estados
│   │   │   ├── session-config.vo.ts   # Configuración de sesión
│   │   │   ├── session.events.ts      # 10 Domain Events
│   │   │   ├── session.errors.ts      # 8 Domain Errors tipados
│   │   │   └── session.repository.ts  # Output Port + Symbol token
│   │   └── message/
│   │       ├── send-message.params.ts # VO + validación JID
│   │       └── send-media.params.ts   # VO + validación MIME/tamaño
│   │
│   ├── application/                   # Casos de uso — solo depende del dominio
│   │   ├── ports/
│   │   │   ├── event-publisher.port.ts
│   │   │   └── session-socket.port.ts
│   │   ├── sessions/
│   │   │   ├── commands/
│   │   │   │   ├── create-session/
│   │   │   │   ├── delete-session/
│   │   │   │   └── disconnect-session/
│   │   │   └── queries/
│   │   │       ├── list-sessions/
│   │   │       └── get-session-qr/
│   │   └── messages/
│   │       └── commands/
│   │           ├── send-message/
│   │           └── send-media/
│   │
│   ├── infrastructure/                # Adaptadores externos
│   │   ├── baileys/
│   │   │   ├── baileys-session.adapter.ts  # Implementa SessionSocketPort
│   │   │   ├── session-manager.service.ts  # Map<sessionId, WASocket>
│   │   │   ├── baileys.module.ts
│   │   │   └── auth-state/
│   │   │       ├── filesystem.auth-state.ts
│   │   │       └── redis.auth-state.ts
│   │   ├── persistence/
│   │   │   ├── in-memory.session.repository.ts
│   │   │   ├── filesystem.session.repository.ts
│   │   │   ├── redis.session.repository.ts
│   │   │   └── prisma.session.repository.ts
│   │   ├── events/
│   │   │   ├── websocket.event-publisher.ts
│   │   │   ├── rest-webhook.event-publisher.ts
│   │   │   └── composite.event-publisher.ts
│   │   └── websocket/
│   │       └── events.gateway.ts
│   │
│   ├── api/                           # Controladores HTTP
│   │   ├── sessions/
│   │   │   ├── sessions.controller.ts
│   │   │   └── dto/create-session.dto.ts
│   │   ├── messages/
│   │   │   ├── messages.controller.ts
│   │   │   └── dto/
│   │   └── health/
│   │       └── health.controller.ts
│   │
│   ├── shared/                        # Concerns transversales
│   │   ├── logging/pino-logger.service.ts
│   │   ├── context/request-context.ts  # AsyncLocalStorage + hashJid()
│   │   ├── filters/                    # 3 Exception Filters RFC 7807
│   │   └── interceptors/               # CorrelationId + Logging
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── tests/
│   ├── unit/
│   │   ├── domain/session.aggregate.spec.ts
│   │   └── application/
│   │       ├── create-session.handler.spec.ts
│   │       └── send-message.handler.spec.ts
│   └── e2e/
│       └── sessions.e2e.spec.ts
│
├── prisma/
│   └── schema.prisma
├── manage.py                          # CLI manager interactivo
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Configuración

Toda la configuración se centraliza vía variables de entorno. Copiar `.env.example` a `.env` antes de iniciar.

```bash
cp .env.example .env
```

### Variables disponibles

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor HTTP |
| `NODE_ENV` | `development` | Entorno (`development`, `production`, `test`) |
| `LOG_LEVEL` | `info` | Nivel de log (`trace`, `debug`, `info`, `warn`, `error`) |
| `SESSION_PATH` | `./sessions` | Directorio de sesiones (auth state filesystem) |
| `MAX_SESSIONS` | `10` | Máximo de sesiones simultáneas |
| `SESSION_PROVIDER` | `filesystem` | Proveedor de persistencia: `filesystem`, `redis`, `postgres` |
| `RECONNECT_INTERVAL_MS` | `5000` | Intervalo entre reintentos de reconexión (ms) |
| `MAX_RECONNECT_ATTEMPTS` | `5` | Intentos máximos de reconexión antes de abandonar |
| `HEARTBEAT_INTERVAL_MS` | `30000` | Intervalo de heartbeat (ms) |
| `MAX_MEDIA_SIZE_MB` | `16` | Tamaño máximo de archivos multimedia (MB) |
| `ALLOWED_MIME_TYPES` | `image/jpeg,...` | Tipos MIME permitidos separados por coma |
| `CORS_ENABLED` | `true` | Habilitar CORS |
| `CORS_ORIGINS` | `*` | Orígenes permitidos separados por coma |
| `ENABLE_WEBSOCKET` | `true` | Habilitar servidor WebSocket |
| `ENABLE_REST` | `true` | Habilitar API REST |
| `ENABLE_EVENTS` | `true` | Publicar eventos a clientes |
| `ENABLE_REDIS` | `false` | Habilitar Redis (auth state + dedup) |
| `REDIS_URL` | — | URL de Redis: `redis://host:6379` |
| `ENABLE_POSTGRES` | `false` | Habilitar PostgreSQL como repositorio |
| `DATABASE_URL` | — | URL de PostgreSQL (Prisma format) |
| `WEBHOOK_ENABLED` | `false` | Enviar eventos a webhook externo |
| `WEBHOOK_URL` | — | URL destino del webhook |
| `WEBHOOK_SECRET` | — | Secret para firma HMAC-SHA256 del webhook |
| `RATE_LIMIT_MAX_PER_MINUTE` | `20` | Máximo de mensajes por minuto por sesión |
| `RATE_LIMIT_MIN_DELAY_MS` | `500` | Delay mínimo entre mensajes (ms) |

---

## Instalación y ejecución

### Modo desarrollo (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env

# 3. Iniciar con hot-reload
npm run start:dev
```

El servidor queda disponible en `http://localhost:3000`.

### Modo producción (local)

```bash
npm run build
npm run start:prod
```

### Manager interactivo

```bash
python3 manage.py
```

Menú con todas las opciones: desarrollo, Docker, Podman, pruebas de API, utilidades.

---

## API REST

### Sesiones

#### `GET /sessions`
Lista todas las sesiones registradas.

```bash
curl http://localhost:3000/sessions
```

```json
[
  {
    "id": "mi-sesion",
    "status": "open",
    "statusKind": "open",
    "isConnected": true,
    "createdAt": "2026-06-14T12:00:00.000Z",
    "updatedAt": "2026-06-14T12:01:30.000Z"
  }
]
```

---

#### `POST /sessions`
Crea una nueva sesión e inicia el proceso de conexión con WhatsApp.

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "mi-sesion"}'
```

```json
{ "sessionId": "mi-sesion" }
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `sessionId` | string | ✔ | Alfanumérico, máx 64 chars (`a-z A-Z 0-9 _ -`) |
| `maxReconnectAttempts` | number | — | Override de intentos de reconexión |
| `reconnectIntervalMs` | number | — | Override del intervalo de reconexión (ms) |

---

#### `GET /sessions/{id}/qr`
Retorna el código QR actual de la sesión (disponible ~5 segundos después de crearla).

```bash
curl http://localhost:3000/sessions/mi-sesion/qr
```

```json
{
  "sessionId": "mi-sesion",
  "qrCode": "2@xxx...",
  "expiresAt": "2026-06-14T12:02:30.000Z"
}
```

> El QR expira en ~90 segundos. Baileys genera uno nuevo automáticamente; volver a consultar el endpoint.

---

#### `POST /sessions/{id}/disconnect`
Desconecta la sesión sin eliminarla. Puede reconectarse posteriormente.

```bash
curl -X POST http://localhost:3000/sessions/mi-sesion/disconnect
```

`204 No Content`

---

#### `DELETE /sessions/{id}`
Elimina la sesión y libera todos los recursos asociados.

```bash
curl -X DELETE http://localhost:3000/sessions/mi-sesion
```

`204 No Content`

---

### Mensajes

#### `POST /messages/send`
Envía un mensaje de texto.

```bash
curl -X POST http://localhost:3000/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "mi-sesion",
    "to": "5491122334455@s.whatsapp.net",
    "text": "Hola desde whatsapp-connector!"
  }'
```

```json
{
  "messageId": "3EB0...",
  "sessionId": "mi-sesion",
  "to": "5491122334455@s.whatsapp.net",
  "sentAt": "2026-06-14T12:05:00.000Z"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `sessionId` | string | ✔ | ID de sesión activa |
| `to` | string | ✔ | JID de WhatsApp (`número@s.whatsapp.net` o `grupoId@g.us`) |
| `text` | string | ✔ | Contenido del mensaje (máx 4096 chars) |
| `quotedMessageId` | string | — | ID del mensaje a citar/responder |

---

#### `POST /messages/send-media`
Envía un archivo multimedia (imagen, video, audio, documento).

```bash
curl -X POST http://localhost:3000/messages/send-media \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "mi-sesion",
    "to": "5491122334455@s.whatsapp.net",
    "mimeType": "image/jpeg",
    "fileName": "foto.jpg",
    "data": "<base64>",
    "caption": "Imagen de prueba"
  }'
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `sessionId` | string | ✔ | ID de sesión activa |
| `to` | string | ✔ | JID de WhatsApp |
| `mimeType` | string | ✔ | Tipo MIME del archivo |
| `fileName` | string | ✔ | Nombre del archivo |
| `data` | string | ✔ | Contenido en Base64 |
| `caption` | string | — | Texto acompañante (máx 1024 chars) |

---

### Health

#### `GET /health`
Estado del servicio.

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "info": {
    "memory_heap": { "status": "up" },
    "whatsapp_sessions": { "status": "up", "activeSessions": 2 }
  }
}
```

---

### Formato de errores (RFC 7807)

Todos los errores siguen el estándar [Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807).

```json
{
  "type": "https://whatsapp-connector/errors/session-not-found",
  "title": "SessionNotFoundError",
  "status": 404,
  "detail": "Session 'mi-sesion' not found",
  "correlationId": "a1b2c3d4-...",
  "timestamp": "2026-06-14T12:00:00.000Z"
}
```

| Error | HTTP | Código |
|---|---|---|
| Sesión no encontrada | 404 | `SESSION_NOT_FOUND` |
| Sesión ya existe | 409 | `SESSION_ALREADY_EXISTS` |
| Límite de sesiones alcanzado | 422 | `SESSION_LIMIT_REACHED` |
| Sesión no conectada | 409 | `SESSION_NOT_CONNECTED` |
| QR no disponible | 404 | `SESSION_QR_NOT_AVAILABLE` |
| JID inválido | 422 | `INVALID_JID` |
| Archivo demasiado grande | 413 | `MEDIA_TOO_LARGE` |
| MIME type no permitido | 415 | `MIME_TYPE_NOT_ALLOWED` |

---

## Eventos WebSocket

Conectar al servidor con cualquier cliente socket.io:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("SESSION_CREATED",       (event) => console.log(event));
socket.on("SESSION_CONNECTED",     (event) => console.log(event));
socket.on("SESSION_DISCONNECTED",  (event) => console.log(event));
socket.on("SESSION_RECONNECTED",   (event) => console.log(event));
socket.on("QR_GENERATED",          (event) => console.log(event));
socket.on("MESSAGE_RECEIVED",      (event) => console.log(event));
socket.on("PRIVATE_MESSAGE_RECEIVED", (event) => console.log(event));
socket.on("GROUP_MESSAGE_RECEIVED",   (event) => console.log(event));
socket.on("MEDIA_RECEIVED",        (event) => console.log(event));
socket.on("MESSAGE_SENT",          (event) => console.log(event));
```

### Payload de ejemplo — `MESSAGE_RECEIVED`

```json
{
  "eventName": "MESSAGE_RECEIVED",
  "occurredAt": "2026-06-14T12:10:00.000Z",
  "sessionId": "mi-sesion",
  "messageId": "3EB0...",
  "from": "5491122334455@s.whatsapp.net",
  "isGroup": false,
  "type": "conversation",
  "timestamp": 1749902400
}
```

> **Nota de privacidad:** Los JIDs nunca se incluyen en logs. Internamente se hashean con SHA-256 para trazabilidad.

---

## Persistencia

El proveedor de persistencia se selecciona con `SESSION_PROVIDER`:

| Proveedor | `SESSION_PROVIDER` | Requiere | Descripción |
|---|---|---|---|
| Filesystem | `filesystem` | — | Archivos JSON en `SESSION_PATH/.meta/` |
| Redis | `redis` | `ENABLE_REDIS=true` + `REDIS_URL` | Keys con prefijo `wac:session:` |
| PostgreSQL | `postgres` | `ENABLE_POSTGRES=true` + `DATABASE_URL` | Tabla `whatsapp_session` (Prisma) |

El **auth state de Baileys** (credenciales Signal Protocol) también se puede almacenar en:
- **Filesystem** (default): directorio `SESSION_PATH/{sessionId}/`
- **Redis** (cuando `ENABLE_REDIS=true`): keys `wac:auth:{sessionId}:*`

---

## Observabilidad

### Logs estructurados (Pino)

```json
{
  "level": "info",
  "time": "2026-06-14T12:00:00.000Z",
  "service": "whatsapp-connector",
  "version": "1.0.0",
  "env": "production",
  "correlationId": "a1b2c3d4-...",
  "context": "CreateSessionHandler",
  "msg": "Session created"
}
```

Todos los requests HTTP y mensajes de WhatsApp tienen un `correlationId` (UUID v4) propagado via `AsyncLocalStorage`.

### Seguridad en logs

- **JIDs y números de teléfono**: nunca se loggean en texto plano. Se hashean con SHA-256 (primeros 12 caracteres del hex).
- **Texto de mensajes**: nunca se loggea (privacidad GDPR).
- **Credenciales y tokens**: nunca se loggean.
- **Stack traces**: nunca se incluyen en respuestas HTTP (solo en logs internos).

---

## Tests

```bash
# Tests unitarios (sin dependencias externas)
npm test

# Tests E2E (API completa con adaptadores InMemory)
npm run test:e2e

# Cobertura completa
npm run test:cov

# Type checking
npx tsc --noEmit
```

### Estrategia de tests

| Tipo | Cobertura | Herramienta | Dependencias |
|---|---|---|---|
| Unitarios | Domain + Application | Jest | Ninguna (InMemory adapters) |
| E2E | API REST | Jest + Supertest | NestJS testing module |

Los tests de aplicación usan **InMemory adapters** en lugar de `jest.fn()` para mayor fidelidad.

---

## Docker

### Desarrollo rápido (sin dependencias adicionales)

```bash
cp .env.example .env
docker-compose up whatsapp-connector --build
```

### Con Redis (auth state y dedup persistente)

```bash
ENABLE_REDIS=true REDIS_URL=redis://redis:6379 \
docker-compose --profile redis up --build
```

### Con PostgreSQL (repositorio de sesiones)

```bash
ENABLE_POSTGRES=true DATABASE_URL=postgresql://wac:wac_secret@postgres:5432/whatsapp_connector \
SESSION_PROVIDER=postgres \
docker-compose --profile postgres up --build
```

### Build manual

```bash
docker build -t whatsapp-connector:1.0.0 .
docker run -p 3000:3000 --env-file .env whatsapp-connector:1.0.0
```

---

## Manager CLI

`manage.py` es un menú interactivo para gestionar el ciclo de vida del proyecto:

```bash
python3 manage.py
```

```
╔══════════════════════════════════════════════════╗
║        whatsapp-connector — manager              ║
╚══════════════════════════════════════════════════╝
  Runtime : DOCKER   Compose: docker compose

  ── DESARROLLO LOCAL ──────────────────────────────
  [1]  Instalar dependencias
  [2]  Iniciar en modo desarrollo
  [3]  Build producción
  [4]  Unit tests
  [5]  E2E tests
  ...
```

Detecta automáticamente Docker o Podman disponible en el sistema.

---

## Decisiones de diseño

### Clean Architecture — sin framework en el dominio
El dominio (`src/domain/`) no importa nada de NestJS, Prisma, Baileys ni ningún framework. Esto permite testear la lógica de negocio con tests síncronos sin setup de infraestructura.

### CQRS Liviano
Se usa separación de paquetes `commands/` y `queries/` sin Event Bus ni buses tipados. Justificado porque este servicio no tiene múltiples Bounded Contexts consumiendo los mismos eventos internamente — los eventos se publican externamente via `EventPublisherPort`.

### SessionManager en memoria
Los sockets de Baileys (`WASocket`) son conexiones WebSocket stateful no serializables. Viven en un `Map<sessionId, WASocket>` en memoria. Los **metadatos** de sesión (estado, config, timestamps) se persisten en el proveedor configurado.

### EventPublisher intercambiable
Implementado como un Port (`EventPublisherPort`) con múltiples adaptadores (WebSocket, REST Webhook). El `CompositeEventPublisher` fanea a todos los publishers activos según la configuración. Agregar un publisher nuevo (Kafka, Redis Pub/Sub, NATS) no requiere modificar la capa de aplicación.

### Filtros obligatorios en mensajes Baileys
Para evitar procesamiento duplicado y mensajes del sistema:
```
fromMe === true        → ignorar
!message              → ignorar (notificación vacía)
protocolMessage        → ignorar (mensajes internos de WhatsApp)
age > 60 segundos      → ignorar (mensajes históricos al reconectar)
key.id duplicado       → ignorar (dedup Redis TTL 5 min)
```

### Configuration over Code
Todas las decisiones de runtime (proveedor de persistencia, canales de eventos, rate limits, CORS, TLS) se toman leyendo `process.env` validado por Zod al inicio. Una nueva instalación se adapta a distintos entornos cambiando únicamente el `.env`.

---

## Licencia

Privado — uso interno.
