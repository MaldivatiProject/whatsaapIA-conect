# whatsaap-backend

Backend de automatización para WhatsApp. Recibe eventos generados por
`whatsapp-connector`, evalúa reglas de negocio versionadas, administra el estado
de cada conversación y solicita acciones mediante RabbitMQ.

> El nombre del directorio conserva `whatsaap` por compatibilidad con el
> repositorio existente. En contratos y nombres de dominio se usa `whatsapp`.

## Estado

Implementación inicial operativa:

- [Arquitectura orientada a eventos](docs/architecture/event-driven-architecture.md)
- [Plan de ejecución](docs/plans/execution-plan.md)
- [ADR 0001: RabbitMQ como bus de integración](docs/adr/0001-rabbitmq-event-bus.md)

Incluye API FastAPI, CRUD de reglas, validación/simulación, auditoría de
ejecuciones, migraciones Flyway, inbox/outbox transaccional, relay RabbitMQ,
workers y bridge transitorio hacia el REST actual de `whatsapp-connector`.

## Responsabilidades

El backend:

- consume mensajes entrantes normalizados;
- garantiza deduplicación persistente;
- evalúa reglas por tenant, sesión, prioridad y versión;
- mantiene el estado conversacional;
- crea y ejecuta acciones de manera asíncrona;
- registra cada decisión y resultado para auditoría;
- publica comandos para enviar mensajes;
- procesa confirmaciones o fallos de entrega.

No administra sockets, QR ni credenciales de WhatsApp. Esas responsabilidades
permanecen en `whatsapp-connector`.

## Stack tecnológico

| Área | Tecnología | Decisión |
|---|---|---|
| Lenguaje | Python 3.12+ | Tipado estricto y ejecución asíncrona |
| API | FastAPI + Uvicorn | API administrativa y adaptador webhook transitorio |
| Validación | Pydantic v2 | DTO, configuración y contratos de entrada |
| Mensajería | RabbitMQ 4.x, AMQP 0-9-1 | Bus durable orientado a eventos y comandos |
| Cliente AMQP | aio-pika | Conexiones robustas, confirms y consumidores async |
| Base de datos | PostgreSQL 16+ | Reglas, conversaciones, inbox, outbox y auditoría |
| Persistencia | SQLAlchemy 2 async + asyncpg | Repositorios y unidades de trabajo |
| Migraciones | Flyway | SQL versionado, reproducible y promovible por pipeline |
| Contratos | JSON Schema 2020-12 | Versionado y compatibilidad en CI |
| Logs | structlog | Logs JSON con correlación y sin PII innecesaria |
| Métricas | Prometheus client | API, workers, outbox, inbox, retry y DLQ |
| Trazas | OpenTelemetry | Propagación W3C entre HTTP, AMQP y dependencias |
| Calidad | pytest, pytest-asyncio, Testcontainers | Unitarias, integración y E2E reales |
| Estática | Ruff, mypy strict, Bandit | Formato, lint, tipos y seguridad |
| Empaquetado | pyproject.toml + hatchling | Artefacto instalable y entrypoints por proceso |
| Runtime | Docker Compose local; contenedor OCI | Misma imagen, procesos independientes |

La versión exacta de RabbitMQ/Erlang y de la imagen OCI se fijará después de
validar la matriz oficial de compatibilidad. Producción no utilizará etiquetas
`latest`.

### Por qué no Celery

Los contratos, exchanges, routing, acknowledgements y publisher confirms son
parte explícita de la arquitectura. Usar `aio-pika` evita ocultar esas garantías
detrás del modelo de tareas de Celery y permite validar retornos `mandatory`,
backpressure, retry y DLQ directamente.

## Arquitectura

Se aplica Clean Architecture + Hexagonal Architecture + DDD en un monolito
modular. API, consumidores y relay de outbox se ejecutan como procesos separados
desde el mismo artefacto y pueden extraerse sin modificar el dominio.

```text
whatsapp-connector
        │ whatsapp.message.received.v1
        ▼
  whatsapp.events (topic)
        │
        ▼
automation.inbound-message.q (quorum)
        │ manual ack después del commit
        ▼
 Inbox → Rule Engine → Conversation → Execution → Outbox
                                                   │
                                      confirm + mandatory
                                                   ▼
                                      whatsapp.commands (direct)
                                                   │
                                                   ▼
                                      whatsapp-connector / bridge
                                                   │
                         whatsapp.message.sent|failed.v1
                                                   ▼
                                       automation delivery consumer
```

