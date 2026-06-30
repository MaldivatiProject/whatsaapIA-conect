# 📡 SKILL: API RESPONSE STANDARDIZATION — EXPERT

**skill_id**: api-response-standardization-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / api-design  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-backend-go  
**dependencias**: ninguna (skill autónoma)  
**referencia_stack**: Spring Boot 3.4.x / SpringDoc OpenAPI 2.8.4 / Kotlin 2.x / Java 21 / .NET 8 / RFC 7807 / RFC 9457

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento completo para diseñar e implementar respuestas de API **consistentes, predecibles y bien documentadas**. Cubre: estructura de respuesta exitosa, errores estandarizados con `ProblemDetail` (RFC 7807/9457), semántica de códigos HTTP en política POST-only, validación de entrada, paginación, versionado, y documentación OpenAPI. El resultado es una API que cualquier cliente puede integrar sin sorpresas.

---

## 🧠 PARTE 1 — POLÍTICA HTTP Y CÓDIGOS DE ESTADO

### Política POST-Only del Proyecto ZNS

```
GET  → SOLO /actuator/health, /actuator/info, /actuator/metrics, /swagger-ui/**
POST → TODOS los demás endpoints (consultas, creaciones, actualizaciones, eliminaciones lógicas)
```

**Razón de seguridad**: datos sensibles van en body (nunca en URL/query params/logs).  
**Razón de consistencia**: un solo patrón, el cliente siempre envía `Content-Type: application/json`.

### Tabla de Códigos HTTP por Situación

| Código | Nombre | Cuándo usarlo |
|---|---|---|
| `200 OK` | OK | Consulta exitosa (POST /buscar, POST /detalle, POST /listar) |
| `201 Created` | Created | Creación exitosa de un recurso (POST /registrar, POST /crear) |
| `202 Accepted` | Accepted | Comando aceptado para procesamiento asíncrono (POST /iniciarProceso) |
| `204 No Content` | No Content | Operación exitosa sin cuerpo de respuesta (POST /eliminar lógico si no retorna datos) |
| `400 Bad Request` | Bad Request | Fallo de validación de entrada (`@Valid` falla, JSON malformado, constraint violada) |
| `401 Unauthorized` | Unauthorized | No autenticado (JWT ausente, expirado o inválido) |
| `403 Forbidden` | Forbidden | Autenticado pero sin autorización (BOLA — acceder a recurso de otro usuario) |
| `404 Not Found` | Not Found | Recurso no encontrado (resultado `NoEncontrado` del Use Case) |
| `409 Conflict` | Conflict | Conflicto de estado (email duplicado, recurso ya activo) |
| `422 Unprocessable Entity` | Unprocessable Entity | Error de negocio válido (regla de dominio violada — DomainException) |
| `429 Too Many Requests` | Too Many Requests | Rate limit excedido |
| `500 Internal Server Error` | Internal Server Error | Error inesperado no manejado |
| `503 Service Unavailable` | Service Unavailable | Circuit Breaker abierto; servicio degradado |

**Regla de oro — distinción 400 vs 422:**
- `400`: el formato de la petición es inválido (validación de DTO, tipo de dato incorrecto, campo requerido ausente)  
- `422`: el formato es válido pero la operación no se puede ejecutar por una regla de negocio (ej: "No puedes suspender un usuario ya suspendido")

---

## 🧠 PARTE 2 — ESTRUCTURA DE RESPUESTA EXITOSA

### Principio: Sin Wrapper Envelope en Éxito

```kotlin
// ❌ NUNCA envolver success en envelope genérico
{
  "success": true,
  "data": { "usuarioId": "..." },
  "message": "OK",
  "timestamp": "..."
}

// ✅ Retornar el DTO directamente + HTTP status semántico
// 201 Created + body con el recurso creado o su ID
{ "usuarioId": "550e8400-e29b-41d4-a716-446655440000" }
```

**Razón**: los wrappers genéricos son anti-pattern (duplican la información que ya provee HTTP). Los frameworks de Spring y .NET están diseñados para trabajar con `ResponseEntity<T>` y `IActionResult<T>` directamente.

