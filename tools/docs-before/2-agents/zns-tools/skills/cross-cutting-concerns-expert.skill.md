# 🎯 SKILL: CROSS-CUTTING CONCERNS — Concerns Transversales Expert

**skill_id**: cross-cutting-concerns-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / architecture  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-dotnet-core-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-backend-go.md`

**dependencias**: ninguna (skill autónoma de arquitectura transversal)

---

## 📌 Propósito de la Skill

Los **Cross-Cutting Concerns** (CCCs) son responsabilidades que atraviesan múltiples capas y módulos sin pertenecer a ningún dominio de negocio específico: logging estructurado, distributed tracing, manejo global de errores, gestión transaccional, caching, resiliencia (retry/circuit breaker), auditoría y filtros HTTP. Esta skill equipa al agente con patrones Expert para implementar cada CCC de forma consistente, no intrusiva en el dominio, testeable y production-ready en Kotlin + Spring Boot, Java + Spring Boot y .NET Core / C#.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Logging Estructurado + MDC / Correlation ID

#### Principios
- **Structured logging siempre**: JSON en producción (Logback + `logstash-logback-encoder` / Serilog JSON). Nunca texto libre en producción.
- **Correlation ID obligatorio**: cada request HTTP debe propagar un `X-Correlation-Id` (UUID v4) que se adjunta al MDC/contexto y aparece en TODOS los logs de esa petición y en los eventos de Kafka.
- **Nunca loggear PII** (nombres, emails, passwords, tokens, números de tarjeta) — usar `[REDACTED]`.
- **Log levels**: `ERROR` = errores que afectan al usuario; `WARN` = situación inesperada pero recuperable; `INFO` = eventos de negocio significativos; `DEBUG` = solo en desarrollo.

#### Implementación Kotlin + Spring Boot

```kotlin
// infrastructure/config/CorrelationIdFilter.kt
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class CorrelationIdFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain
    ) {
        val correlationId = request.getHeader(CORRELATION_HEADER)
            ?.takeIf { it.isNotBlank() }
            ?: UUID.randomUUID().toString()

        MDC.put(CORRELATION_KEY, correlationId)
        response.setHeader(CORRELATION_HEADER, correlationId)  // propaga al cliente

        try {
            chain.doFilter(request, response)
        } finally {
            MDC.clear()  // ← SIEMPRE limpiar para evitar leaks en thread pools
        }
    }

    companion object {
        const val CORRELATION_HEADER = "X-Correlation-Id"
        const val CORRELATION_KEY = "correlationId"
    }
}

// infrastructure/config/KafkaCorrelationInterceptor.kt
// ✅ Propagar correlationId a mensajes Kafka salientes
class KafkaCorrelationProducerInterceptor : ProducerInterceptor<String, Any> {
    override fun onSend(record: ProducerRecord<String, Any>): ProducerRecord<String, Any> {
        val correlationId = MDC.get(CorrelationIdFilter.CORRELATION_KEY) ?: UUID.randomUUID().toString()
        record.headers().add(CorrelationIdFilter.CORRELATION_HEADER, correlationId.toByteArray())
        return record
    }
    override fun onAcknowledgement(metadata: RecordMetadata?, exception: Exception?) {}
    override fun close() {}
    override fun configure(configs: MutableMap<String, *>?) {}
}

// ✅ Restaurar correlationId en Kafka consumers
@KafkaListener(topics = ["pedidos"])
fun onPedidoEvent(record: ConsumerRecord<String, PedidoEvent>) {
    val correlationId = record.headers()
        .lastHeader(CorrelationIdFilter.CORRELATION_HEADER)
        ?.value()?.let { String(it) }
        ?: UUID.randomUUID().toString()

    MDC.put(CorrelationIdFilter.CORRELATION_KEY, correlationId)
    try {
        procesarEvento(record.value())
    } finally {
        MDC.clear()
    }
}

