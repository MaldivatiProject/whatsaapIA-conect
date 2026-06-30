# 🏛️ SKILL: DDD + HEXAGONAL ARCHITECTURE — GO EXPERT

**skill_id**: ddd-hexagonal-go  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / architecture / go  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-backend-go  
**dependencias**: ninguna (skill autónoma de arquitectura)  
**referencia_stack**: Go 1.23+ / Gin 1.10+ / pgx v5 / Wire (google/wire) / uber-go/fx

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento profundo y los patrones canónicos para implementar **Arquitectura Hexagonal (Ports & Adapters)** con **Domain-Driven Design táctico y estratégico** en Go idiomático. Cubre estructura de paquetes, Go interfaces como puertos, modelado de agregados, value objects, domain events, errores de dominio, wiring en el composition root y reglas de dependencia verificables.

---

## 🧠 PARTE 1 — PRINCIPIOS DE ARQUITECTURA HEXAGONAL EN GO

### Reglas de Dependencia Absolutas

```
domain      → no depende de NADA externo (no net/http, no database/sql, no gin, no pgx)
application → depende solo de domain + puertos (interfaces)
infrastructure → depende de application + domain + frameworks concretos
cmd/api     → composition root; ensambla todo usando Wire o fx
```

**Verificación automática**: usa `golang.org/x/tools/go/packages` o el linter `depguard` con reglas:

```yaml
# .depguard.yml
rules:
  domain-no-infra:
    files:
      - "internal/domain/**/*.go"
    deny:
      - pkg: "github.com/gin-gonic/gin"
        desc: "domain must not depend on HTTP framework"
      - pkg: "github.com/jackc/pgx"
        desc: "domain must not depend on database driver"
      - pkg: "github.com/nats-io/nats.go"
        desc: "domain must not depend on messaging broker"
```

---

### Estructura de Paquetes Canónica

```text
service-name/
├── cmd/
│   └── api/
│       └── main.go                  # composition root — ÚNICO lugar de wiring
├── internal/
│   ├── domain/
│   │   └── {bounded-context}/
│   │       ├── entity.go            # aggregate root + entities
│   │       ├── valueobject.go       # value objects inmutables
│   │       ├── event.go             # domain events
│   │       ├── service.go           # domain service (si aplica)
│   │       ├── repository.go        # OUTPUT PORT (interface)
│   │       ├── publisher.go         # OUTPUT PORT de eventos (interface)
│   │       └── errors.go            # errores de dominio
│   ├── application/
│   │   └── {bounded-context}/
│   │       ├── commands/
│   │       │   ├── create_xxx.go    # Command struct + Handler interface
│   │       │   └── update_xxx.go
│   │       ├── queries/
│   │       │   ├── find_xxx.go      # Query struct + Handler interface + ReadModel
│   │       │   └── list_xxx.go
│   │       └── ports/
│   │           ├── input.go         # INPUT PORTS (use case interfaces)
│   │           └── output.go        # OUTPUT PORTS re-exportados si conviene
│   └── infrastructure/
│       ├── http/
│       │   ├── handler/             # Gin handlers — adapters de entrada
│       │   ├── middleware/          # auth, cors, ratelimit, correlation-id
│       │   └── router.go
│       ├── persistence/
│       │   └── postgres/            # implementaciones de Repository (pgx)
│       ├── messaging/
│       │   └── nats/                # implementaciones de Publisher/Consumer
│       ├── security/
│       └── config/
│           └── config.go            # viper o envconfig
├── api/
│   ├── openapi/
│   └── postman/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
└── docs/
    ├── adr/
    └── security/
```

---

## 🧠 PARTE 2 — MODELADO DDD EN GO

### Aggregate Root — Patrón Canónico

