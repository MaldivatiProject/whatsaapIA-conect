# whatsapp-dashboard

Panel operativo (Next.js + React + TypeScript) para gestionar y monitorear
[`whatsapp-connector`](../whatsapp-connector): crear y vincular sesiones por QR, enviar
mensajes de prueba y ver en vivo la actividad (eventos WebSocket) del microservicio.

No contiene lógica de negocio propia — es un cliente delgado sobre la API REST y el
gateway WebSocket de `whatsapp-connector`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 + shadcn/ui ·
TanStack Query · Zustand · socket.io-client · react-hook-form + Zod.

Arquitectura: Feature-Sliced Design (`app` → `features` → `entities` → `shared`).

## Requisitos

- Node.js 22+
- Una instancia de `whatsapp-connector` corriendo y accesible (local o Docker), con al
  menos un API key configurado en su `API_KEYS`.

## Configuración

```bash
cp .env.example .env.local
```

| Variable | Default | Descripción |
|---|---|---|
| `NEXT_PUBLIC_CONNECTOR_API_URL` | `http://localhost:3000` | URL REST de whatsapp-connector |
| `NEXT_PUBLIC_CONNECTOR_WS_URL` | `http://localhost:3000` | URL del servidor socket.io de whatsapp-connector |
| `NEXT_PUBLIC_RULES_API_URL` | `/rules-api` | URL pública usada por el navegador para reglas y ejecuciones |
| `RULES_INTERNAL_API_URL` | `http://whatsaap-backend-api:8000` | URL interna Docker usada por el proxy Next.js `/rules-api/*` |

Son variables `NEXT_PUBLIC_*`: se inlinean en el bundle en **build time**. Cambiarlas
requiere rebuildear (`npm run build` o reconstruir la imagen Docker).

No hay API key hardcodeada: se ingresa en runtime desde la pantalla de login y vive solo
en `sessionStorage` del navegador (se borra al cerrar la pestaña).

### ⚠️ CORS en whatsapp-connector

`whatsapp-connector` valida el header `Origin` contra `CORS_ORIGINS`. Para que este
dashboard pueda llamarlo desde otro puerto (por ejemplo `http://localhost:3001` en
desarrollo), agregá ese origen al `.env` de `whatsapp-connector`:

```bash
# whatsapp-connector/.env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

y reiniciá el contenedor/proceso del connector. Sin este paso, el navegador bloquea las
requests y vas a ver errores de CORS en la consola aunque el backend esté sano.

## Desarrollo

```bash
npm install
npm run dev
```

Por defecto Next.js usa el puerto 3000; si `whatsapp-connector` ya lo está usando,
arrancá el dashboard en otro puerto:

```bash
npm run dev -- --port 3001
```

## Build y producción

```bash
npm run build
npm start
```

## Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Publica el dashboard en `http://localhost:3001` (configurable con `PORT`) apuntando a
`NEXT_PUBLIC_CONNECTOR_API_URL`, `NEXT_PUBLIC_CONNECTOR_WS_URL` y
`NEXT_PUBLIC_RULES_API_URL` (pasadas como build args, ya que son variables de cliente
inlineadas en build time).

El contenedor se conecta a la red Docker externa `whatsapp-platform`, la misma que usan
`whatsapp-connector` y `whatsaap-backend`.

Para reglas, el navegador llama al dashboard en el mismo origen:

```text
http://localhost:3001/rules-api/api/v1/rules
```

Next.js reescribe internamente esa ruta hacia:

```text
http://whatsaap-backend-api:8000/api/v1/rules
```

Esto evita depender de que Windows/WSL reenvíe `localhost:8000` al navegador.

### Configurar identidades `@lid`

La ruta `/identities` administra mapeos de remitentes WhatsApp:

```text
99132626702366@lid → 573243744739@s.whatsapp.net
```

Esto permite que una regla de remitente use el JID telefónico
`573243744739@s.whatsapp.net`, aunque el evento entrante aparezca como
`99132626702366@lid`. El backend usa el mapeo para evaluar la regla y para
responder al destino correcto.

### Reportes

La ruta `/reports` muestra mensajes procesados, mensajes con/sin regla,
respuestas enviadas o en cola, fallos, pendientes, distribución por categoría,
reglas con más coincidencias y últimos mensajes procesados.

Los datos salen del backend `/api/v1/reports/*` y se calculan sobre auditoría
persistida en PostgreSQL, no sobre RabbitMQ. En reglas se puede configurar
`category`; si queda vacío, el backend usa `general`.

## Estructura

```
src/
├── app/                    # Rutas (App Router)
│   ├── login/               # Pantalla de ingreso de API key
│   └── (dashboard)/         # Rutas autenticadas: resumen, sesiones, mensajes, reglas, identidades, reportes
├── features/
│   ├── auth/                 # API key store + guard de rutas
│   ├── sessions/              # Crear/listar/QR/desconectar/eliminar sesiones
│   ├── messages/               # Enviar texto/media
│   ├── rules/                  # CRUD de reglas del backend de automatización
│   ├── contact-identities/      # Mapeos @lid ↔ @s.whatsapp.net
│   ├── reports/                 # Reportes de mensajes, categorías, reglas y entregas
│   ├── activity/                # Feed en vivo de eventos WebSocket
│   └── health/                   # /health y /metrics
├── entities/
│   └── session/              # Modelo de sesión compartido (query, tipos, SessionSelect)
└── shared/
    ├── components/ui/        # Primitivas shadcn/ui
    ├── lib/api/apiClient.ts  # Cliente axios (header x-api-key, errores RFC 7807)
    ├── lib/socket/            # Wrapper de socket.io-client
    └── hooks/                 # useConnectorSocket, useConnectorEvent(s)
```

## Tests

```bash
npm test           # unit + integración (Vitest + React Testing Library, mocks con MSW)
npm run test:cov    # con cobertura
npm run test:e2e     # E2E (Playwright, backend de whatsapp-connector mockeado con page.route)
```

Pirámide de tests:

| Tipo | Cobertura | Herramienta |
|---|---|---|
| Unitarios | Formatters, mapeo de estados, `fileToBase64` | Vitest |
| Integración | Componentes/hooks de `sessions`, `messages`, `activity`, `auth` contra un backend mockeado (MSW) | Vitest + React Testing Library |
| E2E | Flujo login → sesiones → QR, validación de formularios, accesibilidad (`@axe-core/playwright`) en `/`, `/sessions`, `/messages`, `/activity`, `/login` | Playwright |

Los tests E2E no dependen de una instancia real de `whatsapp-connector`: interceptan las
llamadas REST con `page.route`, así que corren igual en CI.

## Alcance y próximos pasos

Esta primera versión cubre únicamente `whatsapp-connector`. No incluye todavía:

- Integración con `whatsaap-backend` (reglas/conversaciones): ese servicio todavía no
  expone una API consumible.
- Auditoría completa de Lighthouse (performance/SEO) — los checks de accesibilidad ya
  están automatizados vía `axe-core` en los tests E2E.

## Seguridad

Es un panel interno de administración (`robots: noindex`). El modelo de auth delega la
identidad al portador del API key — no lo expongas públicamente sin una capa de
autenticación adicional (reverse proxy con SSO, VPN, IP allowlist, etc.).
