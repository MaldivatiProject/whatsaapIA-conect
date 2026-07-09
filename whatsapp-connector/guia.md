# Guía de configuración y conexión — whatsapp-connector

Guía práctica para dejar el microservicio corriendo y conectar un número de WhatsApp real. Para el detalle completo de arquitectura y API, ver [`README.md`](README.md).

> **Qué es:** un gateway (NestJS + [Baileys](https://github.com/WhiskeySockets/Baileys)) que administra sesiones de WhatsApp, expone REST/WebSocket y publica los eventos hacia afuera. No contiene lógica de negocio ni IA.

---

## 1. Requisitos previos

- Node.js 22 LTS + npm
- Docker o Podman (opcional, para el modo contenedor)
- Un teléfono con WhatsApp para escanear el QR de vinculación
- Python 3 (opcional, solo para el `manage.py` interactivo)

---

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

El proyecto sigue el principio **"Configuration over Code"**: todo el comportamiento se define en `.env`, validado con Zod al arrancar (`src/config/app.config.ts`). Si falta o hay un valor inválido, el proceso no levanta y loguea el error de validación.

> Este repo ya trae un `.env` de ejemplo con perfil de producción (`SESSION_PROVIDER=valkey`, claves ya generadas). Puedes usarlo como referencia, pero **regenera los secretos** (`AUTH_STATE_ENCRYPTION_KEY`, `API_KEYS`, `POSTGRES_PASSWORD`) antes de usarlo en un entorno real.

### 2.1 Variables mínimas para arrancar en desarrollo

Con los defaults de `.env.example` alcanza para un arranque local básico (filesystem, sin Valkey/Postgres). Solo revisa:

| Variable | Qué hacer |
|---|---|
| `AUTH_ENABLED` / `API_KEYS` | Define al menos un owner: `miapp:una-clave-de-16-caracteres-o-mas` |
| `SESSION_PATH` | Carpeta donde se guardan credenciales de sesión (`./sessions` por defecto) |
| `CORS_ORIGINS` | Ajusta si vas a llamar desde un frontend en otro puerto |

### 2.2 Generar secretos fuertes

```bash
# API key por owner (formato: ownerId:secret, secret >= 16 caracteres)
node -e "console.log('miapp:' + require('crypto').randomBytes(24).toString('hex'))"

# AUTH_STATE_ENCRYPTION_KEY (32 bytes en base64) — obligatoria en producción
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# WEBHOOK_SECRET (si usas webhooks) — mínimo 32 caracteres
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Reglas de validación a tener presentes

`app.config.ts` rechaza el arranque si:

- `NODE_ENV=production` y **no** hay `AUTH_STATE_ENCRYPTION_KEY` válida (32 bytes base64).
- `NODE_ENV=production` y **no** hay Valkey habilitado (`ENABLE_VALKEY=true` + `VALKEY_URL`) — en producción el auth state no puede vivir solo en filesystem.
- `NODE_ENV=production` y `CORS_ORIGINS=*` (CORS wildcard prohibido).
- `SESSION_PROVIDER=valkey` sin `ENABLE_VALKEY=true` + `VALKEY_URL`.
- `SESSION_PROVIDER=postgres` sin `ENABLE_POSTGRES=true` + `DATABASE_URL`.
- `WEBHOOK_ENABLED=true` sin `WEBHOOK_URL` o con `WEBHOOK_SECRET` de menos de 32 caracteres.
- `TLS_ENABLED=true` sin `TLS_CERT_PATH` / `TLS_KEY_PATH`.

### 2.4 Elegir proveedor de persistencia (`SESSION_PROVIDER`)

| Proveedor | Uso recomendado | Variables asociadas |
|---|---|---|
| `filesystem` (default) | Desarrollo local, prueba rápida | `SESSION_PATH` |
| `valkey` | Producción / multi-instancia, dedup de mensajes | `ENABLE_VALKEY=true`, `VALKEY_URL=redis://...` |
| `postgres` | Cuando ya tienes Postgres y quieres consultar sesiones por SQL | `ENABLE_POSTGRES=true`, `DATABASE_URL=postgresql://...` |

El **auth state de Baileys** (credenciales del Signal Protocol) se guarda por separado, en filesystem (`SESSION_PATH/{sessionId}/`) o en Valkey si `ENABLE_VALKEY=true`.

---

## 3. Levantar el servicio

### Opción A — Desarrollo local (hot-reload)

```bash
npm ci
cp .env.example .env   # si no lo hiciste antes
npm run start:dev
```

Servicio en `http://localhost:3000`. Swagger disponible en `http://localhost:3000/docs` (activo por defecto fuera de producción).

### Opción B — Manager interactivo

```bash
python3 manage.py
```

Menú con instalación de dependencias, modo desarrollo, build, Docker/Podman, tests y utilidades de prueba de API. Detecta automáticamente si tienes Docker o Podman.

### Opción C — Docker (recomendado para producción)

```bash
cp .env.example .env
# Editar AUTH_STATE_ENCRYPTION_KEY y API_KEYS antes de levantar
docker compose up -d whatsapp-connector --build
```

Con Valkey (auth state y deduplicación persistentes):

```bash
SESSION_PROVIDER=valkey ENABLE_VALKEY=true VALKEY_URL=redis://valkey:6379 \
docker compose --profile valkey up -d --build
```

Con PostgreSQL (repositorio de sesiones):

```bash
ENABLE_POSTGRES=true DATABASE_URL=postgresql://wac:wac_secret@postgres:5432/whatsapp_connector \
SESSION_PROVIDER=postgres \
docker compose --profile postgres up -d --build
```

### Opción D — Producción local (sin Docker)

```bash
npm run build
npm run start:prod
```

### Verificar que arrancó

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "info": {
    "memory_heap": { "status": "up" },
    "whatsapp_sessions": { "status": "up", "activeSessions": 0 }
  }
}
```

---

## 4. Conectar un número de WhatsApp (flujo de vinculación)

Todas las rutas salvo `GET /health` requieren `x-api-key` (usa el `secret` configurado en `API_KEYS`).

```bash
export API_KEY="tu-secret-de-API_KEYS"
export BASE_URL="http://localhost:3000"
```

### Paso 1 — Crear la sesión

```bash
curl -X POST "$BASE_URL/sessions" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "mi-sesion"}'
```

`sessionId` debe ser alfanumérico (`a-z A-Z 0-9 _ -`), máximo 64 caracteres.

### Paso 2 — Obtener el QR

El QR tarda ~5 segundos en generarse tras crear la sesión.

```bash
curl "$BASE_URL/sessions/mi-sesion/qr" -H "x-api-key: $API_KEY"
```

```json
{ "qrCode": "2@xxx...", "expiresAt": "2026-07-08T12:02:30.000Z" }
```

El QR expira en ~90 segundos; si expira, Baileys genera uno nuevo automáticamente — vuelve a consultar el endpoint. Para escanearlo con el teléfono, convierte el `qrCode` a imagen (por ejemplo con la librería `qrcode` en Node, o pegándolo en cualquier generador de QR local) y ábrelo con **WhatsApp → Dispositivos vinculados → Vincular un dispositivo**.

### Paso 3 — Confirmar conexión

```bash
curl "$BASE_URL/sessions" -H "x-api-key: $API_KEY"
```

```json
[{ "id": "mi-sesion", "status": "open", "createdAt": "...", "updatedAt": "..." }]
```

`status: "open"` confirma que la sesión quedó vinculada. También puedes escuchar el evento `SESSION_CONNECTED` por WebSocket (ver sección 6).

### Desconectar / eliminar

```bash
# Desconecta sin borrar credenciales (se puede reconectar sin re-escanear QR)
curl -X POST "$BASE_URL/sessions/mi-sesion/disconnect" -H "x-api-key: $API_KEY"