```go
// internal/domain/user/entity.go
package user

import (
    "errors"
    "time"
)

// User es el aggregate root del bounded context de identidad.
// Encapsula invariantes y emite eventos de dominio.
type User struct {
    id           UserID
    email        Email
    passwordHash PasswordHash
    role         Role
    status       Status
    createdAt    time.Time
    events       []DomainEvent
}

// NewUser es el constructor canónico — ÚNICA forma de crear un User válido.
// Valida invariantes antes de retornar.
func NewUser(id UserID, email Email, passwordHash PasswordHash, role Role) (*User, error) {
    if id.IsZero() {
        return nil, ErrInvalidUserID
    }
    u := &User{
        id:           id,
        email:        email,
        passwordHash: passwordHash,
        role:         role,
        status:       StatusActive,
        createdAt:    time.Now().UTC(),
    }
    u.recordEvent(UserCreated{UserID: id, Email: email.String(), OccurredAt: u.createdAt})
    return u, nil
}

// Disable aplica la regla de negocio de desactivar un usuario.
func (u *User) Disable() error {
    if u.status == StatusDisabled {
        return ErrUserAlreadyDisabled
    }
    u.status = StatusDisabled
    u.recordEvent(UserDisabled{UserID: u.id, OccurredAt: time.Now().UTC()})
    return nil
}

// Getters inmutables — sin setters públicos, el estado cambia solo por métodos de negocio
func (u *User) ID() UserID          { return u.id }
func (u *User) Email() Email        { return u.email }
func (u *User) Role() Role          { return u.role }
func (u *User) Status() Status      { return u.status }

// DomainEvents retorna los eventos pendientes de publicar y limpia el slice.
func (u *User) DomainEvents() []DomainEvent {
    evts := make([]DomainEvent, len(u.events))
    copy(evts, u.events)
    u.events = nil
    return evts
}

func (u *User) recordEvent(e DomainEvent) {
    u.events = append(u.events, e)
}
```

### Value Objects — Inmutables con Validación Propia

```go
// internal/domain/user/valueobject.go
package user

import (
    "errors"
    "regexp"
    "strings"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Email es un value object — igualdad por valor, no por identidad.
type Email struct {
    value string
}

func NewEmail(raw string) (Email, error) {
    normalized := strings.ToLower(strings.TrimSpace(raw))
    if !emailRegex.MatchString(normalized) {
        return Email{}, ErrInvalidEmail
    }
    return Email{value: normalized}, nil
}

func (e Email) String() string   { return e.value }
func (e Email) IsZero() bool     { return e.value == "" }
func (e Email) Equals(o Email) bool { return e.value == o.value }

// UserID value object basado en UUID
type UserID struct{ value string }

func NewUserID(raw string) (UserID, error) {
    if len(raw) != 36 {
        return UserID{}, ErrInvalidUserID
    }
    return UserID{value: raw}, nil
}
func (id UserID) String() string { return id.value }
func (id UserID) IsZero() bool   { return id.value == "" }
```

### Domain Events — Interface + Tipos Concretos

```go
// internal/domain/user/event.go
package user

import "time"

// DomainEvent es la interface que deben implementar todos los eventos del dominio.
type DomainEvent interface {
    EventName() string
    OccurredAt() time.Time
}

type UserCreated struct {
    UserID     UserID
    Email      string
    OccurredAt time.Time
}
func (e UserCreated) EventName() string       { return "user.created" }
func (e UserCreated) OccurredAt() time.Time   { return e.OccurredAt }

type UserDisabled struct {
    UserID     UserID
    OccurredAt time.Time
}
func (e UserDisabled) EventName() string      { return "user.disabled" }
func (e UserDisabled) OccurredAt() time.Time  { return e.OccurredAt }
```

### Output Ports — Interfaces en el Dominio

