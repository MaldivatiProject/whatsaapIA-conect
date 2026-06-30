# 🔭 SKILL: OBSERVABILIDAD EN GO — EXPERT

**skill_id**: observability-go-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / observability / go  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-backend-go  
**dependencias**: ddd-hexagonal-go (la observabilidad es un cross-cutting concern en infrastructure layer)  
**referencia_stack**: Go 1.23+ / OpenTelemetry Go SDK v1.24+ / zerolog v1.32+ / Prometheus client_golang v1.19+ / Gin 1.10+ / pprof

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento profundo y los patrones canónicos para implementar **observabilidad production-grade en servicios Go**: logging estructurado con zerolog, distributed tracing con OpenTelemetry, métricas con Prometheus, profiling con pprof, health checks y alertas. Todo sin filtrar secretos ni PII, y con Correlation ID propagado end-to-end.

---

## 🧠 PARTE 1 — TRES PILARES DE OBSERVABILIDAD

```
┌─────────────────────────────────────────────────────┐
│  LOGS             TRACES              METRICS        │
│  (zerolog)        (OTel + Jaeger)     (Prometheus)   │
│                                                      │
│  Qué pasó y       Dónde y cuánto      Qué tan bien  │
│  por qué          tiempo tomó         funciona       │
└─────────────────────────────────────────────────────┘
```

| Pilar | Herramienta | Uso | SLA |
|-------|------------|-----|-----|
| **Logs** | zerolog (o zap) | Eventos de negocio, errores, auditoría | N/A |
| **Traces** | OpenTelemetry SDK + Jaeger/Tempo | Latencia por span, bottlenecks | p95 ≤ 100ms |
| **Metrics** | Prometheus client_golang + Grafana | Tasa de error, latencia histograma, uso de recursos | p95 ≤ 100ms gate en CI |
| **Profiling** | pprof | Detección de memory leaks, goroutine leaks, CPU hotspots | On-demand |

---

## 🧠 PARTE 2 — LOGGING ESTRUCTURADO CON ZEROLOG

### Setup global

```go
// internal/infrastructure/config/logger.go
package config

import (
    "io"
    "os"
    "time"

    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func InitLogger(env string) {
    zerolog.TimeFieldFormat = time.RFC3339Nano
    zerolog.SetGlobalLevel(zerolog.InfoLevel)

    var output io.Writer = os.Stdout
    if env == "development" {
        // Pretty print solo en dev — NUNCA en producción (costoso)
        output = zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
        zerolog.SetGlobalLevel(zerolog.DebugLevel)
    }

    log.Logger = zerolog.New(output).With().
        Timestamp().
        Str("service", "service-name").
        Str("version", "v1.0.0").
        Logger()
}
```

### Middleware de Correlation ID en Gin

```go
// internal/infrastructure/http/middleware/correlation_id.go
package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/rs/zerolog/log"
)

const CorrelationIDHeader = "X-Correlation-Id"
const correlationIDKey = "correlationID"

// CorrelationID inyecta o genera un correlation ID en cada request y lo propaga.
func CorrelationID() gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.GetHeader(CorrelationIDHeader)
        if id == "" {
            id = uuid.NewString()
        }
        c.Set(correlationIDKey, id)
        c.Header(CorrelationIDHeader, id) // propaga al cliente

        // Enriquecer el logger con el correlationID para todos los logs del request
        logger := log.With().Str("correlationId", id).Logger()
        c.Set("logger", logger)

        c.Next()
    }
}
```

### Middleware de request logging

```go
// internal/infrastructure/http/middleware/request_logger.go
package middleware

import (
    "time"

    "github.com/gin-gonic/gin"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

// RequestLogger loggea cada request HTTP con campos estructurados.
// NUNCA loggea headers de autorización ni body con datos sensibles.
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next()

        logger, ok := c.Get("logger")
        l, _ := logger.(zerolog.Logger)
        if !ok {
            l = log.Logger
        }

        status := c.Writer.Status()
        entry := l.With().
            Str("method", c.Request.Method).
            Str("path", c.Request.URL.Path).        // path, sin query params con tokens
            Int("status", status).
            Dur("durationMs", time.Since(start)).
            Str("clientIp", c.ClientIP()).           // IP del cliente (no PII en el sentido estricto)
            Logger()

        switch {
        case status >= 500:
            entry.Error().Msg("server error")
        case status >= 400:
            entry.Warn().Msg("client error")
        default:
            entry.Info().Msg("request completed")
        }
    }
}
```

