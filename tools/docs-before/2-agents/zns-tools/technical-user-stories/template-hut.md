# HUT-[HU_ID]-[TIPO]-[SECUENCIA]: [Título Técnico]

> **Tipo:** `[API|UC|DOM|INFRA|SEC|PERF|TEST]`  
> **HU Origen:** [HU-XXX](../../05-deliverables/hus/[modulo]/HU-XXX-*.md) — [Título HU Negocio]  
> **Módulo:** [Nombre del módulo]  
> **Sprint:** [Número de sprint estimado]  
> **Fecha Creación:** [YYYY-MM-DD]

---

## 🎯 Historia Técnica

**Como** [rol técnico: Desarrollador Backend/Frontend/DevOps/QA],  
**Quiero** [capacidad técnica específica],  
**Para** [objetivo técnico que habilita funcionalidad de negocio].

---

## 💼 Valor Técnico

**Impacto en arquitectura:**
- [Describe cómo esta HUT contribuye a la arquitectura del sistema]
- [Qué problema técnico resuelve]
- [Qué riesgos mitiga]

**Habilitador de negocio:**
- [Explica cómo esta implementación técnica habilita la HU de negocio]
- [Qué capacidad de negocio desbloquea]

**Beneficios:**
- ✅ [Beneficio 1: ej. Desacoplamiento entre capas]
- ✅ [Beneficio 2: ej. Testeabilidad mejorada]
- ✅ [Beneficio 3: ej. Performance optimizada]

---

## 📋 Especificaciones Técnicas

### Capa Arquitectónica
```
[X] Presentación (API/UI)
[X] Aplicación (Use Cases)
[X] Dominio (Entities + Business Logic)
[X] Infraestructura (Adapters)
```

### Componentes Involucrados

**Entidades/Modelos:**
```java
// Ejemplo: Entidad principal
@Entity
@Table(name = "nombre_tabla")
public class NombreEntidad {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Atributos con tipos específicos
    @Column(nullable = false, length = 100)
    private String atributo1;
    
    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;
    
    // Relaciones
    @ManyToOne
    @JoinColumn(name = "relacion_id")
    private EntidadRelacionada relacion;
    
    // Métodos de negocio (si aplica)
    public void metodoNegocio() {
        // Lógica de dominio
    }
}
```

**Contratos API (Request/Response):**
```json
// Request DTO
{
  "campo1": "string",
  "campo2": 123,
  "campo3": {
    "subcampo1": "valor",
    "subcampo2": ["array", "values"]
  }
}

// Response DTO (Success)
{
  "id": "uuid",
  "campo1": "string",
  "estado": "ESTADO_ENUM",
  "fechaCreacion": "2025-11-08T10:30:00Z",
  "_links": {
    "self": "/api/v1/recurso/id",
    "relacionado": "/api/v1/otro-recurso/id"
  }
}

// Response DTO (Error)
{
  "error": {
    "codigo": "ERR_VALIDATION_001",
    "mensaje": "Mensaje descriptivo del error",
    "campo": "nombreCampo",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**Endpoints API (si HUT-API):**
```
POST   /api/v1/[recurso]                  - Crear recurso
GET    /api/v1/[recurso]/{id}             - Obtener por ID
GET    /api/v1/[recurso]?filtro=valor     - Listar con filtros
PUT    /api/v1/[recurso]/{id}             - Actualizar completo
PATCH  /api/v1/[recurso]/{id}             - Actualizar parcial
DELETE /api/v1/[recurso]/{id}             - Eliminar
```

**Headers requeridos:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
X-API-Version: v1
X-Request-ID: {UUID} (para trazabilidad)
```

**Códigos HTTP esperados:**
```
200 OK                  - Operación exitosa (GET, PUT, PATCH)
201 Created             - Recurso creado exitosamente (POST)
204 No Content          - Operación exitosa sin contenido (DELETE)
400 Bad Request         - Error validación datos entrada
401 Unauthorized        - Token inválido o ausente
403 Forbidden           - Sin permisos para esta operación
404 Not Found           - Recurso no existe
409 Conflict            - Conflicto (ej: recurso duplicado)
422 Unprocessable       - Regla de negocio violada
500 Internal Error      - Error inesperado servidor
503 Service Unavailable - Servicio externo no disponible
```

