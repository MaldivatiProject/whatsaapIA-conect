# Prompts Restantes - Auditoría Técnica

## 📑 Índice de Prompts Complementarios

Este archivo consolida los 4 prompts restantes en formato compacto. Cada sección puede expandirse a documento individual si es necesario.

---

# 🎨 Prompt - Auditoría de Patrones de Diseño

**Área:** Patrones de Diseño y Principios SOLID  
**Prioridad:** 🟡 MEDIA  
**Duración:** 2 horas  
**Salida:** `03-auditoria-patrones-diseno.md`

## Objetivo

Evaluar la correcta aplicación de patrones de diseño (GoF, enterprise, framework-specific) y principios SOLID.

## Áreas de Evaluación

### 1. Principios SOLID

#### S - Single Responsibility Principle
```java
// ❌ Múltiples responsabilidades
class UserService {
    void saveUser() { }
    void sendEmail() { }
    void generateReport() { }
}

// ✅ Una responsabilidad
class UserService { void saveUser() { } }
class EmailService { void sendEmail() { } }
class ReportService { void generateReport() { } }
```

#### O - Open/Closed Principle
```java
// ✅ Abierto a extensión, cerrado a modificación
interface PaymentStrategy {
    void processPayment(BigDecimal amount);
}

class CreditCardPayment implements PaymentStrategy { }
class PSEPayment implements PaymentStrategy { }
```

#### L - Liskov Substitution Principle
#### I - Interface Segregation Principle
#### D - Dependency Inversion Principle

### 2. Patrones Creacionales

- **Factory Method**: Creación de objetos
- **Builder**: Construcción compleja
- **Singleton**: Instancia única (usar con cuidado)

### 3. Patrones Estructurales

- **Adapter**: Compatibilidad de interfaces
- **Decorator**: Añadir funcionalidad dinámicamente
- **Facade**: Simplificar subsistemas complejos

### 4. Patrones Comportamentales

- **Strategy**: Algoritmos intercambiables
- **Observer**: Notificaciones de eventos
- **Template Method**: Esqueleto de algoritmo

### 5. Patrones Spring

- **Dependency Injection**: @Autowired, constructor injection
- **AOP**: @Transactional, @Cacheable
- **Template**: JdbcTemplate, RestTemplate

### 6. Patrones React

- **Container/Presentational**: Separación lógica/UI
- **Higher-Order Components**: Reutilización de lógica
- **Hooks**: useState, useEffect, custom hooks
- **Context**: Estado global

## Checklist

- [ ] SOLID principles aplicados consistentemente
- [ ] Patrones usados apropiadamente (no over-engineering)
- [ ] Dependency Injection sobre instanciación directa
- [ ] Interfaces para abstracciones
- [ ] No anti-patterns (Singleton abuse, God Object)

---

# ⚡ Prompt - Auditoría de Performance

**Área:** Rendimiento y Optimización  
**Prioridad:** 🟡 MEDIA  
**Duración:** 2 horas  
**Salida:** `06-auditoria-performance.md`

## Objetivo

Identificar cuellos de botella, queries ineficientes y oportunidades de optimización.

## Áreas de Evaluación

### 1. Backend Performance

#### Queries N+1
```java
// ❌ N+1 problem
List<Tutor> tutors = tutorRepository.findAll();
for (Tutor tutor : tutors) {
    List<Review> reviews = tutor.getReviews(); // Query por cada tutor
}

// ✅ Fetch eager o JOIN FETCH
@Query("SELECT t FROM Tutor t LEFT JOIN FETCH t.reviews")
List<Tutor> findAllWithReviews();
```

#### Índices de Base de Datos
```sql
-- Verificar queries sin índices
EXPLAIN ANALYZE SELECT * FROM sessions WHERE student_id = 123;

-- Crear índices en foreign keys y campos de búsqueda
CREATE INDEX idx_sessions_student_id ON sessions(student_id);
CREATE INDEX idx_tutors_subject ON tutors(subject);
```

#### Caching
- Query caching (Redis)
- HTTP caching (ETag, Cache-Control)
- Application-level caching (@Cacheable)

### 2. Frontend Performance

#### Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

#### Optimizaciones React
```tsx
// ✅ Memoization
const MemoizedComponent = React.memo(ExpensiveComponent);

// ✅ useMemo para cálculos costosos
const filteredTutors = useMemo(() => 
    tutors.filter(t => t.rating > 4.5), 
    [tutors]
);

// ✅ Code splitting
const AdminPanel = lazy(() => import('./AdminPanel'));
```

#### Imágenes
- Lazy loading: `loading="lazy"`
- Formatos modernos: WebP, AVIF
- Responsive images: srcset
- CDN para assets estáticos

### 3. API Performance

- Paginación: `GET /api/tutors?page=0&size=20`
- Compresión: Gzip/Brotli
- Timeouts configurados: < 30s
- Rate limiting: 100 req/min por IP

## Métricas Objetivo

| Métrica | Objetivo | Crítico Si |
|---------|----------|------------|
| API response (P95) | < 300ms | > 2s |
| Page load (P95) | < 2s | > 5s |
| Database queries | < 50ms avg | > 500ms |
| Memory usage | < 512MB | > 2GB |
| CPU usage | < 50% avg | > 80% |

---

# 🔧 Prompt - Auditoría de Obsolescencia

**Área:** Deuda Técnica y Tecnologías Desactualizadas  
**Prioridad:** 🟠 ALTA  
**Duración:** 2 horas  
**Salida:** `05-auditoria-obsolescencia.md`

## Objetivo

Identificar tecnologías obsoletas, dependencias desactualizadas y deuda técnica acumulada.

## Áreas de Evaluación

### 1. Versiones de Runtime