// logback-spring.xml (producción — JSON estructurado)
// <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
//   <encoder class="net.logstash.logback.encoder.LogstashEncoder">
//     <includeMdcKeyName>correlationId</includeMdcKeyName>
//     <includeMdcKeyName>userId</includeMdcKeyName>
//   </encoder>
// </appender>
```

#### Implementación Java + Spring Boot

```java
// Idéntico — MDC.put/MDC.clear funcionan igual en Java
// Solo cambiar: fun → void/String, companion object → static final
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String CORRELATION_HEADER = "X-Correlation-Id";
    public static final String CORRELATION_KEY = "correlationId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        var correlationId = Optional.ofNullable(request.getHeader(CORRELATION_HEADER))
            .filter(h -> !h.isBlank())
            .orElse(UUID.randomUUID().toString());

        MDC.put(CORRELATION_KEY, correlationId);
        response.setHeader(CORRELATION_HEADER, correlationId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

#### Implementación .NET Core / C#

```csharp
// Infrastructure/Middleware/CorrelationIdMiddleware.cs
public class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string CorrelationHeader = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[CorrelationHeader].FirstOrDefault()
            ?? Guid.NewGuid().ToString();

        context.Response.Headers[CorrelationHeader] = correlationId;

        // Agregar al scope de logging (equivalente a MDC en .NET)
        using var scope = context.RequestServices
            .GetRequiredService<ILogger<CorrelationIdMiddleware>>()
            .BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId });

        context.Items["CorrelationId"] = correlationId;
        await next(context);
    }
}

// Program.cs — registrar antes que otros middlewares
app.UseMiddleware<CorrelationIdMiddleware>();

// appsettings.json — Serilog JSON estructurado
// "Serilog": { "WriteTo": [{ "Name": "Console", "Args": { "formatter": "Serilog.Formatting.Json.JsonFormatter" } }] }
```

---

### 2️⃣ Distributed Tracing — OpenTelemetry

#### Principios
- **Auto-instrumentación primero**: Spring Boot Actuator + Micrometer Tracing + OTLP exporter instrumenta automáticamente HTTP, JPA, Kafka.
- **Manual spans solo para lógica de negocio crítica**: no instrumentar cada método, sino los puntos de valor (use case boundaries, llamadas a servicios externos).
- **Trace context propagation**: W3C `traceparent` header (RFC-7230) — **nunca** `X-B3-*` en proyectos nuevos.
- **Sampling**: 100% en desarrollo/staging; 5-10% en producción (ajustable con `management.tracing.sampling.probability`).

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.micrometer:micrometer-tracing-bridge-otel")
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")
    // Spring Boot autoconfigura el resto
}

// application.yml
management:
  tracing:
    sampling:
      probability: 1.0  # 100% en dev/staging
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces

// ✅ Manual span para operaciones de negocio críticas
@Service
class ProcesarPagoService(
    private val tracer: Tracer,
    private val pasarelaPago: PasarelaPagoPort
) : ProcesarPagoUseCase {

    override fun execute(command: ProcesarPagoCommand): ProcesarPagoResult {
        val span = tracer.nextSpan()
            .name("procesar-pago")
            .tag("pago.monto", command.monto.value.toPlainString())
            .tag("pago.moneda", command.monto.moneda.name)
            .start()

        return try {
            tracer.withSpan(span).use {
                pasarelaPago.procesar(command)
            }
        } catch (ex: Exception) {
            span.tag("error", ex.message ?: "unknown")
            throw ex
        } finally {
            span.end()
        }
    }
}