### Capas

```text
src/
├── domain/             # Reglas, conversaciones, ejecuciones y eventos
├── application/        # Casos de uso, puertos, DTO y unidad de trabajo
├── infrastructure/     # PostgreSQL, RabbitMQ, HTTP y observabilidad
├── presentation/       # FastAPI, schemas y manejo de errores
└── bootstrap/          # Composición de API, workers y outbox relay
```

Reglas de dependencia:

```text
presentation   → application → domain
infrastructure → application → domain
bootstrap      → todas las capas para composición
domain         → ninguna capa externa ni framework
```

## Modelo de dominio inicial

- `BusinessRule`: tenant, alcance, prioridad, versión, condiciones, acciones y
  vigencia.
- `Conversation`: estado y versión optimista por tenant/sesión/chat.
- `RuleExecution`: decisión tomada, versión de regla, estado y resultados.
- `Action`: intención idempotente de enviar mensaje, invocar webhook, consultar
  IA, modificar estado o escalar a una persona.
- `InboxMessage`: mensaje consumido y resultado durable de deduplicación.
- `OutboxMessage`: contrato pendiente de publicación confirmada.
- `ContactIdentity`: mapeo configurable `@lid → @s.whatsapp.net` por tenant y
  opcionalmente por sesión, usado para normalizar remitentes y respuestas.
- `BusinessMessage`: mensaje/dato de negocio trazable por origen (`WHATSAPP`,
  `EMAIL`, `MANUAL`) y categoría (`TRASLADO_TIENDA`, `CREAR_USUARIO`, etc.),
  con metadata estructurada en JSONB para decisiones y reportes.

Las condiciones usan una DSL declarativa con operadores permitidos. No se
ejecutará Python, JavaScript, SQL ni expresiones arbitrarias almacenadas en DB.

## Contrato AMQP

Todos los mensajes utilizan un envelope estable:

```json
{
  "message_id": "01J...",
  "message_type": "whatsapp.message.received",
  "schema_version": 1,
  "occurred_at": "2026-07-08T15:00:00Z",
  "producer": "whatsapp-connector",
  "correlation_id": "01J...",
  "causation_id": null,
  "tenant_id": "tenant-42",
  "content_type": "application/json",
  "payload": {}
}
```

No se incluyen secretos ni archivos binarios. Los medios se transmiten como
metadatos y referencias con acceso temporal controlado.

## Topología RabbitMQ resumida

| Exchange | Tipo | Publicador | Propósito |
|---|---|---|---|
| `whatsapp.events` | topic | connector | Eventos observados en WhatsApp |
| `whatsapp.commands` | direct | backend | Intenciones dirigidas al connector |
| `automation.events` | topic | backend | Resultados del dominio de automatización |

| Cola principal | Tipo | Binding principal | Consumidor |
|---|---|---|---|
| `automation.inbound-message.q` | quorum | `whatsapp.message.received.v1` | rule worker |
| `automation.delivery-result.q` | quorum | `whatsapp.message.sent.v1`, `whatsapp.message.failed.v1` | delivery worker |
| `connector.message-send.q` | quorum | `whatsapp.message.send.v1` | connector o bridge transitorio |

Cada cola crítica tiene retry acotado de referencia `5s → 30s → 5m` y DLQ de
cuarentena. Esas demoras se validarán con el SLA real antes de producción.

## Garantías

- Entrega: **at-least-once**; no se promete exactly-once.
- Productores: mensajes persistentes, publisher confirms y `mandatory=true`.
- Consumidores: manual ack únicamente después del commit o efecto durable.
- Idempotencia: `message_id` único en inbox y clave estable para efectos externos.
- Dual write: transactional outbox en la misma transacción del estado de negocio.
- Retry: acotado, con backoff; ningún `requeue` inmediato infinito.
- Orden: no existe orden global. El estado conversacional usa versión y bloqueo
  transaccional por conversación; los mensajes atrasados no pisan estados nuevos.
- Replay: no se promete desde quorum queues. La auditoría durable vive en
  PostgreSQL; si el negocio exige replay temporal se evaluará RabbitMQ Streams.

