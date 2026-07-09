# Arquitectura orientada a eventos

## 1. Objetivo

Procesar mensajes de WhatsApp y ejecutar reglas de negocio sin bloquear el
connector, con entrega at-least-once, idempotencia persistente, aislamiento por
tenant y trazabilidad desde el evento original hasta cada acción.

## 2. Contexto y supuestos

### Evidencia disponible

- `whatsapp-connector` administra sesiones y expone mensajes entrantes como
  eventos WebSocket/webhook.
- El evento contiene sesión, identificador, origen, tipo, timestamp y texto.
- El connector permite enviar texto/media mediante REST.
- `whatsaap-backend` inicia vacío y no existe RabbitMQ desplegado en su alcance.

### Supuestos de diseño que deben validarse

| Tema | Supuesto provisional | Impacto de cambiarlo |
|---|---|---|
| Entrega | No se acepta pérdida silenciosa | Exige outbox/inbox y quorum queues |
| Duplicados | Son posibles y deben ser inocuos | Claves únicas e idempotencia externa |
| Orden | Solo importa por conversación | Lock/versionado; no se promete orden global |
| Replay | Auditoría sí; replay operativo aún no | PostgreSQL ahora; stream si se aprueba |
| Media | No viajan binarios por RabbitMQ | Referencias temporales y metadatos |
| Tenancy | Toda regla y ejecución pertenece a tenant | Índices, auth y routing lógico aislados |
| IA | Integración opcional y asíncrona | Puerto separado, timeout y circuit breaker |

### Datos pendientes para capacity plan

- mensajes promedio, pico sostenido y burst;
- tamaño p50/p95/p99 del envelope;
- fan-out esperado;
- latencia máxima de decisión y respuesta;
- retención de auditoría y DLQ;
- RPO/RTO y dominios de fallo;
- despliegue objetivo: VM, Kubernetes o servicio administrado.

No se extrapolarán números productivos sin estos datos y una prueba de carga.

## 3. Bounded contexts

### Automation

Posee reglas, condiciones, prioridades, versiones y evaluación. Decide qué
acciones solicitar; no conoce RabbitMQ, FastAPI ni SQLAlchemy.

### Conversation

Mantiene el estado por tenant/sesión/chat. Controla transiciones y concurrencia
optimista. Una regla puede depender del estado anterior y producir uno nuevo.

### Execution

Registra una decisión y el ciclo de vida de sus acciones. Permite reconciliación,
consulta, reintento autorizado y auditoría.

### Messaging Reliability

Implementa inbox, outbox, relay, contratos, deduplicación y clasificación de
fallos. Es infraestructura al servicio de los casos de uso.

## 4. Componentes y procesos

```text
┌────────────────────┐       ┌──────────────────────┐
│ whatsapp-connector │──────▶│   whatsapp.events    │
└────────────────────┘       └──────────┬───────────┘
                                       │ binding v1
                            ┌──────────▼─────────────┐
                            │ inbound quorum queue  │
                            └──────────┬─────────────┘
                                       │ manual ack
                            ┌──────────▼─────────────┐
                            │ rule worker            │
                            │ inbox + UoW            │
                            │ rules + conversation   │
                            │ executions + outbox    │
                            └──────────┬─────────────┘
                                       │ commit
                            ┌──────────▼─────────────┐
                            │ outbox relay           │
                            │ confirm + mandatory    │
                            └──────────┬─────────────┘
                                       │
                            ┌──────────▼─────────────┐
                            │  whatsapp.commands    │
                            └──────────┬─────────────┘
                                       │
                       ┌───────────────▼────────────────┐
                       │ connector AMQP consumer/bridge │
                       └───────────────┬────────────────┘
                                       │ result event
                            ┌──────────▼─────────────┐
                            │ delivery worker       │
                            └────────────────────────┘
```

Todos los procesos usan la misma imagen, pero tienen entrypoints y escalamiento
independientes. `api` no consume colas. Los workers no exponen API pública.

## 5. Catálogo inicial de mensajes

| Routing key | Clase | Productor | Consumidor | Criticidad |
|---|---|---|---|---|
| `whatsapp.message.received.v1` | evento | connector/bridge | rule worker | alta |
| `whatsapp.message.send.v1` | comando | automation outbox | connector/bridge | alta |
| `whatsapp.message.sent.v1` | evento | connector/bridge | delivery worker | alta |
| `whatsapp.message.failed.v1` | evento | connector/bridge | delivery worker | alta |
| `automation.rule.matched.v1` | evento | automation | auditoría/observabilidad | media |
| `automation.action.completed.v1` | evento | execution | auditoría/consumidores futuros | media |
| `automation.action.failed.v1` | evento | execution | alertas/auditoría | alta |
| `automation.conversation.state-changed.v1` | evento | conversation | consumidores futuros | media |