// ✅ SpanContext en logs — automático con Micrometer+Logback:
// { "traceId": "abc123", "spanId": "def456", "correlationId": "..." }
```

---

### 3️⃣ Global Exception Handling — Problem Details (RFC 7807)

#### Principios
- **Un único punto de manejo de errores** por microservicio: `@ControllerAdvice` en Kotlin/Java, `IExceptionFilter` en .NET.
- **RFC 7807 Problem Details**: respuesta JSON estándar con `type`, `title`, `status`, `detail`, `instance`.
- **Domain Exceptions → 4xx**: errores de negocio controlados.
- **Infrastructure Exceptions → 500**: errores inesperados, loggear con `ERROR` + stack trace, **nunca** exponer detalle interno al cliente.
- **Correlation ID en la respuesta de error** para correlacionar con logs.

```kotlin
// infrastructure/adapter/in/rest/GlobalExceptionHandler.kt
@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = loggerPara<GlobalExceptionHandler>()

    // ✅ Domain exceptions → 422 Unprocessable Entity (error de negocio)
    @ExceptionHandler(DomainException::class)
    fun handleDomain(ex: DomainException, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.message ?: "Error de negocio")
        problem.title = "Regla de negocio violada"
        problem.setProperty("correlationId", MDC.get("correlationId"))
        problem.instance = URI.create(request.requestURI)
        return ResponseEntity.unprocessableEntity().body(problem)
    }

    // ✅ BOLA / acceso no autorizado → 403
    @ExceptionHandler(AccesoNoAutorizadoException::class)
    fun handleAcceso(ex: AccesoNoAutorizadoException, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatus(HttpStatus.FORBIDDEN)
        problem.title = "Acceso denegado"
        problem.setProperty("correlationId", MDC.get("correlationId"))
        problem.instance = URI.create(request.requestURI)
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem)
    }

    // ✅ Validación (@Valid) → 400
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val errores = ex.bindingResult.fieldErrors
            .map { "${it.field}: ${it.defaultMessage}" }
        val problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Datos de entrada inválidos")
        problem.title = "Error de validación"
        problem.setProperty("errores", errores)
        problem.setProperty("correlationId", MDC.get("correlationId"))
        problem.instance = URI.create(request.requestURI)
        return ResponseEntity.badRequest().body(problem)
    }

    // ✅ Errores inesperados → 500 — loggear con stack trace, NO exponer detalles
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ProblemDetail> {
        log.error("Error inesperado [correlationId={}]", MDC.get("correlationId"), ex)
        val problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR)
        problem.title = "Error interno del servidor"
        problem.detail = "Contacte al soporte con el correlationId adjunto"
        problem.setProperty("correlationId", MDC.get("correlationId"))
        problem.instance = URI.create(request.requestURI)
        return ResponseEntity.internalServerError().body(problem)
    }
}
```

```csharp
// Infrastructure/Filters/GlobalExceptionFilter.cs (.NET Core)
public class GlobalExceptionFilter(ILogger<GlobalExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var correlationId = context.HttpContext.Items["CorrelationId"]?.ToString();

        var (status, title, detail) = context.Exception switch
        {
            DomainException ex       => (422, "Regla de negocio violada", ex.Message),
            AccesoNoAutorizadoException => (403, "Acceso denegado", "Sin permisos sobre este recurso"),
            _                        => (500, "Error interno", "Contacte soporte con el correlationId")
        };

        if (status == 500)
            logger.LogError(context.Exception, "Error inesperado [CorrelationId={CorrelationId}]", correlationId);

        context.Result = new ObjectResult(new ProblemDetails {
            Status = status, Title = title, Detail = detail,
            Extensions = { ["correlationId"] = correlationId }
        }) { StatusCode = status };

        context.ExceptionHandled = true;
    }
}
```

---

### 4️⃣ Gestión Transaccional — Reglas y Propagación

#### Reglas no negociables

| Regla | Justificación |
|-------|--------------|
| `@Transactional` solo en Application Services | El dominio es puro Kotlin; los Controllers no deben gestionar transacciones |
| `readOnly = true` en queries de lectura | Optimiza flush mode, permite read replicas |
| Nunca `@Transactional` en métodos `private` | Spring AOP no intercepta self-calls — silent bug |
| Propagación `REQUIRES_NEW` solo cuando se necesita transacción independiente | Ejemplo: auditoría que no debe rollbackear si falla el negocio |
| Evitar `@Transactional` en Controllers | El adapter de entrada no debe conocer la semántica transaccional |

```kotlin
// ✅ CORRECTO — @Transactional en Application Service
@Service
class TransferirFondosService(
    private val cuentaRepository: CuentaRepository,
    private val eventoPublisher: DomainEventPublisher,
    private val auditoriaService: AuditoriaService     // servicio con REQUIRES_NEW
) : TransferirFondosUseCase {

    @Transactional  // ← transacción principal
    override fun execute(command: TransferirFondosCommand): TransferirFondosResult {
        val cuentaOrigen = cuentaRepository.findById(command.cuentaOrigenId)
            ?: return TransferirFondosResult.CuentaNoEncontrada

        val cuentaDestino = cuentaRepository.findById(command.cuentaDestinoId)
            ?: return TransferirFondosResult.CuentaNoEncontrada

        cuentaOrigen.debitar(command.monto)
        cuentaDestino.acreditar(command.monto)

        cuentaRepository.save(cuentaOrigen)
        cuentaRepository.save(cuentaDestino)
        eventoPublisher.publishAll(cuentaOrigen.domainEvents + cuentaDestino.domainEvents)

        // auditoría en transacción SEPARADA — persiste aunque falle la principal
        auditoriaService.registrar(command)

        return TransferirFondosResult.Exito
    }
}

