# ⚡ SKILL: CQRS EN GO — SENIOR

**skill_id**: cqrs-go-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: backend / architecture / go  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-backend-go  
**dependencias**: ddd-hexagonal-go (los buses operan sobre puertos definidos en esa skill)  
**referencia_stack**: Go 1.23+ (generics) / Gin 1.10+ / NATS / Kafka

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento profundo para diseñar e implementar **CQRS en Go idiomático** con tres niveles de profundidad según la complejidad del dominio: CQRS liviano, CQRS completo con buses tipados usando generics, y CQRS con separación de read store. Incluye patrones de consistencia eventual, decisión justificada de nivel a aplicar y anti-patrones a evitar.

---

## 🧠 PARTE 1 — DECIDIR EL NIVEL DE CQRS

Antes de implementar, el agente DEBE documentar cuál escenario aplica:

| Escenario | Cuándo aplica | Implementación |
|-----------|--------------|----------------|
| **CQRS Liviano** | Dominio simple/moderado, un solo store, lecturas no tienen read model separado | Commands y Queries como structs separados, handlers en packages separados, mismo repositorio |
| **CQRS Completo** | Dominio complejo, múltiples consumidores de eventos, lectura optimizada independiente de escritura | Command Bus + Query Bus tipados, read store separado, proyecciones actualizadas por eventos |
| **CQRS con Event Sourcing** | Auditoría total requerida, reconstrucción de estado por eventos, máximo 2-3 bounded contexts | Append-only event log, projectors, snapshotting |

> ⚠️ **Regla**: Si el dominio tiene <5 casos de uso CRUD y sin consumidores de eventos, CQRS liviano es suficiente. Dejar documentado en ADR.

---

## 🧠 PARTE 2 — CQRS LIVIANO (SEPARACIÓN DE PAQUETES)

```text
internal/application/{bounded-context}/
├── commands/
│   ├── create_user.go       # Command struct + Handler struct (implementa input port)
│   └── disable_user.go
└── queries/
    ├── find_user_by_id.go   # Query struct + ReadModel struct + Handler struct
    └── list_users.go
```

```go
// internal/application/user/commands/create_user.go
package commands

// CreateUserCommand es el DTO del caso de uso de escritura.
type CreateUserCommand struct {
    RequestID string // idempotency key
    Email     string
    Password  string
    Role      string
}

// CreateUserResult es el DTO de salida.
type CreateUserResult struct {
    UserID string
}
```

```go
// internal/application/user/queries/find_user_by_id.go
package queries

// FindUserByIDQuery es el DTO del caso de uso de lectura.
type FindUserByIDQuery struct {
    UserID string
}

// UserReadModel es el DTO de salida de lectura — desacoplado del aggregate root.
// Puede contener campos desnormalizados optimizados para la UI.
type UserReadModel struct {
    UserID    string `json:"userId"`
    Email     string `json:"email"`
    Role      string `json:"role"`
    Status    string `json:"status"`
    CreatedAt string `json:"createdAt"`
}
```

---

## 🧠 PARTE 3 — CQRS COMPLETO CON BUS TIPADO (GENERICS GO 1.18+)

```go
// internal/application/bus/command_bus.go
package bus

import (
    "context"
    "fmt"
    "reflect"
    "sync"
)

// CommandHandler es la interface genérica para cualquier command handler.
type CommandHandler[C any, R any] interface {
    Handle(ctx context.Context, cmd C) (R, error)
}

// commandEntry almacena el handler y los tipos sin generics para el mapa.
type commandEntry struct {
    handle func(ctx context.Context, cmd any) (any, error)
}

// CommandBus despacha Commands al Handler registrado por tipo.
type CommandBus struct {
    mu       sync.RWMutex
    handlers map[reflect.Type]commandEntry
}

func NewCommandBus() *CommandBus {
    return &CommandBus{handlers: make(map[reflect.Type]commandEntry)}
}

// Register registra un handler para el tipo de comando C.
func Register[C any, R any](bus *CommandBus, handler CommandHandler[C, R]) {
    cmdType := reflect.TypeOf((*C)(nil)).Elem()
    bus.mu.Lock()
    defer bus.mu.Unlock()
    bus.handlers[cmdType] = commandEntry{
        handle: func(ctx context.Context, cmd any) (any, error) {
            return handler.Handle(ctx, cmd.(C))
        },
    }
}

// Dispatch ejecuta el handler correspondiente al tipo de cmd.
func (b *CommandBus) Dispatch(ctx context.Context, cmd any) (any, error) {
    b.mu.RLock()
    entry, ok := b.handlers[reflect.TypeOf(cmd)]
    b.mu.RUnlock()
    if !ok {
        return nil, fmt.Errorf("commandBus: no handler registered for %T", cmd)
    }
    return entry.handle(ctx, cmd)
}
```

```go
// internal/application/bus/query_bus.go
package bus

import (
    "context"
    "fmt"
    "reflect"
    "sync"
)

type QueryHandler[Q any, R any] interface {
    Handle(ctx context.Context, query Q) (R, error)
}

type queryEntry struct {
    handle func(ctx context.Context, query any) (any, error)
}

type QueryBus struct {
    mu       sync.RWMutex
    handlers map[reflect.Type]queryEntry
}

func NewQueryBus() *QueryBus {
    return &QueryBus{handlers: make(map[reflect.Type]queryEntry)}
}

func RegisterQuery[Q any, R any](bus *QueryBus, handler QueryHandler[Q, R]) {
    qType := reflect.TypeOf((*Q)(nil)).Elem()
    bus.mu.Lock()
    defer bus.mu.Unlock()
    bus.handlers[qType] = queryEntry{
        handle: func(ctx context.Context, q any) (any, error) {
            return handler.Handle(ctx, q.(Q))
        },
    }
}

func (b *QueryBus) Query(ctx context.Context, query any) (any, error) {
    b.mu.RLock()
    entry, ok := b.handlers[reflect.TypeOf(query)]
    b.mu.RUnlock()
    if !ok {
        return nil, fmt.Errorf("queryBus: no handler registered for %T", query)
    }
    return entry.handle(ctx, query)
}
```

