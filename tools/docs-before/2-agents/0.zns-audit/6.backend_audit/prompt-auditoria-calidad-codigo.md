# Prompt - Auditoría de Calidad de Código

---
**Método:** ZNS v2.0  
**Área:** Calidad y Mantenibilidad del Código  
**Prioridad:** 🟡 MEDIA  
**Duración:** 4 horas  
**Salida:** `05-deliverables/audit-report-{fecha}/02-auditoria-calidad-codigo.md`

---

## 🎯 Objetivo

Evaluar la calidad intrínseca del código: complejidad, duplicación, cobertura de tests, adherencia a estándares, code smells y deuda técnica.

---

## 👔 Perfil del Auditor

**Rol:** Senior Code Quality Engineer & Backend Technical Reviewer

---

## 🔍 Métricas Clave

### 1. Complejidad Ciclomática

**Objetivo:** < 10 por método

**Herramientas:**
```bash
# Java - Checkstyle
./gradlew checkstyleMain

# SonarQube
sonar-scanner

# JavaScript/TypeScript - ESLint complexity rule
npx eslint --max-warnings=0 src/
```

**Clasificación:**
- 1-10: Simple, bajo riesgo
- 11-20: Moderado, revisar
- 21-50: Complejo, refactorizar
- > 50: Crítico, rediseñar

---

### 2. Duplicación de Código

**Objetivo:** < 5%

**Buscar:**
```bash
# CPD (Copy/Paste Detector)
cpd --minimum-tokens 100 --files src/ --language java

# jscpd para JavaScript
npx jscpd src/
```

**Tipos de duplicación:**
- **Tipo 1:** Copia exacta
- **Tipo 2:** Copia con cambios de variables
- **Tipo 3:** Copia con modificaciones estructurales

---

### 3. Cobertura de Tests

**Objetivos:**
- Líneas: > 80%
- Branches: > 70%
- Métodos: > 75%

**Comandos:**
```bash
# Java - JaCoCo
./gradlew jacocoTestReport
# Ver: build/reports/jacoco/test/html/index.html

# JavaScript - Jest
npm test -- --coverage
```

---

### 4. Índice de Mantenibilidad

**Objetivo:** > 65/100

**Fórmula simplificada:**
```
MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)

Donde:
- HV: Halstead Volume
- CC: Cyclomatic Complexity
- LOC: Lines of Code
```

**Clasificación:**
- 85-100: Alta mantenibilidad
- 65-84: Mantenibilidad moderada
- < 65: Baja mantenibilidad (refactorizar)

---

## 🚨 Code Smells Comunes

### 1. Long Method
```java
// ❌ Método > 50 líneas
public void processBooking(BookingRequest request) {
    // 150 líneas de código...
}

// ✅ Métodos cortos y descriptivos
public void processBooking(BookingRequest request) {
    validateRequest(request);
    Tutor tutor = findAvailableTutor(request);
    Session session = createSession(request, tutor);
    notifyParticipants(session);
    return session;
}
```

---

### 2. Large Class (God Class)
```java
// ❌ Clase con > 500 líneas y > 15 métodos
public class UserService {
    // Autenticación
    // Gestión de perfil
    // Gestión de roles
    // Notificaciones
    // Reportes
    // ... 20 responsabilidades más
}

// ✅ Separar responsabilidades
public class AuthenticationService { }
public class UserProfileService { }
public class UserRoleService { }
```

---

### 3. Excessive Parameters
```java
// ❌ Método con > 5 parámetros
public Session createSession(Long tutorId, Long studentId, 
    LocalDateTime startTime, LocalDateTime endTime, 
    String subject, String level, BigDecimal rate, 
    PaymentMethod method, String notes) {
    // ...
}

// ✅ Usar objeto de solicitud
public Session createSession(CreateSessionRequest request) {
    // ...
}
```

---

