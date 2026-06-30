# 🎯 WF-HUT-004 — Prompts de Invocación (Kotlin + Spring Boot)

---

**workflow**: WF-HUT-004-technical-user-stories-kotlin  
**version**: 1.0.0  
**fecha_actualizacion**: 2026-03-18  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.
>
> **Companion de:** `1-workflow/WF-HUT-004-technical-user-stories-kotlin.md`

---

## 🗂️ Mapa de Agentes

| Operación | Agente | Ruta |
|-----------|--------|------|
| `/hut:crear` `/hut:afinar` | Technical Architect DDD | `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md` |
| `/hut:backend` | Backend Kotlin Senior | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md` |
| `/hut:frontend` | Frontend Senior Angular | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md` |
| `/hut:database` | Database Senior PostgreSQL | `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md` |
| Flyway | Flyway Specialist | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md` |

### Skills Kotlin Activas (AGT-BACKEND)

| Skill | Ruta |
|-------|------|
| `kotlin-lang-expert` | `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md` |
| `ddd-hexagonal-kotlin` | `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md` |
| `security-owasp-kotlin` | `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md` |
| `tdd-testing-kotlin` | `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md` |

### Templates Disponibles

| Template | Ruta |
|----------|------|
| HUT Genérica | `2-agents/zns-tools/technical-user-stories/template-hut.md` |
| HUT API | `2-agents/zns-tools/technical-user-stories/template-hut-api.md` |
| HUT Database | `2-agents/zns-tools/technical-user-stories/template-hut-database.md` |
| HUT Integration | `2-agents/zns-tools/technical-user-stories/template-hut-integration.md` |
| Checklist Validación | `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md` |

---

## 📋 ÍNDICE DE PROMPTS

| Prompt | Comando | Objetivo | Agente |
|--------|---------|----------|--------|
| [PROMPT-001](#prompt-001-crear-huts-desde-hu) | `/hut:crear` | Crear HUTs desde HU de negocio | Technical Architect DDD |
| [PROMPT-002](#prompt-002-afinar-huts-existentes) | `/hut:afinar` | Refinar HUTs existentes | Technical Architect DDD |
| [PROMPT-003](#prompt-003-huts-backend-kotlin) | `/hut:backend` | HUTs específicas Kotlin + Spring Boot | Backend Kotlin Senior |
| [PROMPT-004](#prompt-004-huts-frontend) | `/hut:frontend` | HUTs específicas Angular Standalone | Frontend Senior |
| [PROMPT-005](#prompt-005-huts-database) | `/hut:database` | HUTs de modelo de datos PostgreSQL | Database Senior |
| [PROMPT-FLYWAY](#prompt-flyway-huts-de-migraciones) | complementario | HUTs de migraciones Flyway | Flyway Specialist |
| [PROMPT-006](#prompt-006-validar-huts) | `/hut:validar` | Verificar calidad — checklist Kotlin | Checklist Validation |

---

## PROMPT-001: Crear HUTs desde HU (`/hut:crear`)

**Agente:** `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`  
**Tiempo estimado:** 45–90 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`

## PARÁMETROS DE EJECUCIÓN

### Historia de Usuario de Negocio
[PEGAR AQUÍ LA HU DE NEGOCIO O RUTA: 0-docs/1-business-analysis/2-user-stories/HU-XXX.md]

### Contexto del Proyecto
- **Proyecto:** [NOMBRE DEL PROYECTO]
- **Arquitectura:** Hexagonal + DDD + Kotlin 2.x + Spring Boot 3.4.x + Angular 18 + PostgreSQL 16

### Consideraciones Kotlin al Descomponer

Al identificar componentes del dominio, usar convenciones Kotlin:
- Aggregates → `data class` con `companion object { fun crear(...): NombreAggregate }`
- Value Objects → `@JvmInline value class` o `data class` con `init { require(...) }`
- IDs → `@JvmInline value class NombreId(val value: Long)` o UUID
- Domain Events → `sealed interface DomainEvent` con implementaciones `data class`
- Repository Ports → `interface NombreRepository` en domain/ (NUNCA @Repository aquí)
- Use Case Results → `sealed interface NombreResult` con ramas Exito y errores de negocio
- REGLA: domain/ NO importa Spring, JPA, ni ningún framework

