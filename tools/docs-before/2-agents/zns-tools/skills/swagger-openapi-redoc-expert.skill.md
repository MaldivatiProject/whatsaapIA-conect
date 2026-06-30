# 📖 SKILL: SWAGGER / OPENAPI / REDOC — EXPERT

**skill_id**: swagger-openapi-redoc-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / api-documentation / openapi  
**last_updated**: 2026-03-19  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-backend-go  
**dependencias**: api-response-standardization-expert (complementaria — cubre estructura de respuesta)  
**referencia_stack**: SpringDoc OpenAPI 2.8.4 / Spring Boot 3.4.3 / Kotlin 2.1.20 / Java 21 / .NET 8 / Swashbuckle.AspNetCore 6.x / NSwag / OpenAPI 3.1.0 / ReDoc 2.x

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con conocimiento completo y aplicado para configurar, anotar y publicar documentación de API de nivel producción utilizando:

- **SpringDoc OpenAPI 2.8.4** para Spring Boot 3.x (Kotlin y Java)
- **Swagger UI** — configuración avanzada, personalización, seguridad
- **ReDoc** — interfaz alternativa de documentación, integración con Spring y .NET
- **Swashbuckle / NSwag** — equivalentes para ASP.NET Core 8
- **OpenAPI 3.1.0** — anotaciones exhaustivas: `@Schema`, `@Parameter`, `@ExampleObject`, grupos, entornos

Esta skill **complementa** a `api-response-standardization-expert` (que solo toca SpringDoc instrumentalmente). La presente skill profundiza en toda la capa de documentación como ciudadano de primera clase del sistema.

---

## 🧠 PARTE 1 — SPRINGDOC OPENAPI 2.8.4 — CONFIGURACIÓN BASE

### Dependencias (Kotlin/Java)

```kotlin
// build.gradle.kts
dependencies {
    // SpringDoc OpenAPI con Swagger UI integrado
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.4")
    // Si el proyecto usa Spring WebFlux (reactivo):
    // implementation("org.springdoc:springdoc-openapi-starter-webflux-ui:2.8.4")
    // Kotlin-specific: habilita soporte para Kotlin classes en OpenAPI
    // (incluido automáticamente en starter, pero explícito si se necesita)
}
```

### OpenApiConfig — Configuración global completa

```kotlin
// infrastructure/config/OpenApiConfig.kt
@Configuration
class OpenApiConfig {

    @Bean
    fun customOpenAPI(
        @Value("\${spring.application.name}") appName: String,
        @Value("\${api.version:v1}") apiVersion: String
    ): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("$appName API")
                .description("""
                    API REST de la plataforma **$appName**.  
                    
                    > **Política POST-only**: excepto `/actuator/health`, todos los endpoints usan `POST`.  
                    > Los datos sensibles viajan siempre en el body, nunca en URL ni query params.
                    
                    **Autenticación**: Bearer JWT — obtener token en `POST /api/v1/auth/login`.
                """.trimIndent())
                .version(apiVersion)
                .contact(
                    Contact()
                        .name("ZNS Dev Team")
                        .email("dev@zenapses.com")
                        .url("https://zenapses.com")
                )
                .license(License().name("Proprietary").url("https://zenapses.com/legal"))
                .termsOfService("https://zenapses.com/terms")
        )
        // Esquema de seguridad Bearer JWT
        .addSecurityItem(SecurityRequirement().addList("bearerAuth"))
        .components(
            Components()
                .addSecuritySchemes(
                    "bearerAuth", SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT token. Obtener via `POST /api/v1/auth/login`. Formato: `Bearer {token}`")
                )
                // Esquema API Key (si aplica, ej: para integraciones M2M)
                .addSecuritySchemes(
                    "apiKey", SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .`in`(SecurityScheme.In.HEADER)
                        .name("X-Api-Key")
                        .description("API Key para integración Machine-to-Machine")
                )
        )
        .externalDocs(
            ExternalDocumentation()
                .description("Documentación técnica completa ZNS")
                .url("https://docs.zenapses.com")
        )
}
```

### Grupos de API (GroupedOpenApi)

