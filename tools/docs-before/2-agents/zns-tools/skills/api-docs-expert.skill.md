# 📚 SKILL: API DOCUMENTATION — EXPERT

**skill_id**: api-docs-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / api-documentation / developer-experience  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior  
**dependencias**: swagger-openapi-redoc-expert (cubre la capa técnica de anotaciones), postman-collection-expert (cubre colecciones de prueba)  
**referencia_stack**: OpenAPI 3.1.0 / Spring Boot 3.4.x / Kotlin 2.1.20 / Java 21 / .NET 8 / Swashbuckle.AspNetCore / Redocly CLI / Spectral / openapi-diff / GitHub Actions / Docs-as-Code

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con la capacidad de producir **documentación de API orientada al consumidor** (developer experience). Complementa a `swagger-openapi-redoc-expert` (que cubre configuración técnica de anotaciones y Swagger UI/ReDoc) y `postman-collection-expert` (que cubre colecciones de prueba), elevando la capa de:

- **API README** — documentación de onboarding por repositorio/dominio
- **Calidad de prose en OpenAPI** — descripciones, ejemplos y summaries que realmente comunican
- **Changelog de API** — cómo versionar y comunicar breaking vs. non-breaking changes
- **Developer Experience (DX)** — guías de inicio rápido, catálogo de errores, guías de migración
- **Docs-as-Code** — documentación como artefacto de CI/CD, versionada y validada con Spectral

> **Límite claro**: esta skill NO repite la configuración técnica de SpringDoc/Swashbuckle (eso es `swagger-openapi-redoc-expert`) ni la estructura de colecciones Postman (eso es `postman-collection-expert`). Su foco es la **experiencia del consumidor de la API**.

---

## 🧠 PARTE 1 — API README ESTÁNDAR ZNS

Cada módulo/microservicio expone un `README.md` en la raíz del proyecto. Es el primer documento que lee un desarrollador nuevo.

### Template canónico por dominio

```markdown
# 🔐 ZNS — [Nombre del Dominio] API

**dominio**: identidad | aibos | administración  
**versión_api**: v1.0.0  
**base_url_dev**: `http://localhost:8080/api/v1`  
**base_url_staging**: `https://staging-api.zenapses.com/api/v1`  
**spec_openapi**: `/api-docs` (JSON) | `/swagger-ui.html` (UI interactiva)  
**spec_redoc**: `/redoc`  
**postman_collection**: `postman/collections/ZNS-[Dominio].postman_collection.json`

---

## 🚀 Quick Start (< 5 minutos)

### Requisitos
- Java 21 / .NET 8 / Kotlin 2.x
- Docker + Docker Compose
- Variables de entorno (ver tabla abajo)

### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_URL` | URL JDBC/ADO de la BD | `jdbc:postgresql://localhost:5432/zenapses` |
| `JWT_PUBLIC_KEY_PATH` | Ruta al cert RS256 | `classpath:keys/jwt-public.pem` |
| `REDIS_URL` | URL Redis (caché/tokens) | `redis://localhost:6379` |

### Ejecutar

```bash
# Docker Compose (recomendado — levanta BD + Redis + App)
docker-compose up -d

# Verificar salud
curl -s http://localhost:8080/actuator/health | jq .status
# → "UP"
```

### Autenticarse

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@zenapses.com", "password": "Mi-Pass-Segura-2024!"}' \
  --cookie-jar cookies.txt
# El access_token llega en cookie HttpOnly — se envía automáticamente en requests siguientes
```

---

## 📋 Dominios y Endpoints

| Grupo | Endpoints clave | Documentación interactiva |
|-------|----------------|--------------------------|
| 🔐 Auth | POST /auth/login · POST /auth/refresh · POST /auth/logout | [Swagger UI](http://localhost:8080/swagger-ui.html#/auth) |
| 👤 Usuarios | POST /usuarios/registrar · POST /usuarios/buscar | [Swagger UI](http://localhost:8080/swagger-ui.html#/usuarios) |

---

## 🔴 Catálogo de Errores

| HTTP | errorCode | Descripción | Cuándo ocurre |
|------|-----------|-------------|----------------|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos | Campo requerido faltante o formato incorrecto |
| 401 | `TOKEN_EXPIRED` | JWT expirado | Token con `exp` en el pasado |
| 401 | `TOKEN_INVALID` | Token malformado o firma incorrecta | Token manipulado o de otro entorno |
| 403 | `ACCESS_DENIED` | Acceso denegado | Rol insuficiente o BOLA |
| 409 | `EMAIL_ALREADY_EXISTS` | Email ya registrado | Intento de registro duplicado |
| 422 | `[DOMAIN_CODE]` | Regla de negocio violada | Ver `detail` en la respuesta |
| 429 | `RATE_LIMIT_EXCEEDED` | Límite excedido | > N req/min por IP/usuario |
| 500 | `INTERNAL_ERROR` | Error interno | Usar `correlationId` para trazabilidad |

---

## 🔄 Changelog

Ver [CHANGELOG.md](CHANGELOG.md)
```