### Fases a Ejecutar
1. FASE 1: Análisis Estratégico DDD (Bounded Contexts, Ubiquitous Language)
2. FASE 2: Identificación de Aggregates, Value Objects, Domain Events
3. FASE 3: Generación de HUTs por capa

### Output Esperado
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/`
- HUT-XXX-DOM-01-*.md (Aggregates Kotlin puros)
- HUT-XXX-DOM-02-*.md (Value Objects + Domain Events)
- HUT-XXX-INFRA-01-*.md (Database Dual Key)
- HUT-XXX-INFRA-02-*.md (Flyway V{n.m}__)
- HUT-XXX-UC-01-*.md (Use Cases sealed results)
- HUT-XXX-API-01-*.md (REST POST-only)
- HUT-XXX-UI-01-*.md (Angular Standalone + Signals)
- HUT-XXX-SEC-01-*.md (Spring Security Kotlin DSL)
- HUT-XXX-TEST-01-*.md (TDD Outside-In pyramid)

¡Ejecutar descomposición completa con stack Kotlin!
```

---

## PROMPT-002: Afinar HUTs Existentes (`/hut:afinar`)

**Agente:** `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`  
**Checklist:** `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`  
**Tiempo estimado:** 30–45 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`

## PARÁMETROS DE EJECUCIÓN

### HUT a Afinar
- **Ruta:** [0-docs/3-technical-stories/[bc]/[HU-XXX]/HUT-XXX-*.md]

### Tipo de Refinamiento
- [ ] Completar criterios de aceptación (Given-When-Then)
- [ ] Agregar especificaciones técnicas Kotlin (sealed results, Value Objects)
- [ ] Detallar contratos API (endpoints POST, data class request/response)
- [ ] Definir modelo de datos (Dual Key Pattern, snake_case)
- [ ] Agregar casos de prueba (domain puro → MockK → Testcontainers → @SpringBootTest)
- [ ] Verificar que domain/ no referencia frameworks (ArchUnit compliance)

### Stack de Referencia
- **Backend:** Kotlin 2.x + Spring Boot 3.4.x + Spring Data JPA
- **Mocking:** MockK (no Mockito)
- **Tests dominio:** pure Kotlin — sin @SpringBootTest, sin DI
- **Coverage targets:** domain ≥95% / application ≥90% / global ≥85%

### Checklist de Validación
Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Output
HUT actualizada en su ubicación original

¡Afinar HUT con especificaciones Kotlin!
```

---

## PROMPT-003: HUTs Backend Kotlin (`/hut:backend`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`  
**Skills obligatorias:**
- `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md`
- `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md`
- `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md`
- `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md`

**Template:** `2-agents/zns-tools/technical-user-stories/template-hut-api.md`  
**Tiempo estimado:** 60–90 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