# Elimina la sesión y libera recursos (requiere nuevo QR para reconectar)
curl -X DELETE "$BASE_URL/sessions/mi-sesion" -H "x-api-key: $API_KEY"
```

---

## 5. Probar el envío de mensajes

```bash
curl -X POST "$BASE_URL/messages/send" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "mi-sesion",
    "to": "5491122334455@s.whatsapp.net",
    "text": "Hola desde whatsapp-connector!"
  }'
```

`to` usa formato JID: `numero@s.whatsapp.net` para chats individuales o `grupoId@g.us` para grupos.

Para multimedia, ver `POST /messages/send-media` en el [README](README.md#api-rest) (requiere `mimeType`, `fileName` y `data` en base64, respetando `MAX_MEDIA_SIZE_MB` y `ALLOWED_MIME_TYPES`).

---

## 6. Recibir eventos en tiempo real (WebSocket)

Requiere `ENABLE_WEBSOCKET=true` (default). Autentica con la misma API key.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],
  auth: { token: process.env.WHATSAPP_CONNECTOR_API_KEY },
});

socket.on("QR_GENERATED", (event) => console.log(event));
socket.on("SESSION_CONNECTED", (event) => console.log(event));
socket.on("SESSION_DISCONNECTED", (event) => console.log(event));
socket.on("MESSAGE_RECEIVED", (event) => console.log(event));
socket.on("MESSAGE_SENT", (event) => console.log(event));
```