```kotlin
// Dividir la documentación en grupos por dominio — muy útil en modular monolith
@Bean
fun identidadApiGroup(): GroupedOpenApi =
    GroupedOpenApi.builder()
        .group("01-identidad")
        .displayName("🔐 Identidad y Autenticación")
        .pathsToMatch("/api/v1/auth/**", "/api/v1/usuarios/**", "/api/v1/roles/**")
        .build()

@Bean
fun aibosApiGroup(): GroupedOpenApi =
    GroupedOpenApi.builder()
        .group("02-aibos")
        .displayName("🤖 AIBOS — Asistentes IA")
        .pathsToMatch("/api/v1/aibos/**", "/api/v1/conversaciones/**")
        .build()

@Bean
fun administracionApiGroup(): GroupedOpenApi =
    GroupedOpenApi.builder()
        .group("03-admin")
        .displayName("⚙️ Administración")
        .pathsToMatch("/api/v1/admin/**")
        .addOpenApiCustomizer { openApi ->
            // Solo añadir security requirement a este grupo sin afectar globalmente
            openApi.info.description = "Endpoints de administración — requiere rol ADMIN"
        }
        .build()
```

### Habilitación por entorno

```kotlin
// ✅ Deshabilitar Swagger UI en producción — CRÍTICO para seguridad
// application-prod.yml:
// springdoc:
//   swagger-ui.enabled: false
//   api-docs.enabled: false

@Bean
@ConditionalOnProperty(name = ["springdoc.swagger-ui.enabled"], havingValue = "true", matchIfMissing = false)
fun customOpenAPI(...): OpenAPI { ... }  // opcional si se prefiere controlar por yml
```

---

## 🧠 PARTE 2 — ANOTACIONES COMPLETAS

### @Tag a nivel de controller

```kotlin
@RestController
@RequestMapping("/api/v1/usuarios")
@Tag(
    name = "Usuarios",
    description = "Operaciones de gestión de usuarios: registro, consulta, actualización y baja lógica"
)
class UsuarioController(private val registrarUsuario: RegistrarUsuarioUseCase) {
    // ...
}
```

### @Operation + @ApiResponses completo

```kotlin
@PostMapping("/registrar")
@Operation(
    summary = "Registrar nuevo usuario",
    description = """
        Crea un nuevo usuario en el sistema.  
        - El email debe ser único en el sistema
        - La contraseña se almacena con hash Argon2id
        - Retorna el UUID del usuario creado
    """,
    security = [SecurityRequirement(name = "bearerAuth")]  // override global si algún endpoint es público
)
@ApiResponses(value = [
    ApiResponse(
        responseCode = "201",
        description = "Usuario registrado exitosamente",
        content = [Content(
            mediaType = "application/json",
            schema = Schema(implementation = UsuarioIdResponse::class),
            examples = [ExampleObject(
                name = "Respuesta exitosa",
                value = """{"usuarioId": "550e8400-e29b-41d4-a716-446655440000"}"""
            )]
        )]
    ),
    ApiResponse(
        responseCode = "400",
        description = "Error de validación JSR-380",
        content = [Content(
            mediaType = "application/problem+json",
            schema = Schema(implementation = ProblemDetail::class),
            examples = [ExampleObject(
                name = "Validación fallida",
                value = """{
                    "type": "https://zenapses.com/errors/validation",
                    "title": "Validation Error",
                    "status": 400,
                    "correlationId": "abc-123",
                    "errors": [{"field": "email", "message": "Formato de email inválido"}]
                }"""
            )]
        )]
    ),
    ApiResponse(
        responseCode = "409",
        description = "Email ya registrado en el sistema",
        content = [Content(mediaType = "application/problem+json",
            schema = Schema(implementation = ProblemDetail::class))]
    ),
    ApiResponse(responseCode = "401", description = "Token JWT ausente o expirado"),
    ApiResponse(responseCode = "403", description = "Sin permisos para esta operación")
])
fun registrar(@Valid @RequestBody req: RegistrarUsuarioRequest): ResponseEntity<UsuarioIdResponse> { ... }
```

### @Parameter para query params (edge cases)