### Kotlin — Respuesta exitosa canónica

```kotlin
// ✅ Controller Kotlin — sin wrapper, HTTP status semántico
@RestController
@RequestMapping("/api/v1/usuarios")
class UsuarioController(
    private val registrarUseCase: RegistrarUsuarioUseCase,
    private val consultarUseCase: ConsultarUsuarioUseCase,
    private val listarUseCase: ListarUsuariosUseCase
) {

    // 201 Created — Creación de recurso
    @PostMapping("/registrar")
    fun registrar(@Valid @RequestBody req: RegistrarUsuarioRequest): ResponseEntity<UsuarioIdResponse> =
        when (val result = registrarUseCase.execute(req.toCommand())) {
            is RegistrarUsuarioResult.Exito       -> ResponseEntity.status(201).body(UsuarioIdResponse(result.usuarioId.value))
            is RegistrarUsuarioResult.EmailDuplicado -> throw EmailDuplicadoException(result.email)
        }

    // 200 OK — Consulta
    @PostMapping("/detalle")
    fun detalle(
        @Valid @RequestBody req: DetalleUsuarioRequest,
        auth: Authentication
    ): ResponseEntity<UsuarioResponse> =
        when (val result = consultarUseCase.porId(UsuarioId.from(req.usuarioId), UsuarioId.from(auth.name))) {
            is ConsultarUsuarioResult.Encontrado  -> ResponseEntity.ok(UsuarioResponse.from(result.usuario))
            ConsultarUsuarioResult.NoEncontrado   -> throw UsuarioNoEncontradoException(req.usuarioId)
            ConsultarUsuarioResult.NoAutorizado   -> throw AccesoNoAutorizadoException()
        }

    // 200 OK — Listado paginado
    @PostMapping("/listar")
    fun listar(@Valid @RequestBody req: ListarUsuariosRequest): ResponseEntity<PageResponse<UsuarioResumenResponse>> =
        ResponseEntity.ok(listarUseCase.execute(req.toQuery()).toPageResponse { UsuarioResumenResponse.from(it) })

    // 204 No Content — Eliminación lógica
    @PostMapping("/eliminar")
    fun eliminar(@Valid @RequestBody req: EliminarUsuarioRequest, auth: Authentication): ResponseEntity<Void> {
        eliminarUseCase.execute(req.toCommand(UsuarioId.from(auth.name)))
        return ResponseEntity.noContent().build()
    }
}
```

---

## 🧠 PARTE 3 — ERRORES: ProblemDetail RFC 7807 / RFC 9457

### Spring Boot 3.x ProblemDetail — Estructura Canónica

Spring Boot 3.x incluye `ProblemDetail` nativamente. **Todos los errores** deben retornar `application/problem+json`.

```json
// ✅ Estructura estándar ProblemDetail
{
  "type": "https://zenapses.com/errors/email-duplicado",
  "title": "Email ya registrado",
  "status": 409,
  "detail": "El email 'juan@zenapses.com' ya está registrado en el sistema",
  "instance": "/api/v1/usuarios/registrar",
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-03-18T10:30:00Z"
}

// ✅ Errores de validación (400) — extensión con campo errors[]
{
  "type": "https://zenapses.com/errors/validacion",
  "title": "Error de validación",
  "status": 400,
  "detail": "Se encontraron 2 errores de validación",
  "instance": "/api/v1/usuarios/registrar",
  "correlationId": "...",
  "timestamp": "2026-03-18T10:30:00Z",
  "errors": [
    { "campo": "email", "mensaje": "Formato de email inválido", "valor": "no-es-email" },
    { "campo": "password", "mensaje": "Mínimo 8 caracteres", "valor": null }
  ]
}
```

### GlobalExceptionHandler — Kotlin + Spring Boot 3.4.x (patrón canónico completo)

