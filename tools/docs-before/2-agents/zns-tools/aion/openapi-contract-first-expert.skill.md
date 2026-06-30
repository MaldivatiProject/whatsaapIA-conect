# 📐 SKILL: OPENAPI CONTRACT-FIRST — EXPERT

**skill_id**: openapi-contract-first-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: api-design / especificación / contract-testing  
**last_updated**: 2026-03-19  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-spec-driven-master-agent, prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-aspnet-core-senior  
**dependencias**: spec-driven-development-expert (fundacional)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento exhaustivo para **diseñar, validar y mantener especificaciones OpenAPI 3.1 de nivel Expert**. Cubre desde la anatomía completa del estándar hasta las decisiones de trade-off en diseño de contratos: cuándo usar `$ref` vs inline, cómo modelar errores con RFC 7807, cómo versionar sin romper consumers y cómo integrar el ciclo de design-first en Spring Boot con herramientas de lint, codegen y conformance testing. Una spec excelente no solo documenta: es un contrato ejecutable que un equipo puede implementar en paralelo.

---

## 🧠 Conocimiento Núcleo

### Principios de Diseño de APIs OpenAPI-First

1. **URL como recurso, no como acción**: `/api/v1/users/{id}` ✅ — `/api/v1/getUserById` ❌
2. **HTTP verbs semánticamente correctos**: `POST` → crear / `GET` → leer sin side effects / `PUT` → reemplazar / `PATCH` → modificar parcial / `DELETE` → eliminar
3. **Recursos en plural**: `/api/v1/users` ✅ — `/api/v1/user` ❌
4. **Nesting limitado a 2 niveles**: `/api/v1/users/{id}/orders` ✅ — `/api/v1/users/{id}/orders/{oid}/items/{iid}/reviews` ❌ (usar query params)
5. **Errores siempre con RFC 7807 ProblemDetail**: Nunca `{ "error": "mensaje" }`, siempre `{ "type", "title", "status", "detail", "instance", "correlationId" }`
6. **Payload directo para ítems únicos — DTO sin envelope**: `{ "id": 1, "nombre": "..." }` ✅ — `{ "data": { "id": 1 } }` ❌
7. **Paginación estandarizada**: Respuesta con `{ "content": [], "page": 0, "size": 20, "totalElements": 142 }`

---

### Anatomía Completa OpenAPI 3.1.0

```yaml
openapi: "3.1.0"

info:
  title: "Nombre del Servicio API"
  version: "1.2.0"              # Semantic versioning del contrato
  description: |
    Descripción detallada del propósito del servicio.
    Incluir: qué endpoints expone, quién es el consumer principal, contexto de dominio.
  contact:
    name: "ZNS Backend Team"
    email: "backend@zenapses.com"
  license:
    name: "Proprietary"

servers:
  - url: https://api.zenapses.com/v1
    description: Producción
  - url: https://api-staging.zenapses.com/v1
    description: Staging
  - url: http://localhost:8080
    description: Desarrollo local

tags:
  - name: Autenticación
    description: Operaciones de login, logout y refresh de tokens
  - name: Usuarios
    description: Gestión de cuentas de usuario

paths:
  /auth/login:
    post:
      operationId: loginUsuario           # camelCase, verbo + sustantivo
      summary: Autenticar usuario
      description: |
        Autentica al usuario con email y contraseña.
        En caso de éxito, establece el token JWT en una cookie HttpOnly.
        Límite de intentos: 5 en 15 minutos por IP.
      tags: [Autenticación]
      security: []                        # Endpoint público — sin autenticación
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
            examples:
              usuario_valido:
                summary: Credenciales correctas
                value:
                  email: "dev@zenapses.com"
                  password: "Secure123!"
              usuario_invalido:
                summary: Credenciales incorrectas (para documentar el 401)
                value:
                  email: "dev@zenapses.com"
                  password: "wrongpassword"
      responses:
        '200':
          $ref: '#/components/responses/LoginExitoso'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
        '429':
          $ref: '#/components/responses/TooManyRequests'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    CookieAuth:
      type: apiKey
      in: cookie
      name: access_token

  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      additionalProperties: false          # ← SIEMPRE false en inputs — previene inyección
      properties:
        email:
          type: string
          format: email
          maxLength: 254
          example: "usuario@zenapses.com"
        password:
          type: string
          minLength: 8
          maxLength: 128
          writeOnly: true                  # ← nunca aparece en responses

    ProblemDetail:                         # RFC 7807
      type: object
      required: [type, title, status, detail, instance]
      properties:
        type:
          type: string
          format: uri
          example: "https://zenapses.com/errors/validation-error"
        title:
          type: string
          example: "Error de validación"
        status:
          type: integer
          example: 422
        detail:
          type: string
          example: "El campo email no tiene formato válido"
        instance:
          type: string
          format: uri
          example: "/api/v1/auth/login"
        correlationId:
          type: string
          format: uuid
          example: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
        timestamp:
          type: string
          format: date-time
        errors:
          type: array
          items:
            $ref: '#/components/schemas/FieldError'

    FieldError:
      type: object
      properties:
        field:
          type: string
          example: "email"
        message:
          type: string
          example: "formato de email inválido"
        rejectedValue:
          type: string
          example: "not-an-email"

  responses:
    LoginExitoso:
      description: Autenticación exitosa
      headers:
        Set-Cookie:
          description: JWT en cookie HttpOnly + Secure
          schema:
            type: string
            example: "access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/"

    Unauthorized:
      description: Credenciales inválidas o token expirado
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
          example:
            type: "https://zenapses.com/errors/unauthorized"
            title: "No autorizado"
            status: 401
            detail: "Las credenciales proporcionadas no son válidas"
            instance: "/api/v1/auth/login"

    UnprocessableEntity:
      description: Error de validación de campos de entrada
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

    TooManyRequests:
      description: Demasiados intentos — rate limiting activo
      headers:
        Retry-After:
          schema:
            type: integer
            example: 900
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

security:
  - CookieAuth: []              # Seguridad global por defecto
  # Los endpoints públicos definen: security: []
```