## Seguridad

- AMQPS/TLS obligatorio fuera de desarrollo local.
- Un vhost por ambiente y clusters separados para producción/no producción.
- Identidades distintas para connector, backend consumer, backend publisher,
  topology deployer y monitor.
- Permisos `configure/write/read` mínimos mediante regex probadas.
- Management UI y métricas restringidas a red de operación.
- Secretos inyectados en runtime; nunca en Git, imágenes, URLs o logs.
- Payloads, headers, DLQ y trazas minimizan PII.
- Todas las API se aíslan por `tenant_id` derivado de la identidad autenticada,
  nunca aceptado ciegamente desde el body.

## Procesos desplegables

```text
api                 FastAPI para reglas, simulación, ejecuciones y webhook
worker-rules        consume whatsapp.message.received.v1 y evalúa reglas
worker-delivery     consume sent/failed y cierra auditoría de ejecución
outbox-relay        publica outbox con mensajes persistentes y mandatory=true
connector-bridge    consume comandos AMQP y llama el REST actual del connector
```

Todos los procesos de larga duración tienen `healthcheck` Docker:

- `api`: consulta `/health/ready`.
- `worker-rules`: valida RabbitMQ y la cola `automation.inbound-message.q`.
- `worker-delivery`: valida RabbitMQ y la cola `automation.delivery-result.q`.
- `outbox-relay`: valida PostgreSQL y RabbitMQ.
- `connector-bridge`: valida RabbitMQ y la cola `connector.message-send.q`.

## API implementada

```text
POST   /api/v1/contact-identities
GET    /api/v1/contact-identities
GET    /api/v1/contact-identities/{identity_id}
PATCH  /api/v1/contact-identities/{identity_id}
DELETE /api/v1/contact-identities/{identity_id}
POST   /api/v1/rules
GET    /api/v1/rules
GET    /api/v1/rules/{rule_id}
PATCH  /api/v1/rules/{rule_id}
DELETE /api/v1/rules/{rule_id}
POST   /api/v1/rules/validate
POST   /api/v1/rules/simulate
GET    /api/v1/reports/summary
GET    /api/v1/reports/messages
GET    /api/v1/reports/categories
GET    /api/v1/reports/rules
GET    /api/v1/reports/deliveries
GET    /api/v1/executions
GET    /api/v1/executions/{execution_id}
POST   /webhooks/whatsapp-connector
GET    /health/live
GET    /health/ready
GET    /metrics
```

La autenticación de la API usa `x-api-key` con el mismo formato del connector:
`API_KEYS=tenant:secret,tenant2:secret2`. El `tenant_id` siempre se deriva de la
clave y no se acepta desde el body.

### Reportes

Los reportes se calculan desde PostgreSQL, no desde RabbitMQ. RabbitMQ transporta
mensajes; la auditoría durable vive en `rule_executions`.

Las reglas tienen `category` con valor por defecto `general`. Cada ejecución
guarda las categorías de las reglas que hicieron match, para reportar mensajes
procesados por categoría incluso si luego se edita la regla.

Filtros soportados:

```text
from=2026-07-09T00:00:00Z
to=2026-07-10T00:00:00Z
session_id=test
limit=100
```

Ejemplos:

```bash
curl -H "x-api-key: <tenant-secret>" \
  "http://localhost:8000/api/v1/reports/summary?from=2026-07-09T00:00:00Z"

curl -H "x-api-key: <tenant-secret>" \
  "http://localhost:8000/api/v1/reports/categories"
```

### Mensajes de negocio trazables

La tabla `automation_schema.business_messages` guarda datos de negocio
extraídos desde distintos canales sin acoplarlos a WhatsApp. El canal queda en
`source_origin` y la decisión de negocio en `business_category`.

Ejemplo para un traslado de tienda recibido por WhatsApp:

```json
{
  "source_origin": "WHATSAPP",
  "business_category": "TRASLADO_TIENDA",
  "metadata": {
    "promoter": "WOMER",
    "full_name": "Jesús Alberto Quiñones Quiñones",
    "document_number": "1023031587",
    "phone": "3027529244",
    "email": "jesus.quinonestem@movilpt.co",
    "new_store": "Kiosco Único",
    "new_warehouse": "533"
  }
}
```