### Reglas del API README
- **Un README por dominio** — no un README global para todo el monolito
- **Quick Start < 5 minutos** — si el dev no puede levantar el servicio en 5 min, el README falló
- **Catálogo de errores obligatorio** — todos los `errorCode` del dominio documentados, incluyendo los de dominio (422)
- **Links a Swagger UI y ReDoc** siempre presentes con URLs locales funcionales
- **Variables de entorno como tabla** — sin excepción: `Variable | Descripción | Ejemplo`
- **Comandos copy-paste** — todo `bash` debe ser ejecutable sin modificación manual

---

## 🧠 PARTE 2 — CALIDAD DE PROSE EN OPENAPI

Las anotaciones OpenAPI deben producir **documentación legible por humanos**, no solo metadata técnica. La regla de los 3 niveles:

| Nivel | Qué incluir | Longitud orientativa |
|-------|------------|---------------------|
| `summary` | Acción + sustantivo | ≤ 60 caracteres |
| `description` | Comportamiento, restricciones, efectos, seguridad | 3-10 líneas con Markdown |
| `example` / `@ExampleObject` | Datos realistas, múltiples casos | Tantos como casos de uso distintos |

### Kotlin / Java — Estándar de anotaciones

```kotlin
// ❌ Inadecuado — no comunica nada al consumidor
@Operation(summary = "Crear usuario")

// ✅ Adecuado — clara acción + contexto completo
@Operation(
    summary = "Registrar nuevo usuario en el sistema",
    description = """
        Registra un nuevo usuario con el rol especificado.
        
        **Restricciones:**
        - El email debe ser único en el sistema
        - La contraseña debe tener entre 8 y 128 caracteres (NIST 800-63B)
        - El rol `SUPER_ADMIN` solo puede asignarlo un `SUPER_ADMIN` activo
        
        **Efectos:**
        - Se envía email de verificación al correo registrado
        - El usuario queda en estado `PENDIENTE_VERIFICACION` hasta confirmar
        
        **Seguridad:** Requiere Bearer JWT con rol `ADMIN` o `SUPER_ADMIN`
    """.trimIndent(),
    responses = [
        ApiResponse(
            responseCode = "201",
            description = "Usuario registrado correctamente. El ID del nuevo usuario se retorna en el body.",
            content = [Content(
                schema = Schema(implementation = UsuarioRegistradoResponse::class),
                examples = [ExampleObject(
                    name = "registro-exitoso",
                    summary = "Registro de administrador de portal",
                    value = """{"id":"550e8400-e29b-41d4-a716-446655440000","email":"admin@empresa.com","estado":"PENDIENTE_VERIFICACION"}"""
                )]
            )]
        ),
        ApiResponse(
            responseCode = "409",
            description = "El email ya está registrado en el sistema.",
            content = [Content(
                schema = Schema(implementation = ProblemDetail::class),
                examples = [ExampleObject(
                    name = "email-duplicado",
                    value = """{"type":"https://zenapses.com/errors/email-already-exists","title":"Conflict","status":409,"detail":"El email ya existe","errorCode":"EMAIL_ALREADY_EXISTS","correlationId":"abc-123","timestamp":"2026-03-20T10:00:00Z"}"""
                )]
            )]
        )
    ]
)
```

### `@Schema` — Cada campo con semántica