```kotlin
@RestControllerAdvice
class GlobalExceptionHandler {

    // ── Errores de validación Bean Validation (@Valid) ── 400
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val errores = ex.bindingResult.fieldErrors.map {
            mapOf("campo" to it.field, "mensaje" to (it.defaultMessage ?: "Inválido"), "valor" to it.rejectedValue?.toString())
        }
        val p = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Se encontraron ${errores.size} errores de validación")
        p.type = URI.create("https://zenapses.com/errors/validacion")
        p.title = "Error de validación"
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        p.setProperty("errors", errores)
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    // ── JSON malformado / tipo incorrecto ── 400
    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleMalformedJson(ex: HttpMessageNotReadableException, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val p = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "El cuerpo de la petición no es un JSON válido")
        p.type = URI.create("https://zenapses.com/errors/json-invalido")
        p.title = "JSON malformado"
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        return ResponseEntity.badRequest().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    // ── Error de negocio / regla de dominio ── 422
    @ExceptionHandler(DomainException::class)
    fun handleDomain(ex: DomainException, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val p = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.message ?: "Regla de negocio violada")
        p.type = URI.create("https://zenapses.com/errors/${ex.errorCode}")
        p.title = ex.title
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        return ResponseEntity.unprocessableEntity().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    // ── Recurso no encontrado ── 404
    @ExceptionHandler(RecursoNoEncontradoException::class)
    fun handleNotFound(ex: RecursoNoEncontradoException, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val p = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.message ?: "Recurso no encontrado")
        p.type = URI.create("https://zenapses.com/errors/no-encontrado")
        p.title = "Recurso no encontrado"
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        return ResponseEntity.status(404).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    // ── Acceso no autorizado (BOLA) ── 403
    @ExceptionHandler(AccesoNoAutorizadoException::class)
    fun handleForbidden(ex: AccesoNoAutorizadoException, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val p = ProblemDetail.forStatus(HttpStatus.FORBIDDEN)
        p.type = URI.create("https://zenapses.com/errors/acceso-denegado")
        p.title = "Acceso denegado"
        p.detail = "No tienes autorización para acceder a este recurso"
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        return ResponseEntity.status(403).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    // ── Conflicto de estado ── 409
    @ExceptionHandler(ConflictoEstadoException::class)
    fun handleConflict(ex: ConflictoEstadoException, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        val p = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.message ?: "Conflicto de estado")
        p.type = URI.create("https://zenapses.com/errors/${ex.errorCode}")
        p.title = ex.title
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        return ResponseEntity.status(409).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    // ── Error inesperado ── 500 (NUNCA exponer detalles del stack)
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, req: HttpServletRequest): ResponseEntity<ProblemDetail> {
        log.error("Error inesperado [correlationId={}]", MDC.get("correlationId"), ex)
        val p = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR)
        p.type = URI.create("https://zenapses.com/errors/error-interno")
        p.title = "Error interno del servidor"
        p.detail = "Ha ocurrido un error inesperado. Por favor contacta soporte con el correlationId."
        p.instance = URI.create(req.requestURI)
        p.setProperty("correlationId", MDC.get("correlationId"))
        p.setProperty("timestamp", Instant.now().toString())
        // ↑ NUNCA incluir ex.message ni stack trace en la respuesta de producción
        return ResponseEntity.internalServerError().contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p)
    }

    companion object { private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java) }
}
```

### Jerarquía de excepciones de dominio

```kotlin
// shared-kernel/exception/
abstract class DomainException(
    override val message: String,
    val errorCode: String,
    val title: String
) : RuntimeException(message)

abstract class ConflictoEstadoException(
    message: String,
    errorCode: String,
    title: String
) : DomainException(message, errorCode, title)

class RecursoNoEncontradoException(val recurso: String, val id: String)
    : RuntimeException("$recurso con id '$id' no encontrado")

class AccesoNoAutorizadoException : RuntimeException("Acceso denegado")

// Excepciones de dominio específicas:
class EmailDuplicadoException(val email: Email)
    : ConflictoEstadoException("El email '${email.value}' ya está registrado", "email-duplicado", "Email ya registrado")

class UsuarioSuspendidoException(id: UsuarioId)
    : DomainException("El usuario '${id.value}' está suspendido", "usuario-suspendido", "Usuario suspendido")
```