---

### Reglas de Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| `operationId` | camelCase, verbo + recurso | `crearUsuario`, `obtenerPedidoPorId`, `eliminarSesion` |
| Schemas en `components` | PascalCase | `LoginRequest`, `UsuarioResponse`, `ProblemDetail` |
| Query params | camelCase | `pageSize`, `sortBy`, `includeDeleted` |
| Path params | camelCase | `{userId}`, `{orderId}` |
| Tags | PascalCase o Título | `Autenticación`, `Gestión de Pedidos` |
| Nombres de respuesta en components | PascalCase + semántica | `LoginExitoso`, `Unauthorized`, `NotFound` |

---

### Reglas de Códigos HTTP

| Código | Cuándo usar |
|--------|-------------|
| `200 OK` | Consulta exitosa con body / actualización exitosa con body |
| `201 Created` | Recurso creado exitosamente. Incluir `Location` header |
| `204 No Content` | Acción exitosa sin body de retorno (DELETE, logout) |
| `400 Bad Request` | Req malformado (sintaxis JSON incorrecta, Content-Type incorrecto) |
| `401 Unauthorized` | Sin autenticación o token inválido/expirado |
| `403 Forbidden` | Autenticado pero sin permisos para el recurso |
| `404 Not Found` | Recurso no existe — SOLO para identifiers específicos |
| `409 Conflict` | Conflicto de estado: duplicado, version mismatch, estado inválido |
| `422 Unprocessable Entity` | Validación de negocio falló (campos inválidos, reglas de dominio) |
| `429 Too Many Requests` | Rate limiting — incluir `Retry-After` header |
| `500 Internal Server Error` | Error inesperado — NUNCA exponer stack trace |

---

### Spectral Ruleset Recomendado

```yaml
# .spectral.yml (en la raíz del repo)
rules:
  operation-id-camel-case:
    description: "operationId debe ser camelCase"
    given: "$.paths[*][*].operationId"
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^[a-z][a-zA-Z0-9]+$"

  require-examples:
    description: "Todas las operaciones deben tener ejemplos"
    given: "$.paths[*][post,put,patch].requestBody.content[*]"
    severity: warn
    then:
      field: examples
      function: truthy

  no-additional-properties-in-request:
    description: "RequestBody schemas deben tener additionalProperties: false"
    given: "$.components.schemas[*Request]"
    severity: error
    then:
      field: additionalProperties
      function: falsy

  problem-detail-on-errors:
    description: "Errores 4xx/5xx deben usar application/problem+json"
    given: "$.paths[*][*].responses[4xx,5xx].content"
    severity: error
    then:
      field: "application/problem+json"
      function: truthy
```

---

### Integración con Spring Boot (springdoc ≠ spec maestra)

```kotlin
// ✅ CORRECTO — springdoc genera SOLO docs en Swagger UI, NO es la spec maestra
// La spec maestra vive en api-spec/openapi.yml y el controller implementa la interface generada

// 1) Interface generada por openapi-generator (no modificar manualmente):
// src/generated/kotlin/com/zenapses/auth/api/AuthApi.kt
interface AuthApi {
    @Operation(operationId = "loginUsuario", tags = ["Autenticación"])
    @PostMapping("/api/v1/auth/login")
    suspend fun loginUsuario(
        @Valid @RequestBody loginRequest: LoginRequest
    ): ResponseEntity<Unit>
}

// 2) Implementación del desarrollador:
@RestController
class AuthController(
    private val loginUseCase: LoginUseCase
) : AuthApi {
    override suspend fun loginUsuario(loginRequest: LoginRequest): ResponseEntity<Unit> {
        val token = loginUseCase.execute(loginRequest.toDomain())
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, token.toHttpOnlyCookie())
            .build()
    }
}

// ✅ Conformance: el pipeline CI ejecuta Schemathesis contra api-spec/openapi.yml
// para verificar que AuthController responde de acuerdo al contrato
```

---

### Diseño de Paginación Estándar