```kotlin
// ❌ Inadecuado — campo sin contexto
val email: String

// ✅ Adecuado — descripción + ejemplo + constraints
@field:Schema(
    description = "Email corporativo del usuario. Debe ser único en el sistema. Se usará como identificador de login.",
    example = "usuario@empresa.com",
    format = "email",
    maxLength = 255
)
val email: String

@field:Schema(
    description = "Contraseña: 8-128 caracteres, sin reglas de complejidad (NIST 800-63B). Se almacenará con Argon2id, nunca en texto plano.",
    writeOnly = true,
    minLength = 8,
    maxLength = 128
)
val password: String
```

### .NET / C# — Equivalentes Swashbuckle

```csharp
// ❌ Inadecuado
[HttpPost("registrar")]
public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioRequest request)

// ✅ Adecuado — summary + description completos con XML docs + Swashbuckle annotations
/// <summary>Registrar nuevo usuario en el sistema</summary>
/// <remarks>
/// Registra un nuevo usuario con el rol especificado.
///
/// **Restricciones:**
/// - Email debe ser único en el sistema
/// - Contraseña: 8-128 caracteres (NIST 800-63B)
///
/// **Efectos:**
/// - Envío de email de verificación
/// - Estado inicial: `PENDIENTE_VERIFICACION`
///
/// **Seguridad:** Requiere Bearer JWT con rol `ADMIN` o `SUPER_ADMIN`
/// </remarks>
[SwaggerOperation(Summary = "Registrar nuevo usuario en el sistema", OperationId = "RegistrarUsuario")]
[SwaggerResponse(201, "Usuario registrado correctamente", typeof(UsuarioRegistradoResponse))]
[SwaggerResponse(409, "El email ya está registrado", typeof(ProblemDetails))]
[HttpPost("registrar")]
public async Task<IActionResult> Registrar([FromBody] RegistrarUsuarioRequest request)

// Record DTO con descriptions en cada propiedad
public record RegistrarUsuarioRequest(
    [property: Required]
    [property: MaxLength(255)]
    [property: EmailAddress]
    [property: SwaggerSchema(Description = "Email corporativo. Único en el sistema. Se usará como identificador de login.", Format = "email")]
    string Email,

    [property: Required]
    [property: MinLength(8)]
    [property: MaxLength(128)]
    [property: SwaggerSchema(Description = "Contraseña: 8-128 chars sin restricciones de complejidad (NIST 800-63B). Almacenada con Argon2id.", WriteOnly = true)]
    string Password
);
```

---

## 🧠 PARTE 3 — CHANGELOG.md PARA APIs

### Estructura estándar de CHANGELOG.md

```markdown
# Changelog — ZNS [Dominio] API

Todos los cambios notables siguen [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security

---

## [1.2.0] — 2026-03-20

### Added
- `POST /api/v1/usuarios/exportar` — Exportación de usuarios en CSV/Excel
- Filtros opcionales en `POST /api/v1/usuarios/buscar`: `fechaDesde`, `fechaHasta`

### Changed
- `POST /api/v1/usuarios/detalle` ahora retorna campo `ultimoAcceso` (era `null` hasta v1.1.x)

### Security
- Rotación de Refresh Tokens habilitada por defecto (era opt-in en v1.1.x)
- TTL del access token reducido de 30 min a 15 min

---

## [1.1.0] — 2026-02-15

### Deprecated
- `POST /api/v1/auth/token` — Usar `POST /api/v1/auth/login`. Se eliminará en v2.0.0.

---

## [1.0.0] — 2026-01-01

### Added
- Versión inicial de la API
```

### Clasificación de cambios (breaking vs. non-breaking)

| Tipo de cambio | ¿Breaking? | Incremento | Ejemplo |
|----------------|-----------|-----------|---------|
| Nuevo endpoint | No | MINOR | `POST /recursos/exportar` |
| Nuevo campo opcional en response | No | MINOR | Añadir campo `updatedAt` |
| Nuevo campo requerido en request | **Sí** | **MAJOR** | `apellido` obligatorio en registro |
| Eliminar campo de response | **Sí** | **MAJOR** | Remover campo `nickname` |
| Cambio de tipo de campo | **Sí** | **MAJOR** | `id: Int` → `id: UUID` |
| Cambio de HTTP status | **Sí** | **MAJOR** | `404 → 422` |
| Eliminar endpoint | **Sí** | **MAJOR** | Eliminar ruta existente |
| Fix bug sin cambio de contrato | No | PATCH | Corrección de validación interna |
| Nueva validación antes permisiva | **Sí** | **MAJOR** | Email ahora verifica dominio real |

