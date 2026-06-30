# HUT-[HU_ID]-API-[SECUENCIA]: [Método HTTP] /api/v1/[recurso]

> **Tipo:** `API` — Endpoint REST  
> **HU Origen:** [HU-XXX](../../05-deliverables/hus/[modulo]/HU-XXX-*.md)  
> **Método HTTP:** `[GET|POST|PUT|PATCH|DELETE]`  
> **Versión API:** `v1`  
> **Autenticación:** `[Requerida|Opcional|Pública]`

---

## 🎯 Historia Técnica API

**Como** Desarrollador Frontend/Mobile/Integrador externo,  
**Quiero** un endpoint `[MÉTODO] /api/v1/[recurso]` que [acción específica],  
**Para** [objetivo: ej. permitir a usuarios crear/obtener/actualizar recursos desde la UI].

---

## 📡 Especificación del Endpoint

### URL y Método

```http
[GET|POST|PUT|PATCH|DELETE] /api/v1/[modulo]/[recurso]
```

**Parámetros de ruta (Path Parameters):**
```
{id}          : UUID o Long (identificador único del recurso)
{subrecurso}  : Nombre del subrecurso anidado (opcional)
```

**Query Parameters (si aplica):**
| Parámetro | Tipo   | Requerido | Descripción | Ejemplo |
|-----------|--------|-----------|-------------|---------|
| `page`    | integer| No        | Número de página (default: 0) | `?page=2` |
| `size`    | integer| No        | Tamaño página (default: 20, max: 100) | `?size=50` |
| `sort`    | string | No        | Campo y dirección ordenamiento | `?sort=fecha,desc` |
| `filtro1` | string | No        | Filtro específico del recurso | `?estado=ACTIVO` |
| `filtro2` | date   | No        | Filtro por rango de fechas | `?fechaDesde=2025-01-01` |

---

## 🔐 Seguridad

### Autenticación
```http
Authorization: Bearer {JWT_TOKEN}
```

**Token requerido:** `[Sí|No]`  
**Roles permitidos:** `[ROLE_ESTUDIANTE, ROLE_TUTOR, ROLE_ADMIN]`  
**Permisos requeridos:** `[PERM_CREAR_RESERVA, PERM_VER_PERFIL]`

**Validación JWT:**
- ✅ Firma válida (secret key)
- ✅ Token no expirado (exp claim)
- ✅ Issuer correcto (iss claim)
- ✅ Token no en blacklist (Redis)

### Autorización

**Reglas de acceso:**
```java
@PreAuthorize("hasRole('ROLE_ESTUDIANTE')")
// O más específico:
@PreAuthorize("@authService.canAccess(#resourceId, authentication.principal)")
```

**Validaciones:**
1. ✅ Usuario autenticado
2. ✅ Rol adecuado para la operación
3. ✅ Ownership del recurso (si aplica)
4. ✅ Estado de cuenta activo

**Respuesta no autorizado:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "codigo": "ERR_AUTH_001",
    "mensaje": "Token JWT inválido o expirado",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**Respuesta sin permisos:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "codigo": "ERR_AUTH_002",
    "mensaje": "No tienes permisos para acceder a este recurso",
    "recurso": "/api/v1/reservas/123",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

### Rate Limiting

**Límites:**
- Usuarios autenticados: `100 requests/minuto`
- Endpoints públicos: `20 requests/minuto por IP`
- Endpoints críticos (pagos): `10 requests/minuto`

**Implementación:**
```
Storage: Redis (key: rate_limit:{userId}:{endpoint})
TTL: 60 segundos (ventana deslizante)
Algoritmo: Token Bucket
```

**Respuesta límite excedido:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699440000

