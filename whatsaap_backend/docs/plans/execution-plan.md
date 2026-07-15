# Plan de ejecución

## Objetivo

Construir `whatsaap-backend` como backend Python orientado a eventos, integrado
con `whatsapp-connector`, con motor de reglas configurable y garantías RabbitMQ
verificables.

Las estimaciones son rangos de esfuerzo, no fechas calendario. Capacity, RPO/RTO
y performance productiva dependen de datos aún pendientes.

## Fase 0 — Discovery y baseline

**Duración:** 0.5–1 día

### Trabajo

- inventariar mensajes, acciones y flujos conversacionales;
- acordar volumen promedio/pico/burst y tamaño de payload;
- definir SLA de decisión/respuesta, RPO/RTO y retención;
- clasificar PII y secretos;
- confirmar infraestructura y estrategia de despliegue;
- revisar contrato real del connector y su ownership por tenant.

### Gate

- cada flujo tiene productor, consumidor, owner y criticidad;
- pérdida, duplicados, orden y replay están expresados;
- los supuestos pendientes tienen owner y fecha de decisión.

## Fase 1 — Scaffolding y arquitectura ejecutable

**Duración:** 1–1.5 días

### Trabajo

- crear `pyproject.toml`, lockfile y estructura Clean/Hexagonal;
- configurar settings tipados y secretos por entorno;
- crear entrypoints `api`, `worker-rules`, `worker-delivery`, `outbox-relay`;
- preparar Dockerfile multi-stage y Compose local;
- incorporar PostgreSQL, RabbitMQ y Flyway;
- activar Ruff, mypy strict, Bandit, pytest y coverage;
- crear gates de dependencias entre capas.

### Gate

- build reproducible sin `latest`;
- API y workers inician y terminan limpiamente;
- health/readiness distinguen DB, broker y proceso;
- lint, tipos y tests vacíos pasan en CI.

## Fase 2 — Contratos y topología como código

**Duración:** 1–2 días

### Trabajo

- implementar envelope y JSON Schemas v1;
- crear ejemplos válidos e inválidos;
- declarar exchanges, bindings, quorum queues, retries y DLQ;
- generar definitions/policies sin secretos;
- configurar vhost e identidades locales separadas;
- añadir validación contractual y drift check al pipeline.

### Gate

- 100% de mensajes tiene owner, versión y schema;
- publish con routing correcto llega a su cola;
- routing desconocido produce `mandatory return`;
- permisos positivos/negativos están probados;
- la topología se recrea idempotentemente.

## Fase 3 — Persistencia, inbox y outbox

**Duración:** 2 días

### Trabajo

- diseñar tablas de reglas, versiones, conversaciones y ejecuciones;
- implementar inbox con clave única por `message_id`;
- implementar outbox y estados de publicación;
- crear migraciones Flyway e índices multi-tenant;
- implementar repositorios SQLAlchemy y unidad de trabajo;
- crear relay con lote, `SKIP LOCKED`, confirms y mandatory returns.

### Gate

- estado de negocio y outbox se confirman atómicamente;
- una republicación no duplica el efecto;
- return/nack/timeout no marca el outbox como enviado;
- dos relays concurrentes no publican intencionalmente el mismo lote;
- migraciones forward y restauración local están verificadas.

## Fase 4 — Dominio y API de reglas

**Duración:** 2–3 días

### Trabajo

- implementar `BusinessRule`, `Conversation`, `Execution` y `Action`;
- definir DSL de condiciones con operadores permitidos;
- implementar prioridad, vigencia, alcance y `stop_on_match`;
- implementar versionado y publicación de reglas;
- crear CRUD, validación y simulación dry-run;
- aplicar autenticación, autorización y aislamiento por tenant;
- documentar OpenAPI y errores Problem Details.

### Gate

- dominio sin imports de framework/infraestructura;
- reglas inválidas no pueden activarse;
- simulación y ejecución real comparten el mismo evaluador puro;
- acceso cruzado entre tenants retorna 404 sin filtrar existencia;
- no existe ejecución de código arbitrario desde una regla.

## Fase 5 — Consumo entrante y estado conversacional

**Duración:** 1.5–2 días

### Trabajo

- implementar consumer con validación, prefetch y manual ack;
- procesar inbox + dominio + outbox en una transacción;
- serializar transición por conversación mediante lock/versionado;
- clasificar errores permanentes, transitorios y poison;
- implementar retry 5s/30s/5m y DLQ;
- propagar correlation, causation y trace context;
- añadir graceful shutdown.