### Wiring en composition root

```go
// cmd/api/main.go (fragmento de wiring del bus)
cmdBus := bus.NewCommandBus()
queryBus := bus.NewQueryBus()

bus.Register(cmdBus, commands.NewCreateUserHandler(userRepo, userPublisher, hasher))
bus.Register(cmdBus, commands.NewDisableUserHandler(userRepo, userPublisher))
bus.RegisterQuery(queryBus, queries.NewFindUserByIDHandler(userReadRepo))
bus.RegisterQuery(queryBus, queries.NewListUsersHandler(userReadRepo))
```

---

## 🧠 PARTE 4 — READ STORE SEPARADO Y PROYECCIONES

```go
// internal/domain/user/repository.go (OUTPUT PORT — write side)
type UserRepository interface {
    Save(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id UserID) (*User, error)
}

// internal/application/user/queries/user_read_repository.go (OUTPUT PORT — read side)
// Read models optimizados para queries — pueden ser vistas materializadas, Redis o DB secundaria
type UserReadRepository interface {
    FindByID(ctx context.Context, id string) (*UserReadModel, error)
    ListByStatus(ctx context.Context, status string, page, size int) ([]UserReadModel, int64, error)
}

// Proyector que actualiza el read store cuando ocurre un domain event
// internal/infrastructure/projections/user_projection.go
type UserProjection struct {
    readRepo UserReadRepository
}

func (p *UserProjection) On(ctx context.Context, event domain.DomainEvent) error {
    switch e := event.(type) {
    case domain.UserCreated:
        return p.readRepo.Upsert(ctx, UserReadModel{
            UserID: e.UserID.String(),
            Email:  e.Email,
            Status: "active",
        })
    case domain.UserDisabled:
        return p.readRepo.UpdateStatus(ctx, e.UserID.String(), "disabled")
    }
    return nil
}
```

---

## 🧠 PARTE 5 — POLÍTICA DE CONSISTENCIA

Debe documentarse en el ADR correspondiente:

```markdown
## ADR-XXX: Política de Consistencia CQRS — {BoundedContext}

### Decisión
[CQRS Liviano | CQRS Completo | CQRS + Event Sourcing]

### Razón
[Justificación técnica y de dominio]

### Commands disponibles
- CreateUser → UserRepository.Save + UserPublisher.Publish
- DisableUser → UserRepository.Save + UserPublisher.Publish

### Queries disponibles
- FindUserByID → UserReadRepository (eventual consistency: < 100ms lag aceptable)
- ListUsers → UserReadRepository con paginación máx. 50 items

### Read Models
- UserReadModel: campos denormalizados para UI (createdAt formateado, role label)

### Política de consistencia
- Write side: strong consistency (PostgreSQL transaction)
- Read side: eventual consistency via projection sobre eventos NATS
- SLA lag lectura: < 500ms (monitoreado con métrica `projection_lag_seconds`)

### Eventos publicados
- user.created → Consumidores: notification-service, audit-service
- user.disabled → Consumidores: audit-service, session-service

### Tradeoffs aceptados
- [Describir qué se sacrifica y por qué es acceptable]
```

---

## 🧠 PARTE 6 — ANTI-PATRONES CQRS EN GO

| ❌ Anti-patrón | ✅ Corrección |
|----------------|--------------|
| Handler de comando que también ejecuta queries para construir la respuesta | El command devuelve solo el ID generado; el cliente hace una query aparte si necesita el read model |
| `GetUser()` y `CreateUser()` en la misma "service struct" sin separación | Handlers separados en packages `commands/` y `queries/` |
| Read model con puntero al aggregate root (acoplamiento) | Read model es un struct DTO independiente sin referencias al dominio |
| Usar goroutines en el handler de comando para publicar eventos (sin outbox) | Publicación best-effort en el mismo proceso o Outbox Pattern si se requiere garantía |
| Command Bus que retorna el aggregate completo | Command Bus retorna solo el resultado mínimo (ID, status code) — el read model llega por query |
| CQRS sin documentar consistencia eventual | ADR obligatorio con lag aceptable documentado y métrica de monitoreo |

---

## ✅ Checklist CQRS Go

```markdown
- [ ] El nivel de CQRS (liviano / completo / ES) está documentado en ADR con justificación
- [ ] Commands y Queries son structs DTO sin comportamiento de negocio
- [ ] Los handlers de comando dependen de puertos output, no de repositorios concretos
- [ ] Los read models son structs desacoplados del aggregate root
- [ ] Si hay read store separado: existe proyector y política de consistencia eventual documentada
- [ ] Si hay bus: Register/Dispatch testeable de forma independiente
- [ ] Los eventos publicados y sus consumidores están documentados
- [ ] Cobertura de tests de command handlers ≥ 85% (con gomock de puertos)
- [ ] No hay goroutines sin contexto ni sin manejo de error en los handlers
```