```kotlin
// Aunque ZNS usa POST-only, algunos endpoints GET (actuator, swagger) pueden necesitar @Parameter
@GetMapping("/actuator/health")
@Operation(summary = "Health check", tags = ["Infraestructura"])
@Parameter(
    name = "full",
    description = "Si es true, retorna detalles completos de salud de los componentes",
    `in` = ParameterIn.QUERY,
    required = false,
    schema = Schema(type = "boolean", defaultValue = "false")
)
fun health(@RequestParam(required = false) full: Boolean?): ResponseEntity<Any> { ... }

// Para endpoints POST con @RequestBody que incluyen parámetros de filtro documentados:
@PostMapping("/buscar")
@Operation(summary = "Buscar usuarios con filtros y paginación")
fun buscar(
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Criterios de búsqueda paginada",
        required = true,
        content = [Content(schema = Schema(implementation = BuscarUsuariosRequest::class))]
    )
    @Valid @RequestBody req: BuscarUsuariosRequest
): ResponseEntity<PageResponse<UsuarioResumenResponse>> { ... }
```

### @Schema avanzado en DTOs

```kotlin
@Schema(
    description = "Request para registrar un nuevo usuario",
    requiredProperties = ["email", "password", "nombre", "apellido"]
)
data class RegistrarUsuarioRequest(

    @field:NotBlank @field:Email @field:Size(max = 255)
    @Schema(
        description = "Email corporativo del usuario. Debe ser único en el sistema.",
        example = "juan.perez@empresa.com",
        format = "email",
        maxLength = 255
    )
    val email: String,

    @field:NotBlank @field:Size(min = 8, max = 128)
    @Schema(
        description = "Contraseña. Mínimo 8 caracteres, máximo 128. Se almacena con Argon2id.",
        example = "S3cure!Pass2024",
        minLength = 8,
        maxLength = 128,
        writeOnly = true  // ← CRÍTICO: nunca aparece en responses
    )
    val password: String,

    @field:NotBlank @field:Size(min = 2, max = 100)
    @Schema(description = "Nombre del usuario", example = "Juan", minLength = 2, maxLength = 100)
    val nombre: String,

    @field:NotBlank @field:Size(min = 2, max = 100)
    @Schema(description = "Apellido del usuario", example = "Pérez", minLength = 2, maxLength = 100)
    val apellido: String,

    @Schema(
        description = "Rol inicial del usuario. DEFAULT si no se especifica.",
        example = "CLIENTE",
        allowableValues = ["ADMIN", "OPERADOR", "CLIENTE"],
        defaultValue = "CLIENTE"
    )
    val rol: String = "CLIENTE"
)

// Response con campo deprecated
@Schema(description = "Resumen público del usuario")
data class UsuarioResumenResponse(
    @Schema(description = "UUID del usuario", example = "550e8400-e29b-41d4-a716-446655440000")
    val usuarioId: UUID,

    @Schema(description = "Nombre completo del usuario", example = "Juan Pérez")
    val nombreCompleto: String,

    @Schema(
        description = "Username legacy. DEPRECATED — usar `nombreCompleto`.",
        deprecated = true  // ← aparece tachado en Swagger UI
    )
    val username: String? = null,

    @Schema(description = "Estado de la cuenta", allowableValues = ["ACTIVO", "INACTIVO", "SUSPENDIDO"])
    val estado: String
)
```

### @Schema con oneOf / anyOf (respuestas polimórficas)

```kotlin
// Cuando un endpoint puede retornar uno de varios tipos de respuesta:
@Schema(
    oneOf = [UsuarioPersonaFisicaResponse::class, UsuarioEmpresaResponse::class],
    description = "Detalle del usuario. Varía según si es persona física o empresa."
)
interface UsuarioDetalleResponse

@Schema(description = "Usuario persona física")
data class UsuarioPersonaFisicaResponse(
    @Schema(description = "Tipo de usuario", allowableValues = ["PERSONA_FISICA"], example = "PERSONA_FISICA")
    val tipo: String = "PERSONA_FISICA",
    val usuarioId: UUID,
    val nombre: String,
    val apellido: String,
    val curp: String
) : UsuarioDetalleResponse

@Schema(description = "Usuario empresa")
data class UsuarioEmpresaResponse(
    @Schema(description = "Tipo de usuario", allowableValues = ["EMPRESA"], example = "EMPRESA")
    val tipo: String = "EMPRESA",
    val usuarioId: UUID,
    val razonSocial: String,
    val rfc: String
) : UsuarioDetalleResponse
```

---

## 🧠 PARTE 3 — SWAGGER UI — CONFIGURACIÓN AVANZADA