### Gate

- ack ocurre únicamente después del commit;
- caída antes/después del commit no duplica acciones;
- errores permanentes llegan a DLQ sin hot loop;
- backlog aplica backpressure y no agota memoria;
- resultados atrasados no sobrescriben estado reciente.

## Fase 6 — Integración con whatsapp-connector

**Duración:** 2–3 días

### Etapa 6A: bridge

- exponer webhook HMAC compatible con el connector actual;
- persistir ingreso antes de publicar;
- consumir comandos salientes y llamar REST con idempotency key;
- producir eventos `sent`/`failed` normalizados;
- reconciliar timeouts de estado incierto.

### Etapa 6B: AMQP nativo

- añadir productor RabbitMQ al connector;
- ejecutar shadow/dual publish con métricas de paridad;
- añadir consumidor idempotente de comandos al connector;
- retirar webhook/bridge después del periodo de estabilidad.

### Gate

- cero eventos perdidos en caída controlada del bridge;
- dos entregas del mismo comando producen un solo envío lógico;
- dual publish demuestra paridad antes del cutover;
- existe rollback documentado hacia el bridge.

## Fase 7 — Observabilidad, seguridad y operación

**Duración:** 1.5–2 días

### Trabajo

- instrumentar métricas de broker, colas, productor, consumer y dominio;
- construir dashboard y alertas por edad/drain time, DLQ y quorum;
- habilitar OpenTelemetry end-to-end;
- aplicar TLS, secretos rotables y permisos mínimos;
- limitar conexiones, canales, payload y recursos;
- crear runbooks de backlog, DLQ/redrive, alarmas, credenciales, nodo caído,
  quorum, upgrade, restore y DR.

### Gate

- management y clustering no están expuestos públicamente;
- ninguna identidad de aplicación tiene permisos globales;
- alertas P1/P2 enlazan un runbook probado;
- logs, traces y DLQ no filtran secretos ni PII innecesaria;
- restore de definitions/topología funciona en entorno de prueba.

## Fase 8 — Verificación y salida

**Duración:** 1–2 días más pruebas de capacidad según entorno

### Trabajo

- unitarias de dominio y property tests de la DSL;
- contract tests y compatibilidad de schemas;
- integración con PostgreSQL/RabbitMQ reales vía Testcontainers;
- E2E mensaje → regla → comando → resultado;
- pruebas de duplicados, poison, redrive y out-of-order;
- chaos: caída del consumer, relay, conexión y líder de quorum;
- carga normal, pico, burst, backlog y N-1;
- revisión de cobertura, seguridad y arquitectura.

### Gate de producción

- cobertura del código nuevo ≥80%; dominio crítico con cobertura de decisiones;
- cero pérdida fuera de la garantía aprobada;
- duplicados no generan efectos duplicados;
- retries ilimitados: cero;
- SLO demostrado bajo pico y N-1;
- RPO/RTO demostrado mediante restore/DR drill;
- riesgos residuales aceptados por owner explícito.

## Secuencia de entregables

| Incremento | Resultado demostrable |
|---|---|
| I1 | Scaffold, Compose, topología y contratos validados |
| I2 | Reglas CRUD/simulación + DB/Flyway |
| I3 | Consumer idempotente + inbox/outbox + retry/DLQ |
| I4 | Bridge funcional con connector y flujo E2E |
| I5 | AMQP nativo en connector y retiro progresivo del bridge |
| I6 | Hardening, SLO, chaos, capacity y runbooks |

## Estimación global

- MVP con bridge, reglas determinísticas y envío de texto: **10–14 días de
  ingeniería** después de discovery.
- Integración AMQP nativa del connector, IA, medios y hardening productivo:
  **5–8 días adicionales**, sin incluir esperas de infraestructura ni pruebas de
  carga condicionadas al entorno.

## Definition of Done

Una historia no está terminada solo porque el happy path funciona. Debe incluir:

- contrato versionado;
- migración y rollback/roll-forward aplicable;
- idempotencia y clasificación de fallos;
- pruebas unitarias, integración y autorización;
- métricas, logs correlacionados y alerta cuando corresponda;
- documentación y runbook operativo;
- evidencia de que respeta los límites de arquitectura.