### Lógica de Negocio / Algoritmos

**Reglas de validación:**
1. [Regla 1: ej. Campo X es obligatorio si campo Y == "VALOR"]
2. [Regla 2: ej. Fecha inicio debe ser anterior a fecha fin]
3. [Regla 3: ej. Precio debe estar entre $MIN y $MAX]

**Algoritmos clave:**
```java
// Pseudocódigo o código real del algoritmo principal
public ResultadoDTO ejecutarAlgoritmo(InputDTO input) {
    // Paso 1: Validaciones
    validarInput(input);
    
    // Paso 2: Lógica principal
    Entidad entidad = new Entidad();
    entidad.setAtributo1(input.getCampo1());
    
    // Paso 3: Aplicar reglas de negocio
    if (condicion) {
        entidad.aplicarRegla();
    }
    
    // Paso 4: Persistir/Recuperar
    repositorio.guardar(entidad);
    
    // Paso 5: Retornar resultado
    return mapearADTO(entidad);
}
```

**Transaccionalidad:**
```
@Transactional(isolation = Isolation.[NIVEL])
- Nivel aislamiento: READ_COMMITTED / REPEATABLE_READ / SERIALIZABLE
- Propagación: REQUIRED / REQUIRES_NEW / NESTED
- Rollback en excepciones: [Sí/No]
- Timeout: [X segundos]
```

### Base de Datos (si HUT-INFRA)

**Tablas involucradas:**
```sql
-- DDL completo de tabla(s) nueva(s)
CREATE TABLE nombre_tabla (
    id BIGSERIAL PRIMARY KEY,
    campo1 VARCHAR(100) NOT NULL,
    campo2 INTEGER CHECK (campo2 > 0),
    campo3 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    campo4_enum VARCHAR(20) CHECK (campo4_enum IN ('VALOR1', 'VALOR2')),
    relacion_id BIGINT REFERENCES tabla_relacionada(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT uk_campo_unico UNIQUE (campo1),
    CONSTRAINT chk_validacion CHECK (condicion)
);

-- Índices para performance
CREATE INDEX idx_campo1 ON nombre_tabla(campo1);
CREATE INDEX idx_compuesto ON nombre_tabla(campo2, campo3);
```

**Migraciones:**
```
- Flyway/Liquibase script: V[VERSION]__[descripcion].sql
- Version: [ej. V1.2.001]
- Rollback script: U[VERSION]__[descripcion].sql (si necesario)
```

**Queries principales:**
```sql
-- Query 1: [Descripción]
SELECT 
    t1.campo1,
    t2.campo2,
    COUNT(*) as total
FROM tabla1 t1
INNER JOIN tabla2 t2 ON t1.id = t2.tabla1_id
WHERE t1.condicion = ?
GROUP BY t1.campo1, t2.campo2
HAVING COUNT(*) > 5
ORDER BY total DESC
LIMIT 20;

-- Query 2: [Descripción]
-- [Incluir queries críticas con performance esperado]
```

**Estimación performance:**
- Volumen datos esperado: [ej. 100K registros primer año]
- Tiempo respuesta objetivo: [ej. <200ms en p95]
- Índices requeridos: [listar índices críticos]

### Integraciones Externas (si HUT-INFRA)

**Servicio:** [Nombre del servicio: Stripe, SendGrid, DIAN, etc.]

**Endpoint externo:**
```
POST https://api.servicio.com/v1/recurso
```

**Autenticación:**
```
Tipo: [API Key | OAuth 2.0 | JWT | Basic Auth]
Header: Authorization: Bearer {TOKEN}
Secrets management: [AWS Secrets Manager | Vault | Environment vars]
```

**Payload request:**
```json
{
  "campo1": "valor",
  "campo2": 123,
  "metadatos": {
    "idempotency_key": "uuid",
    "origen": "MITOGA_PLATFORM"
  }
}
```

**Payload response exitoso:**
```json
{
  "id": "ext_id_123",
  "estado": "SUCCESS",
  "datos": { ... }
}
```

**Manejo de errores:**
| Código HTTP | Acción                                    |
|-------------|-------------------------------------------|
| 400         | Validar input, loggear, retornar error    |
| 401/403     | Refrescar token, reintentar 1 vez        |
| 429         | Aplicar backoff exponencial (max 3 retry)|
| 500/503     | Circuit breaker, fallback, alertar       |