### application.yml completo por entorno

```yaml
# application.yml (base)
springdoc:
  api-docs:
    path: /api-docs              # ruta JSON: GET /api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html      # ruta UI: GET /swagger-ui.html
    enabled: true
    operations-sorter: alpha     # ordena operaciones alfabéticamente
    tags-sorter: alpha           # ordena tags alfabéticamente
    display-request-duration: true  # muestra tiempo de respuesta en UI
    disable-swagger-default-url: true  # elimina petstore por defecto
    try-it-out-enabled: true     # habilita "Try it out" por defecto
    filter: true                 # muestra barra de búsqueda en UI
    persist-authorization: true  # persiste token JWT entre recargas (localStorage)
    deep-linking: true           # permite URLs directas a operaciones
    default-models-expand-depth: 1  # desplegar 1 nivel de schemas en "Models"
    doc-expansion: none          # swagger colapsado por defecto (none | list | full)
    syntax-highlight:
      activated: true
      theme: tomorrow-night      # tema oscuro para código
  show-actuator: false           # no mostrar endpoints de actuator en docs
  default-produces-media-type: application/json
  packages-to-scan: com.zenapses  # limitar scanning al paquete base
  paths-to-exclude: /error, /actuator/**  # excluir paths del error controller

---
# application-dev.yml
springdoc:
  api-docs.enabled: true
  swagger-ui.enabled: true

---
# application-prod.yml  ← CRÍTICO: deshabilitar en producción
springdoc:
  api-docs.enabled: false
  swagger-ui.enabled: false
```

### Spring Security — permitir acceso a rutas de documentación

```kotlin
// SecurityConfig.kt — en la configuración de Spring Security
@Bean
fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
    http {
        authorizeHttpRequests {
            // ✅ Rutas de documentación — solo en entornos no-prod
            authorize("/swagger-ui/**", permitAll)
            authorize("/swagger-ui.html", permitAll)
            authorize("/api-docs/**", permitAll)
            authorize("/api-docs.yaml", permitAll)
            // Rutas de salud pública
            authorize("/actuator/health", permitAll)
            authorize("/actuator/health/**", permitAll)
            // Todo lo demás requiere autenticación
            authorize(anyRequest, authenticated)
        }
        // ... resto de configuración
    }
    return http.build()
}
```

### Personalización del banner de Swagger UI

```kotlin
// Controlador para redirigir / → /swagger-ui.html en entornos dev
@RestController
@ConditionalOnProperty("springdoc.swagger-ui.enabled", havingValue = "true")
@Hidden  // ← @Hidden excluye este controller de la documentación
class SwaggerRedirectController {
    @GetMapping("/docs")
    fun redirectToDocs(): RedirectView = RedirectView("/swagger-ui.html")
}
```

---

## 🧠 PARTE 4 — REDOC — INTEGRACIÓN COMPLETA

### ¿Qué es ReDoc y cuándo preferirlo sobre Swagger UI?

| Critero | Swagger UI | ReDoc |
|---|---|---|
| Try it out (ejecutar requests) | ✅ Sí | ❌ No (solo lectura) |
| Navegabilidad / UX | Básica | ✅ Excelente (3 columnas, navegación lateral) |
| Renderizado de schemas complejos | Regular | ✅ Superior (oneOf/anyOf claro) |
| Para equipos externos / clientes | Regular | ✅ Preferido |
| Para desarrolladores propios | ✅ Preferido | Regular |
| Customización visual | Básica | ✅ Temas, colores, logo |

**Recomendación ZNS**: exponer **ambos** — Swagger UI para el equipo interno, ReDoc para documentación de cliente.

### Integración ReDoc en Spring Boot

**Opción A — Endpoint HTML estático (recomendada)**

```kotlin
// infrastructure/config/ReDocController.kt
@Controller
@ConditionalOnProperty("springdoc.redoc.enabled", havingValue = "true", matchIfMissing = true)
@Hidden  // excluir de la documentación OpenAPI
class ReDocController(
    @Value("\${spring.application.name}") private val appName: String,
    @Value("\${springdoc.api-docs.path:/api-docs}") private val apiDocsPath: String
) {

    @GetMapping("/redoc")
    fun redoc(model: Model): String {
        model.addAttribute("title", "$appName — API Reference")
        model.addAttribute("specUrl", apiDocsPath)
        return "redoc"  // → templates/redoc.html (Thymeleaf)
    }
}
```

