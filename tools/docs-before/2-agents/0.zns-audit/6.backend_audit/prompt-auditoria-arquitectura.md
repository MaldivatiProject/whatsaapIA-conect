# Prompt - Auditoría de Arquitectura

---
**Método:** ZNS v2.0  
**Área:** Arquitectura de Software  
**Prioridad:** 🟠 ALTA  
**Duración:** 3 horas  
**Salida:** `05-deliverables/audit-report-{fecha}/01-auditoria-arquitectura.md`

---

## 🎯 Objetivo

Evaluar la calidad arquitectónica del proyecto, verificando patrones, decisiones de diseño, separación de responsabilidades, escalabilidad y mantenibilidad del sistema.

---

## 👔 Perfil del Auditor

**Rol:** Solution Architect Senior & Technical Architect

**Experiencia:**
- Diseño de arquitecturas enterprise (monolitos, microservicios, event-driven)
- Patrones arquitectónicos (layered, hexagonal, CQRS, DDD)
- Evaluación de trade-offs y decisiones arquitectónicas (ADRs)
- Cloud-native architecture (AWS, Azure, GCP)
- Escalabilidad, performance y resiliencia de sistemas distribuidos

---

## 🔍 Áreas de Evaluación

### 1. Patrón Arquitectónico Principal

**Identificar y evaluar:**
- [ ] ¿Qué patrón se usa? (Layered, Clean Architecture, Hexagonal, MVC, etc.)
- [ ] ¿Es adecuado para el problema?
- [ ] ¿Se implementa consistentemente?
- [ ] ¿Hay documentación (diagrama C4, ADRs)?

**Arquitectura esperada para MI-TOGA:**
```
Frontend (Next.js 16 + React 19)
  ├── Presentation Layer
  │   ├── Pages/Routes
  │   ├── Components (UI)
  │   └── State Management
  ├── Business Logic Layer
  │   ├── Hooks
  │   ├── Services
  │   └── Validators
  └── Data Access Layer
      ├── API Clients
      ├── Cache Layer
      └── Local Storage

Backend (Spring Boot 3.5.5)
  ├── Presentation Layer
  │   ├── Controllers (REST)
  │   ├── DTOs
  │   └── Mappers
  ├── Business Logic Layer
  │   ├── Services
  │   ├── Domain Models
  │   └── Business Rules
  ├── Data Access Layer
  │   ├── Repositories (JPA)
  │   ├── Entities
  │   └── Specifications
  └── Infrastructure Layer
      ├── Security (JWT, Spring Security)
      ├── Config
      └── Utilities
```

---

### 2. Separation of Concerns (SoC)

**Verificar:**

#### ❌ Anti-patterns comunes:
```java
// Controller con lógica de negocio
@PostMapping("/tutors")
public ResponseEntity<Tutor> createTutor(@RequestBody Tutor tutor) {
    // ❌ Validación en controller
    if (tutor.getHourlyRate() < 10000) {
        throw new IllegalArgumentException("Tarifa muy baja");
    }
    
    // ❌ Lógica de negocio en controller
    tutor.setStatus(TutorStatus.PENDING);
    tutor.setCreatedAt(LocalDateTime.now());
    
    // ❌ Acceso directo a repository
    return ResponseEntity.ok(tutorRepository.save(tutor));
}
```

#### ✅ Correcta separación:
```java
// Controller - Solo orquestación
@PostMapping("/tutors")
public ResponseEntity<TutorDTO> createTutor(@Valid @RequestBody CreateTutorRequest request) {
    TutorDTO tutor = tutorService.createTutor(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(tutor);
}

// Service - Lógica de negocio
@Service
@Transactional
public class TutorService {
    public TutorDTO createTutor(CreateTutorRequest request) {
        validateBusinessRules(request);
        Tutor tutor = tutorMapper.toEntity(request);
        tutor.initializeDefaults();
        Tutor saved = tutorRepository.save(tutor);
        publishTutorCreatedEvent(saved);
        return tutorMapper.toDTO(saved);
    }
}
```

**Checklist:**
- [ ] Controllers no tienen lógica de negocio
- [ ] Services no acceden directamente a HttpServletRequest/Response
- [ ] Repositories no contienen lógica de negocio
- [ ] DTOs separados de Entities
- [ ] Mappers para conversión DTO ↔ Entity

---

### 3. Cohesión y Acoplamiento

**Métricas objetivo:**
- **Alta cohesión:** Clases con responsabilidades relacionadas
- **Bajo acoplamiento:** Dependencias mínimas entre módulos

**Evaluar:**
```bash
# Analizar dependencias entre paquetes
# High coupling indicators:
- Muchos imports entre paquetes no relacionados
- Clases con > 10 dependencias
- Dependencias circulares
```