**Timeouts y reintentos:**
```
Connection timeout: 5 segundos
Read timeout: 30 segundos
Max reintentos: 3
Backoff strategy: Exponencial (1s, 2s, 4s)
Circuit breaker: Open después de 5 fallos consecutivos
```

**Idempotencia:**
```
Clave idempotencia: [Campo/Header usado]
TTL cache: [Tiempo de retención]
Estrategia duplicados: [Ignorar | Retornar cached response]
```

### Seguridad (si HUT-SEC)

**Autenticación:**
```
Método: [JWT | OAuth 2.0 | API Key]
Token location: [Header Authorization | Cookie]
Token expiration: [15 minutos access, 7 días refresh]
Refresh strategy: [Rotación automática | Manual]
```

**Autorización:**
```java
@PreAuthorize("hasRole('ROLE_ESTUDIANTE') or hasRole('ROLE_TUTOR')")
@PreAuthorize("hasAuthority('PERM_CREAR_RESERVA')")
@PreAuthorize("@securityService.canAccessReserva(#reservaId)")
```

**Validaciones de entrada:**
```java
@Valid
public class RequestDTO {
    @NotNull(message = "Campo obligatorio")
    @Size(min = 3, max = 100)
    @Pattern(regexp = "regex", message = "Formato inválido")
    private String campo;
    
    @Email
    private String email;
    
    @Min(value = 0)
    @Max(value = 1000000)
    private BigDecimal precio;
}
```

**Cifrado datos sensibles:**
```
Algoritmo: AES-256-GCM
Key management: AWS KMS / HashiCorp Vault
Campos cifrados: [tarjeta_token, documento_identidad, etc.]
```

**Auditoría:**
```
Evento: [CREAR_RESERVA | PROCESAR_PAGO | etc.]
Datos loggeados: userId, timestamp, IP, action, metadata
Retention: 5 años (compliance DIAN)
Storage: [Base datos | ElasticSearch | S3]
```

**Rate Limiting:**
```
Límite: 100 requests/minuto por usuario
Storage: Redis (TTL 60 segundos)
Response: 429 Too Many Requests + Retry-After header
```

### Performance (si HUT-PERF)

**Optimizaciones aplicadas:**
- ✅ [Ej: Caching en Redis con TTL 5 minutos]
- ✅ [Ej: Lazy loading de relaciones N+1]
- ✅ [Ej: Índice compuesto en (campo1, campo2)]
- ✅ [Ej: Paginación con cursor-based (más escalable que offset)]

**Benchmarks esperados:**
| Métrica           | Objetivo  | Método medición        |
|-------------------|-----------|------------------------|
| Latencia (p50)    | <100ms    | APM (New Relic/Dynatrace) |
| Latencia (p95)    | <300ms    | APM                    |
| Latencia (p99)    | <500ms    | APM                    |
| Throughput        | 500 req/s | Load test (JMeter)     |
| CPU uso           | <70%      | Metrics server         |
| Memoria uso       | <80%      | Metrics server         |
| DB query time     | <50ms     | Slow query log         |

**Caching strategy:**
```
Capa: [Application | Database | CDN]
Storage: Redis Cluster
Key pattern: [modulo]:[entidad]:[id]:[version]
TTL: [300 segundos para listados, 3600 para entidades]
Invalidación: [On update/delete | TTL based | Manual flush]
```

### Testing (si HUT-TEST)

**Cobertura esperada:**
```
Unit tests (dominio):      >80%
Integration tests (repos): >70%
E2E tests (API):           >60%
Performance tests:         Escenarios críticos
```

**Casos de prueba:**

**1. Tests Unitarios (Dominio)**
```java
@Test
public void deberiaValidarReglaNegocio_CuandoCondicion() {
    // Given
    Entidad entidad = new Entidad();
    entidad.setAtributo("valor");
    
    // When
    boolean resultado = entidad.validarRegla();
    
    // Then
    assertTrue(resultado);
}
```

**2. Tests de Integración (Repositorio)**
```java
@SpringBootTest
@Testcontainers
public class RepositorioIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");
    
    @Test
    public void deberiaGuardarYRecuperar() {
        // Test con base de datos real (Testcontainers)
    }
}
```