```html
<!-- src/main/resources/templates/redoc.html -->
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title th:text="${title}">API Reference</title>
  <!-- ReDoc CDN — fijar versión para reproducibilidad -->
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc
    spec-url="/api-docs"
    expand-responses="200,201"
    required-props-first="true"
    sort-props-alphabetically="false"
    hide-download-button="false"
    theme='{"colors": {"primary": {"main": "#1565c0"}}, "rightPanel": {"backgroundColor": "#1a1a2e"}}'
  ></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.3.0/bundles/redoc.standalone.js"></script>
</body>
</html>
```

**Opción B — ReDoc como recurso estático (sin Thymeleaf)**

```html
<!-- src/main/resources/static/redoc.html -->
<!DOCTYPE html>
<html>
<head>
  <title>API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <redoc spec-url='/api-docs'></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.3.0/bundles/redoc.standalone.js"></script>
</body>
</html>
```

```kotlin
// SecurityConfig — permitir acceso a ReDoc
authorize("/redoc", permitAll)
authorize("/redoc.html", permitAll)
```

### Habilitar ReDoc por entorno

```yaml
# application.yml
springdoc:
  redoc:
    enabled: true   # false en prod si la documentación es interna

# application-prod.yml
springdoc:
  redoc:
    enabled: false
```

---

## 🧠 PARTE 5 — .NET CORE: SWASHBUCKLE / NSWAG

### Swashbuckle.AspNetCore — Dependencias y configuración

```csharp
// dotnet add package Swashbuckle.AspNetCore  (incluye Swagger UI + OpenAPI)
// dotnet add package Swashbuckle.AspNetCore.Annotations  (para atributos avanzados)
// dotnet add package Unchase.Swashbuckle.AspNetCore.Extensions  (para enums, ReDoc)
```

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ZNS API",
        Version = "v1",
        Description = """
            API REST de la plataforma ZNS.
            
            **Política POST-only**: todos los endpoints usan POST excepto `/health`.
            
            **Autenticación**: Bearer JWT — obtener en `POST /api/v1/auth/login`.
            """,
        Contact = new OpenApiContact { Name = "ZNS Dev", Email = "dev@zenapses.com" },
        License = new OpenApiLicense { Name = "Proprietary" }
    });

    // Esquema Bearer JWT
    options.AddSecurityDefinition("bearerAuth", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Introduce el token JWT. Formato: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "bearerAuth" }
            },
            Array.Empty<string>()
        }
    });

    // Incluir comentarios XML de los controladores
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) options.IncludeXmlComments(xmlPath);

    // Habilitar anotaciones de Swashbuckle.AspNetCore.Annotations
    options.EnableAnnotations();

    // Ordenar por nombre
    options.OrderActionsBy(api => $"{api.GroupName}_{api.HttpMethod}_{api.RelativePath}");
});

var app = builder.Build();