Ejemplo para creación de usuario cargada manualmente:

```json
{
  "source_origin": "MANUAL",
  "business_category": "CREAR_USUARIO",
  "created_by": "operador.backoffice",
  "metadata": {
    "full_name": "Nombre del usuario",
    "document_number": "123456789",
    "role": "promotor",
    "email": "usuario@example.com"
  }
}
```

Por defecto no se almacena el texto completo del mensaje; se guarda
`raw_text_hash` para trazabilidad/idempotencia sin duplicar PII innecesaria. La
metadata sí puede contener PII de negocio y debe tratarse como dato sensible.

### Identidades WhatsApp (`@lid` ↔ phone JID)

WhatsApp puede entregar un mensaje privado con remitente como
`99132626702366@lid`, aunque para responder o para reglas de negocio el operador
conozca al contacto como `573243744739@s.whatsapp.net`. Ese vínculo no es
derivable por algoritmo; debe configurarse.

Ejemplo:

```json
{
  "session_id": "test",
  "lid_jid": "99132626702366@lid",
  "phone_jid": "573243744739@s.whatsapp.net",
  "display_name": "Cliente prueba",
  "enabled": true
}
```

Cuando existe este mapeo:

- `sender` se normaliza al phone JID antes de evaluar reglas.
- `raw_sender` conserva el valor original `@lid`.
- Las condiciones sobre `sender` comparan contra aliases, por lo que una regla
  con `sender == 573243744739@s.whatsapp.net` matchea aunque el evento haya
  llegado como `99132626702366@lid`.
- Las acciones `send_text` responden a `reply_to_jid`, que queda apuntando al
  phone JID configurado.
- En plantillas se pueden usar `{{ sender }}`, `{{ raw_sender }}`,
  `{{ sender_lid_jid }}`, `{{ sender_phone_jid }}` y `{{ reply_to_jid }}`.

## Reutilización del deployment existente

El compose del `whatsapp-connector` es dueño de la red Docker compartida
`whatsapp-platform` y de los servicios opcionales:

```bash
cd ../whatsapp-connector
docker compose --profile postgres --profile valkey --profile rabbitmq up -d
```

Este backend reutiliza esos servicios:

- PostgreSQL: misma base `whatsapp_connector`, schema aislado
  `automation_schema`.
- Valkey: disponible por `VALKEY_URL`; reservado para cache/idempotencia
  distribuida cuando una regla lo requiera.
- RabbitMQ: vhost compartido `whatsapp`, exchanges/colas declarados de forma
  idempotente por los procesos del backend.

No copies secretos del `.env` real al repositorio. Crea el `.env` del backend a
partir de `.env.example` y alinea:

```text
DATABASE_URL
FLYWAY_URL
FLYWAY_USER
FLYWAY_PASSWORD
RABBITMQ_URL
CONNECTOR_API_KEY
WEBHOOK_SECRET
API_KEYS
```

Para que el connector entregue eventos al backend usando el webhook existente:

```text
WEBHOOK_ENABLED=true
WEBHOOK_URL=http://whatsaap-backend-api:8000/webhooks/whatsapp-connector
WEBHOOK_SECRET=<mismo valor que en whatsaap-backend>
```

El modo por defecto del backend es `WEBHOOK_PROCESSING_MODE=outbox`: el webhook
solo persiste el evento, el relay lo publica en RabbitMQ y `worker-rules` evalúa
las reglas. Para depuración local sin RabbitMQ se puede usar
`WEBHOOK_PROCESSING_MODE=direct`.

## Calidad requerida

Antes de producción deben aprobarse:

```text
ruff check .
ruff format --check .
mypy --strict src
pytest --cov=src --cov-fail-under=80
bandit -r src
```

También son obligatorias pruebas contractuales, autorización positiva/negativa,
duplicados, caída antes/después del commit, publisher return, retry/DLQ, redrive
selectivo, pérdida de conexión y quorum N-1.

## Desarrollo

Instalación local:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
```

Validación local:

```bash
ruff format --check .
ruff check .
mypy src
pytest
bandit -r src
```

Ejecución por Compose, reutilizando la red/infra del connector:

```bash
docker compose run --rm migrate
docker compose up -d api outbox-relay worker-rules worker-delivery connector-bridge
```