El gateway suscribe al cliente a una sala privada `owner:<id>` según la API key — no hay broadcast entre distintos owners.

Alternativa: `WEBHOOK_ENABLED=true` + `WEBHOOK_URL` + `WEBHOOK_SECRET` para recibir los mismos eventos por POST firmado con HMAC-SHA256, sin mantener un socket abierto.

---

## 7. Probar con Postman

Colección lista en [`api/postman/whatsapp-connector.collection.json`](api/postman/whatsapp-connector.collection.json), con ambientes en [`api/postman/environments/`](api/postman/environments/) (`local`, `qa`, `prod`).

1. Importa la colección y el ambiente `local.environment.json`.
2. Completa las variables `baseUrl`, `apiKey`, `sessionId` y `to`.
3. Ejecuta en orden: crear sesión → obtener QR → escanear → enviar mensaje.

---

## 8. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| El proceso no arranca, error de Zod en consola | Variable de entorno faltante o inválida | Revisar el mensaje de `parsed.error.format()` y la sección 2.3 |
| `401 Unauthorized` en cualquier ruta | Falta `x-api-key` o no coincide con `API_KEYS` | Verificar `API_KEY` exportada y formato `ownerId:secret` en `.env` |
| QR nunca llega / `SESSION_QR_NOT_AVAILABLE` (404) | Consultaste el QR antes de los ~5s de generación, o ya expiró y se está regenerando | Esperar y reintentar `GET /sessions/{id}/qr` |
| Sesión se desconecta sola repetidamente | `MAX_RECONNECT_ATTEMPTS` agotado o el teléfono se deslogueó de "Dispositivos vinculados" | Revisar logs (`SESSION_DISCONNECTED`/`SESSION_RECONNECTED`) y volver a vincular con QR |
| `409 SESSION_ALREADY_EXISTS` | Ya existe una sesión con ese `sessionId` para el owner | Usar `DELETE /sessions/{id}` primero o elegir otro `sessionId` |
| `422 SESSION_LIMIT_REACHED` | Se llegó a `MAX_SESSIONS` | Subir el límite en `.env` o eliminar sesiones inactivas |
| `413 MEDIA_TOO_LARGE` / `415 MIME_TYPE_NOT_ALLOWED` | Archivo excede `MAX_MEDIA_SIZE_MB` o tipo no está en `ALLOWED_MIME_TYPES` | Ajustar esas variables o el archivo enviado |
| Producción no arranca por `AUTH_STATE_ENCRYPTION_KEY` o Valkey | En producción son obligatorios | Generar la clave (sección 2.2) y habilitar `ENABLE_VALKEY` + `VALKEY_URL` |

---

## 9. Referencia rápida de comandos

```bash
npm run start:dev      # desarrollo con hot-reload
npm run build && npm run start:prod   # producción local
npm test                # unit tests
npm run test:e2e        # e2e (adaptadores InMemory)
npm run lint             # lint
npm run typecheck        # chequeo de tipos
docker compose up -d whatsapp-connector --build   # producción en contenedor
python3 manage.py        # menú interactivo
```

Para más detalle (arquitectura Clean Architecture, catálogo completo de variables, formato de errores RFC 7807, decisiones de diseño), ver [`README.md`](README.md) y los ADR en [`docs/adr/`](docs/adr/).