// Solo en entornos no-prod
if (!app.Environment.IsProduction())
{
    app.UseSwagger(options => {
        options.SerializeAsV2 = false;  // usar OpenAPI 3.x
        options.RouteTemplate = "api-docs/{documentName}/openapi.json";
    });
    app.UseSwaggerUI(options => {
        options.SwaggerEndpoint("/api-docs/v1/openapi.json", "ZNS API v1");
        options.RoutePrefix = "swagger";                    // /swagger
        options.DisplayRequestDuration();
        options.EnableFilter();
        options.EnablePersistAuthorization();
        options.EnableDeepLinking();
        options.DocExpansion(DocExpansion.None);            // colapsado
        options.DefaultModelsExpandDepth(1);
    });

    // ReDoc para .NET (via Unchase extension o endpoint manual)
    app.UseReDoc(options =>
    {
        options.SpecUrl = "/api-docs/v1/openapi.json";
        options.RoutePrefix = "redoc";                      // /redoc
        options.DocumentTitle = "ZNS API Reference";
        options.HideDownloadButton = false;
        options.ExpandResponses = "200,201";
        options.RequiredPropsFirst = true;
    });
}
```

### Anotaciones en controllers .NET

```csharp
[ApiController]
[Route("api/v1/usuarios")]
[Tags("Usuarios")]
[Produces("application/json")]
public class UsuarioController : ControllerBase
{
    /// <summary>Registrar nuevo usuario</summary>
    /// <remarks>
    /// Crea un nuevo usuario en el sistema.
    /// El email debe ser único. La contraseña se hashea con Argon2id.
    /// </remarks>
    [HttpPost("registrar")]
    [SwaggerOperation(
        Summary = "Registrar nuevo usuario",
        Description = "Crea un usuario. Email único. Contraseña hasheada con Argon2id.",
        OperationId = "Usuarios_Registrar",
        Tags = new[] { "Usuarios" }
    )]
    [ProducesResponseType(typeof(UsuarioIdResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest,
        "application/problem+json")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict,
        "application/problem+json")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioRequest request)
    { ... }
}
```

### DTOs con anotaciones OpenAPI en .NET

```csharp
/// <summary>Request para registrar un nuevo usuario</summary>
public record RegistrarUsuarioRequest(
    /// <example>juan.perez@empresa.com</example>
    [property: Required, MaxLength(255), EmailAddress]
    string Email,

    /// <example>S3cure!Pass2024</example>
    [property: Required, MinLength(8), MaxLength(128)]
    string Password,  // ← writeOnly se configura via ISchemaFilter en Swashbuckle

    /// <example>Juan</example>
    [property: Required, MinLength(2), MaxLength(100)]
    string Nombre,

    /// <example>Pérez</example>
    [property: Required, MinLength(2), MaxLength(100)]
    string Apellido
);

// WriteOnly filter para passwords
public class WriteOnlySchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.MemberInfo?.Name == "Password")
            schema.WriteOnly = true;
    }
}
// Registrar en AddSwaggerGen: options.SchemaFilter<WriteOnlySchemaFilter>();
```

### NSwag (alternativa a Swashbuckle)

```csharp
// dotnet add package NSwag.AspNetCore

builder.Services.AddOpenApiDocument(config =>
{
    config.Title = "ZNS API";
    config.Version = "v1";
    config.AddSecurity("bearerAuth", new NSwag.OpenApiSecurityScheme
    {
        Type = NSwag.OpenApiSecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    config.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("bearerAuth"));
});

app.UseOpenApi();          // /swagger/v1/swagger.json
app.UseSwaggerUi();        // /swagger
app.UseReDoc(x => x.Path = "/redoc");
```

**¿Swashbuckle vs NSwag?**  
- **Swashbuckle**: más popular, mejor integración con `[ApiController]`, soporte oficial Microsoft  
- **NSwag**: genera clientes TypeScript/C# automáticamente, mejor para contract-first  

---

## 🧠 PARTE 6 — PATRONES ZNS POST-ONLY EN DOCS

### Documentar endpoints POST que hacen consultas

```kotlin
// ✅ Usar @Operation con description clara de por qué es POST
@PostMapping("/buscar")
@Operation(
    summary = "Buscar usuarios",
    description = """
        **POST por política ZNS**: las consultas se envían como POST para:
        - Evitar datos sensibles (filtros, IDs) en URL/logs
        - Permitir bodies complejos de búsqueda con paginación
        
        Retorna lista paginada ordenable de usuarios activos.
    """
)
@ApiResponses(value = [
    ApiResponse(
        responseCode = "200",
        description = "Lista paginada de usuarios",
        content = [Content(schema = Schema(implementation = PageResponseUsuarioResumen::class))]
    )
])
fun buscar(@Valid @RequestBody req: BuscarUsuariosRequest): ResponseEntity<PageResponse<UsuarioResumenResponse>> { ... }
```

### Documentar deprecación de endpoints

```kotlin
@PostMapping("/obtenerPerfil")
@Operation(
    summary = "Obtener perfil de usuario [DEPRECATED]",
    description = "**DEPRECATED desde v1.2** — usar `POST /api/v1/usuarios/detalle`",
    deprecated = true  // ← aparece tachado + badge "deprecated" en Swagger UI
)
@ApiResponse(
    responseCode = "200",
    headers = [Header(
        name = "Deprecation",
        description = "Indica que este endpoint está deprecated",
        schema = Schema(type = "boolean", example = "true")
    )]
)
fun obtenerPerfil(...): ResponseEntity<PerfilLegacyResponse> { ... }
```

### Excluir endpoints de la documentación

```kotlin
// @Hidden excluye el controller o método de Swagger UI y api-docs
@RestController
@Hidden  // controller interno — no documentar
class InternalHealthController { ... }

// A nivel de método:
@PostMapping("/internal/ping")
@Hidden
fun ping(): ResponseEntity<String> { ... }
```

---

## 🧠 PARTE 7 — JAVA SPRING BOOT — ADAPTACIONES

Los patrones Kotlin aplican 1:1 en Java 21 con sintaxis estándar:

```java
// OpenApiConfig.java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI(
        @Value("${spring.application.name}") String appName
    ) {
        return new OpenAPI()
            .info(new Info()
                .title(appName + " API")
                .version("v1")
                .description("API ZNS — política POST-only")
                .contact(new Contact().name("ZNS Dev").email("dev@zenapses.com")))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")));
    }

    @Bean
    public GroupedOpenApi identidadGroup() {
        return GroupedOpenApi.builder()
            .group("identidad")
            .pathsToMatch("/api/v1/auth/**", "/api/v1/usuarios/**")
            .build();
    }
}