**Hallazgos a documentar:**
- Módulos altamente acoplados
- Clases con múltiples responsabilidades (violación SRP)
- Dependencias circulares
- God classes (> 500 líneas, > 15 métodos)

---

### 4. Escalabilidad y Performance

#### Escalabilidad Horizontal
**Verificar:**
- [ ] Aplicación stateless (no sesión en memoria)
- [ ] Sesiones en store externo (Redis, base de datos)
- [ ] No archivos locales temporales
- [ ] Idempotencia en operaciones críticas

#### Escalabilidad Vertical
**Verificar:**
- [ ] Manejo eficiente de memoria
- [ ] Sin memory leaks evidentes
- [ ] Uso de pools (conexiones DB, threads)
- [ ] Lazy loading donde apropiado

#### Caching Strategy
**Evaluar presencia y configuración:**
- [ ] Cache de queries frecuentes
- [ ] Cache de sesiones (Redis)
- [ ] Cache HTTP (CDN, browser cache)
- [ ] Invalidación de cache consistente

```java
// ✅ Caching con Spring Cache
@Service
public class TutorService {
    
    @Cacheable(value = "tutors", key = "#id")
    public TutorDTO getTutor(Long id) {
        return tutorRepository.findById(id)
            .map(tutorMapper::toDTO)
            .orElseThrow(() -> new NotFoundException("Tutor no encontrado"));
    }
    
    @CacheEvict(value = "tutors", key = "#id")
    public void updateTutor(Long id, UpdateTutorRequest request) {
        // Actualización invalida cache
    }
}
```

---

### 5. Resiliencia y Tolerancia a Fallos

**Patrones a verificar:**

#### Circuit Breaker
```java
// ✅ Resilience4j Circuit Breaker
@CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
public PaymentResponse processPayment(PaymentRequest request) {
    return paymentClient.charge(request);
}

public PaymentResponse paymentFallback(PaymentRequest request, Exception ex) {
    // Log error y retornar respuesta por defecto
    log.error("Payment service unavailable", ex);
    return PaymentResponse.builder()
        .status(PaymentStatus.PENDING)
        .message("Pago en proceso, recibirás notificación")
        .build();
}
```

**Checklist:**
- [ ] Retry logic en llamadas externas
- [ ] Timeouts configurados (HTTP clients, DB queries)
- [ ] Fallbacks para servicios críticos
- [ ] Graceful degradation

---

### 6. API Design

**RESTful Best Practices:**

#### ✅ Correcta estructura:
```
GET    /api/v1/tutors                # List tutors
GET    /api/v1/tutors/{id}           # Get tutor
POST   /api/v1/tutors                # Create tutor
PUT    /api/v1/tutors/{id}           # Update tutor (full)
PATCH  /api/v1/tutors/{id}           # Update tutor (partial)
DELETE /api/v1/tutors/{id}           # Delete tutor

GET    /api/v1/tutors/{id}/reviews   # Nested resource
POST   /api/v1/sessions/{id}/cancel  # Action on resource
```

#### ❌ Anti-patterns a buscar:
```
GET  /api/getTutor?id=123            # Verbo en URL
POST /api/tutors/update              # Verbo POST para update
GET  /api/tutors/123/update          # Action en GET
```

**Checklist:**
- [ ] Versionado de API (`/api/v1/`)
- [ ] Uso correcto de verbos HTTP
- [ ] Códigos de estado HTTP apropiados
- [ ] Paginación en listados (`page`, `size`, `sort`)
- [ ] Filtrado mediante query params
- [ ] Respuestas consistentes (estructura JSON estándar)
- [ ] HATEOAS (opcional, pero recomendado)

---

### 7. Documentación Arquitectónica

**Verificar existencia de:**

#### Architecture Decision Records (ADRs)
```markdown
# ADR-001: Uso de PostgreSQL como Base de Datos Principal

**Estado:** Aceptado
**Fecha:** 2025-01-15
**Decisores:** Tech Lead, CTO

## Contexto
Necesitamos una base de datos relacional para datos estructurados.

## Decisión
Usar PostgreSQL 15+ como base de datos principal.

## Consecuencias
**Positivas:**
- ACID compliant
- Extensiones poderosas (PostGIS, full-text search)
- Buen rendimiento para workload OLTP

**Negativas:**
- Requiere gestión de migraciones
- Escalabilidad vertical limitada
```

**Checklist de documentación:**
- [ ] README con arquitectura general
- [ ] Diagramas C4 (Context, Containers, Components)
- [ ] ADRs para decisiones importantes
- [ ] Documentación de APIs (OpenAPI/Swagger)
- [ ] Diagramas de flujo de procesos críticos
- [ ] Modelo de datos (ERD)