Activa estas skills antes de comenzar:
- `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md`
- `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md`
- `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md`
- `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]

### Bounded Context
- **Nombre:** [nombre — determina package com.zenapses.[nombre]]
- **Schema PostgreSQL:** [mismo nombre_bc]

### Componentes a Especificar en las HUTs

#### domain/ (Kotlin puro — CERO imports de frameworks)
- [ ] Aggregates: `data class` + `companion object create()` + reglas de negocio
- [ ] Value Objects: `@JvmInline value class` o `data class` con `init { require(...) }`
- [ ] Domain Events: `sealed interface DomainEvent` + clases `data class`
- [ ] Repository Ports: `interface NombreRepository` (sin @Repository, sin framework)
- [ ] Domain Service Ports: `interface NombreService` (sin framework)

#### application/ (Spring mínimo — @Service, MockK en tests)
- [ ] Input Ports: `interface NombreUseCase` (command → result)
- [ ] Commands: `data class NombreCommand` (inmutables)
- [ ] Results: `sealed interface NombreResult` (ramas Exito + errores negocio)
- [ ] Use Case impl: `@Service class NombreService : NombreUseCase`

#### infrastructure/ (Spring completo — @Entity, @RestController)
- [ ] JpaEntity: `@Entity` con mapeo snake_case a columnas Flyway
- [ ] PersistenceAdapter: `@Component` implementa Repository Port
- [ ] Controller: `@RestController` con endpoints POST-only
- [ ] Security config: `securityFilterChain` con Spring Security Kotlin DSL

#### Testing Strategy (TDD Outside-In)
- [ ] domain/: pure Kotlin — `val agg = Aggregate.crear(...)` (0 Spring)
- [ ] application/: MockK — `every { repo.buscar(...) } returns ...`
- [ ] infrastructure/: `@DataJpaTest` + Testcontainers (PostgreSQL container)
- [ ] e2e: `@SpringBootTest` + WebTestClient (único lugar con contexto Spring completo)
- [ ] ArchUnit: 7 reglas de arquitectura (domain sin frameworks = regla #1)

### Coverage Targets
| Capa | Mínimo |
|------|--------|
| domain/ | ≥ 95% |
| application/ | ≥ 90% |
| Global | ≥ 85% |

### Reglas Absolutas en las HUTs
- domain/ NO importa Spring, JPA, ni frameworks → ArchUnit verifica en CI
- CERO !! en producción → usar ?.let{} / requireNotNull() / sealed results
- Endpoints HTTP son POST (excepto /actuator/health)
- MockK para mocks, NUNCA Mockito

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut-api.md`

### Output
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/`
- HUT-XXX-DOM-*.md
- HUT-XXX-UC-*.md
- HUT-XXX-API-*.md
- HUT-XXX-SEC-*.md
- HUT-XXX-TEST-*.md

¡Crear HUTs de Backend Kotlin + Spring Boot con TDD hexagonal!
```

---

## PROMPT-004: HUTs Frontend (`/hut:frontend`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`  
**Template:** `2-agents/zns-tools/technical-user-stories/template-hut.md`  
**Tiempo estimado:** 45–60 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]

### APIs del Backend Kotlin a Consumir
[LISTAR ENDPOINTS — el backend Kotlin usa POST para todos los endpoints de negocio]

Ejemplo de contrato POST:
  POST /api/v1/[bc]/[accion]
    Request body: data class Kotlin serializado a JSON
    Response 201: { id: string (UUID) }
    Response 409: { error: "CODIGO_ERROR_NEGOCIO" }  ← sealed Result mapeado por @ExceptionHandler
    Response 400: { error: "DATOS_INVALIDOS", campos: [{campo, mensaje}] }

### Componentes a Especificar
- [ ] Standalone Components (no NgModules) con Signals
- [ ] Reactive Forms (no Template-driven)
- [ ] Angular Service con `this.http.post<T>(...)` (no GET para operaciones)
- [ ] Interfaces TypeScript alineadas con data class Kotlin del backend
- [ ] Manejo de errores HTTP:
  - 409 → mensaje de conflicto en el campo correspondiente
  - 400 → mapear errores de validación a FormControl
  - 401 → redirigir a /login
  - 403 → mostrar "Sin permisos"
- [ ] Lazy routes configuradas
- [ ] Tests con coverage ≥ 80%

### Mapeo sealed Result Kotlin → HTTP → Angular
| sealed Result | HTTP Status | Acción en Frontend |
|---------------|-------------|-------------------|
| Exito | 201/200 | Navegar / toast success |
| [ErrorNegocio] | 409 Conflict | Mensaje en campo / formulario |
| NoEncontrado | 404 | Mensaje en pantalla |
| DatosInvalidos | 400 | Errores por campo en ReactiveForm |
| NoAutorizado | 401 | Router.navigate(['/login']) |
| SinPermisos | 403 | Mostrar componente de acceso denegado |

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut.md`

### Output
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-XXX-UI-*.md`