---

## 🧠 PARTE 4 — PAGINACIÓN

### Estructura canónica `PageResponse<T>`

```kotlin
// shared-kernel/dto/PageResponse.kt
data class PageResponse<T>(
    val contenido: List<T>,
    val pagina: Int,
    val tamano: Int,
    val totalElementos: Long,
    val totalPaginas: Int,
    val esPrimera: Boolean,
    val esUltima: Boolean
) {
    companion object {
        fun <T, R> from(page: Page<T>, mapper: (T) -> R) = PageResponse(
            contenido      = page.content.map(mapper),
            pagina         = page.number,
            tamano         = page.size,
            totalElementos = page.totalElements,
            totalPaginas   = page.totalPages,
            esPrimera      = page.isFirst,
            esUltima       = page.isLast
        )
    }
}

// Extensión en application layer
fun <T, R> Page<T>.toPageResponse(mapper: (T) -> R) = PageResponse.from(this, mapper)
```

**Estructura JSON de paginación:**
```json
{
  "contenido": [
    { "usuarioId": "...", "nombre": "Juan Pérez", "email": "juan@zenapses.com" }
  ],
  "pagina": 0,
  "tamano": 20,
  "totalElementos": 150,
  "totalPaginas": 8,
  "esPrimera": true,
  "esUltima": false
}
```

**Request de paginación:**
```kotlin
data class ListarUsuariosRequest(
    @field:Min(0, message = "La página debe ser ≥ 0")
    val pagina: Int = 0,

    @field:Min(1) @field:Max(100, message = "Máximo 100 elementos por página")
    val tamano: Int = 20,

    val ordenarPor: String = "creadoEn",
    val direccion: String = "DESC"  // ASC | DESC
) {
    fun toQuery() = ListarUsuariosQuery(pagina, tamano, ordenarPor, DireccionOrden.valueOf(direccion))
}
```

---

## 🧠 PARTE 5 — OPENAPI / SPRINGDOC 2.8.4

### Configuración global

```kotlin
// infrastructure/config/OpenApiConfig.kt
@Configuration
class OpenApiConfig {

    @Bean
    fun customOpenAPI(): OpenAPI = OpenAPI()
        .info(Info()
            .title("ZNS AIBOS API")
            .description("API de la plataforma AIBOS — ZNS Zenapses")
            .version("v1")
            .contact(Contact().name("ZNS Dev Team").email("dev@zenapses.com"))
            .license(License().name("Proprietary")))
        .addSecurityItem(SecurityRequirement().addList("bearerAuth"))
        .components(Components()
            .addSecuritySchemes("bearerAuth", SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("JWT token de autenticación. Obtener en POST /api/v1/auth/login")))
        .externalDocs(ExternalDocumentation()
            .description("Documentación técnica ZNS")
            .url("https://docs.zenapses.com"))
}
```

### Anotaciones por endpoint

```kotlin
@RestController
@RequestMapping("/api/v1/usuarios")
@Tag(name = "Usuarios", description = "Gestión de usuarios del sistema")
class UsuarioController(...) {

    @PostMapping("/registrar")
    @Operation(
        summary = "Registrar nuevo usuario",
        description = "Crea un nuevo usuario en el sistema. El email debe ser único."
    )
    @ApiResponses(value = [
        ApiResponse(responseCode = "201", description = "Usuario creado exitosamente",
            content = [Content(schema = Schema(implementation = UsuarioIdResponse::class))]),
        ApiResponse(responseCode = "400", description = "Error de validación en los campos",
            content = [Content(mediaType = "application/problem+json",
                schema = Schema(implementation = ProblemDetail::class))]),
        ApiResponse(responseCode = "409", description = "Email ya registrado",
            content = [Content(mediaType = "application/problem+json",
                schema = Schema(implementation = ProblemDetail::class))]),
        ApiResponse(responseCode = "401", description = "No autenticado")
    ])
    fun registrar(@Valid @RequestBody req: RegistrarUsuarioRequest): ResponseEntity<UsuarioIdResponse> { ... }

    @PostMapping("/listar")
    @Operation(summary = "Listar usuarios con paginación")
    @ApiResponses(value = [
        ApiResponse(responseCode = "200", description = "Lista paginada de usuarios"),
        ApiResponse(responseCode = "401", description = "No autenticado")
    ])
    fun listar(@Valid @RequestBody req: ListarUsuariosRequest): ResponseEntity<PageResponse<UsuarioResumenResponse>> { ... }
}
```