// ✅ Auditoría con transacción independiente
@Service
class AuditoriaService(private val auditoriaRepository: AuditoriaRepository) {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun registrar(command: TransferirFondosCommand) {
        auditoriaRepository.save(RegistroAuditoria(
            accion = "TRANSFERENCIA",
            monto = command.monto.value,
            timestamp = Instant.now()
        ))
    }
}

// ✅ readOnly = true para Application Services de consulta
@Service
class BuscarPedidosService(private val pedidoRepository: PedidoRepository) : BuscarPedidosUseCase {

    @Transactional(readOnly = true)  // ← optimización para lectura
    override fun execute(query: BuscarPedidosQuery): List<PedidoResumen> =
        pedidoRepository.findAllByPropietario(query.usuarioId, query.pagina, query.tamaño)
            .map(Pedido::toResumen)
}

// ❌ PROHIBIDO — @Transactional en Controller
@RestController
class PedidoController {
    @Transactional  // ← NUNCA en adapters de entrada
    @PostMapping("/crear")
    fun crear(request: CrearPedidoRequest): ResponseEntity<*> { ... }
}
```

---

### 5️⃣ Caching — Spring Cache + Redis

#### Principios
- **Cache-aside** es el patrón por defecto: la aplicación gestiona cache (leer → miss → cargar → guardar).
- **Nomear caches con esquema**: `{contexto}:{entidad}:{granularidad}` → `pedidos:detalle:id`.
- **TTL explícito por cache**: nunca cachear indefinidamente. Definir TTL según volatilidad del dato.
- **Cache eviction en mutaciones**: toda escritura que invalida datos cacheados debe evictarlos.
- **Serialización JSON** (no Java serialization) para compatibilidad multiservicio.

```kotlin
// infrastructure/config/CacheConfig.kt
@Configuration
@EnableCaching
class CacheConfig {

    @Bean
    fun redisCacheManager(connectionFactory: RedisConnectionFactory): RedisCacheManager {
        val defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                GenericJackson2JsonRedisSerializer()  // JSON — no Java serialization
            ))

        val configs = mapOf(
            "pedidos:detalle:id"   to defaultConfig.entryTtl(Duration.ofMinutes(5)),
            "usuarios:perfil:id"   to defaultConfig.entryTtl(Duration.ofMinutes(30)),
            "catalogos:productos"  to defaultConfig.entryTtl(Duration.ofHours(1))
        )

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(configs)
            .build()
    }
}

// ✅ Cachear en Application Service de lectura
@Service
class ObtenerPedidoService(private val pedidoRepository: PedidoRepository) : ObtenerPedidoUseCase {

    @Cacheable(
        cacheNames = ["pedidos:detalle:id"],
        key = "#command.pedidoId.value",
        condition = "#command.solicitadoPor != null"  // solo cachear si hay usuario autenticado
    )
    @Transactional(readOnly = true)
    override fun execute(command: ObtenerPedidoCommand): ObtenerPedidoResult {
        val pedido = pedidoRepository.findByIdAndPropietario(command.pedidoId, command.solicitadoPor)
            ?: return ObtenerPedidoResult.NoEncontrado
        return ObtenerPedidoResult.Encontrado(pedido)
    }
}

// ✅ Eviction en mutaciones
@Service
class ActualizarPedidoService(private val pedidoRepository: PedidoRepository) : ActualizarPedidoUseCase {