### 4. Magic Numbers
```java
// ❌ Números mágicos
if (user.getAge() < 18) {
    // ...
}
if (order.getTotal() > 1000000) {
    // ...
}

// ✅ Constantes nombradas
private static final int MIN_ADULT_AGE = 18;
private static final BigDecimal HIGH_VALUE_THRESHOLD = 
    new BigDecimal("1000000");

if (user.getAge() < MIN_ADULT_AGE) {
    // ...
}
```

---

### 5. Dead Code
```bash
# Buscar código comentado
grep -r "//.*{" src/
grep -r "/\*.*\*/" src/

# Buscar imports no usados
# Java: IDE warnings
# TypeScript: ESLint no-unused-vars
```

---

### 6. Feature Envy
```java
// ❌ Método usa más la otra clase que la propia
public class SessionService {
    public BigDecimal calculateSessionCost(Session session) {
        return session.getTutor().getHourlyRate()
            .multiply(session.getDurationHours())
            .add(session.getTutor().getPlatformFee())
            .multiply(session.getTutor().getTaxRate());
    }
}

// ✅ Mover lógica a la clase apropiada
public class Tutor {
    public BigDecimal calculateSessionCost(Duration duration) {
        return hourlyRate
            .multiply(duration.toHours())
            .add(platformFee)
            .multiply(taxRate);
    }
}
```

---

### 7. Inappropriate Intimacy
```java
// ❌ Acceso directo a internals de otra clase
public class ReportService {
    public void generateReport(User user) {
        String email = user.profile.contactInfo.primaryEmail;
        // Accede a estructura interna profunda
    }
}

// ✅ Usar métodos públicos
public class ReportService {
    public void generateReport(User user) {
        String email = user.getPrimaryEmail();
    }
}
```

---

## 📏 Estándares de Código

### Java - Google Style Guide

**Configuración Checkstyle:**
```xml
<module name="Checker">
    <module name="LineLength">
        <property name="max" value="120"/>
    </module>
    <module name="TreeWalker">
        <module name="NeedBraces"/>
        <module name="MethodLength">
            <property name="max" value="50"/>
        </module>
        <module name="ParameterNumber">
            <property name="max" value="5"/>
        </module>
    </module>
</module>
```

---

### TypeScript/JavaScript - ESLint

**Configuración .eslintrc.json:**
```json
{
  "rules": {
    "max-lines-per-function": ["error", 50],
    "max-params": ["error", 4],
    "complexity": ["error", 10],
    "max-depth": ["error", 3],
    "max-nested-callbacks": ["error", 3],
    "no-magic-numbers": ["warn"],
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

---

## 🧪 Calidad de Tests

### 1. Cobertura Insuficiente

**Identificar:**
```bash
# Módulos sin tests
find src/ -name "*.java" | while read file; do
    test_file="${file/src\/main/src\/test}"
    test_file="${test_file/.java/Test.java}"
    if [ ! -f "$test_file" ]; then
        echo "Missing test: $file"
    fi
done
```

---

### 2. Test Smells

#### ❌ Assertion Roulette
```java
@Test
void testUserCreation() {
    User user = userService.create(request);
    assertEquals("John", user.getFirstName());
    assertEquals("Doe", user.getLastName());
    assertEquals("john@example.com", user.getEmail());
    assertTrue(user.isActive());
    // ¿Cuál falla? Difícil de saber
}
```

#### ✅ Clear assertions
```java
@Test
void testUserCreation() {
    User user = userService.create(request);
    
    assertThat(user.getFirstName())
        .as("First name should match request")
        .isEqualTo("John");
    assertThat(user.isActive())
        .as("New users should be active by default")
        .isTrue();
}
```

---

#### ❌ Test Interdependence
```java
// Tests que dependen de orden de ejecución
@Test
void test1_createUser() { /* ... */ }

@Test
void test2_updateUser() { 
    // Asume que test1 corrió primero
}
```

#### ✅ Independent tests
```java
@BeforeEach
void setUp() {
    // Cada test tiene su propio setup
}

