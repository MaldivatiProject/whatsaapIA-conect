# 🧪 SKILL: TDD + TESTING EN GO — EXPERT

**skill_id**: tdd-testing-go  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / testing / go  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-backend-go  
**dependencias**: ddd-hexagonal-go (complementaria — los tests se organizan por capas hexagonales)  
**referencia_stack**: Go 1.23+ / testify v1.9+ / gomock v1.6+ / testcontainers-go v0.29+ / net/http/httptest

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento profundo y los patrones canónicos para diseñar e implementar **pruebas automatizadas de calidad Senior/Expert en Go**. Cubre: pirámide de testing hexagonal, table-driven tests, testify, gomock por puertos, testcontainers-go para integración, Net/httptest para handlers, Object Mother, fuzzing, benchmarks y cobertura mínima del 85% verificable en CI.

---

## 🧠 PARTE 1 — PIRÁMIDE DE TESTING HEXAGONAL GO

```
                    ┌─────────────────────┐
                    │   E2E / Contract     │  ← httptest + Postman Newman / Pact
                    ├─────────────────────┤
              ┌─────┤   Integration        ├─────┐
              │     │   (testcontainers)   │     │
              │     ├─────────────────────┤     │
              └─────┤   Unit (domain +    ├─────┘
                    │   application)      │
                    └─────────────────────┘
```

| Capa | Objetivo | Herramientas | Cobertura objetivo |
|------|----------|-------------|-------------------|
| **Unit — domain** | Invariantes, reglas de negocio, value objects | stdlib `testing` + testify | ≥ 90% |
| **Unit — application** | Casos de uso con puertos mockeados | testify + gomock | ≥ 85% |
| **Integration — adapters** | Repositorios contra PostgreSQL real, publishers contra NATS real | testcontainers-go | Flujos críticos |
| **HTTP Handlers** | Serialización, routing, middleware, códigos de estado | `net/http/httptest` + testify | 100% endpoints públicos |
| **Contract / CDC** | Contrato entre productor y consumidor de API | Pact Go / Schemathesis | APIs externas |

---

## 🧠 PARTE 2 — TABLE-DRIVEN TESTS (PATRÓN CANÓNICO GO)

```go
// tests/unit/domain/user/email_test.go
package user_test

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "service/internal/domain/user"
)

func TestNewEmail(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr bool
        want    string
    }{
        {
            name:  "valid email normalizes to lowercase",
            input: "USER@EXAMPLE.COM",
            want:  "user@example.com",
        },
        {
            name:    "empty string returns error",
            input:   "",
            wantErr: true,
        },
        {
            name:    "missing domain returns error",
            input:   "noatsign",
            wantErr: true,
        },
        {
            name:    "missing TLD returns error",
            input:   "user@domain",
            wantErr: true,
        },
        {
            name:  "trims whitespace",
            input: "  alice@example.com  ",
            want:  "alice@example.com",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := user.NewEmail(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
                return
            }
            assert.NoError(t, err)
            assert.Equal(t, tt.want, got.String())
        })
    }
}
```

> **Regla**: Cada subtabla de test tiene `name` descriptivo en español o inglés consistente. Usar siempre `t.Run()`. NUNCA tests sin nombre.

---

## 🧠 PARTE 3 — OBJETO MADRE (OBJECT MOTHER EN GO)

```go
// tests/testdata/user_mother.go
package testdata

import (
    "service/internal/domain/user"
)

// UserMother genera agregados User configurables para tests.
// Patrón: NewXxx() devuelve un default válido; WithXxx() aplican overrides.
type UserMother struct {
    id       string
    email    string
    password string
    role     string
}

func NewUserMother() *UserMother {
    return &UserMother{
        id:       "550e8400-e29b-41d4-a716-446655440000",
        email:    "alice@example.com",
        password: "$argon2id$...",
        role:     "viewer",
    }
}

func (m *UserMother) WithEmail(email string) *UserMother {
    m.email = email
    return m
}

func (m *UserMother) WithRole(role string) *UserMother {
    m.role = role
    return m
}

func (m *UserMother) Build() *user.User {
    id, _ := user.NewUserID(m.id)
    email, _ := user.NewEmail(m.email)
    hash, _ := user.NewPasswordHash(m.password)
    role, _ := user.NewRole(m.role)
    u, _ := user.NewUser(id, email, hash, role)
    return u
}
```

---

## 🧠 PARTE 4 — MOCKS DE PUERTOS CON GOMOCK