    @CacheEvict(cacheNames = ["pedidos:detalle:id"], key = "#command.pedidoId.value")
    @Transactional
    override fun execute(command: ActualizarPedidoCommand): ActualizarPedidoResult {
        // ... lógica de actualización
    }
}

// ✅ Cache programático para lógica condicional compleja
@Service
class CatalogoService(
    private val cacheManager: CacheManager,
    private val catalogoRepository: CatalogoRepository
) {
    fun obtenerProducto(id: ProductoId): Producto? {
        val cache = cacheManager.getCache("catalogos:productos")
        return cache?.get(id.value, Producto::class.java)
            ?: catalogoRepository.findById(id)
                ?.also { cache?.put(id.value, it) }
    }
}
```

---

### 6️⃣ Resiliencia — Retry & Circuit Breaker (Resilience4j)

#### Cuándo aplicar cada patrón

| Patrón | Aplica cuando |
|--------|--------------|
| **Retry** | Errores transitorios predecibles: timeouts de red, 503 temporales, locks de BD |
| **Circuit Breaker** | Servicio externo inestable — evitar cascade failures |
| **Bulkhead** | Aislar pools de hilos entre servicios externos para evitar saturación global |
| **Rate Limiter** | Controla flujo de llamadas salientes a APIs con cuotas |
| **TimeLimiter** | Poner timeout a operaciones que no lo tienen nativamente |

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.github.resilience4j:resilience4j-spring-boot3")
    implementation("io.github.resilience4j:resilience4j-kotlin")
}

// application.yml
resilience4j:
  retry:
    instances:
      pasarela-pago:
        max-attempts: 3
        wait-duration: 500ms
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - java.io.IOException
          - java.net.SocketTimeoutException
        ignore-exceptions:
          - com.zenapses.dominio.exception.PagoRechazadoException  # no reintentar errores de negocio
  circuitbreaker:
    instances:
      pasarela-pago:
        failure-rate-threshold: 50         # abre si >50% de últimas 10 llamadas fallan
        wait-duration-in-open-state: 30s
        sliding-window-size: 10
        permitted-number-of-calls-in-half-open-state: 3
        register-health-indicator: true    # expuesto en /actuator/health

// infrastructure/adapter/out/payment/PasarelaPagoAdapter.kt
@Component
class PasarelaPagoAdapter(
    private val httpClient: PasarelaPagoHttpClient
) : PasarelaPagoPort {

    @Retry(name = "pasarela-pago", fallbackMethod = "procesarConFallback")
    @CircuitBreaker(name = "pasarela-pago", fallbackMethod = "procesarConFallback")
    @TimeLimiter(name = "pasarela-pago")
    override fun procesar(command: ProcesarPagoCommand): ResultadoPago =
        httpClient.procesar(command.toRequest()).toDomain()

    // ✅ Fallback — respuesta degradada cuando el CB está abierto
    fun procesarConFallback(command: ProcesarPagoCommand, ex: Exception): ResultadoPago {
        log.warn("Pasarela no disponible, usando fallback [correlationId={}]", MDC.get("correlationId"), ex)
        return ResultadoPago.PendienteDeProcesamiento(command.pedidoId)
    }
}
```

```csharp
// .NET Core — Polly v8 (Microsoft.Extensions.Resilience)
// Program.cs
builder.Services.AddHttpClient<IPasarelaPagoClient, PasarelaPagoClient>()
    .AddResilienceHandler("pasarela-pago", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential,
            Delay = TimeSpan.FromMilliseconds(500),
            ShouldHandle = args => args.Outcome.Exception is HttpRequestException or TimeoutException
        });
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            FailureRatio = 0.5,
            SamplingDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = 10,
            BreakDuration = TimeSpan.FromSeconds(30)
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(5));
    });
```

---

### 7️⃣ AOP — Aspectos Transversales en Spring

**Cuándo usar AOP sobre alternativas:**

| Situación | Solución recomendada |
|-----------|---------------------|
| Logging de entrada/salida de *todos* los Application Services | `@Aspect` + `@Around` en el paquete `application/service/` |
| Auditoría automática en mutaciones de dominio | `@Aspect` + `@AfterReturning` en `infrastructure/adapter/out/persistence/` |
| Métricas de latencia por use case | `@Timed` de Micrometer (aspecto declarativo) |
| Validación de autorización cross-cutting | Spring Security `@PreAuthorize` (no crear aspecto propio) |