¡Crear HUTs de Frontend Angular integradas con backend Kotlin!
```

---

## PROMPT-005: HUTs Database (`/hut:database`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`  
**Template:** `2-agents/zns-tools/technical-user-stories/template-hut-database.md`  
**Tiempo estimado:** 30–45 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`

## PARÁMETROS DE EJECUCIÓN

### Aggregates Kotlin del Análisis DDD
[LISTAR — proviene del PROMPT-001 o de HUTs de dominio ya creadas]

Ejemplo:
- Aggregate: Usuario
  - Value Objects: Email, Password, NombreCompleto, UsuarioId
  - States: EstadoUsuario (enum Kotlin → columna VARCHAR)

### Bounded Context / Schema
- **Schema PostgreSQL:** [nombre_bc]
  (exactamente el mismo nombre que usará el package com.zenapses.[nombre_bc])

### Requisitos Obligatorios
- **Dual Key Pattern** (OBLIGATORIO):
  - pkid_<tabla> BIGINT GENERATED ALWAYS AS IDENTITY   ← NO usar SERIAL
  - uuid_<tabla> UUID NOT NULL DEFAULT gen_random_uuid()
- **Auditoría:** creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Schema:** CREATE SCHEMA IF NOT EXISTS [nombre_bc]
- **Naming constraints:** pk_<tabla>, fk_<tabla>_<ref>, idx_<tabla>_<col>, uk_<tabla>_<col>

### Nota de Compatibilidad con Kotlin/JPA
- Columnas en snake_case (Spring Data JPA los mapea automáticamente a camelCase)
- Evitar reserved keywords de JPA/SQL: user→usr_, order→ord_, group→grp_, status→sts_
- No se necesitan columnas de tipo complejo para @JvmInline value class
  (un BIGINT o UUID es suficiente — el mapeo se hace en el JpaEntity)
- Los enum Kotlin se mapean como String/EnumString (NO integer → legibilidad en DB)

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut-database.md`

### Output
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-XXX-INFRA-DB-*.md`
- HUT-XXX-INFRA-DB-01-schema-tablas.md
- HUT-XXX-INFRA-DB-02-indices-constraints.md
- Diagrama ER en mermaid incluido

¡Crear HUTs de Database PostgreSQL con Dual Key Pattern!
```

---

## PROMPT-FLYWAY: HUTs de Migraciones (complementario)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`  
**Tiempo estimado:** 20–30 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`

## PARÁMETROS DE EJECUCIÓN

### Input: DDL de HUTs de Database
[REFERENCIAR HUT-XXX-INFRA-DB-01 — pegar o indicar ruta]

### Configuración del Proyecto
- **DB:** PostgreSQL 16
- **Flyway:** 10.x
- **Directorio:** src/main/resources/db/migration/
- **Última versión ejecutada:** [ej: 1.4]
- **Nueva versión:** [ej: 1.5]

### Naming Convention ESTRICTO
V{version}__{descripcion_snake_case}.sql

Ejemplos válidos:
  V1_5__create_schema_autenticacion.sql
  V1_6__create_table_usuarios.sql
  V1_7__create_indexes_usuarios.sql
  U1_5__drop_schema_autenticacion.sql   ← rollback

Ejemplos INVÁLIDOS (no usar):
  V1.5__create_schema.sql              ← punto en lugar de guión bajo
  V1_5_create_schema.sql              ← falta segundo guión bajo
  V1_5__Create_Schema.sql             ← no PascalCase

### Output
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-XXX-INFRA-FLY-*.md`
Scripts en: src/main/resources/db/migration/

¡Crear HUTs de Migraciones Flyway para stack Kotlin!
```

---

## PROMPT-006: Validar HUTs (`/hut:validar`)

**Checklist:** `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`  
**Tiempo estimado:** 15–20 minutos por HUT

```markdown
## VALIDACIÓN DE HUT — Stack Kotlin

### HUT a Validar
- **Ruta:** [0-docs/3-technical-stories/[bc]/[HU-XXX]/HUT-XXX-*.md]

### Checklist Estándar
Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Criterios Generales
1. [ ] Título claro (HUT-[TIPO]-[NUM]-[descripcion])
2. [ ] Descripción técnica completa
3. [ ] Criterios de aceptación verificables (Given-When-Then)
4. [ ] Story Points estimados (Fibonacci: 1,2,3,5,8)
5. [ ] Dependencias identificadas
6. [ ] Componentes técnicos especificados
7. [ ] Trazabilidad a HU de negocio
8. [ ] Tests definidos

