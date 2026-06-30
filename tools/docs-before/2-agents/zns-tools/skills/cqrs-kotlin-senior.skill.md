# 🎯 SKILL: CQRS — COMMAND QUERY RESPONSIBILITY SEGREGATION EN KOTLIN

**skill_id**: cqrs-kotlin-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: backend / arquitectura  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-dotnet-core-senior.md`

**dependencias**: `ddd-hexagonal-kotlin` (Aggregates, Domain Events, Ports & Adapters)

---

## 📌 Propósito de la Skill

Esta skill provee dominio **Senior** del patrón **CQRS (Command Query Responsibility Segregation)** aplicado con Kotlin + Spring Boot. Cubre la separación estricta entre el modelo de escritura (Commands) y el modelo de lectura (Queries), la mecánica del bus de comandos y consultas tipado, las projections con modelos de lectura dedicados, el **Outbox Pattern** para publicación confiable de eventos, y la integración con Kafka para Event Streaming. Aplica cuando los casos de uso de escritura y lectura tienen complejidades o requisitos de escalado independientes.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Principios Fundamentales CQRS

```
COMMANDS  → Intención de cambiar estado. Retornan void o Result.
            Se validan. Generan Domain Events. Usan el Aggregate.

QUERIES   → Solo leen. Sin efectos secundarios. Sin tocar el Aggregate.
            Retornan Read Models (DTOs planos optimizados para UI/API).
            Pueden acceder directamente a la DB de lectura (sin pasar por dominio).

REGLA DE ORO: Una operación es COMMAND **o** QUERY, nunca ambas.
```

**Beneficios en producción:**
- Escalado independiente: escala la DB de lectura sin tocar la de escritura
- Read models optimizados: consultas sin JOINs costosos — estructuras desnormalizadas para UI
- Auditoría: los Commands son el registro natural de intenciones del sistema
- Evolución segura: cambiar el modelo de lectura no afecta el dominio

---

### 2️⃣ Estructura de Paquetes CQRS en Hexagonal

```
src/main/kotlin/com/zenapses/<contexto>/
├── application/
│   ├── command/                          ← Write Side
│   │   ├── CreateOrderCommand.kt         ← data class (parámetros validados)
│   │   ├── CancelOrderCommand.kt
│   │   └── handler/
│   │       ├── CreateOrderHandler.kt     ← @Component, recibe Command, usa Aggregate
│   │       └── CancelOrderHandler.kt
│   ├── query/                            ← Read Side
│   │   ├── GetOrderByIdQuery.kt          ← data class (parámetros de consulta)
│   │   ├── ListOrdersByClientQuery.kt
│   │   └── handler/
│   │       ├── GetOrderByIdHandler.kt    ← @Component, accede directo a Read Model
│   │       └── ListOrdersByClientHandler.kt
│   └── port/
│       ├── in/
│       │   ├── CommandBus.kt             ← interface (Input Port)
│       │   └── QueryBus.kt              ← interface (Input Port)
│       └── out/
│           └── DomainEventPublisher.kt  ← interface (Output Port)
│
├── domain/
│   ├── model/      ← Aggregates, Value Objects (CERO conocimiento de Commands/Queries)
│   └── event/      ← Domain Events (sellados por el Aggregate)
│
└── infrastructure/
    ├── adapter/
    │   ├── in/rest/
    │   │   └── OrderController.kt        ← usa CommandBus + QueryBus
    │   └── out/
    │       ├── persistence/
    │       │   ├── write/                ← JPA Write Side
    │       │   │   └── OrderJpaRepository.kt
    │       │   └── read/                 ← queryDSL / JOOQ / views — Read Side
    │       │       └── OrderReadRepository.kt
    │       └── messaging/
    │           └── KafkaEventPublisher.kt
    └── bus/
        ├── InMemoryCommandBus.kt         ← impl primaria (síncrona)
        └── InMemoryQueryBus.kt
```

---

### 3️⃣ Command side — Definición e Implementación

#### Command (Data Class Kotlin)

```kotlin
// application/command/CreateOrderCommand.kt
data class CreateOrderCommand(
    val clientId: ClientId,
    val items: List<OrderItemInput>,
    val shippingAddress: Address
) {
    init {
        require(items.isNotEmpty()) { "Una orden debe tener al menos un ítem" }
    }
}