### DTOs con @Schema

```kotlin
@Schema(description = "Request para registrar un nuevo usuario en el sistema")
data class RegistrarUsuarioRequest(
    @field:NotBlank @field:Email
    @Schema(description = "Email del usuario", example = "juan@zenapses.com", required = true)
    val email: String,

    @field:NotBlank @field:Size(min = 8)
    @Schema(description = "Contraseña (mínimo 8 caracteres, requiere mayúscula, minúscula, dígito y especial)",
            example = "S3cure!Pass", required = true)
    val password: String,

    @field:NotBlank
    @Schema(description = "Nombre del usuario", example = "Juan", required = true)
    val nombre: String,

    @field:NotBlank
    @Schema(description = "Apellido del usuario", example = "Pérez", required = true)
    val apellido: String
)

@Schema(description = "ID del usuario recién creado")
data class UsuarioIdResponse(
    @Schema(description = "UUID v4 del usuario", example = "550e8400-e29b-41d4-a716-446655440000")
    val usuarioId: UUID
)
```

### `application.yml` para SpringDoc

```yaml
springdoc:
  api-docs:
    path: /api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html
    operations-sorter: alpha
    tags-sorter: alpha
    display-request-duration: true
    disable-swagger-default-url: true
  show-actuator: false
  default-produces-media-type: application/json
```

---

## 🧠 PARTE 6 — VERSIONADO DE API

### Estrategia: Versionado por URI (recomendado para este stack)

```
/api/v1/usuarios/registrar   ← versión actual
/api/v2/usuarios/registrar   ← cuando hay breaking changes
```

**Reglas de versionado:**
- Nueva versión solo cuando hay **breaking changes** (cambiar campo requerido, eliminar campo, cambiar tipo)
- Añadir campos opcionales al response **NO** es breaking change (backwards-compatible)
- La versión anterior se mantiene activa mínimo 6 meses después de anunciar deprecación
- Deprecación se anuncia con header `Deprecation: true` + `Sunset: [fecha ISO]`

```kotlin
// ✅ Header de deprecación en endpoints de v1 que serán eliminados
@PostMapping("/buscar")
fun buscar(...): ResponseEntity<UsuarioResponse> {
    val response = ...
    return ResponseEntity.ok()
        .header("Deprecation", "true")
        .header("Sunset", "2026-09-18")
        .header("Link", "</api/v2/usuarios/buscar>; rel=\"successor-version\"")
        .body(response)
}
```

---

## 🧠 PARTE 7 — JAVA SPRING BOOT — Adaptaciones

Los patrones de respuesta son **idénticos** para Java 21 + Spring Boot 3.4.x:

```java
// ✅ Java 21 — Controller con records y sealed results
@RestController
@RequestMapping("/api/v1/usuarios")
@Tag(name = "Usuarios")
public class UsuarioController {

    @PostMapping("/registrar")
    @ResponseStatus(HttpStatus.CREATED)   // alternativa a ResponseEntity para casos simples
    public UsuarioIdResponse registrar(@Valid @RequestBody RegistrarUsuarioRequest req) {
        return switch (registrarUseCase.execute(req.toCommand())) {
            case RegistrarUsuarioResult.Exito e   -> new UsuarioIdResponse(e.usuarioId().value());
            case RegistrarUsuarioResult.EmailDuplicado d -> throw new EmailDuplicadoException(d.email());
        };
    }

    @PostMapping("/listar")
    public PageResponse<UsuarioResumenResponse> listar(@Valid @RequestBody ListarUsuariosRequest req) {
        return PageResponse.from(listarUseCase.execute(req.toQuery()), UsuarioResumenResponse::from);
    }
}

// ✅ Java 21 — GlobalExceptionHandler (mismo patrón, Java syntax)
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        var errores = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> Map.of("campo", e.getField(), "mensaje",
                    Optional.ofNullable(e.getDefaultMessage()).orElse("Inválido")))
            .toList();
        var p = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Se encontraron " + errores.size() + " errores de validación");
        p.setType(URI.create("https://zenapses.com/errors/validacion"));
        p.setTitle("Error de validación");
        p.setInstance(URI.create(req.getRequestURI()));
        p.setProperty("correlationId", MDC.get("correlationId"));
        p.setProperty("timestamp", Instant.now().toString());
        p.setProperty("errors", errores);
        return ResponseEntity.badRequest()
            .contentType(MediaType.APPLICATION_PROBLEM_JSON).body(p);
    }
}
```

---

## 🧠 PARTE 8 — .NET CORE 8 — Adaptaciones

```csharp
// ✅ ASP.NET Core 8 — TypedResults (minimal API o controller)
// Program.cs — configurar ProblemDetails
builder.Services.AddProblemDetails(options => {
    options.CustomizeProblemDetails = ctx => {
        ctx.ProblemDetails.Extensions["correlationId"] =
            ctx.HttpContext.Items["correlationId"]?.ToString();
        ctx.ProblemDetails.Extensions["timestamp"] = DateTimeOffset.UtcNow.ToString("O");
        ctx.ProblemDetails.Instance = ctx.HttpContext.Request.Path;
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// ✅ GlobalExceptionHandler .NET 8 — IExceptionHandler
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        int status;
        string type, title, detail;

        switch (ex) {
            case ValidationException ve:
                status = 400; type = "validacion"; title = "Error de validación";
                detail = "Se encontraron errores de validación";
                ctx.Response.StatusCode = status;
                await _problemDetailsService.WriteAsync(new ProblemDetailsContext {
                    HttpContext = ctx,
                    ProblemDetails = new ValidationProblemDetails(ve.Errors) {
                        Type = $"https://zenapses.com/errors/{type}",
                        Title = title, Status = status, Detail = detail
                    }
                });
                return true;
            case DomainException de:
                status = 422; type = de.ErrorCode; title = de.Title; detail = de.Message; break;
            case RecursoNoEncontradoException:
                status = 404; type = "no-encontrado"; title = "Recurso no encontrado";
                detail = ex.Message; break;
            case AccesoNoAutorizadoException:
                status = 403; type = "acceso-denegado"; title = "Acceso denegado";
                detail = "No tienes autorización para acceder a este recurso"; break;
            default:
                // NUNCA exponer ex.Message en producción para errores inesperados
                status = 500; type = "error-interno"; title = "Error interno del servidor";
                detail = "Ha ocurrido un error inesperado. Contacta soporte con el correlationId."; break;
        }

        ctx.Response.StatusCode = status;
        await _problemDetailsService.WriteAsync(new ProblemDetailsContext {
            HttpContext = ctx,
            ProblemDetails = new ProblemDetails {
                Type = $"https://zenapses.com/errors/{type}",
                Title = title, Status = status, Detail = detail
            }
        });
        return true;
    }
}

// ✅ Controller .NET 8 — TypedResults
[ApiController]
[Route("api/v1/usuarios")]
[Tags("Usuarios")]
public class UsuarioController : ControllerBase
{
    [HttpPost("registrar")]
    [ProducesResponseType(typeof(UsuarioIdResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest,
        "application/problem+json")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict,
        "application/problem+json")]
    public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioRequest request)
    {
        var result = await _mediator.Send(request.ToCommand());
        return result switch {
            RegistrarUsuarioResult.Exito e        => StatusCode(201, new UsuarioIdResponse(e.UsuarioId.Value)),
            RegistrarUsuarioResult.EmailDuplicado d => throw new EmailDuplicadoException(d.Email)
        };
    }
}

// ✅ PageResponse .NET — misma estructura que Kotlin
public record PageResponse<T>(
    IEnumerable<T> Contenido,
    int Pagina,
    int Tamano,
    long TotalElementos,
    int TotalPaginas,
    bool EsPrimera,
    bool EsUltima
) {
    public static PageResponse<R> From<T, R>(IPagedList<T> page, Func<T, R> mapper) => new(
        Contenido: page.Select(mapper),
        Pagina: page.PageNumber,
        Tamano: page.PageSize,
        TotalElementos: page.TotalItemCount,
        TotalPaginas: page.PageCount,
        EsPrimera: page.IsFirstPage,
        EsUltima: page.IsLastPage
    );
}
```