### Regla de deprecación
1. **Anunciar en MINOR**: `@Operation(deprecated = true)` + aviso en `description` con fecha límite
2. **Mantener ≥ 1 versión MAJOR o 90 días** (el mayor de los dos)
3. **Remover en MAJOR** con guía de migración obligatoria en `docs/migration-vN-to-vN+1.md`

---

## 🧠 PARTE 4 — DEVELOPER EXPERIENCE (DX) DOCUMENTATION

### Artefactos obligatorios por dominio

| Artefacto | Ruta | Propósito | Cuándo es obligatorio |
|-----------|------|-----------|----------------------|
| `README.md` | `[proyecto]/README.md` | Onboarding y referencia rápida | ✅ Siempre |
| `CHANGELOG.md` | `[proyecto]/CHANGELOG.md` | Historial de cambios | ✅ Siempre |
| `docs/auth-guide.md` | `[proyecto]/docs/` | Cómo autenticarse, manejar tokens, refresh | ✅ Si hay auth |
| `docs/error-catalog.md` | `[proyecto]/docs/` | Todos los `errorCode` del dominio con causa y acción | ✅ Siempre |
| `docs/migration-vN-to-vN+1.md` | `[proyecto]/docs/` | Guía paso a paso para migrar versiones | ✅ En cada MAJOR |
| `postman/README.md` | `[proyecto]/postman/` | Cómo importar y usar las colecciones | ✅ Si hay colecciones |

### Template: `docs/auth-guide.md`

```markdown
# 🔒 Guía de Autenticación — ZNS [Dominio] API

## Flujo completo

```
[Cliente] → POST /auth/login → [Server] → cookie HttpOnly access_token + refresh_token
[Cliente] → Requests normales (cookie automática) → [Server] → respuesta
[Cliente] → POST /auth/refresh (antes de exp) → [Server] → nuevos tokens (Refresh Token Rotation)
[Cliente] → POST /auth/logout → [Server] → invalida tokens, limpia cookies
```

## ⏰ Expiración de tokens

| Token | TTL | Qué hacer al expirar |
|-------|-----|---------------------|
| `access_token` | 15 min | Llamar `POST /auth/refresh` |
| `refresh_token` | 7 días | Re-autenticar con login |

## ⚠️ Errores de autenticación

| HTTP | errorCode | Causa | Acción recomendada |
|------|-----------|-------|-------------------|
| 401 | `TOKEN_EXPIRED` | Access token vencido | Llamar `/auth/refresh` |
| 401 | `TOKEN_INVALID` | Token malformado o firma incorrecta | Re-autenticar |
| 401 | `TOKEN_REVOKED` | Token revocado por logout previo | Re-autenticar |
| 403 | `INSUFFICIENT_ROLE` | Rol insuficiente para el endpoint | Verificar permisos en el sistema |
```

### Template: `docs/error-catalog.md`

```markdown
# 🔴 Catálogo de Errores — ZNS [Dominio] API

Todos los errores siguen el formato **ProblemDetail RFC 7807**:

```json
{
  "type": "https://zenapses.com/errors/[error-slug]",
  "title": "[Título HTTP estándar]",
  "status": [código HTTP],
  "detail": "[Descripción legible del error]",
  "errorCode": "[SNAKE_UPPER_CASE]",
  "correlationId": "[UUID para trazabilidad]",
  "timestamp": "[ISO-8601]",
  "instance": "/api/v1/[ruta-que-falló]",
  "errors": [{ "field": "[campo]", "message": "[descripción]" }]  // solo en 400
}
```

## Errores de validación (400)

| errorCode | Causa | Campos afectados | Ejemplo `errors[]` |
|-----------|-------|------------------|--------------------|
| `VALIDATION_ERROR` | JSR-380 / DataAnnotations fallaron | Varía por request | `[{"field":"email","message":"must be a well-formed email address"}]` |

## Errores de autenticación (401)

| errorCode | Causa |
|-----------|-------|
| `TOKEN_EXPIRED` | JWT con `exp` en el pasado |
| `TOKEN_INVALID` | JWT malformado, firma incorrecta |
| `TOKEN_REVOKED` | Token revocado explícitamente |

## Errores de autorización (403)

| errorCode | Causa |
|-----------|-------|
| `ACCESS_DENIED` | BOLA: recurso no pertenece al usuario |
| `INSUFFICIENT_ROLE` | Rol del JWT insuficiente para la operación |

## Errores de negocio (422)

| errorCode | Contexto | Descripción |
|-----------|---------|-------------|
| `[DOMAIN_CODE]` | [endpoint] | [descripción de la regla de negocio violada] |
```