Un evento expresa un hecho y puede tener varios consumidores. Un comando expresa
una intención y tiene un único propietario lógico, aunque su cola use competing
consumers para escalar.

## 6. Topología

### Exchanges

| Nombre | Tipo | Durable | Uso |
|---|---|---:|---|
| `whatsapp.events` | topic | sí | Hechos publicados por el connector |
| `whatsapp.commands` | direct | sí | Comandos dirigidos al connector |
| `automation.events` | topic | sí | Hechos del backend |
| `automation.retry` | direct | sí | Reintentos diferidos por cola/nivel |
| `automation.dlx` | direct | sí | Cuarentena terminal |

Los productores publican en exchanges y desconocen nombres de colas.

### Colas

| Cola | Tipo | Bindings | Owner |
|---|---|---|---|
| `automation.inbound-message.q` | quorum | `whatsapp.message.received.v1` | automation |
| `automation.delivery-result.q` | quorum | `whatsapp.message.sent.v1`, `whatsapp.message.failed.v1` | execution |
| `connector.message-send.q` | quorum | `whatsapp.message.send.v1` | connector |

En producción, las quorum queues usan un número impar de miembros, normalmente
tres. El número final depende de los dominios de fallo y el capacity test.

Cada cola crítica dispone de:

```text
<queue>.retry.5s
<queue>.retry.30s
<queue>.retry.5m
<queue>.dlq
```

Los TTL/DLX/límites operables se aplican mediante policies. Los argumentos
inmutables se limitan a propiedades intrínsecas de la cola.

## 7. Envelope y contratos

```json
{
  "message_id": "ULID global",
  "message_type": "whatsapp.message.received",
  "schema_version": 1,
  "occurred_at": "RFC3339 UTC",
  "producer": "whatsapp-connector",
  "correlation_id": "ULID",
  "causation_id": "ULID o null",
  "tenant_id": "identificador opaco",
  "content_type": "application/json",
  "traceparent": "W3C opcional",
  "payload": {}
}
```

Reglas contractuales:

1. `message_id` es globalmente único e inmutable.
2. `tenant_id` proviene de una identidad/sesión confiable.
3. Cambios aditivos usan la misma versión mayor.
4. Renombrar, eliminar o cambiar tipos exige una nueva versión mayor.
5. Consumidores ignoran campos desconocidos.
6. El payload no contiene secretos ni PII no necesaria.
7. Cada esquema tiene owner, ejemplos válidos/inválidos y clasificación de datos.

## 8. Flujo transaccional

### Consumo entrante

1. Validar envelope y JSON Schema.
2. Abrir transacción PostgreSQL.
3. Insertar `message_id` en inbox con restricción única.
4. Si ya existe, confirmar la transacción y hacer ack sin repetir efectos.
5. Bloquear/cargar conversación y versión actual.
6. Evaluar reglas activas en orden estable: prioridad, versión e ID.
7. Persistir ejecución, nueva conversación y acciones.
8. Insertar comandos/eventos resultantes en outbox.
9. Commit.
10. Ack manual.

No se mantiene una transacción abierta esperando APIs externas.

### Publicación outbox

1. Seleccionar lote con `FOR UPDATE SKIP LOCKED`.
2. Validar contrato.
3. Publicar persistente con `mandatory=true`.
4. Esperar confirm asíncrono con timeout y límite de pendientes.
5. Marcar como publicado solo después del confirm.
6. Ante return/nack/timeout, conservar pendiente y reintentar con backoff/jitter.

Una caída después del confirm y antes del marcado produce republicación. El
consumidor debe absorberla mediante inbox.

### Efectos externos

Cada acción tiene una clave idempotente estable derivada de `action_id`. Si la API
externa no acepta una clave, se usa una máquina de estados con reconciliación; no
se asume que un timeout equivale a fallo.

## 9. Errores, retry y DLQ