```kotlin
// infrastructure/aspect/UseCaseLoggingAspect.kt
@Aspect
@Component
class UseCaseLoggingAspect {

    private val log = LoggerFactory.getLogger(UseCaseLoggingAspect::class.java)

    // ✅ Intercepta todos los Application Services (execute method)
    @Around("execution(* com.zenapses..application.service.*Service.execute(..))")
    fun logUseCaseExecution(pjp: ProceedingJoinPoint): Any? {
        val useCaseName = pjp.signature.declaringType.simpleName
        val correlationId = MDC.get("correlationId") ?: "-"

        log.info("[USE_CASE_START] {} [correlationId={}]", useCaseName, correlationId)
        val inicio = System.currentTimeMillis()

        return try {
            val resultado = pjp.proceed()
            val duracion = System.currentTimeMillis() - inicio
            log.info("[USE_CASE_END] {} completado en {}ms [correlationId={}]", useCaseName, duracion, correlationId)
            resultado
        } catch (ex: Exception) {
            log.error("[USE_CASE_ERROR] {} falló [correlationId={}]", useCaseName, correlationId, ex)
            throw ex
        }
    }
}

// ✅ @Timed — latencia de use cases en Prometheus (sin aspecto propio)
@Service
class RegistrarUsuarioService : RegistrarUsuarioUseCase {

    @Timed(value = "use_case.duration", extraTags = ["use_case", "registrar-usuario"])
    @Transactional
    override fun execute(command: RegistrarUsuarioCommand): RegistrarUsuarioResult {
        // ...
    }
}
```

---

### 8️⃣ Request/Response Logging Filter

```kotlin
// infrastructure/adapter/in/rest/HttpLoggingFilter.kt
// ⚠️ Solo activar en desarrollo/staging — en producción puede impactar rendimiento y PII
@Component
@ConditionalOnProperty("app.logging.http.enabled", havingValue = "true")
@Order(Ordered.HIGHEST_PRECEDENCE + 1)  // Después del CorrelationIdFilter
class HttpLoggingFilter : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(HttpLoggingFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain
    ) {
        val correlationId = MDC.get(CorrelationIdFilter.CORRELATION_KEY) ?: "-"

        log.info(
            "[HTTP_IN] {} {} [correlationId={}] [user-agent={}]",
            request.method, request.requestURI,
            correlationId,
            request.getHeader("User-Agent")?.take(80) ?: "unknown"
            // ✅ NO loggear el body completo — puede contener PII o passwords
        )

        val startTime = System.currentTimeMillis()
        chain.doFilter(request, response)
        val duration = System.currentTimeMillis() - startTime

        log.info(
            "[HTTP_OUT] {} {} → {} {}ms [correlationId={}]",
            request.method, request.requestURI,
            response.status, duration, correlationId
        )
    }

    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        request.requestURI.startsWith("/actuator")  // No loggear health checks
}
```

---

### 9️⃣ Audit Trail — Auditoría de Cambios en Entidades

```kotlin
// domain/audit/AuditMetadata.kt
// ✅ Value Object de auditoría reutilizable — embebible en Aggregates
data class AuditMetadata(
    val creadoPor: UsuarioId,
    val creadoEn: Instant,
    val modificadoPor: UsuarioId? = null,
    val modificadoEn: Instant? = null
) {
    fun registrarModificacion(modificadoPor: UsuarioId) = copy(
        modificadoPor = modificadoPor,
        modificadoEn = Instant.now()
    )
}

// infrastructure/adapter/out/persistence/AuditJpaListener.kt
// ✅ JPA Entity Listener para audit automático sin contaminar dominio
@MappedSuperclass
abstract class AuditableJpaEntity {
    @Column(nullable = false, updatable = false)
    var creadoEn: Instant = Instant.now()

    @Column(nullable = false)
    var modificadoEn: Instant = Instant.now()

    @Column(length = 36, updatable = false)
    var creadoPorId: String? = null

    @Column(length = 36)
    var modificadoPorId: String? = null

    @PrePersist
    fun onPrePersist() {
        creadoEn = Instant.now()
        modificadoEn = creadoEn
        creadoPorId = SecurityContextHolder.getContext().authentication?.name
        modificadoPorId = creadoPorId
    }

    @PreUpdate
    fun onPreUpdate() {
        modificadoEn = Instant.now()
        modificadoPorId = SecurityContextHolder.getContext().authentication?.name
    }
}

// ✅ Extender JpaEntity con auditoría
@Entity
@Table(name = "pedidos")
class PedidoJpaEntity(
    @Id val id: UUID,
    val propietarioId: UUID,
    val estado: String
) : AuditableJpaEntity()
```