---

## 🧠 PARTE 5 — DOCS-AS-CODE

### Pipeline CI/CD para documentación

```yaml
# .github/workflows/api-docs.yml
name: API Docs — Lint & Publish

on:
  push:
    branches: [main, develop]
    paths: ['src/**', 'docs/**', 'postman/**']

jobs:
  validate-openapi-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }  # necesario para comparar con rama base

      # 1. Iniciar la app para generar spec en vivo
      - name: Start application
        run: docker-compose up -d --wait

      # 2. Exportar spec OpenAPI generada por la app
      - name: Export OpenAPI spec
        run: |
          curl -sf http://localhost:8080/api-docs -o openapi-current.json
          echo "✅ Spec exportada correctamente"

      # 3. Lint con Spectral — reglas ZNS
      - name: Lint with Spectral
        run: npx @stoplight/spectral-cli lint openapi-current.json --ruleset .spectral.yml
        # Falla el pipeline si hay errores o warnings — 0 tolerancia

      # 4. Detectar breaking changes vs. rama base
      - name: Detect breaking changes
        if: github.ref != 'refs/heads/main'
        run: |
          git show origin/main:openapi.json > openapi-base.json || echo '{}' > openapi-base.json
          npx openapi-diff openapi-base.json openapi-current.json --fail-on-incompatible
          # Si hay breaking changes, el PR no puede mergearse sin aprobación explícita

      # 5. Guardar spec actualizada en rama main
      - name: Save spec artifact
        if: github.ref == 'refs/heads/main'
        run: cp openapi-current.json openapi.json

      # 6. Publicar docs con Redocly
      - name: Build & publish ReDoc
        if: github.ref == 'refs/heads/main'
        run: |
          npx @redocly/cli build-docs openapi-current.json -o docs-output/
          # Deploy a GitHub Pages / S3 / servidor de docs interno
```

### `.spectral.yml` — Reglas ZNS personalizadas

```yaml
extends: ["spectral:oas"]

rules:
  # Todos los endpoints deben tener summary
  zns-operation-summary-required:
    message: "El endpoint '{{path}}' no tiene 'summary'. Todos los endpoints deben documentarse."
    given: "$.paths.*.*"
    severity: error
    then:
      field: summary
      function: truthy

  # Todos los endpoints deben tener description
  zns-operation-description-required:
    message: "El endpoint '{{path}}' no tiene 'description'. Documenta restricciones, efectos y seguridad."
    given: "$.paths.*.*"
    severity: warn
    then:
      field: description
      function: truthy

  # Todos los campos de schema deben tener description
  zns-schema-property-description:
    message: "La propiedad '{{path}}' no tiene 'description'. Documenta qué representa el campo."
    given: "$.components.schemas.*.properties.*"
    severity: warn
    then:
      field: description
      function: truthy

  # Versión semántica en todos los paths
  zns-path-versioning:
    message: "El path '{{path}}' debe incluir versión de API (ej: /api/v1/...)."
    given: "$.paths"
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^/api/v[0-9]+"

  # No exponer stack traces en ejemplos
  zns-no-stack-trace-in-examples:
    message: "Detectado posible stack trace en ejemplo. Nunca exponer internals del servidor."
    given: "$.paths.*.*.responses.*.content.*.examples.*"
    severity: error
    then:
      function: pattern
      functionOptions:
        notMatch: "at (org\\.springframework|System\\.|java\\.)"

  # Todos los responses de error deben tener type URI
  zns-problem-detail-type:
    message: "Los errores deben seguir ProblemDetail RFC 7807 con 'type' URI canónica."
    given: "$.paths.*.*.responses[4xx,5xx].content.*.schema"
    severity: warn
    then:
      function: schema
      functionOptions:
        schema:
          properties:
            type:
              type: string
              format: uri
```

---

## ✅ Criterios de Aplicación