| Categoría | Ejemplo | Tratamiento |
|---|---|---|
| Transitorio | timeout, 429, dependencia no disponible | retry 5s/30s/5m + jitter |
| Permanente | contrato inválido, regla corrupta | DLQ inmediata |
| Poison | crash repetido no clasificado | delivery limit y DLQ |
| Duplicado | inbox ya contiene `message_id` | ack sin repetir efecto |
| Estado incierto | timeout después de side effect | reconciliar con idempotency key |

Está prohibido `nack(requeue=true)` ilimitado. El redrive es selectivo, auditado y
solo ocurre después de corregir o clasificar la causa.

## 10. Concurrencia y orden

RabbitMQ preserva el orden de encolado, pero múltiples consumers, redeliveries y
retries pueden cambiar el orden observado. La solución no promete orden global.

Para conversaciones:

- clave lógica: `tenant_id + session_id + conversation_id`;
- `SELECT ... FOR UPDATE` o versión optimista durante la transición;
- cada acción registra la versión de estado que la causó;
- un resultado atrasado no sobrescribe una versión posterior;
- si discovery exige orden estricto, se evaluará partición estable y Single
  Active Consumer por partición después de medir el impacto.

## 11. Seguridad

### Aislamiento

- clusters separados entre producción y no producción;
- un vhost por ambiente/dominio de fallo;
- AMQP, management, métricas y clustering limitados por red;
- management nunca expuesto públicamente.

### Identidades mínimas

| Identidad | Configure | Write | Read |
|---|---|---|---|
| `connector-publisher` | vacío | `^whatsapp\.events$` | vacío |
| `automation-consumer` | vacío | vacío | `^automation\..*\.q$` autorizado |
| `automation-publisher` | vacío | `^(automation\.events|whatsapp\.commands)$` | vacío |
| `connector-command-consumer` | vacío | vacío | `^connector\.message-send\.q$` |
| `topology-deployer` | recursos declarados | exchanges declarados | colas declaradas |

Las regex exactas se prueban positiva y negativamente antes de promover. Las
aplicaciones no reciben permisos de configuración.

### Hardening

- TLS con validación de CA y hostname;
- secretos rotables desde gestor externo;
- usuario `guest` ausente fuera del entorno local;
- plugins mínimos y versiones soportadas;
- límites de conexiones, canales, colas y tamaño;
- logs y DLQ sanitizados;
- contenedores no root e imágenes sin secretos.

## 12. Observabilidad

### Señales

- Broker: nodos, particiones, memoria, disco, file descriptors y alarmas.
- Cola: ready, unacked, oldest age, rates, consumers, capacity y quorum.
- Productor: confirm latency, nack, return, timeout, reconnect y outbox lag.
- Consumidor: processing latency, ack latency, retry, DLQ y dedup hits.
- Dominio: reglas evaluadas/coincidentes, acciones completadas/fallidas y tiempo
  mensaje→respuesta.

### SLO

No se fija un número hasta acordar el SLA del negocio. Todo flujo crítico deberá
tener al menos:

- disponibilidad de publish confirmado;
- latencia end-to-end;
- edad máxima del mensaje ready;
- cero mensajes críticos en DLQ sin reconocer más allá de la ventana acordada;
- cero quorum queues sin quorum;
- restore drill dentro del RPO/RTO aprobado.

Cada alerta P1/P2 debe incluir owner, impacto, dashboard y runbook.

## 13. Despliegue y migración

### Etapa 1: bridge compatible

El connector continúa enviando webhook. El adaptador de ingreso persiste inbox +
outbox y publica `whatsapp.message.received.v1`. Los comandos salientes se
consumen en un bridge que llama a la API REST existente.

### Etapa 2: productor AMQP nativo

El connector publica eventos directamente con confirms/mandatory. Se ejecuta
doble publicación controlada y comparación antes de retirar el webhook.

### Etapa 3: consumidor AMQP nativo

El connector consume `whatsapp.message.send.v1`, aplica idempotencia y publica el
resultado. Se retira el bridge REST.

## 14. Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Volumen y SLA desconocidos | alta | discovery + prueba de carga antes de sizing |
| Connector sin AMQP | alta | bridge transitorio y migración por etapas |
| Doble respuesta por redelivery | crítica | inbox + action idempotency key |
| Reglas costosas bloquean cola | alta | límites, timeout y workers separados |
| Mensajes fuera de orden | media/alta | versionado y lock por conversación |
| DLQ con PII | alta | minimización, acceso restringido y retención |
| RabbitMQ como nuevo punto operativo | alta | quorum, SLO, alertas, backup y runbooks |