---

## ✅ Criterios de Aplicación

- Todo endpoint HTTP que ingresa al sistema → `CorrelationIdFilter` activo.
- Todo Application Service → `@Transactional` con `readOnly` clasificado correctamente.
- Toda llamada a servicio externo HTTP/gRPC → `@Retry` + `@CircuitBreaker` de Resilience4j.
- Todo error de dominio → manejado en `GlobalExceptionHandler` con `ProblemDetail`.
- Toda entidad JPA mutable → extender `AuditableJpaEntity`.
- Toda cache Redis → TTL explícito + `@CacheEvict` en mutaciones.

## ❌ Anti-patrones

- ❌ **MDC sin `finally { MDC.clear() }`** — filtra datos entre requests en thread pools.
- ❌ **Loggear PII** (emails, passwords, tokens) — viola GDPR y buenas prácticas.
- ❌ **`@Transactional` en Controllers** — responsabilidad de la capa application.
- ❌ **`@Transactional` en métodos `private`** — Spring AOP no intercepta self-calls (silent bug).
- ❌ **Retry en errores de negocio** (DomainException, 4xx HTTP) — solo para errores transitorios de infraestructura.
- ❌ **Circuit Breaker sin fallback** — degrada abruptamente; siempre definir respuesta degradada.
- ❌ **Cache sin TTL** — datos obsoletos indefinidamente.
- ❌ **`@Cacheable` en métodos void o `Unit`** — no tiene sentido cachear ausencia de retorno.
- ❌ **Aspecto AOP que accede al dominio directamente** — los aspectos son infra, no deben conocer lógica de dominio.
- ❌ **HTTP body logging en producción** — impacto de rendimiento + posible exposición de PII.

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Cadena completa de un request HTTP con todos los CCCs activos

```
1. HTTP POST /api/v1/pagos/procesar
   → CorrelationIdFilter: extrae/genera X-Correlation-Id → MDC
   → HttpLoggingFilter: log [HTTP_IN] (solo dev/staging)
   → Spring Security: valida JWT
2. Controller: extrae solicitadoPor del JWT
   → construye Command con correlationId del MDC
3. Application Service:
   → @Transactional abre transacción
   → UseCaseLoggingAspect: [USE_CASE_START]
   → @Timed: inicia contador Micrometer
   → BOLA check (ownership-aware query)
   → Lógica de dominio (pure Kotlin)
   → @CircuitBreaker + @Retry → llama pasarela de pago
   → @CacheEvict invalida cache de pedido
   → @Transactional commit
   → UseCaseLoggingAspect: [USE_CASE_END] Xms
   → @Timed: registra latencia en Prometheus
4. GlobalExceptionHandler (si hay error):
   → mapea excepción → ProblemDetail con correlationId
5. HttpLoggingFilter: log [HTTP_OUT] status + ms
6. CorrelationIdFilter finally → MDC.clear()
7. Log final: { "correlationId": "...", "traceId": "...", "spanId": "..." }
```

### Ejemplo 2: Kafka Consumer con propagación correcta de correlationId