```go
// Generar mock del puerto UserRepository:
// go install go.uber.org/mock/mockgen@latest
// mockgen -source=internal/domain/user/repository.go -destination=tests/mocks/user_repository_mock.go -package=mocks

// tests/unit/application/register_user_handler_test.go
package commands_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "go.uber.org/mock/gomock"

    "service/internal/application/user/commands"
    domain "service/internal/domain/user"
    "service/tests/mocks"
    "service/tests/testdata"
)

func TestRegisterUserHandler_Execute(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    tests := []struct {
        name        string
        setupMocks  func(repo *mocks.MockUserRepository, pub *mocks.MockUserPublisher)
        cmd         commands.RegisterUserCommand
        wantErr     bool
        wantErrIs   error
    }{
        {
            name: "registers user successfully",
            setupMocks: func(repo *mocks.MockUserRepository, pub *mocks.MockUserPublisher) {
                repo.EXPECT().ExistsByEmail(gomock.Any(), gomock.Any()).Return(false, nil)
                repo.EXPECT().Save(gomock.Any(), gomock.Any()).Return(nil)
                pub.EXPECT().Publish(gomock.Any(), gomock.Any()).Return(nil)
            },
            cmd: commands.RegisterUserCommand{
                Email: "alice@example.com", Password: "P@ssw0rd.123", Role: "viewer",
            },
        },
        {
            name: "returns error when email already exists",
            setupMocks: func(repo *mocks.MockUserRepository, pub *mocks.MockUserPublisher) {
                repo.EXPECT().ExistsByEmail(gomock.Any(), gomock.Any()).Return(true, nil)
            },
            cmd: commands.RegisterUserCommand{
                Email: "alice@example.com", Password: "P@ssw0rd.123", Role: "viewer",
            },
            wantErr:   true,
            wantErrIs: domain.ErrUserAlreadyExists,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            repo := mocks.NewMockUserRepository(ctrl)
            pub := mocks.NewMockUserPublisher(ctrl)
            hasher := &stubHasher{}
            if tt.setupMocks != nil {
                tt.setupMocks(repo, pub)
            }

            h := commands.NewRegisterUserHandler(repo, pub, hasher)
            _, err := h.Execute(context.Background(), tt.cmd)

            if tt.wantErr {
                assert.ErrorIs(t, err, tt.wantErrIs)
                return
            }
            assert.NoError(t, err)
        })
    }
}

type stubHasher struct{}
func (s *stubHasher) Hash(pwd string) (domain.PasswordHash, error) {
    return domain.NewPasswordHash("$argon2id$stub")
}
```

---

## 🧠 PARTE 5 — TESTS DE INTEGRACIÓN CON TESTCONTAINERS-GO

```go
// tests/integration/postgres_user_repository_test.go
package integration_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
    "github.com/testcontainers/testcontainers-go/wait"

    persistence "service/internal/infrastructure/persistence/postgres"
    "service/tests/testdata"
)

func TestUserRepository_Save_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test in short mode")
    }

    ctx := context.Background()

    pgContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:16-alpine"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
        ),
    )
    require.NoError(t, err)
    t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    require.NoError(t, err)

    db := persistence.MustConnect(ctx, connStr)
    persistence.MustMigrate(db) // aplica migraciones Flyway/goose

    repo := persistence.NewUserRepository(db)
    user := testdata.NewUserMother().Build()

    err = repo.Save(ctx, user)
    assert.NoError(t, err)

    found, err := repo.FindByID(ctx, user.ID())
    assert.NoError(t, err)
    assert.Equal(t, user.Email().String(), found.Email().String())
}
```

---

## 🧠 PARTE 6 — TESTS DE HTTP HANDLERS

```go
// tests/unit/infrastructure/http/user_handler_test.go
package handler_test

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "go.uber.org/mock/gomock"

    httpHandler "service/internal/infrastructure/http/handler"
    "service/internal/application/user/commands"
    "service/tests/mocks"
)

func init() { gin.SetMode(gin.TestMode) }

func TestUserHandler_Register(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    tests := []struct {
        name           string
        body           map[string]any
        setupMock      func(m *mocks.MockRegisterUserUseCase)
        expectedStatus int
    }{
        {
            name:  "POST /users returns 201 on success",
            body:  map[string]any{"email": "alice@example.com", "password": "P@ssw0rd.123", "role": "viewer"},
            setupMock: func(m *mocks.MockRegisterUserUseCase) {
                m.EXPECT().Execute(gomock.Any(), gomock.Any()).
                    Return(commands.RegisterUserResult{UserID: "uuid-123"}, nil)
            },
            expectedStatus: http.StatusCreated,
        },
        {
            name:           "POST /users returns 400 on missing email",
            body:           map[string]any{"password": "P@ssw0rd.123"},
            setupMock:      func(m *mocks.MockRegisterUserUseCase) {},
            expectedStatus: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockUC := mocks.NewMockRegisterUserUseCase(ctrl)
            tt.setupMock(mockUC)

            r := gin.New()
            h := httpHandler.NewUserHandler(mockUC)
            h.RegisterRoutes(r)

            bodyBytes, _ := json.Marshal(tt.body)
            req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewBuffer(bodyBytes))
            req.Header.Set("Content-Type", "application/json")
            w := httptest.NewRecorder()

            r.ServeHTTP(w, req)
            assert.Equal(t, tt.expectedStatus, w.Code)
        })
    }
}
```