---

### 8. Estructura de Carpetas

**Evaluar organización del código:**

#### ✅ Backend - Package by Feature (recomendado)
```
src/main/java/com/mitoga/
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── dto/
│   └── repository/
├── tutors/
│   ├── TutorController.java
│   ├── TutorService.java
│   ├── dto/
│   ├── entity/
│   └── repository/
├── sessions/
├── payments/
└── common/
    ├── config/
    ├── exception/
    └── util/
```

#### ❌ Package by Layer (menos recomendado)
```
src/main/java/com/mitoga/
├── controller/
│   ├── AuthController.java
│   ├── TutorController.java
│   └── SessionController.java
├── service/
├── repository/
└── dto/
```

**Frontend - Feature-based:**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── tutors/
│   │   ├── [id]/
│   │   └── search/
│   └── sessions/
├── components/
│   ├── ui/          # Shared UI components
│   └── layout/
├── lib/
│   ├── api/
│   ├── hooks/
│   └── utils/
└── types/
```

---

### 9. Dependencias y Módulos

**Analizar:**
```bash
# Backend - Gradle dependencies
./gradlew dependencies > dependencies.txt

# Frontend - npm/yarn
npm list --depth=0 > dependencies.txt
```

**Verificar:**
- [ ] No dependencias circulares entre módulos
- [ ] Dependencias transitivas controladas
- [ ] Versiones consistentes (no múltiples versiones de misma lib)
- [ ] Dependencias bien categorizadas (compile, runtime, test)

---

### 10. Manejabilidad y Operabilidad

**Health Checks:**
```java
// ✅ Custom health indicators
@Component
public class DatabaseHealthIndicator extends AbstractHealthIndicator {
    @Override
    protected void doHealthCheck(Health.Builder builder) {
        try {
            // Check DB connectivity
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            builder.up()
                .withDetail("database", "PostgreSQL")
                .withDetail("status", "Connected");
        } catch (Exception ex) {
            builder.down().withException(ex);
        }
    }
}
```

**Checklist:**
- [ ] Health endpoint configurado (`/actuator/health`)
- [ ] Metrics endpoint para Prometheus (`/actuator/prometheus`)
- [ ] Graceful shutdown configurado
- [ ] Configuración externalizada (environment variables)
- [ ] Logs estructurados (JSON format)
- [ ] Correlation IDs en logs

---

## 📊 Sistema de Calificación

| Aspecto | Peso | Puntos |
|---------|------|--------|
| Patrón arquitectónico adecuado | 15% | ___/15 |
| Separación de responsabilidades | 15% | ___/15 |
| Cohesión y bajo acoplamiento | 10% | ___/10 |
| Escalabilidad | 15% | ___/15 |
| Resiliencia | 10% | ___/10 |
| API Design | 10% | ___/10 |
| Documentación | 10% | ___/10 |
| Estructura de código | 5% | ___/5 |
| Manejo de dependencias | 5% | ___/5 |
| Operabilidad | 5% | ___/5 |
| **TOTAL** | **100%** | **___/100** |

**Calificación:**
- **A (90-100):** Arquitectura excelente, best practices
- **B (75-89):** Arquitectura sólida, mejoras menores
- **C (60-74):** Arquitectura funcional, requiere mejoras
- **D (40-59):** Arquitectura deficiente, refactoring necesario
- **F (0-39):** Arquitectura crítica, rediseño requerido

---

## 📝 Plantilla de Hallazgo

```markdown
### H-ARCH-{SEVERIDAD}-{NUM}: {Título}

**Severidad:** 🔴 CRÍTICO / 🟠 ALTO / 🟡 MEDIO / 🟢 BAJO
**Categoría:** {Patrón/SoC/Escalabilidad/etc}
**Componente:** `{ruta/archivo}`

**Descripción:**
{Problema identificado}

**Evidencia:**
```java
// Código problemático
```

**Impacto:**
- Mantenibilidad: {Bajo/Medio/Alto}
- Escalabilidad: {Bajo/Medio/Alto}
- Rendimiento: {Bajo/Medio/Alto}

**Recomendación:**
{Solución propuesta}

**Esfuerzo:** {horas/días}
**Prioridad:** {1-5}
```

---

## 🚀 Entregables

1. **Documento:** `01-auditoria-arquitectura.md`
2. **Diagramas:** 
   - Diagrama C4 Context
   - Diagrama C4 Containers
   - Diagrama de despliegue
3. **ADRs sugeridos:** Mínimo 5 decisiones a documentar
4. **Roadmap de mejora arquitectónica**

---

**Próximo paso:** `prompt-auditoria-calidad-codigo.md`