```yaml
# En components/schemas:
PageResponse:
  type: object
  required: [content, page, size, totalElements, totalPages]
  properties:
    content:
      type: array
      items: {}  # Reemplazar con referencia al schema del ítem
    page:
      type: integer
      minimum: 0
      example: 0
    size:
      type: integer
      minimum: 1
      maximum: 100
      example: 20
    totalElements:
      type: integer
      minimum: 0
      example: 142
    totalPages:
      type: integer
      minimum: 0
      example: 8
```

---

## ✅ Criterios de Aplicación

- Toda API REST nueva en el ecosistema ZNS debe tener su `openapi.yml` en `api-spec/<servicio>/` ANTES de cualquier código
- Cuando hay que generar stubs de código: usar `openapi-generator` con `interfaceOnly=true`
- Cuando hay que levantar mock server en desarrollo o CI: usar `prism mock api-spec/<servicio>/openapi.yml`
- Cuando hay que validar conformance: usar `schemathesis run api-spec/<servicio>/openapi.yml`

## ❌ Anti-patrones Críticos

- ❌ **Campos sin `format` en tipos primitivos**: `type: string` para UUID/email/date-time es ambiguo. Usar `format: uuid`, `format: email`, `format: date-time`.
- ❌ **`additionalProperties: true` en request schemas**: Abre la puerta a inyección de campos no esperados. Siempre `additionalProperties: false` en inputs.
- ❌ **Errores sin ProblemDetail RFC 7807**: `{ "error": "algo falló" }` no es aceptable. Siempre `application/problem+json` con los campos obligatorios.
- ❌ **`operationId` sin verbo**: `userId` ❌ — `obtenerUsuarioPorId` ✅
- ❌ **Schemas inline en paths**: Todo schema con más de 3 propiedades debe estar en `components/schemas` con `$ref`.
- ❌ **Tags sin descripción**: Los tags sin `description` en el nivel raíz generan documentación incompleta.
- ❌ **Spec sin servers definidos**: Sin la sección `servers`, las herramientas de testing no saben contra qué URL correr.
- ❌ **`password` sin `writeOnly: true`**: Los campos sensibles DEBEN marcarse para que no se incluyan en responses.

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Endpoint de creación de recurso (POST con 201)

```yaml
/api/v1/users:
  post:
    operationId: crearUsuario
    summary: Registrar nuevo usuario
    tags: [Usuarios]
    security: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CrearUsuarioRequest'
          examples:
            registro_completo:
              value:
                nombre: "Ana García"
                email: "ana.garcia@empresa.com"
                password: "Secure456!"
    responses:
      '201':
        description: Usuario creado exitosamente
        headers:
          Location:
            schema:
              type: string
              format: uri
              example: "/api/v1/users/3fa85f64-5717-4562-b3fc-2c963f66afa6"
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UsuarioResponse'
      '409':
        $ref: '#/components/responses/Conflict'
      '422':
        $ref: '#/components/responses/UnprocessableEntity'
```

### Ejemplo 2: Endpoint de consulta paginada (GET)

```yaml
/api/v1/users:
  get:
    operationId: listarUsuarios
    summary: Obtener lista paginada de usuarios
    tags: [Usuarios]
    parameters:
      - $ref: '#/components/parameters/PageParam'
      - $ref: '#/components/parameters/SizeParam'
      - name: search
        in: query
        description: Filtro por nombre o email (búsqueda parcial)
        schema:
          type: string
          maxLength: 100
          example: "ana garcia"
    responses:
      '200':
        description: Lista paginada de usuarios
        content:
          application/json:
            schema:
              allOf:
                - $ref: '#/components/schemas/PageResponse'
                - type: object
                  properties:
                    content:
                      type: array
                      items:
                        $ref: '#/components/schemas/UsuarioResponse'
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: OPENAPI CONTRACT-FIRST → ver: 2-agents/zns-tools/aion/openapi-contract-first-expert.skill.md

- Spec en `api-spec/<servicio>/openapi.yml` ANTES de cualquier código
- `additionalProperties: false` en TODOS los request schemas
- Errores 4xx/5xx: SIEMPRE `application/problem+json` con ProblemDetail RFC 7807 + `correlationId`
- `operationId` en camelCase con verbo: `crearUsuario`, `obtenerPedidoPorId`
- Campos sensibles (`password`, `token`): `writeOnly: true`
- Stubs generados con openapi-generator `interfaceOnly=true`, NUNCA modificar código generado manualmente
- Spectral lint en CI: 0 errores, 0 warnings antes del merge
- Mock server con `prism mock api-spec/<servicio>/openapi.yml` en dev y CI
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor Esperado |
|---------|----------------|
| Spectral lint score | 0 errores, 0 warnings |
| `additionalProperties: false` en request schemas | 100% |
| Errores 4xx/5xx con `application/problem+json` | 100% |
| Operations con al menos 1 ejemplo | 100% |
| `operationId` presentes y en camelCase | 100% |
| Schemas without `$ref` (inline con >3 props) | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — OpenAPI Contract-First Expert (2026-03-19)