// Controller Java con anotaciones OpenAPI
@RestController
@RequestMapping("/api/v1/usuarios")
@Tag(name = "Usuarios", description = "Gestión de usuarios")
public class UsuarioController {

    @PostMapping("/registrar")
    @Operation(summary = "Registrar usuario")
    @ApiResponse(responseCode = "201", description = "Creado",
        content = @Content(schema = @Schema(implementation = UsuarioIdResponse.class)))
    @ApiResponse(responseCode = "400", description = "Validación fallida",
        content = @Content(mediaType = "application/problem+json",
            schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<UsuarioIdResponse> registrar(
        @Valid @RequestBody RegistrarUsuarioRequest req
    ) { ... }
}
```

---

## ✅ CHECKLIST DE AUDITORÍA — SWAGGER / OPENAPI / REDOC

### Configuración base
- [ ] `springdoc-openapi-starter-webmvc-ui:2.8.4` en dependencias (o webflux si reactivo)
- [ ] `OpenApiConfig` con `Info` completo (title, description, version, contact)
- [ ] Esquema de seguridad `bearerAuth` configurado en `Components`
- [ ] `packages-to-scan` apunta al paquete base del proyecto
- [ ] Swagger UI **deshabilitado** en `application-prod.yml`

### Grupos y organización
- [ ] Al menos un `GroupedOpenApi` bean por dominio/contexto
- [ ] `@Tag` en todos los controllers con `name` y `description`
- [ ] Endpoints actuator y error excluidos de la documentación

### Anotaciones de endpoints
- [ ] Todos los endpoints tienen `@Operation(summary = "...")`
- [ ] Todos los `@ApiResponse` incluyen `responseCode` + `description` + `content` con `@Schema`
- [ ] Al menos un `@ExampleObject` en endpoints críticos (login, registro)
- [ ] Endpoints deprecated marcados con `deprecated = true` en `@Operation`
- [ ] Endpoints internos marcados con `@Hidden`

### DTOs / Schemas
- [ ] Todos los DTOs de request tienen `@Schema(description = "...")`
- [ ] Todos los campos tienen `@Schema(description, example)`
- [ ] Campos `password`/`token` tienen `writeOnly = true`
- [ ] Enums documentados con `allowableValues` en `@Schema`
- [ ] Campos deprecated marcados con `deprecated = true` en `@Schema`

### ReDoc
- [ ] Endpoint `/redoc` disponible en entornos no-prod
- [ ] ReDoc deshabilitado en `application-prod.yml`
- [ ] `spec-url` apunta correctamente a `/api-docs`

### .NET (si aplica)
- [ ] `Swashbuckle.AspNetCore` configurado con `bearerAuth`
- [ ] `UseSwaggerUI` solo en `!IsProduction()`
- [ ] `UseReDoc` solo en `!IsProduction()`
- [ ] `[ProducesResponseType]` en todos los action methods
- [ ] `[SwaggerOperation]` o comentarios XML en controllers
- [ ] Comentarios XML habilitados (`<GenerateDocumentationFile>true</GenerateDocumentationFile>`)