- Al crear o modificar cualquier endpoint de la API
- Al iniciar un nuevo dominio/microservicio
- Al hacer release de versión MINOR o MAJOR
- Durante onboarding de un nuevo desarrollador al equipo
- Al deprecar un endpoint o cambiar un contrato

## ❌ Anti-patrones

- ❌ `description: "string"` o `description: "TODO"` en cualquier campo OpenAPI listo para producción
- ❌ README genérico sin Quick Start funcional (si tarda más de 5 min, el README falló)
- ❌ Breaking change sin incremento de versión MAJOR y sin guía de migración
- ❌ Ejemplos con datos ficticios (`"nombre": "string"`, `"id": 1`) en lugar de datos realistas
- ❌ Catálogo de errores documentando solo el happy path — los errores son parte del contrato
- ❌ CHANGELOG sin clasificar si el cambio es breaking o non-breaking
- ❌ Documentación que vive solo en Confluence/Notion sin estar versionada con el código fuente
- ❌ Specs que no pasan `spectral lint` — si el lint tiene warnings, la doc no es de calidad Expert

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Anotar endpoint de registro con calidad Expert

**Entrada**: endpoint `POST /api/v1/usuarios/registrar` sin documentación  
**Proceso**: Aplicar PARTE 2 — prose quality rules  
**Salida**: `@Operation` con `summary` ≤ 60 chars, `description` con restricciones + efectos + seguridad en Markdown, múltiples `@ExampleObject` (happy path + email duplicado + validación fallida), `@Schema` en cada campo del DTO con `description` + `example` + constraints

### Ejemplo 2: Comunicar breaking change — cambio de `id: Int` a `id: UUID`

**Entrada**: PR que cambia el tipo del campo `id` en todos los responses  
**Proceso**:
1. Incrementar versión de `1.x.x` → `2.0.0`
2. Agregar a `CHANGELOG.md` en sección `### Removed`: campo `id: Int`
3. Agregar en `### Added`: campo `id: UUID`
4. Crear `docs/migration-v1-to-v2.md` con tabla de cambios y código de adaptación para clientes
5. Deprecar en swagger el campo antiguo (si se mantiene por compatibilidad)

**Salida**: CHANGELOG.md + guía de migración + `@Schema(deprecated=true)` en campo antiguo

### Ejemplo 3: README que cumple Quick Start < 5 min

**Antes**: "Ejecutar la aplicación con `./gradlew bootRun`"  
**Después**: Sección completa con tabla de variables de entorno, `docker-compose up -d`, `curl` de healthcheck, y `curl` de autenticación — todo copy-paste sin modificaciones manuales

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agregar en la sección `## SKILLS ACTIVAS` (código):

```
SKILL ACTIVA: api-docs-expert                    → ver: 2-agents/zns-tools/skills/api-docs-expert.skill.md
```

Y en la tabla resumen de skills:

| Skill | Aplicación directa |
|-------|-------------------|
| `api-docs-expert` | `README.md` canónico por dominio (Quick Start < 5 min, catálogo de errores, tabla de env vars); `CHANGELOG.md` con clasificación breaking/non-breaking y guías de migración en MAJOR; calidad de prose OpenAPI: `description` con restricciones+efectos+seguridad, `@ExampleObject` con datos realistas, `@Schema` con `description`+`example` por campo; `docs/auth-guide.md` + `docs/error-catalog.md` obligatorios; Docs-as-Code: Spectral lint en CI (0 errores/warnings), `openapi-diff` para detectar breaking changes en PRs, pipeline de publicación automática con Redocly |

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|--------|----------------|
| Campos `@Schema` sin `description` | 0 — todos los campos documentados |
| Endpoints sin `description` en `@Operation` | 0 — todos con comportamiento, restricciones y seguridad |
| Quick Start funcional en README | ≤ 5 minutos para levantar el servicio |
| `errorCode` documentados en catálogo | 100% de los códigos del dominio |
| CHANGELOG presente desde v1.0.0 | Sí |
| Breaking changes con guía de migración | 100% — ningún MAJOR sin `docs/migration-*.md` |
| Spectral lint en CI | 0 errores, 0 warnings |
| Datos realistas en `@ExampleObject` | 100% — ningún `"string"`, `"0"` ni `"TODO"` |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — API README, prose quality, CHANGELOG, DX docs, Docs-as-Code