data class OrderItemInput(
    val productId: ProductId,
    val quantity: Int,
    val unitPrice: Monto
) {
    init { require(quantity > 0) { "Cantidad debe ser mayor a 0" } }
}
```

#### Command Handler

```kotlin
// application/command/handler/CreateOrderHandler.kt
@Component
class CreateOrderHandler(
    private val orderRepository: OrderRepository,          // Port (domain)
    private val eventPublisher: DomainEventPublisher       // Port (out)
) {
    @Transactional
    fun handle(command: CreateOrderCommand): OrderId {
        val order = Order.create(
            clientId = command.clientId,
            items = command.items.map { it.toDomain() },
            shippingAddress = command.shippingAddress
        )
        orderRepository.save(order)
        eventPublisher.publishAll(order.domainEvents)
        order.clearDomainEvents()
        return order.id
    }
}
```

---

### 4️⃣ Query Side — Read Models Desacoplados del Dominio

#### Query y Read Model

```kotlin
// application/query/GetOrderByIdQuery.kt
data class GetOrderByIdQuery(val orderId: OrderId)

// Read Model — NO es un Aggregate. Es un DTO plano para la API.
data class OrderSummaryReadModel(
    val orderId: String,
    val clientName: String,
    val status: String,
    val totalAmount: BigDecimal,
    val currency: String,
    val itemCount: Int,
    val createdAt: Instant
)
```

#### Query Handler — Acceso directo a Read Model (sin pasar por Aggregate)

```kotlin
// application/query/handler/GetOrderByIdHandler.kt
@Component
class GetOrderByIdHandler(
    private val orderReadRepository: OrderReadRepository  // Port de lectura
) {
    fun handle(query: GetOrderByIdQuery): OrderSummaryReadModel? =
        orderReadRepository.findSummaryById(query.orderId)
}
```

> ⚠️ **Regla crítica**: Los **Query Handlers NO usan el Aggregate** ni el `OrderRepository` de escritura.
> Acceden directamente al modelo de lectura optimizado (puede ser una vista SQL, una tabla desnormalizada, RedisSearch, etc.).

---

### 5️⃣ CommandBus y QueryBus Tipados

#### Interfaces (Input Ports)

```kotlin
// application/port/in/CommandBus.kt
interface CommandBus {
    fun <R : Any> dispatch(command: Any): R
}

// application/port/in/QueryBus.kt
interface QueryBus {
    fun <R : Any> ask(query: Any): R?
}
```

#### Implementación InMemory (registro por tipo)

```kotlin
// infrastructure/bus/InMemoryCommandBus.kt
@Component
class InMemoryCommandBus(
    private val handlers: Map<Class<*>, Any>   // inyectado por Spring via ApplicationContext
) : CommandBus {

    @Suppress("UNCHECKED_CAST")
    override fun <R : Any> dispatch(command: Any): R {
        val handler = handlers[command::class.java]
            ?: throw IllegalArgumentException("No handler registered for: ${command::class.simpleName}")
        return when (handler) {
            is CreateOrderHandler -> handler.handle(command as CreateOrderCommand) as R
            is CancelOrderHandler -> handler.handle(command as CancelOrderCommand) as R
            else -> throw IllegalStateException("Handler no reconocido: ${handler::class.simpleName}")
        }
    }
}
```

> 💡 **Alternativa idiomática Kotlin**: Usa un `sealed interface` para los Commands de un mismo contexto y un `when` exhaustivo en el bus — el compilador garantiza exhaustividad.

```kotlin
sealed interface OrderCommand
data class CreateOrderCommand(val clientId: ClientId, val items: List<OrderItemInput>) : OrderCommand
data class CancelOrderCommand(val orderId: OrderId, val reason: String) : OrderCommand

@Component
class OrderCommandBus(
    private val createHandler: CreateOrderHandler,
    private val cancelHandler: CancelOrderHandler
) {
    fun dispatch(command: OrderCommand): Any = when (command) {
        is CreateOrderCommand -> createHandler.handle(command)
        is CancelOrderCommand -> cancelHandler.handle(command)
        // El compilador falla en compilación si falta un caso → exhaustividad garantizada
    }
}
```

---

### 6️⃣ Projections — Mantener el Read Model Actualizado

Las projections escuchan Domain Events y actualizan las tablas de lectura:

```kotlin
// infrastructure/projection/OrderProjection.kt
@Component
@Transactional
class OrderProjection(
    private val orderReadRepository: OrderReadRepository
) {
    // Escucha eventos de dominio publicados vía Kafka o ApplicationEventPublisher
    @EventListener
    fun on(event: OrderCreated) {
        orderReadRepository.save(
            OrderReadEntity(
                orderId = event.orderId.value.toString(),
                clientName = event.clientName,
                status = "PENDING",
                totalAmount = event.totalAmount.valor,
                currency = event.totalAmount.moneda.name,
                itemCount = event.itemCount,
                createdAt = event.occurredOn
            )
        )
    }

    @EventListener
    fun on(event: OrderCancelled) {
        orderReadRepository.updateStatus(
            orderId = event.orderId.value.toString(),
            newStatus = "CANCELLED"
        )
    }
}
```

---

### 7️⃣ Outbox Pattern — Publicación Confiable de Eventos

**Problema**: Si publicas a Kafka **dentro de la transacción** y luego la TX hace rollback, el evento ya salió → **inconsistencia**.

**Solución — Outbox Pattern**:

```
1. La TX de escritura guarda el Aggregate + el evento en tabla `outbox_events` (misma TX, misma DB).
2. Un scheduler/poller lee `outbox_events` pendientes y los publica a Kafka.
3. Una vez publicado, marca el evento como `PROCESSED`.
```

```kotlin
// infrastructure/adapter/out/persistence/OutboxEventEntity.kt
@Entity
@Table(name = "outbox_events")
data class OutboxEventEntity(
    @Id val eventId: UUID = UUID.randomUUID(),
    val aggregateType: String,
    val aggregateId: String,
    val eventType: String,
    @Column(columnDefinition = "TEXT") val payload: String,  // JSON serializado
    val occurredOn: Instant,
    var status: String = "PENDING",   // PENDING | PROCESSED | FAILED
    var processedAt: Instant? = null
)