### Reglas de Logging Seguro

```go
// ✅ CORRECTO
log.Info().
    Str("userId", user.ID().String()).   // ID, no email ni nombre
    Str("action", "user.created").
    Msg("user registration completed")

// ❌ PROHIBIDO — filtra PII
log.Info().Str("email", user.Email().String()).Msg("user created")
log.Info().Str("password", cmd.Password).Msg("...")
log.Error().Str("token", bearerToken).Msg("auth failed")
log.Info().Interface("requestBody", c.Request.Body).Msg("...")  // body puede tener datos sensibles
```

---

## 🧠 PARTE 3 — DISTRIBUTED TRACING CON OPENTELEMETRY

### Setup del tracer

```go
// internal/infrastructure/config/tracing.go
package config

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func InitTracer(ctx context.Context, serviceName, otlpEndpoint string) func() {
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint(otlpEndpoint),
        otlptracehttp.WithInsecure(), // solo en dev/QA
    )
    if err != nil {
        log.Fatalf("failed to create OTLP exporter: %v", err)
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
        )),
        trace.WithSampler(trace.AlwaysSample()), // ajustar en producción (TraceIDRatioBased)
    )
    otel.SetTracerProvider(tp)

    return func() { _ = tp.Shutdown(ctx) }
}
```

### Middleware OTel en Gin

```go
// internal/infrastructure/http/middleware/tracing.go
package middleware

import (
    "github.com/gin-gonic/gin"
    "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

// OtelTracing añade spans OpenTelemetry a cada request Gin.
func OtelTracing(serviceName string) gin.HandlerFunc {
    return otelgin.Middleware(serviceName)
}
```

### Instrumentar casos de uso

```go
// internal/application/user/commands/create_user.go (fragmento)
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

var tracer = otel.Tracer("application/user/commands")

func (h *CreateUserHandler) Execute(ctx context.Context, cmd CreateUserCommand) (CreateUserResult, error) {
    ctx, span := tracer.Start(ctx, "CreateUser")
    defer span.End()

    span.SetAttributes(attribute.String("user.role", cmd.Role))

    // ... lógica del caso de uso
}
```

---

## 🧠 PARTE 4 — MÉTRICAS CON PROMETHEUS

### Setup y métricas personalizadas

```go
// internal/infrastructure/metrics/metrics.go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // HTTP request duration histograma — base para SLA p95 ≤ 100ms
    HTTPRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5},
        },
        []string{"method", "path", "status"},
    )

    // Contador de errores por dominio — permite alertas por tipo de error
    DomainErrorsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "domain_errors_total",
            Help: "Total domain errors by error type",
        },
        []string{"bounded_context", "error_type"},
    )

    // LAG de proyecciones CQRS — para alertar si la consistencia eventual se degrada
    ProjectionLagSeconds = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "projection_lag_seconds",
            Help: "Seconds behind the latest event for each projection",
        },
        []string{"projection"},
    )
)
```

### Middleware de métricas en Gin

```go
// internal/infrastructure/http/middleware/prometheus.go
package middleware

import (
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "service/internal/infrastructure/metrics"
)

func PrometheusMetrics() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        c.Next()
        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Writer.Status())
        metrics.HTTPRequestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(), // patrón de ruta, no URL con IDs
            status,
        ).Observe(duration)
    }
}
```

### Endpoint /metrics (nunca público en producción)

```go
// internal/infrastructure/http/router.go (fragmento)
import "github.com/prometheus/client_golang/prometheus/promhttp"

// Exponer /metrics solo en puerto interno (no en el puerto público del API)
metricsRouter := gin.New()
metricsRouter.GET("/metrics", gin.WrapH(promhttp.Handler()))
go metricsRouter.Run(":9090") // puerto interno de métricas
```