```bash
# Java
java -version  # Objetivo: Java 21 (MI-TOGA actual)

# Node.js
node --version  # Objetivo: Node 20 LTS o superior

# PostgreSQL
psql --version  # Objetivo: PostgreSQL 15+
```

### 2. Frameworks Principales

#### Backend - Spring Boot
```gradle
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.5.5'
}
```

**Verificar:**
- [ ] Spring Boot 3.x (actual)
- [ ] No versiones 2.x (próximo EOL: agosto 2025)

#### Frontend - Next.js / React
```json
// package.json
{
  "dependencies": {
    "next": "16.0.0",
    "react": "19.2.0"
  }
}
```

**Verificar:**
- [ ] Next.js 14+ o 15+
- [ ] React 18+ o 19+

### 3. Dependencias con CVEs

```bash
# Escanear vulnerabilidades
./gradlew dependencyCheckAnalyze
npm audit

# Actualizar dependencias
./gradlew dependencyUpdates
npm outdated
```

**Priorizar:**
- 🔴 CRITICAL CVEs (CVSS >= 9.0)
- 🟠 HIGH CVEs (CVSS 7.0-8.9)
- 🟡 MEDIUM CVEs (CVSS 4.0-6.9)

### 4. Tecnologías End-of-Life (EOL)

Verificar en https://endoflife.date/:
- Java 8, 11: ¿Cuándo termina soporte?
- Node.js versiones pares: LTS activo
- PostgreSQL: Versiones soportadas
- Spring Boot 2.x: EOL agosto 2025

### 5. Prácticas Deprecated

```java
// ❌ Deprecated
Date date = new Date();
new SimpleDateFormat("yyyy-MM-dd").format(date);

// ✅ Modern
LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
```

## Checklist

- [ ] Todas las dependencias < 1 año de desactualizadas
- [ ] No CVEs críticos sin parche
- [ ] No tecnologías en EOL
- [ ] Plan de actualización documentado
- [ ] Renovate/Dependabot configurado

---

# 🧪 Prompt - Auditoría de Testing & DevOps

**Área:** Testing, CI/CD e Infraestructura  
**Prioridad:** 🟢 BAJA  
**Duración:** 2 horas  
**Salida:** `07-auditoria-testing-devops.md`

## Objetivo

Evaluar estrategia de testing, pipeline CI/CD, deployment y observabilidad.

## Áreas de Evaluación

### 1. Pirámide de Testing

```
          /\
         /E2E\        10% - End-to-End (Playwright, Cypress)
        /------\
       /  Int   \     20% - Integration (TestContainers, REST)
      /----------\
     /   Unit     \   70% - Unit (JUnit, Jest)
    /--------------\
```

**Verificar cobertura:**
- Unit: > 80%
- Integration: > 60%
- E2E: > 40% de flujos críticos

### 2. Calidad de Tests

```java
// ✅ Good test structure (AAA)
@Test
void shouldCreateSessionWhenTutorAvailable() {
    // Arrange
    Tutor tutor = createAvailableTutor();
    CreateSessionRequest request = buildSessionRequest(tutor);
    
    // Act
    Session session = sessionService.create(request);
    
    // Assert
    assertThat(session.getStatus()).isEqualTo(SessionStatus.PENDING);
    verify(notificationService).notifyTutor(tutor, session);
}
```

### 3. CI/CD Pipeline

**GitHub Actions / GitLab CI:**
```yaml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: ./gradlew test
      
  security:
    runs-on: ubuntu-latest
    steps:
      - name: OWASP Dependency Check
        run: ./gradlew dependencyCheckAnalyze
  
  deploy:
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: ./deploy.sh
```

**Checklist:**
- [ ] Pipeline CI en cada commit
- [ ] Tests automáticos pre-merge
- [ ] Security scan en pipeline
- [ ] Deployment automático a staging
- [ ] Deployment manual/aprobado a prod

### 4. Ambientes

- [ ] DEV: Desarrollo local
- [ ] STAGING: Pre-producción (replica prod)
- [ ] PROD: Producción

### 5. Observabilidad

**Logs:**
- [ ] Logs estructurados (JSON)
- [ ] Log levels apropiados (ERROR, WARN, INFO)
- [ ] Correlation IDs
- [ ] Logs centralizados (ELK, CloudWatch)

**Métricas:**
- [ ] Prometheus + Grafana
- [ ] Spring Boot Actuator metrics
- [ ] Alertas configuradas

**Tracing:**
- [ ] Distributed tracing (Jaeger, Zipkin)
- [ ] APM tool (New Relic, Datadog)

### 6. Disaster Recovery

- [ ] Backups automáticos (diarios)
- [ ] Backups testeados (restore periódico)
- [ ] RPO < 1 hora
- [ ] RTO < 4 horas
- [ ] Runbook de recuperación

## Checklist DevOps

- [ ] Infraestructura as Code (Terraform, CloudFormation)
- [ ] Secrets en vault (no hardcoded)
- [ ] Rollback automático en fallo
- [ ] Blue-green o canary deployment
- [ ] Health checks configurados
- [ ] Auto-scaling configurado

---

## 📊 Sistema de Calificación Global

Cada auditoría específica contribuye al score global:

| Auditoría | Peso | Calificación |
|-----------|------|--------------|
| Seguridad | 25% | ___/100 |
| Obsolescencia | 15% | ___/100 |
| Arquitectura | 15% | ___/100 |
| Calidad Código | 20% | ___/100 |
| Patrones Diseño | 10% | ___/100 |
| Performance | 10% | ___/100 |
| Testing/DevOps | 5% | ___/100 |
| **TOTAL** | **100%** | **___/100** |

---

**Fin de Prompts de Auditoría**

Estos prompts complementan el prompt maestro de auditoría. Cada sección puede expandirse a documento completo según necesidades del proyecto.