---

## 🧠 PARTE 7 — FUZZING (GO 1.18+)

```go
// tests/unit/domain/user/email_fuzz_test.go
package user_test

import (
    "testing"
    "service/internal/domain/user"
)

// FuzzNewEmail valida que NewEmail no entre en pánico con cualquier input.
// Ejecutar: go test -fuzz=FuzzNewEmail -fuzztime=30s ./tests/unit/domain/user/
func FuzzNewEmail(f *testing.F) {
    // Corpus inicial
    f.Add("alice@example.com")
    f.Add("")
    f.Add(" ")
    f.Add("a@b")
    f.Add("user.name+tag@sub.domain.io")

    f.Fuzz(func(t *testing.T, input string) {
        // La función no debe entrar en pánico — solo retornar error o valor válido
        _, _ = user.NewEmail(input)
    })
}
```

---

## 🧠 PARTE 8 — BENCHMARKS

```go
// tests/unit/domain/user/email_bench_test.go
package user_test

import (
    "testing"
    "service/internal/domain/user"
)

func BenchmarkNewEmail(b *testing.B) {
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        _, _ = user.NewEmail("alice@example.com")
    }
}
```

---

## 🧠 PARTE 9 — COBERTURA Y CI

```makefile
# Makefile
.PHONY: test test-integration test-coverage

test:
	go test -race -count=1 ./internal/...

test-integration:
	go test -race -count=1 -tags=integration ./tests/integration/...

test-coverage:
	go test -race -coverprofile=coverage.out -covermode=atomic ./internal/...
	go tool cover -func=coverage.out | tail -n 1
	# Falla si cobertura < 85%
	@COVERAGE=$$(go tool cover -func=coverage.out | tail -1 | awk '{print $$3}' | tr -d '%'); \
	  if [ $$(echo "$$COVERAGE < 85" | bc) -eq 1 ]; then \
	    echo "❌ Coverage $$COVERAGE% < 85%"; exit 1; \
	  else echo "✅ Coverage $$COVERAGE%"; fi

lint:
	golangci-lint run --config .golangci.yml
```

```yaml
# GitHub Actions — CI gate
- name: Run tests with coverage
  run: make test-coverage

- name: Run integration tests
  run: make test-integration
```

---

## ✅ Checklist de Testing

```markdown
### Unit Tests — Dominio
- [ ] Table-driven tests para TODOS los value objects
- [ ] Tests de invariantes del aggregate root (constructores con inputs inválidos)
- [ ] Tests de domain events (se emiten correctamente en las operaciones)
- [ ] Cobertura ≥ 90% en paquetes internal/domain/**

### Unit Tests — Aplicación
- [ ] Mocks generados con gomock/mockgen desde las interfaces de puertos
- [ ] Table-driven tests por caso de uso (happy path + errores de dominio + errores técnicos)
- [ ] Object Mother usada para construir fixtures complejos
- [ ] Cobertura ≥ 85% en paquetes internal/application/**

### Integration Tests
- [ ] testcontainers-go usado para PostgreSQL y Redis (sin dependencia de docker-compose externo)
- [ ] Test de ciclo completo: Save + FindByID + FindByEmail
- [ ] Migraciones aplicadas antes de los tests de integración
- [ ] Tests de integración marcados con `testing.Short()` skip

### HTTP Handlers
- [ ] httptest.NewRecorder() + gin.SetMode(gin.TestMode) en todos los tests de handler
- [ ] Tests de serialización: 400 en campos faltantes, 400 en formato inválido
- [ ] Tests de códigos de estado para happy path, not-found y errores de dominio

### Fuzzing y Benchmarks
- [ ] Fuzz tests para value objects críticos (Email, IDs, contraseñas) — sin panics posibles
- [ ] Benchmarks para operaciones del dominio que impactan SLA

### CI
- [ ] go test -race activo en todos los tests unitarios
- [ ] Coverage gate ≥ 85% bloqueante en PR
- [ ] Integration tests en stage separado del CI (no bloquean feedback rápido)
```