**3. Tests E2E (API)**
```java
@Test
public void POST_recurso_deberiaRetornar201_CuandoDatosValidos() {
    given()
        .contentType(ContentType.JSON)
        .header("Authorization", "Bearer " + token)
        .body(requestDTO)
    .when()
        .post("/api/v1/recurso")
    .then()
        .statusCode(201)
        .body("id", notNullValue())
        .body("campo1", equalTo("valor_esperado"));
}
```

**4. Tests de Performance**
```java
@Test
public void deberiaResponderEn300ms_Con100ConcurrentUsers() {
    // Usar Gatling o JMeter
    // Configurar 100 usuarios virtuales
    // Enviar 1000 requests en 30 segundos
    // Validar p95 < 300ms
}
```

---

## ✅ Criterios de Aceptación Técnicos

### Escenario 1: [Happy Path - Flujo exitoso]
```gherkin
Given [contexto técnico: base datos con datos X, servicios externos disponibles]
When [acción técnica: se ejecuta método/endpoint con parámetros válidos]
Then [resultado técnico esperado: respuesta con código Y, datos persistidos, eventos emitidos]
```

**Validaciones específicas:**
- ✅ [Validación 1: ej. Registro insertado en tabla con ID generado]
- ✅ [Validación 2: ej. Cache actualizado con key correcta]
- ✅ [Validación 3: ej. Email enviado a cola con payload esperado]

### Escenario 2: [Validación de errores]
```gherkin
Given [contexto con datos inválidos o estado inconsistente]
When [se intenta ejecutar operación]
Then [sistema retorna error específico con código y mensaje claro]
  And [no se persisten datos parciales (rollback)]
  And [evento de error loggeado para auditoría]
```

**Códigos de error esperados:**
- ❌ `ERR_VALIDATION_001`: [Descripción error]
- ❌ `ERR_BUSINESS_002`: [Descripción error]
- ❌ `ERR_EXTERNAL_003`: [Descripción error]

### Escenario 3: [Edge cases y límites]
```gherkin
Given [condiciones límite: volumen grande, timeout, concurrencia]
When [se ejecuta operación bajo estrés]
Then [sistema mantiene performance dentro de SLA]
  And [no hay memory leaks o deadlocks]
  And [circuit breaker funciona correctamente]
```

### Escenario 4: [Seguridad]
```gherkin
Given [usuario sin permisos o token inválido]
When [intenta acceder recurso protegido]
Then [sistema retorna 401/403 sin exponer información sensible]
  And [intento loggeado en auditoría]
  And [rate limiter aplica si múltiples intentos]
```

---

## 🔗 Trazabilidad y Dependencias

