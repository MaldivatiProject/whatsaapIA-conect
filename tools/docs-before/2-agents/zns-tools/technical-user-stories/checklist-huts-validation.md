# ✅ CHECKLIST: VALIDACIÓN DE HISTORIAS DE USUARIO TÉCNICAS (HUTs)

> **Propósito:** Asegurar calidad, completitud e implementabilidad del backlog técnico  
> **Aplica a:** Todas las HUTs generadas antes de comenzar desarrollo  
> **Responsable:** Technical Lead + Arquitecto de Software  
> **Frecuencia:** Por cada HU de negocio descompuesta en HUTs

---

## 📋 ÍNDICE DE VALIDACIONES

1. [Completitud Funcional](#1-completitud-funcional)
2. [Arquitectura y Diseño](#2-arquitectura-y-diseño)
3. [Especificaciones Técnicas](#3-especificaciones-técnicas)
4. [Testeabilidad](#4-testeabilidad)
5. [Dependencias y Secuenciamiento](#5-dependencias-y-secuenciamiento)
6. [Estimación y Granularidad](#6-estimación-y-granularidad)
7. [Seguridad y Compliance](#7-seguridad-y-compliance)
8. [Performance y Escalabilidad](#8-performance-y-escalabilidad)
9. [Documentación](#9-documentación)
10. [Trazabilidad](#10-trazabilidad)

---

## 1. COMPLETITUD FUNCIONAL

### 1.1 Cobertura de la HU de Negocio

**Validar que:**

- [ ] **Todos los escenarios Gherkin** de la HU de negocio tienen contrapartes técnicas en las HUTs
- [ ] **100% de la funcionalidad** de negocio está cubierta (no hay gaps)
- [ ] **Flujos alternativos** y **manejo de errores** están implementados en HUTs
- [ ] **Edge cases** identificados en HU de negocio tienen HUTs correspondientes

**Método de verificación:**
```
Crear matriz de trazabilidad:
┌────────────────────┬─────────────────────────────────┐
│ Escenario HU-XXX   │ HUTs que implementan            │
├────────────────────┼─────────────────────────────────┤
│ Escenario 1        │ HUT-XXX-API-01, HUT-XXX-UC-01   │
│ Escenario 2        │ HUT-XXX-UC-01, HUT-XXX-INFRA-01 │
│ Escenario 3 (error)│ HUT-XXX-API-01 (validación)     │
└────────────────────┴─────────────────────────────────┘

Verificar que no hay escenarios sin HUTs asignadas.
```

### 1.2 Tipos de HUTs Necesarios

**Verificar presencia de:**

- [ ] **HUT-DOM:** Si la HU requiere nuevas entidades o lógica de dominio
- [ ] **HUT-INFRA:** Si requiere persistencia, integraciones externas, o servicios técnicos
- [ ] **HUT-UC:** Para orquestar la lógica de negocio
- [ ] **HUT-API:** Para exponer funcionalidad a clientes (frontend, mobile, externos)
- [ ] **HUT-SEC:** Si hay requisitos de seguridad específicos (auth, cifrado, auditoría)
- [ ] **HUT-PERF:** Si hay requisitos de performance críticos (caching, índices, optimizaciones)
- [ ] **HUT-TEST:** Para estrategia de testing completa

**Ratio esperado por complejidad de HU:**
| Complejidad HU | HUTs mínimas | Distribución típica |
|----------------|--------------|---------------------|
| Baja (3-5 SP)  | 3-5 HUTs     | 1 DOM, 1 INFRA, 1 UC, 1 API, 1 TEST |
| Media (8-13 SP)| 5-8 HUTs     | 2 DOM, 2 INFRA, 2 UC, 1 API, 1 SEC, 1 PERF, 1 TEST |
| Alta (21+ SP)  | 10+ HUTs     | Descomponer HU primero |

---

## 2. ARQUITECTURA Y DISEÑO

### 2.1 Separación de Capas (Clean Architecture)

**Validar que:**

- [ ] **No hay dependencias invertidas:** Dominio NO depende de Infraestructura/API
- [ ] **Capa de Dominio** es pura (sin dependencias a frameworks externos)
- [ ] **Interfaces (Ports)** están definidas en la capa correcta
- [ ] **Adaptadores** implementan las interfaces sin violar encapsulamiento
- [ ] **Casos de Uso** no contienen lógica de persistencia o HTTP

**Diagrama de dependencias esperado:**
```
API/UI ──depends on──> Use Cases ──depends on──> Domain
  ▲                        ▲                         
  │                        │                         
  └───────implements───────┘                         
Infrastructure (Adapters)
```

**Anti-patterns a detectar:**
- ❌ `@RestController` en capa de dominio
- ❌ `EntityManager` o `JdbcTemplate` en casos de uso
- ❌ Lógica de negocio en controllers o repositorios
- ❌ Dependencias circulares entre capas

### 2.2 Patrones de Diseño

**Verificar aplicación correcta de:**

- [ ] **Repository Pattern:** Para acceso a datos (con interface en dominio)
- [ ] **Factory/Builder:** Para creación de objetos complejos
- [ ] **Strategy:** Para algoritmos intercambiables
- [ ] **Adapter:** Para integraciones externas
- [ ] **Observer/Event:** Para comunicación desacoplada entre módulos
- [ ] **Unit of Work:** Para transacciones atómicas
- [ ] **CQRS:** Si hay separación explícita Commands/Queries

**Validar que cada patrón:**
- ✅ Está documentado en la HUT correspondiente
- ✅ Tiene justificación técnica (no over-engineering)
- ✅ Es consistente con el resto del sistema

---

## 3. ESPECIFICACIONES TÉCNICAS

### 3.1 Contratos API (HUT-API)

**Verificar que TODAS las HUT-API incluyen:**

- [ ] **Método HTTP** y **ruta completa** definidos
- [ ] **Request schema** con tipos de datos, validaciones, constraints
- [ ] **Response schema** (success + error) con todos los campos
- [ ] **Códigos HTTP** esperados documentados (200, 201, 400, 401, 404, 422, 500, etc.)
- [ ] **Headers** requeridos (Authorization, Content-Type, etc.)
- [ ] **Query parameters** con tipos, defaults, validaciones
- [ ] **Ejemplos concretos** de request y response (JSON válidos)
- [ ]  **OpenAPI/Swagger** spec incluida o referenciada

**Test de completitud:**
```
¿Un desarrollador frontend puede implementar la llamada 
sin hacer preguntas adicionales? 
  → Sí: ✅ Spec completa
  → No: ❌ Falta detalle
```

### 3.2 Modelos de Datos (HUT-DOM, HUT-INFRA)

**Verificar que TODAS las entidades incluyen:**

- [ ] **Atributos completos** con tipos de datos precisos
- [ ] **Constraints** de base de datos (NOT NULL, UNIQUE, CHECK, etc.)
- [ ] **Relaciones** (FK, cardinalidad, cascade rules)
- [ ] **Índices** requeridos para queries frecuentes
- [ ] **DDL completo** (CREATE TABLE con todos los detalles)
- [ ] **Campos de auditoría** (created_at, updated_at, created_by, etc.)
- [ ] **Soft delete** (si aplica política de no eliminación física)
- [ ] **Optimistic locking** (campo `version` si concurrencia es crítica)

**Validar contra anti-patterns:**
- ❌ Campos `text` sin límite de caracteres
- ❌ Foreign keys sin `ON DELETE`/`ON UPDATE` claros
- ❌ Falta de índices en columnas de búsqueda frecuente
- ❌ Nombres de columnas ambiguos

### 3.3 Algoritmos y Lógica de Negocio

**Verificar que:**

- [ ] **Pseudocódigo o código real** está incluido para algoritmos complejos
- [ ] **Reglas de validación** están explícitas (not null, ranges, patterns, etc.)
- [ ] **Cálculos** tienen fórmulas matemáticas documentadas (ej: comisión = monto × 0.20)
- [ ] **Casos límite** están cubiertos (división por cero, arrays vacíos, nulls, etc.)
- [ ] **Performance** del algoritmo está analizada (complejidad O(n), O(log n), etc.)

**Ejemplo de especificación completa:**
```java
/**
 * Calcula la comisión de la plataforma.
 * Fórmula: comision = montoTotal × COMISION_PORCENTAJE
 * 
 * @param montoTotal Monto total de la transacción (debe ser > 0)
 * @return Comisión calculada, redondeada a 2 decimales
 * @throws IllegalArgumentException si montoTotal <= 0
 */
public BigDecimal calcularComision(BigDecimal montoTotal) {
    if (montoTotal.compareTo(BigDecimal.ZERO) <= 0) {
        throw new IllegalArgumentException("Monto debe ser positivo");
    }
    return montoTotal
        .multiply(COMISION_PORCENTAJE)
        .setScale(2, RoundingMode.HALF_UP);
}
```

### 3.4 Integraciones Externas (HUT-INFRA)

**Verificar que TODAS las HUT-INFRA de integraciones incluyen:**

- [ ] **Endpoint completo** con protocolo, dominio, path, versión
- [ ] **Método de autenticación** (API Key, OAuth, JWT, etc.) y cómo obtener credenciales
- [ ] **Payload request** con JSON Schema o ejemplo completo
- [ ] **Payload response** (success + error) con todos los campos
- [ ] **Códigos de error** del proveedor y cómo mapearlos internamente
- [ ] **Timeouts** (connection, read, total) configurados
- [ ] **Reintentos** (max attempts, backoff strategy)
- [ ] **Circuit breaker** configurado (threshold, open duration)
- [ ] **Idempotencia** (clave, TTL, storage)
- [ ] **Fallback** (qué hacer cuando el servicio externo falla)
- [ ] **Webhooks** (si el proveedor envía notificaciones) con validación de firma

**Checklist específico para pagos (Stripe, PayU, etc.):**
- [ ] Tokenización de tarjetas (PCI-DSS compliance)
- [ ] Manejo de webhooks de cambios de estado
- [ ] Idempotencia con `idempotency_key`
- [ ] Refunds y chargebacks
- [ ] Reconciliación de transacciones

---

## 4. TESTEABILIDAD

### 4.1 Criterios de Aceptación Técnicos

**Verificar que TODAS las HUTs incluyen:**

- [ ] **Mínimo 3 escenarios** Gherkin técnicos (happy path, error, edge case)
- [ ] **Given-When-Then** completo (contexto técnico, acción, resultado esperado)
- [ ] **Validaciones específicas** verificables automáticamente
- [ ] **Datos de prueba** concretos (no genéricos "con datos válidos")
- [ ] **Mocks/stubs necesarios** identificados

**Ejemplo de criterio MALO:**
```gherkin
Given datos válidos
When se ejecuta la operación
Then funciona correctamente
```
❌ Demasiado vago, no testeable

**Ejemplo de criterio BUENO:**
```gherkin
Given una base de datos con usuario ID=123 en estado ACTIVO
  And el servicio externo Stripe responde con token "tok_12345"
When se ejecuta procesarPago(usuarioId=123, monto=15000, metodoPago="tarjeta")
Then se crea una transacción en DB con estado "COMPLETADA"
  And se llama a Stripe API con monto=15000 y token="tok_12345"
  And se retorna PaymentResponse con transaccionId no nulo
  And el usuario tiene saldo actualizado: saldo_anterior - 15000
```
✅ Específico, verificable automáticamente

### 4.2 Estrategia de Testing

**Verificar que existe HUT-TEST con:**

- [ ] **Cobertura objetivo** por capa (ej: Dominio >80%, UC >70%, API >60%)
- [ ] **Tests unitarios** para lógica de dominio (sin dependencias externas)
- [ ] **Tests de integración** para repositorios (con Testcontainers)
- [ ] **Tests E2E** para APIs (con RestAssured o similar)
- [ ] **Tests de contrato** para integraciones críticas (Pact)
- [ ] **Tests de performance** para operaciones críticas (JMeter/Gatling)
- [ ] **Tests de seguridad** para endpoints protegidos

**Distribución esperada:**
| Tipo Test | % Total Tests | Ejemplos |
|-----------|---------------|----------|
| Unitarios | 70% | Lógica dominio, validaciones, cálculos |
| Integración | 20% | Repositorios, base de datos, cache |
| E2E | 10% | Flujos completos API |

### 4.3 Fixtures y Test Data

**Verificar que:**

- [ ] **Fixtures** están definidos para datos de prueba complejos
- [ ] **Test data** es realista (no "test", "foo", "bar")
- [ ] **Cleanup** está definido (cómo limpiar datos después de tests)
- [ ] **Idempotencia** de tests (pueden ejecutarse múltiples veces sin fallar)

---

## 5. DEPENDENCIAS Y SECUENCIAMIENTO

### 5.1 Dependencias entre HUTs

**Validar que:**

- [ ] **Todas las HUTs** tienen sección "Depende de" y "Bloquea a"
- [ ] **No hay ciclos** en dependencias (A depende de B, B depende de A)
- [ ] **Dependencias son mínimas** (bajo acoplamiento)
- [ ] **Orden de implementación** es claro

**Matriz de dependencias:**
```
      HUT-DOM-01  HUT-INFRA-01  HUT-UC-01  HUT-API-01
DOM      —            —            ✓          —
INFRA    ✓            —            ✓          —
UC       ✓            ✓            —          ✓
API      —            —            ✓          —

Leyenda: ✓ = Depende de (fila depende de columna)
```

**Secuencia recomendada:**
1. ✅ HUT-DOM (entidades, sin dependencias externas)
2. ✅ HUT-INFRA (repositorios, clientes externos)
3. ✅ HUT-UC (casos de uso que orquestan DOM + INFRA)
4. ✅ HUT-API (exponer funcionalidad)
5. ✅ HUT-SEC, HUT-PERF (cross-cutting)
6. ✅ HUT-TEST (verificación completa)

### 5.2 Dependencias Externas

**Verificar que están documentadas:**

- [ ] **Librerías y frameworks** necesarios (con versiones específicas)
- [ ] **Servicios externos** (APIs, bases de datos, colas, cache)
- [ ] **Infraestructura** (AWS S3, Redis, PostgreSQL, etc.)
- [ ] **Permisos y credenciales** requeridos

**Ejemplo:**
```xml
<!-- HUT-XXX-INFRA-01 requiere: -->
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>24.0.0</version>
</dependency>
```

---

## 6. ESTIMACIÓN Y GRANULARIDAD

### 6.1 Story Points Técnicos

**Validar que:**

- [ ] **Todas las HUTs** tienen Story Points asignados (1, 2, 3, 5)
- [ ] **No hay HUTs >5 SP** (descomponer si es mayor)
- [ ] **Justificación** de SP está incluida (complejidad, incertidumbre, esfuerzo)
- [ ] **Ratio HUT/HU** está entre 1.5x-2x (ej: HU 13 SP → HUTs 20-26 SP total)

**Calibración:**
| SP | Esfuerzo | Complejidad | Ejemplo |
|----|----------|-------------|---------|
| 1  | <1 día   | Trivial     | Agregar campo simple a entidad |
| 2  | 1 día    | Baja        | CRUD básico sin lógica compleja |
| 3  | 1.5 días | Media       | Endpoint con validaciones y lógica moderada |
| 5  | 2-3 días | Alta        | Integración externa con retry + circuit breaker |

**Anti-patterns:**
- ❌ Todas las HUTs tienen 5 SP (falta granularidad)
- ❌ HUT con 8 SP (demasiado grande, descomponer)
- ❌ Sin justificación de SP

### 6.2 Definition of Done Técnico

**Verificar que TODAS las HUTs incluyen DoD con:**

- [ ] **Código implementado** (lógica completa)
- [ ] **Tests escritos y pasando** (unit, integration, E2E según aplique)
- [ ] **Code coverage** objetivo alcanzado (ej: >80% dominio)
- [ ] **Code review** aprobado (mínimo 1 reviewer)
- [ ] **CI/CD pipeline** pasando (build, tests, quality gates)
- [ ] **Documentación** actualizada (Javadoc, README, diagramas)
- [ ] **Deployment** exitoso en staging
- [ ] **Smoke tests** ejecutados post-deployment

**DoD específico por tipo:**

**HUT-API:**
- [ ] OpenAPI/Swagger actualizado
- [ ] Tests E2E con RestAssured
- [ ] Validaciones de entrada funcionando
- [ ] Rate limiting configurado

**HUT-INFRA (Database):**
- [ ] Migración ejecutada en staging
- [ ] Rollback script validado
- [ ] Índices creados y performance verificado
- [ ] Queries optimizadas (EXPLAIN ANALYZE)

**HUT-INFRA (Integration):**
- [ ] Circuit breaker configurado y testado
- [ ] Retry logic validado
- [ ] Idempotencia funcionando
- [ ] Webhooks (si aplica) probados

---

## 7. SEGURIDAD Y COMPLIANCE

### 7.1 Autenticación y Autorización

**Verificar que las HUT-SEC incluyen:**

- [ ] **Método de autenticación** especificado (JWT, OAuth, API Key)
- [ ] **Roles y permisos** requeridos documentados
- [ ] **Validación de token** implementada (firma, expiration, blacklist)
- [ ] **Autorización granular** (RBAC, ABAC, ownership)
- [ ] **403 Forbidden** retornado cuando sin permisos (no 404 para evitar info leak)

**Ejemplo:**
```java
@PreAuthorize("hasRole('ROLE_ESTUDIANTE')")
@PreAuthorize("@authService.canAccessReserva(#reservaId, authentication.principal)")
```

### 7.2 Validación de Entrada

**Verificar que:**

- [ ] **Todas las entradas** tienen validaciones (DTO con Bean Validation)
- [ ] **Whitelist approach** (validar lo permitido, no blacklist de lo prohibido)
- [ ] **Tipos de datos** fuertes (no todo String)
- [ ] **Sanitización** de HTML/SQL injection (aunque ORM lo hace, validar)
- [ ] **Tamaño límites** (max length, max file size, etc.)

**Validaciones obligatorias:**
```java
@NotNull(message = "Campo obligatorio")
@Size(min = 3, max = 100)
@Pattern(regexp = "^[a-zA-Z0-9]+$")
@Email
@Min(0) @Max(1000000)
@Past (para fechas de nacimiento)
@Future (para fechas de reserva)
```

### 7.3 Datos Sensibles

**Verificar que:**

- [ ] **Passwords** nunca en plaintext (BCrypt, Argon2)
- [ ] **Tokens/API Keys** cifrados en DB
- [ ] **PII (Personally Identifiable Information)** cifrado at-rest (AES-256)
- [ ] **Datos de pago** tokenizados (PCI-DSS, nunca almacenar CVV completo)
- [ ] **Logs** no contienen datos sensibles (passwords, tokens, full credit cards)

### 7.4 Auditoría

**Verificar que las operaciones críticas tienen:**

- [ ] **Auditoría completa** (quién, qué, cuándo, desde dónde)
- [ ] **Eventos de auditoría** persistidos (tabla `auditoria` o log)
- [ ] **Retención** adecuada (ej: 5 años para transacciones financieras)
- [ ] **Inmutabilidad** (logs de auditoría no pueden ser modificados)

---

## 8. PERFORMANCE Y ESCALABILIDAD

### 8.1 SLA y Benchmarks

**Verificar que las HUT-PERF incluyen:**

- [ ] **Latencia objetivo** por percentil (p50, p95, p99)
- [ ] **Throughput objetivo** (requests/segundo)
- [ ] **Volumen de datos** estimado (registros en tablas)
- [ ] **Benchmarks** con datos realistas (no con 10 registros)

**Ejemplo:**
| Endpoint | p50 | p95 | p99 | Throughput |
|----------|-----|-----|-----|------------|
| GET /reservas | <50ms | <150ms | <300ms | 1000 req/s |
| POST /reservas | <100ms | <300ms | <500ms | 500 req/s |

### 8.2 Optimizaciones

**Verificar que están documentadas:**

- [ ] **Índices de base de datos** en columnas de búsqueda frecuente
- [ ] **Caching strategy** (qué cachear, TTL, invalidación)
- [ ] **Lazy loading** vs Eager loading (para relaciones N+1)
- [ ] **Paginación** (cursor-based mejor que offset para grandes datasets)
- [ ] **Batch processing** (para operaciones en bulk)
- [ ] **Asincronía** (para operaciones no críticas como emails)

**Anti-patterns de performance:**
- ❌ N+1 queries (cargar relaciones en loop)
- ❌ Full table scan sin índices
- ❌ Cargar todos los registros sin paginación
- ❌ Procesamiento síncrono de operaciones lentas

### 8.3 Escalabilidad

**Verificar que:**

- [ ] **Stateless design** (no depender de sesión en memoria)
- [ ] **Horizontal scaling** es posible (sin lock global)
- [ ] **Base de datos** puede crecer (partitioning strategy si aplica)
- [ ] **Rate limiting** para prevenir abuso

---

## 9. DOCUMENTACIÓN

### 9.1 Documentación Técnica

**Verificar que TODAS las HUTs incluyen:**

- [ ] **Historia técnica** (Como-Quiero-Para técnico)
- [ ] **Valor técnico** explicado (por qué es necesaria esta HUT)
- [ ] **Especificaciones completas** (contratos, modelos, algoritmos)
- [ ] **Diagramas** si la complejidad lo requiere (secuencia, clases, ER)
- [ ] **Referencias** a documentación externa (APIs, frameworks)

### 9.2 Código Autodocumentado

**Verificar que:**

- [ ] **Nombres descriptivos** (clases, métodos, variables)
- [ ] **Javadoc** en clases y métodos públicos
- [ ] **Comentarios** solo donde lógica es no obvia (no "// suma a + b")
- [ ] **README técnico** por módulo

**Ejemplo:**
```java
/**
 * Procesa el pago de una reserva.
 * 
 * <p>Este método:
 * <ul>
 *   <li>Valida el método de pago del usuario
 *   <li>Llama a Stripe para tokenizar y cobrar
 *   <li>Calcula la comisión de la plataforma (20%)
 *   <li>Actualiza el estado de la reserva a PAGADA
 *   <li>Envía email de confirmación
 * </ul>
 * 
 * @param reservaId ID de la reserva a pagar
 * @param metodoPagoId ID del método de pago del usuario
 * @return Transacción creada con estado COMPLETADA
 * @throws ReservaNoEncontradaException si la reserva no existe
 * @throws MetodoPagoInvalidoException si el método de pago no es válido
 * @throws PagoRechazadoException si Stripe rechaza el pago
 */
public Transaccion procesarPago(Long reservaId, Long metodoPagoId) {
    // ...
}
```

---

## 10. TRAZABILIDAD

### 10.1 Trazabilidad a Negocio

**Verificar que TODAS las HUTs incluyen:**

- [ ] **Link a HU de negocio** origen
- [ ] **Escenarios Gherkin** de negocio que implementa
- [ ] **Requisitos Funcionales** (RF-XXX) que satisface
- [ ] **RNFs** (Requisitos No Funcionales) que aplican

**Ejemplo:**
```markdown
### Trazabilidad
- **HU Origen:** [HU-021](../../05-deliverables/hus/04-reservas/HU-021-reservar-sesion.md)
- **Escenario:** Escenario 2 "Reservar con tarjeta guardada"
- **RF:** RF-RES-002 (Procesar pago de reserva)
- **RNF:** RNF-SEC-007 (PCI-DSS compliance), RNF-PERF-003 (<2s transacción)
```

### 10.2 Trazabilidad en Código

**Verificar que:**

- [ ] **ID de HUT** mencionado en commits (`git commit -m "HUT-021-API-01: Implementar POST /reservas"`)
- [ ] **Tags** en clases Java (`@HUT("HUT-021-UC-01")` o similar)
- [ ] **Pull Requests** referencian HUT en título/descripción

---

## 📊 SCORING Y RESULTADO FINAL

### Cálculo de Score de Calidad

**Asignar puntos por sección:**

| Sección | Peso | Puntaje (0-10) | Subtotal |
|---------|------|----------------|----------|
| 1. Completitud Funcional | 15% | ___ | ___ |
| 2. Arquitectura y Diseño | 15% | ___ | ___ |
| 3. Especificaciones Técnicas | 20% | ___ | ___ |
| 4. Testeabilidad | 15% | ___ | ___ |
| 5. Dependencias | 5% | ___ | ___ |
| 6. Estimación | 5% | ___ | ___ |
| 7. Seguridad | 10% | ___ | ___ |
| 8. Performance | 10% | ___ | ___ |
| 9. Documentación | 5% | ___ | ___ |
| 10. Trazabilidad | 5% | ___ | ___ |
| **TOTAL** | **100%** | — | **___/10** |

### Criterios de Aceptación del Backlog

**Resultado:**

- ✅ **9.0-10.0:** Excelente — Listo para desarrollo
- ✅ **7.5-8.9:** Bueno — Corregir issues menores y comenzar
- ⚠️ **6.0-7.4:** Aceptable — Requiere mejoras antes de comenzar desarrollo
- ❌ **<6.0:** Insuficiente — Rehacer HUTs con issues críticos

---

## 🔄 PROCESO DE REVISIÓN

### Roles y Responsabilidades

**1. Autor (quien generó las HUTs):**
- ✅ Completar todas las secciones de las HUTs
- ✅ Auto-revisar con este checklist antes de peer review
- ✅ Corregir issues identificados

**2. Technical Lead:**
- ✅ Revisar arquitectura y patrones de diseño
- ✅ Validar estimaciones y secuenciamiento
- ✅ Aprobar o solicitar cambios

**3. Arquitecto de Software:**
- ✅ Revisar decisiones arquitectónicas mayores
- ✅ Validar integración con arquitectura global
- ✅ Aprobar HUTs de módulos críticos

**4. Security Lead (si aplica):**
- ✅ Revisar HUT-SEC y validaciones de seguridad
- ✅ Verificar compliance (PCI-DSS, GDPR, etc.)

**5. DBA (si aplica):**
- ✅ Revisar HUT-INFRA de migraciones de base de datos
- ✅ Validar performance de queries e índices

### Workflow de Aprobación

```
┌─────────────────┐
│ 1. Autor genera │
│    HUTs         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Auto-review  │
│    con checklist│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Peer review  │
│    Tech Lead    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Aprobado  Cambios
    │     requeridos
    │         │
    │         └──> Corregir y volver a paso 3
    │
    ▼
┌─────────────────┐
│ 4. Arquitecto   │
│    aprueba      │
│    (si crítico) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Listo para   │
│    desarrollo   │
└─────────────────┘
```

---

## 📝 PLANTILLA DE REPORTE DE VALIDACIÓN

```markdown
# Reporte de Validación de HUTs

**HU de Negocio:** HU-XXX - [Título]
**Fecha de Validación:** [YYYY-MM-DD]
**Revisor:** [Nombre]
**Rol:** [Technical Lead | Arquitecto]

## HUTs Revisadas
- [ ] HUT-XXX-DOM-01
- [ ] HUT-XXX-INFRA-01
- [ ] HUT-XXX-UC-01
- [ ] HUT-XXX-API-01
- [ ] HUT-XXX-TEST-01

## Score de Calidad
| Sección | Puntaje | Observaciones |
|---------|---------|---------------|
| Completitud | 8/10 | Falta cubrir escenario de error X |
| Arquitectura | 10/10 | Excelente separación de capas |
| Especificaciones | 7/10 | Request schema incompleto en API-01 |
| ... | ... | ... |
| **TOTAL** | **8.2/10** | **BUENO** ✅ |

## Issues Identificados

### Críticos (Bloqueantes)
- [ ] **HUT-XXX-API-01:** Falta definir response schema de error 422

### Mayores (Corregir antes de comenzar)
- [ ] **HUT-XXX-INFRA-01:** Índice faltante en columna `usuario_id`
- [ ] **HUT-XXX-UC-01:** No especifica manejo de timeout en integración externa

### Menores (Corregir durante desarrollo)
- [ ] **HUT-XXX-TEST-01:** Cobertura objetivo debería ser 80%, no 70%

## Recomendaciones
1. Agregar circuit breaker en integración con servicio X
2. Considerar caching de resultados de búsqueda (HUT-PERF adicional)
3. Documentar rollback plan para migración DB

## Decisión Final
- ✅ **Aprobado con correcciones menores**
- ⏸️ **Pendiente corrección de issues críticos**
- ❌ **Rechazado — requiere rehacer**

**Próximos pasos:**
1. Autor corrige issues críticos y mayores
2. Re-review en 2 días
3. Si aprobado, mover HUTs a backlog de desarrollo

---
**Firma:** [Nombre del Revisor]
**Fecha:** [YYYY-MM-DD]
```

---

## 🎯 MÉTRICAS DE ÉXITO DEL BACKLOG TÉCNICO

### KPIs de Calidad

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| **Score promedio HUTs** | >8.0/10 | ___ | ⏸️ |
| **% HUTs con specs completas** | 100% | ___ | ⏸️ |
| **% HUTs con tests definidos** | 100% | ___ | ⏸️ |
| **% HUTs con trazabilidad** | 100% | ___ | ⏸️ |
| **Issues críticos abiertos** | 0 | ___ | ⏸️ |
| **Tiempo promedio review** | <2 días | ___ | ⏸️ |

### Indicadores de Riesgo

🚨 **Riesgo Alto:**
- Score promedio <7.0
- >10% HUTs sin especificaciones completas
- Dependencias circulares detectadas
- >5 issues críticos sin resolver

⚠️ **Riesgo Medio:**
- Score promedio 7.0-8.0
- 5-10% HUTs con gaps de información
- Tiempo de review >3 días

✅ **Riesgo Bajo:**
- Score promedio >8.0
- 100% HUTs completas
- Issues críticos resueltos
- Tiempo de review <2 días

---

**Última actualización:** 8 de noviembre de 2025  
**Versión:** 1.0  
**Autor:** ZES-METHOD Framework  
**Licencia:** Uso interno MI-TOGA Project