```go
// internal/domain/user/repository.go
package user

import "context"

// UserRepository es el OUTPUT PORT de persistencia.
// El dominio define QUÉ necesita; infrastructure implementa CÓMO.
type UserRepository interface {
    Save(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id UserID) (*User, error)
    FindByEmail(ctx context.Context, email Email) (*User, error)
    ExistsByEmail(ctx context.Context, email Email) (bool, error)
}

// UserPublisher es el OUTPUT PORT de eventos de dominio.
type UserPublisher interface {
    Publish(ctx context.Context, events []DomainEvent) error
}
```

### Errores de Dominio — Tipos Explícitos

```go
// internal/domain/user/errors.go
package user

import "errors"

var (
    ErrInvalidUserID      = errors.New("user: invalid user id")
    ErrInvalidEmail       = errors.New("user: invalid email format")
    ErrUserNotFound       = errors.New("user: not found")
    ErrUserAlreadyExists  = errors.New("user: already exists with this email")
    ErrUserAlreadyDisabled= errors.New("user: already disabled")
    ErrInvalidPassword    = errors.New("user: password does not meet policy")
)

// DomainError permite distinguir errores de negocio de errores técnicos en la capa de aplicación.
type DomainError struct {
    Code    string
    Message string
}
func (e *DomainError) Error() string { return e.Message }
```

---

## 🧠 PARTE 3 — CAPA DE APLICACIÓN

### Input Ports — Interface del Caso de Uso

```go
// internal/application/user/ports/input.go
package ports

import "context"

// RegisterUserUseCase es el INPUT PORT — define el contrato del caso de uso.
// Los handlers HTTP implementan este contrato, no hablan directamente con domain.
type RegisterUserUseCase interface {
    Execute(ctx context.Context, cmd RegisterUserCommand) (RegisterUserResult, error)
}
```

### Command + Handler

```go
// internal/application/user/commands/register_user.go
package commands

import (
    "context"
    domain "service/internal/domain/user"
)

// RegisterUserCommand es el DTO de entrada del caso de uso.
type RegisterUserCommand struct {
    Email    string
    Password string
    Role     string
}

// RegisterUserResult es el DTO de salida.
type RegisterUserResult struct {
    UserID string
}

// RegisterUserHandler implementa el INPUT PORT.
type RegisterUserHandler struct {
    repo      domain.UserRepository
    publisher domain.UserPublisher
    hasher    PasswordHasher // output port local
}

func NewRegisterUserHandler(
    repo domain.UserRepository,
    publisher domain.UserPublisher,
    hasher PasswordHasher,
) *RegisterUserHandler {
    return &RegisterUserHandler{repo: repo, publisher: publisher, hasher: hasher}
}

func (h *RegisterUserHandler) Execute(ctx context.Context, cmd RegisterUserCommand) (RegisterUserResult, error) {
    email, err := domain.NewEmail(cmd.Email)
    if err != nil {
        return RegisterUserResult{}, err
    }

    exists, err := h.repo.ExistsByEmail(ctx, email)
    if err != nil {
        return RegisterUserResult{}, err
    }
    if exists {
        return RegisterUserResult{}, domain.ErrUserAlreadyExists
    }

    hash, err := h.hasher.Hash(cmd.Password)
    if err != nil {
        return RegisterUserResult{}, err
    }

    userID := domain.NewRandomUserID()
    role, err := domain.NewRole(cmd.Role)
    if err != nil {
        return RegisterUserResult{}, err
    }

    u, err := domain.NewUser(userID, email, hash, role)
    if err != nil {
        return RegisterUserResult{}, err
    }

    if err := h.repo.Save(ctx, u); err != nil {
        return RegisterUserResult{}, err
    }

    _ = h.publisher.Publish(ctx, u.DomainEvents()) // best-effort; outbox pattern si garantía es requerida

    return RegisterUserResult{UserID: userID.String()}, nil
}
```

---

## 🧠 PARTE 4 — COMPOSITION ROOT (WIRING)