// infrastructure/adapter/out/persistence/OutboxPublisherAdapter.kt
@Component
class OutboxPublisherAdapter(
    private val outboxRepository: OutboxJpaRepository,
    private val objectMapper: ObjectMapper
) : DomainEventPublisher {

    @Transactional   // ← Misma transacción que el Command Handler
    override fun publishAll(events: List<DomainEvent>) {
        val entities = events.map { event ->
            OutboxEventEntity(
                aggregateType = event::class.simpleName ?: "Unknown",
                aggregateId = extractAggregateId(event),
                eventType = event::class.qualifiedName ?: "Unknown",
                payload = objectMapper.writeValueAsString(event),
                occurredOn = event.occurredOn
            )
        }
        outboxRepository.saveAll(entities)
    }

    private fun extractAggregateId(event: DomainEvent): String = when (event) {
        is OrderCreated   -> event.orderId.value.toString()
        is OrderCancelled -> event.orderId.value.toString()
        // Añadir más casos según contexto
    }
}


// infrastructure/scheduler/OutboxPoller.kt
@Component
class OutboxPoller(
    private val outboxRepository: OutboxJpaRepository,
    private val kafkaTemplate: KafkaTemplate<String, String>
) {
    @Scheduled(fixedDelay = 500)  // cada 500 ms
    @Transactional
    fun pollAndPublish() {
        val pending = outboxRepository.findTop50ByStatusOrderByOccurredOnAsc("PENDING")
        pending.forEach { event ->
            runCatching {
                kafkaTemplate.send(topicFor(event.eventType), event.aggregateId, event.payload)
                event.status = "PROCESSED"
                event.processedAt = Instant.now()
            }.onFailure {
                event.status = "FAILED"
            }
        }
        outboxRepository.saveAll(pending)
    }

    private fun topicFor(eventType: String): String =
        eventType.substringAfterLast('.').lowercase().replace("$", ".")
}
```

---

### 8️⃣ Integración con Kafka — Event Streaming CQRS

```kotlin
// infrastructure/adapter/out/messaging/KafkaOrderEventConsumer.kt
@Component
class KafkaOrderEventConsumer(
    private val projection: OrderProjection,
    private val objectMapper: ObjectMapper
) {
    @KafkaListener(topics = ["order.created"], groupId = "order-read-model-updater")
    fun onOrderCreated(payload: String) {
        val event = objectMapper.readValue(payload, OrderCreated::class.java)
        projection.on(event)
    }

    @KafkaListener(topics = ["order.cancelled"], groupId = "order-read-model-updater")
    fun onOrderCancelled(payload: String) {
        val event = objectMapper.readValue(payload, OrderCancelled::class.java)
        projection.on(event)
    }
}
```

---

### 9️⃣ Controller — Uso de CommandBus y QueryBus

```kotlin
// infrastructure/adapter/in/rest/OrderController.kt
@RestController
@RequestMapping("/api/v1/orders")
class OrderController(
    private val commandBus: CommandBus,
    private val queryBus: QueryBus
) {
    // COMMAND — POST siempre (política ZNS)
    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: CreateOrderRequest): OrderCreatedResponse {
        val orderId = commandBus.dispatch<OrderId>(request.toCommand())
        return OrderCreatedResponse(orderId.value.toString())
    }

    // QUERY — POST con body (política ZNS: GET solo para health)
    @PostMapping("/find-by-id")
    fun findById(@Valid @RequestBody request: FindOrderRequest): ResponseEntity<OrderSummaryReadModel> {
        val result = queryBus.ask<OrderSummaryReadModel>(
            GetOrderByIdQuery(OrderId.from(request.orderId))
        )
        return if (result != null) ResponseEntity.ok(result)
               else ResponseEntity.notFound().build()
    }
}
```

---

## ✅ Criterios de Aplicación (cuándo usar esta skill)

- El contexto tiene operaciones de escritura y lectura con **complejidades independientes**
- Las queries necesitan **read models desnormalizados** que no coinciden con la estructura del Aggregate
- Existe mensajería asíncrona (Kafka/RabbitMQ) y se necesita garantía de entrega de eventos
- El sistema requiere **escalado horizontal diferenciado** entre lectura y escritura
- Se usa Event Sourcing o Outbox Pattern para auditoría y replay de eventos

## ❌ Anti-patrones (cuándo NO aplicar / errores a evitar)

- ❌ **Query Handlers que cargan el Aggregate completo** para responder consultas simples → usa el Read Model directamente
- ❌ **Commands que retornan datos de negocio** (ej: `createUser(): UserDTO`) → retornar solo el ID o void; la lectura es una Query
- ❌ **Publicar a Kafka dentro de la transacción** sin Outbox Pattern → riesgo de eventos perdidos o duplicados
- ❌ **Commands sin validación en la frontera** (Controller) → validar en el DTO; el dominio lanza excepciones de invariantes, no de formato
- ❌ **Un único bus genérico con `Any → Any`** sin sealed interface por contexto → pérdida de exhaustividad en el compilador
- ❌ **Read Models con lógica de negocio** → los Read Models son planos; la lógica vive en el Aggregate/Domain Services
- ❌ **Proyecciones que modifican el Aggregate** → las Projections son de solo escritura hacia el Read Store. Nunca modifican el Write Side

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Flujo completo Command → Evento → Projection

```
Request HTTP POST /api/v1/orders/create
   │
   ▼