### Origen en Negocio
| Elemento                | Referencia |
|-------------------------|------------|
| **HU de Negocio**       | [HU-XXX](../../05-deliverables/hus/modulo/HU-XXX-*.md) |
| **Escenario Gherkin**   | Escenario 2, 3 de HU-XXX |
| **Requisito Funcional** | RF-XXX ([link](../../01-context-consolidated/02-requisitos-funcionales.md#rf-xxx)) |
| **RNF aplicables**      | RNF-SEC-001, RNF-PERF-003 ([link](../../01-context-consolidated/03-requisitos-no-funcionales.md)) |

### Dependencias Técnicas

**Depende de (Bloqueantes):**
- [HUT-YYY-DOM-01](./HUT-YYY-DOM-01-*.md) — [Razón: necesita entidad X creada]
- [HUT-ZZZ-INFRA-01](./HUT-ZZZ-INFRA-01-*.md) — [Razón: requiere repositorio Y implementado]

**Bloquea a:**
- [HUT-AAA-UC-01](./HUT-AAA-UC-01-*.md) — [Razón: caso de uso depende de este servicio]
- [HUT-BBB-API-01](./HUT-BBB-API-01-*.md) — [Razón: endpoint consume esta lógica]

**Relacionada con (No bloqueante):**
- [HUT-CCC-SEC-01](./HUT-CCC-SEC-01-*.md) — [Comparte estrategia de autenticación]
- [HUT-DDD-PERF-01](./HUT-DDD-PERF-01-*.md) — [Usa misma cache strategy]

### Librerías y Frameworks Necesarios

**Backend (Java/Spring):**
```xml
<!-- pom.xml dependencies -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
<!-- Otras dependencias específicas -->
```

**Versiones:**
- Spring Boot: 3.2.x
- Java: 17+
- [Otras librerías con versiones específicas]

---

## 📊 Estimación

### Story Points Técnicos
**Puntos:** `[1 | 2 | 3 | 5]` SP

**Justificación:**
- **Complejidad técnica:** [Baja | Media | Alta]
- **Incertidumbre:** [Baja | Media | Alta]
- **Esfuerzo estimado:** [0.5 | 1 | 2 | 3] días desarrollador

**Desglose:**
- Desarrollo: [X] horas
- Testing: [Y] horas
- Code review: [Z] horas
- Documentación: [W] horas

### Capacidad Necesaria
- **Rol:** [Backend Dev | Frontend Dev | DevOps | QA]
- **Seniority:** [Junior | Mid | Senior]
- **Skills requeridos:** [Spring Boot, PostgreSQL, Redis, etc.]

---

## ✅ Definition of Done Técnico

### Código
- [ ] Código implementado siguiendo Clean Architecture
- [ ] Patrones de diseño aplicados correctamente
- [ ] Sin code smells (SonarQube quality gate pass)
- [ ] Sin vulnerabilidades críticas (Snyk/Dependabot)
- [ ] Code coverage >80% para capa dominio, >70% casos uso

### Testing
- [ ] Tests unitarios escritos y pasando (JUnit 5)
- [ ] Tests de integración con Testcontainers (si aplica)
- [ ] Tests E2E para endpoints API (RestAssured)
- [ ] Performance tests ejecutados (si HUT-PERF)
- [ ] Security tests para endpoints protegidos

### Documentación
- [ ] Javadoc en clases y métodos públicos
- [ ] README técnico actualizado
- [ ] OpenAPI/Swagger actualizado (si endpoint)
- [ ] Diagramas UML actualizados (si cambio arquitectónico)
- [ ] Runbook/troubleshooting documentado

### Code Review
- [ ] Pull Request creado con descripción completa
- [ ] Al menos 1 aprobación de desarrollador senior
- [ ] Comentarios resueltos
- [ ] CI/CD pipeline pasando (build + tests + quality gates)

### Deployment
- [ ] Migraciones de base de datos ejecutadas en staging
- [ ] Variables de entorno configuradas
- [ ] Feature flag configurado (si release gradual)
- [ ] Monitoreo/alertas configuradas (APM, logs)
- [ ] Rollback plan documentado

### Integración
- [ ] Contratos API versionados
- [ ] Dependencias actualizadas en service registry
- [ ] Tests de contrato con consumidores (si API pública)
- [ ] Backward compatibility verificada

---

## ⚠️ Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| [Ej: Timeout API externa] | Media | Alto | Implementar circuit breaker + cache |
| [Ej: Migración DB lenta] | Baja | Medio | Ejecutar fuera de horario pico |
| [Ej: Memory leak en procesamiento batch] | Baja | Alto | Profiling con VisualVM, tests carga |

---

## 📝 Notas Adicionales

### Consideraciones de Implementación
- [Nota 1: ej. Considerar usar virtual threads (Java 21) para operaciones I/O intensivas]
- [Nota 2: ej. Evaluar migración futura a event-driven con Kafka]

### Mejoras Futuras (Out of Scope)
- [Mejora 1: ej. Implementar CQRS completo con event sourcing]
- [Mejora 2: ej. Cache distribuido con Redis Cluster en múltiples regiones]

### Preguntas Abiertas
- ❓ [Pregunta 1: ¿Usar PostgreSQL JSONB o tabla normalizada para metadata flexible?]
- ❓ [Pregunta 2: ¿Timeout apropiado para servicio X considerando latencia internacional?]

---

## 📚 Referencias Técnicas

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Stripe API Reference](https://stripe.com/docs/api) (si aplica)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## 🏷️ Etiquetas

`#backend` `#spring-boot` `#postgresql` `#[tipo-hut]` `#[modulo]` `#sprint-X`

---

**Generado por:** Technical User Stories Architect v1.0  
**Fecha creación:** [YYYY-MM-DD]  
**Última actualización:** [YYYY-MM-DD]  
**Autor:** [Nombre del arquitecto técnico]