### Criterios Adicionales para Stack Kotlin
9. [ ] domain/ no referencia ningún framework en las especificaciones
10. [ ] Tests de domain/ son pure Kotlin (sin @SpringBootTest, sin @Autowired)
11. [ ] Aggregates definidos como data class con companion object create()
12. [ ] Value Objects con validación en init { require(...) }
13. [ ] Use Case results definidos como sealed (no exceptions como resultado normal)
14. [ ] Endpoints especificados como POST (no GET/PUT/DELETE para ops de negocio)
15. [ ] MockK referenciado para mocks de application layer (no Mockito)
16. [ ] ArchUnit rule planificada para verificar domain puro
17. [ ] Coverage targets especificados: domain ≥95% / application ≥90% / global ≥85%
18. [ ] CERO !! en snippets de código de la HUT

### Output
Reporte de validación con gaps identificados y prioridad de corrección

¡Validar HUT contra checklist Kotlin!
```

---

## 🚀 FLUJO RÁPIDO DE EJECUCIÓN

### Opción A: Descomposición Completa (recomendado)

```markdown
# 1. Crear HUTs desde HU de negocio (Kotlin stack)
/hut:crear → Ejecutar PROMPT-001

# 2. Detalle Backend Kotlin (hexagonal + TDD)
/hut:backend → Ejecutar PROMPT-003

# 3. Detalle Database (Dual Key Pattern)
/hut:database → Ejecutar PROMPT-005

# 4. Detalle Flyway (migraciones V{n.m}__)
[complementario] → Ejecutar PROMPT-FLYWAY

# 5. Detalle Frontend Angular (Standalone + Signals)
/hut:frontend → Ejecutar PROMPT-004

# 6. Validar resultado — checklist Kotlin
/hut:validar → Ejecutar PROMPT-006
```

### Opción B: Afinar HUT existente

```markdown
# 1. Identificar gaps en HUT Kotlin
/hut:validar → Ver checklist (criterios 9-18 son Kotlin-específicos)

# 2. Afinar con contexto Kotlin
/hut:afinar → Ejecutar PROMPT-002
```

### Opción C: Solo HUTs de dominio Kotlin

```markdown
# Crear solo HUTs de capa domain/ (Aggregates + Value Objects + Events)
/hut:backend → PROMPT-003 (limitando a componentes domain/)
```

---

## 📝 Diferencias vs WF-HUT-001-prompts-invocacion.md

| Aspecto | WF-HUT-001 (Spring Boot Java) | WF-HUT-004 (Kotlin) |
|---------|-------------------------------|---------------------|
| Backend prompt | `prompt-dev-springboot-senior.md` | `prompt-dev-kotlin-springboot-senior.md` |
| Skills backend | No aplica | 4 skills Kotlin obligatorias |
| Aggregates | Java classes + Lombok | `data class` + `companion object create()` |
| Value Objects | Java records / Lombok | `@JvmInline value class` o `data class` |
| Domain Events | Java classes | `sealed interface DomainEvent` |
| Results | Exception-driven o Optional | `sealed interface NombreResult` |
| Mocking | Mockito / @MockBean | MockK — nunca Mockito |
| Tests dominio | JUnit + Spring context | Pure Kotlin (cero Spring) |
| Null safety | null + Optional | nullable types + `?.let{}` |
| CERO `!!` | N/A | Regla hard — ArchUnit detecta |
| Endpoints HTTP | REST (GET/POST/PUT/DELETE) | POST-only (excepto /actuator/health) |
| Coverage dominio | ≥ 80% global | domain ≥95% / application ≥90% |

---

**Versión:** 1.0.0  
**Última Actualización:** 2026-03-18  
**Workflow asociado:** [1-workflow/WF-HUT-004-technical-user-stories-kotlin.md](./WF-HUT-004-technical-user-stories-kotlin.md)  
**Ver también:** [WF-HUT-001-prompts-invocacion.md](./WF-HUT-001-prompts-invocacion.md) — [WF-HUT-003-prompts-invocacion.md](./WF-HUT-003-prompts-invocacion.md)