OrderController.create(request)
   │ commandBus.dispatch(CreateOrderCommand)
   ▼
CreateOrderHandler.handle(command)
   │ Order.create(...) → genera OrderCreated event
   │ orderRepository.save(order)          ← Write DB (PostgreSQL)
   │ outboxPublisher.publishAll(events)   ← guarda en outbox_events (misma TX)
   ▼
OutboxPoller (cada 500ms)
   │ lee outbox_events PENDING
   │ kafkaTemplate.send("order.created", payload)
   ▼
KafkaOrderEventConsumer (consumer group: order-read-model-updater)
   │ projection.on(OrderCreated)
   │ orderReadRepository.save(OrderReadEntity) ← Read DB (Postgres / Redis / ElasticSearch)
   ▼
GET siguiente → queryBus.ask(GetOrderByIdQuery) → Read Model actualizado
```

### Ejemplo 2: Sealed Interface Command Bus — exhaustividad garantizada por compilador

```kotlin
sealed interface UserCommand
data class RegisterUserCommand(val email: Email, val password: Password) : UserCommand
data class SuspendUserCommand(val userId: UserId, val reason: String) : UserCommand
data class ChangeUserEmailCommand(val userId: UserId, val newEmail: Email) : UserCommand

// Si se agrega ActivateUserCommand y NO se agrega aquí → ERROR DE COMPILACIÓN
fun UserCommandBus.route(command: UserCommand) = when (command) {
    is RegisterUserCommand    -> registerHandler.handle(command)
    is SuspendUserCommand     -> suspendHandler.handle(command)
    is ChangeUserEmailCommand -> changeEmailHandler.handle(command)
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente sección en su archivo `.md`:

```markdown
SKILL ACTIVA: cqrs-kotlin-senior → ver: 2-agents/zns-tools/skills/cqrs-kotlin-senior.skill.md
```

**Resumen ejecutivo de la skill para el agente receptor:**

| Área | Regla de aplicación |
|------|---------------------|
| Commands | `data class` Kotlin con `init { require(...) }`. El Handler usa el Aggregate y llama al Outbox Publisher dentro de la misma `@Transactional`. |
| Queries | Query Handlers acceden **directamente** al Read Model — nunca cargan el Aggregate. |
| Bus | `sealed interface` por contexto + `when` exhaustivo. Usa el compilador como guardia de exhaustividad. |
| Outbox | TODA publicación de eventos a Kafka pasa por `outbox_events` → garantía at-least-once. |
| Projections | Escuchan Domain Events vía Kafka Consumer y actualizan el Read Store. CERO lógica de negocio. |
| Anti-patrón crítico | Commands nunca retornan Read Models. La segregación es absoluta. |

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Command Handlers con test de dominio (pure Kotlin, CERO Spring) | 100% |
| Query Handlers sin acceso al Aggregate | 100% |
| Eventos publicados vía Outbox Pattern | 100% |
| Projections sin lógica de negocio | 100% |
| Sealed interface por contexto con `when` exhaustivo | ≥ 1 por contexto CQRS |
| Cobertura de tests del Application Layer (MockK) | ≥ 90% |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — CQRS Command/Query Bus tipado, Outbox Pattern, Projections, Kafka integration, anti-patrones Kotlin