{
  "error": {
    "codigo": "ERR_RATE_LIMIT",
    "mensaje": "Has excedido el límite de solicitudes. Intenta en 30 segundos.",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

---

## 📥 Request Specification

### Headers Requeridos
```http
Content-Type: application/json; charset=utf-8
Authorization: Bearer {JWT_TOKEN}
X-API-Version: v1
X-Request-ID: {UUID} (opcional, para trazabilidad)
Accept: application/json
Accept-Language: es-CO (opcional, default: es)
```

### Request Body (si POST/PUT/PATCH)

**Content-Type:** `application/json`

**JSON Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["campo1", "campo2"],
  "properties": {
    "campo1": {
      "type": "string",
      "minLength": 3,
      "maxLength": 100,
      "pattern": "^[a-zA-Z0-9]+$",
      "description": "Descripción del campo"
    },
    "campo2": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000,
      "description": "Descripción del campo"
    },
    "campo3": {
      "type": "string",
      "format": "date-time",
      "description": "Fecha en formato ISO 8601"
    },
    "campo4": {
      "type": "string",
      "enum": ["VALOR1", "VALOR2", "VALOR3"],
      "description": "Enumeración de valores permitidos"
    },
    "campoOpcional": {
      "type": "object",
      "properties": {
        "subcampo1": { "type": "string" },
        "subcampo2": { "type": "number" }
      }
    }
  }
}
```

**Ejemplo de Request Body:**
```json
{
  "campo1": "valor_ejemplo",
  "campo2": 12345,
  "campo3": "2025-11-08T10:30:00Z",
  "campo4": "VALOR1",
  "campoOpcional": {
    "subcampo1": "dato",
    "subcampo2": 3.14
  }
}
```

### Validaciones de Entrada

**Validaciones nivel campo:**
| Campo | Regla | Mensaje Error |
|-------|-------|---------------|
| `campo1` | Not null, length 3-100, alphanumeric | "Campo1 es obligatorio y debe tener entre 3 y 100 caracteres alfanuméricos" |
| `campo2` | Min 1, Max 1000000 | "Campo2 debe estar entre 1 y 1,000,000" |
| `campo3` | Valid ISO 8601, future date | "Campo3 debe ser una fecha válida en el futuro" |
| `campo4` | Enum validation | "Campo4 debe ser uno de: VALOR1, VALOR2, VALOR3" |

**Validaciones nivel objeto:**
1. ✅ `campo3` debe ser posterior a `fechaActual`
2. ✅ Si `campo4 == VALOR1`, entonces `campoOpcional` es requerido
3. ✅ `campo2` debe ser múltiplo de 100 si `campo4 == VALOR2`

**Validaciones de negocio (delegadas a capa aplicación):**
- ✅ Recurso relacionado existe (ej: tutor existe)
- ✅ Horario disponible (no hay conflictos)
- ✅ Usuario tiene saldo suficiente (si aplica)

---

## 📤 Response Specification

### Response Exitoso (Happy Path)

**HTTP Status:** `200 OK` (GET, PUT, PATCH) | `201 Created` (POST) | `204 No Content` (DELETE)

**Headers:**
```http
Content-Type: application/json; charset=utf-8
Location: /api/v1/recurso/{id} (solo en 201 Created)
X-Request-ID: {UUID} (mismo del request)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
Cache-Control: no-cache (o max-age=300 si cacheable)
ETag: "version_hash" (para optimistic locking)
```

**Body (201 Created o 200 OK):**
```json
{
  "id": "uuid-generado",
  "campo1": "valor",
  "campo2": 12345,
  "estado": "ESTADO_ENUM",
  "fechaCreacion": "2025-11-08T10:30:00Z",
  "fechaActualizacion": "2025-11-08T10:30:00Z",
  "version": 1,
  "_links": {
    "self": {
      "href": "/api/v1/recurso/uuid-generado"
    },
    "relacionado": {
      "href": "/api/v1/otro-recurso/id"
    },
    "acciones": [
      {
        "rel": "cancelar",
        "href": "/api/v1/recurso/uuid-generado/cancelar",
        "method": "POST"
      }
    ]
  }
}
```

**Body (Listado paginado):**
```json
{
  "content": [
    { "id": "1", "campo": "valor1" },
    { "id": "2", "campo": "valor2" }
  ],
  "page": {
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "number": 0
  },
  "_links": {
    "self": { "href": "/api/v1/recurso?page=0&size=20" },
    "first": { "href": "/api/v1/recurso?page=0&size=20" },
    "next": { "href": "/api/v1/recurso?page=1&size=20" },
    "last": { "href": "/api/v1/recurso?page=7&size=20" }
  }
}
```

### Responses de Error

**400 Bad Request — Validación de entrada**
```json
{
  "error": {
    "codigo": "ERR_VALIDATION",
    "mensaje": "Error de validación en los datos enviados",
    "timestamp": "2025-11-08T10:30:00Z",
    "path": "/api/v1/recurso",
    "detalles": [
      {
        "campo": "campo1",
        "valorRecibido": "",
        "mensaje": "Campo1 es obligatorio y debe tener entre 3 y 100 caracteres"
      },
      {
        "campo": "campo3",
        "valorRecibido": "2024-01-01T00:00:00Z",
        "mensaje": "Campo3 debe ser una fecha en el futuro"
      }
    ]
  }
}
```

**404 Not Found — Recurso no existe**
```json
{
  "error": {
    "codigo": "ERR_NOT_FOUND",
    "mensaje": "El recurso solicitado no existe",
    "recursoId": "uuid-inexistente",
    "recursoTipo": "Reserva",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**409 Conflict — Conflicto de negocio**
```json
{
  "error": {
    "codigo": "ERR_CONFLICT_001",
    "mensaje": "Ya existe una reserva en este horario",
    "detalles": {
      "reservaExistenteId": "uuid-conflicto",
      "horario": "2025-11-10T14:00:00Z"
    },
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**422 Unprocessable Entity — Regla de negocio violada**
```json
{
  "error": {
    "codigo": "ERR_BUSINESS_001",
    "mensaje": "No se puede cancelar una reserva con menos de 24 horas de anticipación",
    "regla": "CANCELACION_24H",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "codigo": "ERR_INTERNAL",
    "mensaje": "Error inesperado en el servidor. Contacta a soporte con el requestId.",
    "requestId": "uuid-para-tracking",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**503 Service Unavailable — Servicio externo caído**
```json
{
  "error": {
    "codigo": "ERR_SERVICE_UNAVAILABLE",
    "mensaje": "Servicio de pagos temporalmente no disponible. Intenta nuevamente.",
    "servicioExterno": "Stripe API",
    "reintentarEn": 60,
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

---

## 🔄 Flujo de Procesamiento

### Diagrama de Secuencia

```
Cliente → API Gateway → Controller → Validator → Use Case → Repository → Database
                           ↓            ↓           ↓           ↓
                       Rate Limit   Validations  Business   Query/
                       + Auth       Input        Logic      Persist
```

### Pasos Detallados

1. **Request llega a API Gateway:**
   - ✅ Rate limiting check (Redis)
   - ✅ JWT validation (verificar firma + expiration)
   - ✅ Request ID generado (si no viene)

2. **Controller recibe request:**
   - ✅ Binding de JSON a DTO
   - ✅ Validaciones Bean Validation (`@Valid`)
   - ✅ Autorización (`@PreAuthorize`)

3. **Use Case ejecuta lógica:**
   - ✅ Validaciones de negocio complejas
   - ✅ Orquestación de servicios (repositories, external APIs)
   - ✅ Transaccionalidad (`@Transactional`)

4. **Repository persiste/recupera:**
   - ✅ Query a base de datos (con optimizaciones)
   - ✅ Mapeo entidad → dominio
   - ✅ Cache update/invalidation (Redis)

5. **Response construction:**
   - ✅ Mapeo dominio → DTO
   - ✅ HATEOAS links agregados
   - ✅ Headers de respuesta (ETag, Cache-Control)

6. **Logging y Auditoría:**
   - ✅ Log estructurado (JSON) con requestId
   - ✅ Evento de auditoría persistido
   - ✅ Métricas enviadas (APM)

---

## ✅ Criterios de Aceptación API

### Escenario 1: Request válido con autenticación correcta
```gherkin
Given un usuario autenticado con token JWT válido
  And el token tiene el rol "ROLE_ESTUDIANTE"
When se envía [MÉTODO] /api/v1/[recurso] con payload válido
Then el sistema retorna HTTP 201 Created (o 200 OK)
  And el body contiene el recurso creado con ID generado
  And el header Location apunta al nuevo recurso
  And el recurso está persistido en la base de datos
  And se envió evento de auditoría "RECURSO_CREADO"
  And el cache fue actualizado con el nuevo recurso
```

### Escenario 2: Request con validación fallida
```gherkin
Given un usuario autenticado
When se envía POST /api/v1/[recurso] con campo1 vacío
Then el sistema retorna HTTP 400 Bad Request
  And el body contiene error con código "ERR_VALIDATION"
  And el mensaje indica "Campo1 es obligatorio"
  And el campo específico está identificado en detalles
  And NO se persistió ningún dato en la base de datos
```

### Escenario 3: Request sin autenticación
```gherkin
Given una petición sin header Authorization
When se envía [MÉTODO] /api/v1/[recurso]
Then el sistema retorna HTTP 401 Unauthorized
  And el body contiene error "Token JWT inválido o ausente"
  And NO se ejecutó la lógica de negocio
```

### Escenario 4: Request con token válido pero sin permisos
```gherkin
Given un usuario autenticado con token válido
  But el usuario tiene rol "ROLE_TUTOR" (no "ROLE_ESTUDIANTE")
When se envía POST /api/v1/reservas (endpoint solo para estudiantes)
Then el sistema retorna HTTP 403 Forbidden
  And el body contiene error "No tienes permisos"
```

### Escenario 5: Rate limit excedido
```gherkin
Given un usuario autenticado
  And ha realizado 100 requests en el último minuto
When intenta hacer request 101
Then el sistema retorna HTTP 429 Too Many Requests
  And el header Retry-After indica segundos para reintentar
  And el contador en Redis no se reinició
```

### Escenario 6: Recurso no encontrado
```gherkin
Given un usuario autenticado
When se envía GET /api/v1/[recurso]/{id_inexistente}
Then el sistema retorna HTTP 404 Not Found
  And el body contiene error "Recurso no existe"
  And el ID buscado está en el mensaje de error
```

### Escenario 7: Servicio externo caído
```gherkin
Given un usuario autenticado
  And el servicio externo X está down
When se envía POST /api/v1/[recurso] (que depende de X)
Then el sistema retorna HTTP 503 Service Unavailable
  And el mensaje indica "Servicio X temporalmente no disponible"
  And el circuit breaker cambió a estado OPEN
  And se envió alerta al equipo de ops
```

---

## 📊 Performance y Monitoreo

### SLA del Endpoint

| Métrica              | Objetivo | Método Medición          |
|----------------------|----------|--------------------------|
| **Latencia p50**     | <100ms   | APM (New Relic/Datadog)  |
| **Latencia p95**     | <300ms   | APM                      |
| **Latencia p99**     | <500ms   | APM                      |
| **Throughput**       | 500 req/s| Load balancer metrics    |
| **Error rate**       | <1%      | APM + logs               |
| **Availability**     | 99.9%    | Uptime monitoring        |

### Queries de Base de Datos

**Query principal:**
```sql
-- Estimación: <50ms con 100K registros
SELECT r.id, r.campo1, r.campo2, r.estado
FROM tabla_recurso r
INNER JOIN tabla_relacionada t ON r.relacionada_id = t.id
WHERE r.usuario_id = ?
  AND r.estado IN ('ACTIVO', 'PENDIENTE')
  AND r.fecha_creacion >= ?
ORDER BY r.fecha_creacion DESC
LIMIT 20 OFFSET ?;
```

**Índices requeridos:**
```sql
CREATE INDEX idx_recurso_usuario_estado ON tabla_recurso(usuario_id, estado, fecha_creacion);
CREATE INDEX idx_recurso_fecha ON tabla_recurso(fecha_creacion) WHERE estado = 'ACTIVO';
```

### Caching Strategy

**Nivel:** Application cache (Redis)

**Key pattern:** `api:v1:[recurso]:[id]:[version]`

**TTL:** 300 segundos (5 minutos) para listados, 3600 segundos (1 hora) para entidades individuales

**Invalidación:**
- On CREATE: Invalida cache de listados
- On UPDATE: Invalida cache de entidad específica + listados
- On DELETE: Invalida cache de entidad + listados

**Ejemplo:**
```java
@Cacheable(value = "recursos", key = "#id", unless = "#result == null")
public RecursoDTO obtenerPorId(Long id) {
    // ...
}

@CacheEvict(value = "recursos", key = "#id")
public void actualizar(Long id, RecursoDTO dto) {
    // ...
}
```

### Logging y Trazabilidad

**Logs estructurados (JSON):**
```json
{
  "timestamp": "2025-11-08T10:30:00Z",
  "level": "INFO",
  "requestId": "uuid-request",
  "userId": "user-123",
  "endpoint": "POST /api/v1/recurso",
  "statusCode": 201,
  "latency": 145,
  "message": "Recurso creado exitosamente"
}
```

**Métricas (Prometheus):**
```
http_requests_total{method="POST", endpoint="/api/v1/recurso", status="201"}
http_request_duration_seconds{method="POST", endpoint="/api/v1/recurso", quantile="0.95"}
```

### Alertas

**Configuración:**
- 🚨 **Critical:** Error rate >5% por 5 minutos → PagerDuty
- ⚠️ **Warning:** Latencia p95 >500ms por 10 minutos → Slack
- ℹ️ **Info:** Servicio externo down → Email

---

## 🧪 Testing del Endpoint

### 1. Test de Contrato API (Contract Testing)

```java
@Test
public void deberiaRetornarSchemaEsperado_CuandoRequestValido() {
    given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + validToken)
        .body(validRequestDTO)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(201)
        .body("id", notNullValue())
        .body("campo1", equalTo("valor_esperado"))
        .body("fechaCreacion", matchesPattern(ISO_8601_REGEX))
        .body("_links.self.href", containsString("/api/v1/recurso/"));
}
```

### 2. Test de Validación

```java
@Test
public void deberiaRetornar400_CuandoCampo1Vacio() {
    RequestDTO invalidRequest = new RequestDTO();
    invalidRequest.setCampo1(""); // Violación de validación
    
    given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + validToken)
        .body(invalidRequest)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(400)
        .body("error.codigo", equalTo("ERR_VALIDATION"))
        .body("error.detalles[0].campo", equalTo("campo1"));
}
```

### 3. Test de Autenticación

```java
@Test
public void deberiaRetornar401_CuandoSinToken() {
    given()
        .contentType(ContentType.JSON)
        .body(validRequestDTO)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(401);
}

@Test
public void deberiaRetornar403_CuandoRolIncorrecto() {
    String tokenRolIncorrecto = generarTokenConRol("ROLE_WRONG");
    
    given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + tokenRolIncorrecto)
        .body(validRequestDTO)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(403);
}
```

### 4. Test de Performance

```java
@Test
public void deberiaResponderEn300ms_Con100Requests() {
    long startTime = System.currentTimeMillis();
    
    IntStream.range(0, 100).parallel().forEach(i -> {
        given()
            .header("Authorization", "Bearer " + validToken)
        .when()
            .get("/api/v1/recurso/" + i)
        .then()
            .statusCode(anyOf(is(200), is(404)));
    });
    
    long duration = System.currentTimeMillis() - startTime;
    assertTrue(duration / 100 < 300, "Promedio debe ser <300ms");
}
```

### 5. Test de Idempotencia (para POST/PUT)

```java
@Test
public void deberiaSer idempotente_CuandoMismoRequestDosVeces() {
    String idempotencyKey = UUID.randomUUID().toString();
    
    Response response1 = given()
        .header("Authorization", "Bearer " + validToken)
        .header("X-Idempotency-Key", idempotencyKey)
        .body(validRequestDTO)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(201)
        .extract().response();
    
    Response response2 = given()
        .header("Authorization", "Bearer " + validToken)
        .header("X-Idempotency-Key", idempotencyKey)
        .body(validRequestDTO)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(200) // Segunda llamada retorna existing
        .extract().response();
    
    assertEquals(response1.jsonPath().getString("id"), 
                 response2.jsonPath().getString("id"));
}
```

---

## 📚 Documentación OpenAPI (Swagger)

```yaml
/api/v1/recurso:
  post:
    summary: Crear nuevo recurso
    description: |
      Crea un nuevo recurso en el sistema. Requiere autenticación 
      y rol ROLE_ESTUDIANTE.
    tags:
      - Recursos
    security:
      - bearerAuth: []
    parameters:
      - in: header
        name: X-Request-ID
        schema:
          type: string
          format: uuid
        required: false
        description: UUID para trazabilidad de request
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RecursoCreateDTO'
          examples:
            ejemplo_valido:
              summary: Request válido
              value:
                campo1: "valor_ejemplo"
                campo2: 12345
                campo3: "2025-11-08T10:30:00Z"
    responses:
      '201':
        description: Recurso creado exitosamente
        headers:
          Location:
            schema:
              type: string
            description: URL del recurso creado
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecursoResponseDTO'
      '400':
        description: Error de validación
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '401':
        description: No autenticado
      '403':
        description: Sin permisos
      '422':
        description: Regla de negocio violada
      '429':
        description: Rate limit excedido
      '500':
        description: Error interno del servidor

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    RecursoCreateDTO:
      type: object
      required:
        - campo1
        - campo2
      properties:
        campo1:
          type: string
          minLength: 3
          maxLength: 100
        campo2:
          type: integer
          minimum: 1
          maximum: 1000000
    RecursoResponseDTO:
      type: object
      properties:
        id:
          type: string
          format: uuid
        campo1:
          type: string
        campo2:
          type: integer
        estado:
          type: string
          enum: [ACTIVO, INACTIVO, PENDIENTE]
        fechaCreacion:
          type: string
          format: date-time
        _links:
          type: object
          properties:
            self:
              type: object
              properties:
                href:
                  type: string
```

---

## 🔗 Dependencias

**Depende de:**
- [HUT-XXX-UC-01](./HUT-XXX-UC-01-*.md) — Caso de uso que implementa lógica
- [HUT-XXX-DOM-01](./HUT-XXX-DOM-01-*.md) — Entidad del dominio

**Bloquea a:**
- Frontend: Componente UI que consume este endpoint
- Mobile: Pantalla de la app móvil

---

## 📊 Estimación

**Story Points Técnicos:** `[1|2|3|5]` SP

**Desglose:**
- Implementación controller: [X] horas
- Validaciones DTO: [Y] horas
- Tests E2E: [Z] horas
- Documentación OpenAPI: [W] horas

---

## ✅ Definition of Done

- [ ] Endpoint implementado según especificación
- [ ] Validaciones de entrada funcionando
- [ ] Autenticación y autorización configuradas
- [ ] Rate limiting aplicado
- [ ] Tests E2E con RestAssured
- [ ] Documentación OpenAPI/Swagger actualizada
- [ ] Logs estructurados con requestId
- [ ] Métricas enviadas a APM
- [ ] Code review aprobado
- [ ] CI/CD pipeline pasando

---

**Generado por:** Technical User Stories Architect v1.0  
**Tipo:** HUT-API Specialization