```kotlin
@KafkaListener(topics = ["pagos.procesados"])
fun onPagoProcessado(record: ConsumerRecord<String, PagoProcessadoEvent>) {
    val correlationId = record.headers()
        .lastHeader("X-Correlation-Id")?.value()?.let { String(it) }
        ?: UUID.randomUUID().toString()

    MDC.put("correlationId", correlationId)
    try {
        log.info("Procesando pago [correlationId={}]", correlationId)
        actualizarEstadoPedidoService.execute(
            ActualizarEstadoPedidoCommand(
                pedidoId = PedidoId.from(record.value().pedidoId),
                nuevoEstado = EstadoPedido.PAGADO,
                solicitadoPor = UsuarioId.sistema()
            )
        )
    } finally {
        MDC.clear()
    }
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Añadir en la sección `SKILLS ACTIVAS`:

```markdown
SKILL ACTIVA: cross-cutting-concerns-expert → ver: 2-agents/zns-tools/skills/cross-cutting-concerns-expert.skill.md
```

Añadir fila en tabla resumen de skills:

```markdown
| `cross-cutting-concerns-expert` | CorrelationId MDC + propagación Kafka; OpenTelemetry spans manuales; GlobalExceptionHandler ProblemDetail RFC 7807; @Transactional propagación/isolation/readOnly; Spring Cache Redis con TTL + CacheEvict; Resilience4j Retry+CircuitBreaker+fallback; AOP UseCaseLoggingAspect; HttpLoggingFilter; AuditableJpaEntity |
```

Y agregar sección dedicada en el agente:

```markdown
### 🔧 CROSS-CUTTING CONCERNS — REGLAS NO NEGOCIABLES

**Checklist obligatorio por microservicio:**
- [ ] `CorrelationIdFilter` registrado con `@Order(HIGHEST_PRECEDENCE)` — `MDC.clear()` en `finally`
- [ ] `GlobalExceptionHandler` con `@RestControllerAdvice` — ProblemDetail RFC 7807 en toda respuesta de error
- [ ] `@Transactional` solo en Application Services; `readOnly = true` en queries
- [ ] Toda llamada a servicio externo: `@Retry` + `@CircuitBreaker` con fallback definido
- [ ] Cache Redis: TTL explícito por cache + `@CacheEvict` en mutaciones
- [ ] Entidades JPA mutables: extienden `AuditableJpaEntity`
- [ ] Logs: JSON estructurado (Logback+Logstash); NUNCA loggear PII
```

### Adaptación Java (Spring Boot)

Los mismos patrones aplican en Java idiomático:
- `OncePerRequestFilter` → igual sintaxis (solo cambiar `fun` → métodos Java)
- `MDC.put/MDC.clear()` → API Java idéntica
- `@ControllerAdvice` → igual
- `@Cacheable/@CacheEvict` → igual
- `@Retry/@CircuitBreaker` → igual (Resilience4j tiene API Java-first)
- `@Aspect/@Around` → igual

### Adaptación .NET Core / C#

| Spring/Kotlin | .NET equivalente |
|---|---|
| `OncePerRequestFilter` | `IMiddleware` / `RequestDelegate` |
| `MDC` | `ILogger.BeginScope()` + `context.Items` |
| `@ControllerAdvice` | `IExceptionFilter` o `UseExceptionHandler` middleware |
| `@Transactional` | `TransactionScope` o `IDbContextTransaction` (EF Core) |
| `@Cacheable` | `IMemoryCache` / `IDistributedCache` + `[ResponseCache]` |
| Resilience4j | Polly v8 (`AddResilienceHandler`) |
| `@Aspect` AOP | `IAsyncActionFilter` / `ActionFilterAttribute` |
| `AuditableJpaEntity` | `SaveChangesInterceptor` en EF Core |

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Requests sin `X-Correlation-Id` propagado | 0 |
| `MDC.clear()` ausente en filters/consumers | 0 |
| Errores sin `GlobalExceptionHandler` → stacktrace al cliente | 0 |
| `@Transactional` en Controllers | 0 |
| Llamadas a servicios externos sin Circuit Breaker | 0 |
| Caches sin TTL configurado | 0 |
| PII en logs | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Cross-Cutting Concerns Expert  
  Cobertura: Structured Logging + MDC/Correlation ID; OpenTelemetry; ProblemDetail RFC 7807; @Transactional patterns; Spring Cache/Redis; Resilience4j; AOP; HTTP Logging Filter; Audit Trail  
  Stacks: Kotlin+SpringBoot, Java+SpringBoot, .NET Core/C#