```go
// cmd/api/main.go — ÚNICO lugar donde se ensamblan dependencias concretas
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"

    "service/internal/application/user/commands"
    httpHandler "service/internal/infrastructure/http/handler"
    "service/internal/infrastructure/persistence/postgres"
    "service/internal/infrastructure/messaging/nats"
    "service/internal/infrastructure/security"
    "service/internal/infrastructure/config"
)

func main() {
    cfg := config.Load()

    // Infrastructure
    db := postgres.Connect(cfg.DatabaseURL)
    broker := nats.Connect(cfg.NatsURL)

    // Repositories (Output Adapters)
    userRepo := postgres.NewUserRepository(db)

    // Publishers (Output Adapters)
    userPublisher := nats.NewUserPublisher(broker)

    // Domain Services / Utilities
    hasher := security.NewArgon2idHasher()

    // Application Handlers (Use Cases)
    registerHandler := commands.NewRegisterUserHandler(userRepo, userPublisher, hasher)

    // HTTP Handlers (Input Adapters)
    userHTTPHandler := httpHandler.NewUserHandler(registerHandler)

    // Router
    r := gin.New()
    userHTTPHandler.RegisterRoutes(r)

    srv := &http.Server{Addr: ":" + cfg.Port, Handler: r}

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("server error: %v", err)
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    _ = srv.Shutdown(ctx)
}
```

> ⚠️ **Para servicios complejos** usa `google/wire` o `uber-go/fx` para el wiring — el composition root NO debe crecer en lógica.

---

## 🧠 PARTE 5 — REGLAS DE ORO GO + HEXAGONAL

| Regla | Descripción |
|-------|-------------|
| **Interfaces pequeñas** | Preferir interfaces de 1-2 métodos. `io.Reader`, `io.Writer` como modelo. Nunca una "God Interface". |
| **Interfaces en el consumidor** | La interface se define donde SE USA (application layer), no donde se implementa (infrastructure). |
| **No punteros en value objects** | Los value objects se pasan por valor (`Email`, no `*Email`) para garantizar inmutabilidad. |
| **Errores envueltos con contexto** | `fmt.Errorf("registerUser: %w", domain.ErrUserAlreadyExists)` para trazabilidad con `errors.Is`. |
| **ctx en primer argumento** | Toda función de repositorio, publisher y caso de uso recibe `ctx context.Context` como primer parámetro. |
| **No init()** | Prohibido usar `init()` para wiring de dependencias — usa el composition root en `main.go`. |
| **No globals** | Prohibidas variables globales para repositorios, configs o clientes — inyéctala siempre. |
| **Dominio sin reflect** | El paquete `internal/domain` no usa `reflect`, `encoding/json` ni frameworks. Solo stdlib pura. |

---

## ✅ Checklist de Validación DDD + Hexagonal

```markdown
### Dominio
- [ ] El paquete `internal/domain` NO importa gin, pgx, nats, redis ni ningún framework
- [ ] Cada aggregate root tiene constructor con validación de invariantes
- [ ] Los value objects validan en el constructor y son inmutables
- [ ] Los errores de dominio son `var Err... = errors.New(...)` o tipos custom
- [ ] Los domain events son structs con interfaz `DomainEvent`
- [ ] Los OUTPUT PORTS son interfaces definidas en el paquete de dominio

### Aplicación
- [ ] Los use cases dependen de interfaces (ports), nunca de structs concretos
- [ ] Commands y Queries son structs DTO sin lógica de negocio
- [ ] Los handlers de comando y query no invocan directamente HTTP ni SQL
- [ ] El manejo de errores mapea errores de dominio a errores de aplicación explícitamente

### Infraestructura
- [ ] Los adapters implementan las interfaces definidas en domain o application
- [ ] No hay lógica de negocio en handlers HTTP ni en repositorios
- [ ] El wiring completo vive en cmd/api/main.go (o en Wire/fx providers)

### Verificación de arquitectura
- [ ] `go build ./internal/domain/...` compila sin imports de infrastructure
- [ ] `depguard` linting activo sobre la regla domain-no-infra
```