@Test
void shouldUpdateUser() {
    User user = createTestUser(); // Helper
    // Test independiente
}
```

---

## 📊 Checklist de Calidad

### Código Java (Backend)
- [ ] Complejidad ciclomática < 10 por método
- [ ] Métodos < 50 líneas
- [ ] Clases < 500 líneas
- [ ] Parámetros < 5 por método
- [ ] Duplicación < 5%
- [ ] Todos los métodos públicos documentados (Javadoc)
- [ ] Sin warnings de compilación
- [ ] Sin código comentado (dead code)
- [ ] Uso de Optional en lugar de null
- [ ] Logs apropiados (nivel, estructura)

### Código TypeScript (Frontend)
- [ ] Strict mode habilitado
- [ ] No uso de `any` type
- [ ] Componentes < 250 líneas
- [ ] Funciones < 30 líneas
- [ ] Props tipadas correctamente
- [ ] Hooks bien nombrados (use...)
- [ ] No `console.log` en producción
- [ ] Event handlers con tipos correctos
- [ ] Manejo de errores async/await

### Tests
- [ ] Cobertura > 80% líneas
- [ ] Cobertura > 70% branches
- [ ] Tests unitarios rápidos (< 100ms)
- [ ] Tests independientes (sin orden)
- [ ] Naming descriptivo (should/when/given)
- [ ] Un assertion principal por test
- [ ] Mocks usados apropiadamente
- [ ] Tests de integración para flujos críticos

---

## 🛠️ Herramientas Recomendadas

### Análisis Estático
- **SonarQube/SonarCloud** - Análisis integral
- **Checkstyle** - Estándares Java
- **PMD** - Detección de bugs Java
- **SpotBugs** - Análisis de bytecode
- **ESLint** - Linting TypeScript/JavaScript
- **Prettier** - Formateo consistente

### Cobertura
- **JaCoCo** - Cobertura Java
- **Jest** - Testing + cobertura JavaScript
- **Codecov/Coveralls** - Tracking de cobertura

### Métricas
- **CodeClimate** - Calidad y mantenibilidad
- **Codacy** - Code review automatizado

---

## 📈 Sistema de Calificación

| Aspecto | Peso | Objetivo | Puntos |
|---------|------|----------|--------|
| Complejidad | 15% | < 10 avg | ___/15 |
| Duplicación | 15% | < 5% | ___/15 |
| Cobertura tests | 20% | > 80% | ___/20 |
| Mantenibilidad | 15% | > 65 | ___/15 |
| Code smells | 15% | < 20 | ___/15 |
| Estándares | 10% | 100% compliance | ___/10 |
| Documentación | 10% | Completa | ___/10 |
| **TOTAL** | **100%** | | **___/100** |

---

## 📝 Plantilla de Hallazgo

```markdown
### H-QUAL-{SEV}-{NUM}: {Título}

**Severidad:** 🔴/🟠/🟡/🟢
**Tipo:** {Complejidad/Duplicación/Test/Smell}
**Archivo:** `{ruta}`
**Líneas:** {inicio-fin}

**Descripción:**
{Problema}

**Métrica:**
- Valor actual: {X}
- Objetivo: {Y}
- Desviación: {X-Y}

**Código:**
```{language}
// Código problemático
```

**Refactoring sugerido:**
```{language}
// Código mejorado
```

**Esfuerzo:** {horas}
**Beneficio:** {Legibilidad/Mantenibilidad/Testing}
```

---

## 🚀 Entregables

1. **Documento:** `02-auditoria-calidad-codigo.md`
2. **Reporte SonarQube:** `sonar-report.pdf`
3. **Reporte de cobertura:** `coverage-report.html`
4. **Top 20 code smells:** Priorizado por impacto
5. **Roadmap de refactoring:** Por sprints

---

**Próximo paso:** `prompt-auditoria-patrones-diseno.md`