---

## 🧠 PARTE 5 — HEALTH CHECKS

```go
// internal/infrastructure/http/handler/health_handler.go
package handler

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

type HealthChecker interface {
    CheckDB(ctx context.Context) error
    CheckBroker(ctx context.Context) error
}

type HealthHandler struct{ checker HealthChecker }

func NewHealthHandler(checker HealthChecker) *HealthHandler {
    return &HealthHandler{checker: checker}
}

func (h *HealthHandler) Liveness(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{"status": "alive"})
}

func (h *HealthHandler) Readiness(c *gin.Context) {
    checks := map[string]string{}
    code := http.StatusOK

    if err := h.checker.CheckDB(c.Request.Context()); err != nil {
        checks["database"] = "unhealthy"
        code = http.StatusServiceUnavailable
    } else {
        checks["database"] = "healthy"
    }

    if err := h.checker.CheckBroker(c.Request.Context()); err != nil {
        checks["broker"] = "unhealthy"
        code = http.StatusServiceUnavailable
    } else {
        checks["broker"] = "healthy"
    }

    c.JSON(code, gin.H{"status": checks})
}
```

---

## 🧠 PARTE 6 — PROFILING CON PPROF

```go
// cmd/api/main.go (fragmento — solo en ambientes no productivos)
import _ "net/http/pprof"
import "net/http"

if cfg.EnablePprof {
    go func() {
        // Puerto separado del API — NUNCA exponer pprof en el puerto público
        if err := http.ListenAndServe(":6060", nil); err != nil {
            log.Printf("pprof server failed: %v", err)
        }
    }()
}
// Acceso: go tool pprof http://localhost:6060/debug/pprof/goroutine
// Acceso: go tool pprof http://localhost:6060/debug/pprof/heap
```

---

## 🧠 PARTE 7 — ALERTAS PROMETHEUS RECOMENDADAS

```yaml
# prometheus/alerts/service-name.yml
groups:
  - name: service-name-sla
    rules:
      - alert: ZNS_P95_SLA_Violated
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency > 100ms on {{ $labels.path }}"

      - alert: HighErrorRate
        expr: rate(http_request_duration_seconds_count{status=~"5.."}[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Error rate > 5% on {{ $labels.path }}"

      - alert: ProjectionLagHigh
        expr: projection_lag_seconds > 5
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Projection {{ $labels.projection }} lagging > 5s"
```

---

## ✅ Checklist de Observabilidad

```markdown
### Logging
- [ ] zerolog (o zap) configurado con JSON en producción, ConsoleWriter solo en dev
- [ ] Correlation ID middleware activo y propagado en todos los requests y eventos
- [ ] Request logger loguea: method, path, status, duration — SIN body, SIN Authorization header
- [ ] NUNCA se loggea: email, password, token, tarjeta, CURP, número de identificación
- [ ] Nivel de log por variable de entorno: LOG_LEVEL=info (prod), debug (dev)

### Tracing
- [ ] OpenTelemetry SDK inicializado con exportador OTLP configurado por variable de entorno
- [ ] Middleware otelgin activo en el router principal
- [ ] Spans nombrados por operación en casos de uso críticos
- [ ] TraceID propagado en header X-Trace-Id en respuestas de error (para correlación en soporte)

### Métricas
- [ ] Histograma http_request_duration_seconds con buckets apropiados
- [ ] Endpoint /metrics en puerto interno separado (≠ puerto del API público)
- [ ] Alertas Prometheus para p95 > 100ms y error rate > 5%
- [ ] Proyecciones CQRS con projection_lag_seconds si aplica

### Health Checks
- [ ] GET /health/liveness — solo verifica que el proceso está vivo
- [ ] GET /health/readiness — verifica DB y broker antes de recibir tráfico
- [ ] Health checks no exponen información de infraestructura interna

### Profiling
- [ ] pprof habilitado solo por variable de entorno y en puerto separado
- [ ] pprof NUNCA expuesto en producción sin autenticación
```