---

## ⚠️ ANTI-PATTERNS — NUNCA HACER

| Anti-pattern | Consecuencia | Solución |
|---|---|---|
| `{ "success": true, "data": {...} }` wrapper en éxito | Duplica info de HTTP, dificulta la integración con frameworks estándar | DTO directo + HTTP status semántico |
| Retornar `200 OK` para errores de negocio | El cliente no puede distinguir éxito de fallo sin parsear el body | `422` para errores de dominio, `409` para conflictos |
| Exponer `ex.getMessage()` / stack trace en 500 | Information disclosure — revela implementación interna al atacante | Mensaje genérico + `correlationId` para trazabilidad |
| ProblemDetail sin `correlationId` ni `timestamp` | Soporte no puede correlacionar el error con los logs | Siempre añadir `correlationId` de MDC + `timestamp` |
| ProblemDetail sin `Content-Type: application/problem+json` | Los clientes no pueden detectar que es un error RFC 7807 | `.contentType(MediaType.APPLICATION_PROBLEM_JSON)` |
| Validación en el dominio con `MethodArgumentNotValidException` re-thrown | Acoplamiento del dominio a la capa HTTP | Validar en Request DTO (`@Valid`); dominio lanza `DomainException` |
| IDs en la URL: `GET /usuarios/123` | Enumeración de IDs, BOLA si los IDs son secuenciales | POST con UUID v4 en el body |
| Respuestas de error diferentes por endpoint (sin handler global) | Cada endpoint tiene su propio formato de error | Un único `@RestControllerAdvice` / `IExceptionHandler` centralizado |
| `@ResponseBody Map<String, Any>()` sin tipo explícito | Sin documentación OpenAPI, sin type-safety | Siempre DTOs tipados con `@Schema` |
| `Page<Entity>` serializado directamente | Serializa campos de JPA/ORM al cliente (information disclosure) | Mapear a `PageResponse<DTO>` con `mapper` explícito |

---

## ✅ CHECKLIST API RESPONSE STANDARDIZATION — REVISIÓN DE PR

- [ ] ¿Los endpoints de creación retornan `201 Created`?
- [ ] ¿Los endpoints de consulta retornan `200 OK` con el DTO directamente (sin wrapper)?
- [ ] ¿Los errores de negocio retornan `422 Unprocessable Entity` con `ProblemDetail`?
- [ ] ¿Los conflictos de estado retornan `409 Conflict` con `ProblemDetail`?
- [ ] ¿Los errores de validación retornan `400 Bad Request` con `errors[]` en el `ProblemDetail`?
- [ ] ¿Todos los `ProblemDetail` incluyen `correlationId`, `timestamp` e `instance`?
- [ ] ¿Las respuestas de error tienen `Content-Type: application/problem+json`?
- [ ] ¿El `GlobalExceptionHandler` maneja `Exception` genérica sin exponer stack trace?
- [ ] ¿Las respuestas paginadas usan `PageResponse<T>` con todos los campos de navegación?
- [ ] ¿Los DTOs de request/response tienen `@Schema` con `description` y `example`?
- [ ] ¿El `OpenApiConfig` tiene el esquema de seguridad `bearerAuth` configurado?
- [ ] ¿Existe test de integración que verifica el `Content-Type: application/problem+json` en errores?
- [ ] ¿Existe test que verifica que el `500` nunca expone el mensaje de excepción real?
