# 🎯 WF-DEV-002 Kotlin — Prompts de Invocación (Kotlin + Spring Boot)

---

**workflow**: WF-DEV-002-desarrollo-fullstack-kotlin  
**version**: 1.0.0  
**fecha_actualizacion**: 2026-03-18  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.
>
> **Companion de:** `1-workflow/WF-DEV-002-desarrollo-fullstack-kotlin.md`

---

## 🗂️ Mapa de Agentes

| Step | Agente ID | Ruta del Agente |
|------|-----------|-----------------|
| STEP-002 | AGT-DATABASE | `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md` |
| STEP-003 | AGT-FLYWAY | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md` |
| STEP-004 | AGT-BACKEND | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md` |
| STEP-005 | AGT-FRONTEND | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md` |

---

## 🛡️ Skills Kotlin Activas

| Skill | Ruta | Aplica a |
|-------|------|----------|
| `kotlin-lang-expert` | `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md` | AGT-BACKEND |
| `ddd-hexagonal-kotlin` | `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md` | AGT-BACKEND |
| `security-owasp-kotlin` | `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md` | AGT-BACKEND |
| `tdd-testing-kotlin` | `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md` | AGT-BACKEND |

---

## 📋 ÍNDICE DE PROMPTS

| Prompt | Objetivo | Agente |
|--------|----------|--------|
| [PROMPT-001](#prompt-001-workflow-completo) | Ejecutar desarrollo full-stack completo (Kotlin) | Orquestador |
| [PROMPT-002](#prompt-002-diseño-base-de-datos) | Diseñar modelo PostgreSQL con Dual Key | AGT-DATABASE |
| [PROMPT-003](#prompt-003-migraciones-flyway) | Crear y ejecutar migraciones Flyway 10.x | AGT-FLYWAY |
| [PROMPT-004](#prompt-004-desarrollo-backend-kotlin) | Implementar backend Kotlin hexagonal + TDD | AGT-BACKEND |
| [PROMPT-005](#prompt-005-desarrollo-frontend-angular) | Implementar frontend Angular standalone + Signals | AGT-FRONTEND |
| [PROMPT-006](#prompt-006-solo-backend-kotlin) | Solo backend Kotlin (sin DB nueva ni frontend) | AGT-BACKEND |
| [PROMPT-007](#prompt-007-corrección-runtime) | Diagnóstico y corrección de errores runtime | AGT-BACKEND |

---

## PROMPT-001: Workflow Completo

**Workflow:** `1-workflow/WF-DEV-002-desarrollo-fullstack-kotlin.md`  
**Tiempo estimado:** 4–8 horas  
**Stack:** Kotlin 2.x + Spring Boot 3.4.x + Angular 18+ + PostgreSQL 16 + Flyway 10.x

```markdown
Ejecuta el workflow: `1-workflow/WF-DEV-002-desarrollo-fullstack-kotlin.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto:** [NOMBRE DEL PROYECTO]
- **Feature / HUT:** [ID Y DESCRIPCIÓN — ej: HUT-AXON-FEND-001]
- **Bounded Context:** [nombre del BC — determina el schema de PostgreSQL]
- **Alcance:** Full-Stack

## AGENTES EN SECUENCIA
1. STEP-002 AGT-DATABASE → `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`
2. STEP-003 AGT-FLYWAY → `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`
3. STEP-004 AGT-BACKEND → `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`
4. STEP-005 AGT-FRONTEND → `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`

## REGLAS NO NEGOCIABLES (recordar a cada agente)
- domain/ es Kotlin puro — CERO Spring/JPA/Hibernate en esa capa
- Tests de domain/ son pure Kotlin (sin @SpringBootTest ni MockK de Spring)
- CERO SQL nativo (@Query nativeQuery=true) sin ADR aprobado
- CERO !! (not-null assertion) en código de producción
- Todos los endpoints HTTP son POST (excepto /actuator/health)
- ArchUnit debe reportar 0 violations en CI

¡Iniciar desarrollo full-stack Kotlin!
```

---

## PROMPT-002: Diseño Base de Datos

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`  
**Tiempo estimado:** 30–60 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`

## PARÁMETROS DE EJECUCIÓN

### Bounded Context / Schema
- **Schema PostgreSQL:** [nombre_bc]
  (ej: autenticacion, reservas, pagos, notificaciones)

### Aggregates y Value Objects del Dominio Kotlin
[LISTAR — uno por línea]

Ejemplo:
- Aggregate: Usuario
  - Value Objects: Email, Password, NombreCompleto, UsuarioId
  - Estado: EstadoUsuario (enum → ACTIVO | SUSPENDIDO | PENDIENTE_VERIFICACION)
  - Eventos de dominio: UsuarioRegistrado, UsuarioSuspendido
  - Relaciones con otros BC: ninguna (independiente)

### Requisitos de Negocio que Afectan el Modelo
[DESCRIBIR — ej: "necesitamos soft-delete", "el email debe ser único globalmente"]

## ENTREGABLES ESPERADOS
1. DDL de tablas usando **Dual Key Pattern**:
   - pkid_<tabla> BIGINT GENERATED ALWAYS AS IDENTITY   ← NO usar SERIAL
   - uuid_<tabla> UUID NOT NULL DEFAULT gen_random_uuid()
2. Índices y constraints con naming conventions:
   - pk_<tabla>, fk_<tabla>_<referencia>, idx_<tabla>_<campo>, uk_<tabla>_<campo>, ck_<tabla>_<condicion>
3. Campos de auditoría standard ZNS:
   - creation_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
4. Apertura de schema: CREATE SCHEMA IF NOT EXISTS <nombre_bc>
5. Diagrama ER en mermaid

## NOTA DE COMPATIBILIDAD KOTLIN + JPA
- Nombres de columna en snake_case (Spring Data los mapea automáticamente)
- Evitar reserved keywords de JPA/SQL como nombres de columna
  (user, group, order, status, type → agregar prefijo: usr_, grp_, etc.)
- Los @JvmInline value class del dominio no requieren columnas especiales
  — un BIGINT o UUID por ID es suficiente

¡Diseñar el modelo de datos para el stack Kotlin!
```

---

## PROMPT-003: Migraciones Flyway

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`  
**Tiempo estimado:** 20–45 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`

## PARÁMETROS DE EJECUCIÓN

### Modelo de Datos Aprobado (output de STEP-002)
[PEGAR DDL COMPLETO — tablas + índices + constraints]

### Versión de Migración
- **Última versión ejecutada:** [ej: 1.4]
- **Nueva versión:** [ej: 1.5]
- **Directorio de migraciones:** src/main/resources/db/migration/

### Configuración del Proyecto
- **DB:** PostgreSQL 16
- **Flyway:** 10.x
- **Profile Spring Boot:** application-dev.yml

## ENTREGABLES ESPERADOS
1. Archivo(s) de migración con naming **estricto**:
   V{version}__{descripcion_snake_case}.sql
   Ejemplos:
     V1_5__create_schema_autenticacion.sql
     V1_6__create_table_usuarios.sql
     V1_7__create_indexes_usuarios.sql
2. Archivo(s) de rollback (undo migration):
   U{version}__{descripcion_snake_case}.sql
3. Confirmación de ejecución exitosa:
   - ./gradlew flywayValidate → SUCCESS (o mvn flyway:validate)
   - ./gradlew flywayMigrate → SUCCESS
   - ./gradlew flywayInfo → versión actualizada visible

## CRITERIOS DE CALIDAD
- Migración idempotente (IF NOT EXISTS donde aplica) o rollback documentado
- Sin breaking changes destructivos en tablas con datos en producción
  (NUNCA DROP COLUMN sin migración de datos primero)
- El nombre del schema en la migración coincide EXACTAMENTE con el Bounded Context del backend Kotlin

¡Crear y ejecutar las migraciones Flyway!
```

---

## PROMPT-004: Desarrollo Backend Kotlin

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`  
**Skills activas obligatorias:**
- `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md`
- `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md`
- `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md`
- `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md`

**Tiempo estimado:** 90–180 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

Activa y aplica estas skills **antes de escribir una sola línea**:
- `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md`
- `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md`
- `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md`
- `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md`

## PARÁMETROS DE EJECUCIÓN

### HUT / Requisito Funcional
[PEGAR HUT COMPLETA CON CRITERIOS GIVEN-WHEN-THEN]

### Bounded Context
- **Nombre:** [ej: autenticacion]
- **Package base:** com.zenapses.[contexto]  (ej: com.zenapses.autenticacion)
- **Schema PostgreSQL:** [mismo nombre que usó Flyway en STEP-003]

### Tablas y Columnas Creadas por Flyway
[PEGAR RESULTADO DEL STEP-003 — schema + tablas + columnas exactas]

### Componentes del Dominio a Implementar
[LISTAR — confirmar con el diseño acordado en STEP-002]

Ejemplo:
- Aggregate: Usuario (UsuarioId, Email, Password, NombreCompleto, EstadoUsuario)
- Value Objects: Email (regex validation), Password (BCrypt wrapper), UsuarioId (@JvmInline)
- Domain Events: UsuarioRegistrado, UsuarioSuspendido
- Use Cases:
  - RegistrarUsuario → sealed result: Exito | EmailDuplicado | DatosInvalidos
  - SuspenderUsuario → sealed result: Exito | UsuarioNoEncontrado | YaSuspendido
  - BuscarUsuarioPorEmail → sealed result: Encontrado(usuario) | NoEncontrado
- Input Ports: RegistrarUsuarioUseCase, SuspenderUsuarioUseCase, BuscarUsuarioUseCase
- Output Ports: UsuarioRepository, PasswordHashService, EnviarEmailPort

## ORDEN ESTRICTO DE IMPLEMENTACIÓN (TDD Outside-In)
1. Tests de domain/ (pure Kotlin, sin @SpringBootTest, sin MockK de Spring)
2. Implementar Aggregates + Value Objects + Domain Events + Ports (interfaces)
3. Tests de application/ (MockK para Output Ports — sin Spring context)
4. Implementar Use Cases con sealed Results
5. Tests de infrastructure/@DataJpaTest (Testcontainers — solo infrastructure)
6. Implementar JpaEntity + JpaRepository + PersistenceAdapter + toDomain()/toJpaEntity()
7. Tests de Controller (MockMvc / WebTestClient — context mínimo)
8. Implementar @RestController con endpoints POST-only
9. ArchUnit tests (7 reglas — 0 violations admisibles)
10. ./gradlew jacocoTestCoverageVerification → domain ≥95% / application ≥90% / global ≥85%

## REGLAS ABSOLUTAS (no se negocian, no tienen excepciones)
- domain/ no importa org.springframework.*, jakarta.persistence.*, ni ningún framework
- Tests de domain/ son puro Kotlin: `val usuario = Usuario.crear(email, password, nombre)`
- CERO !! en código de producción
- CERO @Query(nativeQuery=true) sin ADR escrito y aprobado
- Todos los endpoints HTTP son POST (excepto /actuator/health)
- MockK para mocks — nunca Mockito (@Mock, @MockBean)
- ArchUnit verifica reglas en CI — falla el pipeline si hay violations

## ESTRUCTURA DE PAQUETES OBLIGATORIA
src/main/kotlin/com/zenapses/[contexto]/
├── domain/
│   ├── model/          ← Kotlin puro. CERO annotations de framework.
│   ├── event/          ← sealed interface DomainEvent
│   ├── repository/     ← interfaces (Output Ports para persistencia)
│   ├── service/        ← interfaces (Output Ports para servicios externos)
│   └── exception/      ← DomainException (si aplica — preferir sealed results)
├── application/
│   ├── port/
│   │   ├── in/         ← Input Port interfaces (Use Case contracts)
│   │   └── out/        ← Output Port interfaces adicionales
│   ├── service/        ← @Service que implementa Input Ports
│   ├── command/        ← data class Command (inmutables)
│   └── result/         ← sealed class/interface Result por Use Case
└── infrastructure/
    ├── adapter/
    │   ├── in/
    │   │   └── rest/   ← @RestController (POST-only)
    │   └── out/
    │       └── persistence/  ← @Entity, JpaRepository, PersistenceAdapter
    └── config/         ← Spring Security, beans, properties

¡Implementar el backend Kotlin con TDD y arquitectura hexagonal!
```

---

## PROMPT-005: Desarrollo Frontend Angular

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`  
**Tiempo estimado:** 60–120 minutos

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Feature de UI
[DESCRIPCIÓN DE LA FUNCIONALIDAD DE INTERFAZ]

### Especificación de Endpoints Backend Kotlin
[PEGAR O DESCRIBIR LOS ENDPOINTS DISPONIBLES]

⚠️ IMPORTANTE: El backend Kotlin usa POST para TODOS los endpoints.
Los servicios Angular deben usar this.http.post(...) exclusivamente.

Ejemplo:
  POST /api/v1/usuarios/registrar
    Body: { email: string, password: string, nombre: string, apellido: string }
    Response 201: { usuarioId: string }   ← UUID como string
    Response 409: { error: "EMAIL_DUPLICADO", detalle: "..." }
    Response 400: { error: "DATOS_INVALIDOS", campos: [...] }

  POST /api/v1/usuarios/buscar-por-email
    Body: { email: string }
    Response 200: { usuarioId, email, nombre, apellido, estado }
    Response 404: { error: "USUARIO_NO_ENCONTRADO" }

### Diseños UI / Referencia Figma
[DESCRIBIR O PEGAR URL DE FIGMA — si es disponible]

### Roles y Permisos
[INDICAR QUÉ ROLES TIENEN ACCESO]
(los roles coinciden con el enum RolUsuario del backend Kotlin)

### Módulo / Feature Angular
- **Nombre del módulo:** [ej: autenticacion]
- **Ruta base:** /[nombre-modulo]

## ENTREGABLES ESPERADOS
1. Interfaces TypeScript alineadas con los sealed results del backend:
   - SuccessResponse<T> → HTTP 200/201
   - ErrorResponse con discriminant field (tipo de error Kotlin → string en JSON)
2. Angular Service con HttpClient usando exclusivamente http.post()
3. Standalone Components con Signals + Reactive Forms (no Template-driven)
4. Lazy routes configuradas correctamente
5. Manejo de errores HTTP (catchError en RxJS):
   - 409 → mostrar mensaje de conflicto al usuario
   - 400 → mapear errores de campo al formulario reactivo
   - 401/403 → redirigir a login / mostrar acceso denegado
6. Tests con coverage ≥ 80%
7. ng build --configuration=production → Build successful (0 errores)
8. ng lint → 0 errores

## MAPEO SEALED RESULT KOTLIN → HTTP STATUS
| sealed Result Kotlin | HTTP Status | Acción en Frontend |
|----------------------|-------------|-------------------|
| Exito / Encontrado | 200 / 201 | Navegar / actualizar estado |
| EmailDuplicado | 409 Conflict | Error en campo email |
| UsuarioNoEncontrado | 404 Not Found | Mensaje en pantalla |
| DatosInvalidos | 400 Bad Request | Errores por campo |
| NoAutorizado | 401 Unauthorized | Redirigir a /login |
| SinPermisos | 403 Forbidden | Mostrar acceso denegado |

¡Implementar el frontend Angular integrado con el backend Kotlin!
```

---

## PROMPT-006: Solo Backend Kotlin

**Uso:** Cuando la DB y el frontend ya existen, o cuando se trabaja aisladamente en el backend Kotlin.

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

Activa las skills:
- `2-agents/zns-tools/skills/kotlin-lang-expert.skill.md`
- `2-agents/zns-tools/skills/ddd-hexagonal-kotlin.skill.md`
- `2-agents/zns-tools/skills/security-owasp-kotlin.skill.md`
- `2-agents/zns-tools/skills/tdd-testing-kotlin.skill.md`

## ALCANCE: Solo Backend Kotlin

### HUT / Requisito
[PEGAR HUT COMPLETA]

### Bounded Context
- **Nombre:** [nombre_bc]
- **Package base:** com.zenapses.[nombre_bc]

### Estado Actual de la DB
[INDICAR SI LA DB YA TIENE TABLAS O SI NECESITA FLYWAY]

## SECUENCIA SI DB NECESITA ACTUALIZARSE
1. AGT-DATABASE: Actualizar modelo → `prompt_dev_database_senior.md`
2. AGT-FLYWAY: Nueva migración → `prompt_dev_senior_flyway.md`
3. AGT-BACKEND: Implementar → `prompt-dev-kotlin-springboot-senior.md`

## SECUENCIA SI DB YA ESTÁ LISTA
1. AGT-BACKEND: Implementar directamente → `prompt-dev-kotlin-springboot-senior.md`

## VALIDACIÓN FINAL
- ./gradlew test → All tests passed
- ./gradlew jacocoTestCoverageVerification → domain ≥95% / global ≥85%
- ArchUnit → 0 violations
- ./gradlew bootRun (profile=dev) → /actuator/health → {"status":"UP"}

¡Ejecutar desarrollo solo backend Kotlin!
```

---

## PROMPT-007: Corrección Runtime

**Uso:** Cuando STEP-008 (verificación runtime) detecta errores en el backend Kotlin.

```markdown
Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

## DIAGNÓSTICO DE ERROR RUNTIME

### Log del Error
[PEGAR STACKTRACE / LOG COMPLETO — incluir las 50+ primeras líneas del stack]

### Contexto
- Fase del workflow: STEP-008 Verificación Runtime
- Paso ejecutado: `./gradlew bootRun --args='--spring.profiles.active=dev'`
- Stack: Kotlin [versión] + Spring Boot [versión]
- Bounded Context fallido: [nombre_bc]

## CLASIFICACIÓN DE ERRORES COMUNES EN KOTLIN SPRING BOOT

| Tipo de Error | Causa Probable | Acción |
|---------------|----------------|--------|
| `BeanCreationException` | DI mal configurado / dependencia circular | Revisar @Bean + @Component + @Service |
| `ArchUnit violation` | domain/ importa Spring/JPA (JAMÁS relajar) | Mover dependencia a infrastructure/ |
| `HibernateException` | Flyway no ejecutado / JpaEntity mal mapeado | Verificar ./gradlew flywayInfo + @Column names |
| `NullPointerException` | Uso de !! o lateinit var no inicializado | Reemplazar !! por ?.let{} / requireNotNull() |
| `ClassCastException en sealed class` | when() incompleto — falta else o rama | Agregar rama faltante en when expression |
| `AddressAlreadyInUseException` | Puerto 8080 ocupado por proceso anterior | Get-Process -Id (netstat -ano | findstr :8080) + Stop-Process |
| `FlywayException: checksum mismatch` | Migración editada después de ejecutar | Nueva migración en lugar de editar la anterior |
| `UnsatisfiedDependencyException` | Port (interfaz) sin implementación | Agregar @Component/@Service al Adapter |

## REGLA CRÍTICA AL CORREGIR

**Si el error es ArchUnit violation (domain/ importa Spring/JPA/Hibernate):**
→ JAMÁS mover la regla @ArchTest a exclusions o allowlist
→ SIEMPRE corregir el código: mover el import problemático a infrastructure/
→ Si la clase de domain/ necesita Spring, NO es domain/ — pertenece a application/ o infrastructure/

**Si el error es NPE por !!:**
→ JAMÁS "solucionar" envolviendo con try-catch
→ SIEMPRE refactorizar: !! → ?.let{} / requireNotNull() / valor por defecto ? :
→ Revisar si el flujo tiene un sealed result que ya debería retornar el error

## ENTREGABLES
- Causa raíz identificada y explicada
- Corrección aplicada (mínima y quirúrgica)
- ./gradlew build → BUILD SUCCESSFUL
- ./gradlew test → [X tests] All passed
- Backend arranca: curl -X POST http://localhost:8080/actuator/health → {"status":"UP"}

¡Diagnosticar y corregir el error runtime Kotlin!
```

---

## 📝 Notas de Uso

### Diferencias clave vs WF-DEV-002 (Go)

| Aspecto | Go (WF-DEV-002) | Kotlin (este archivo) |
|---------|-----------------|----------------------|
| Backend agente | `prompt-dev-backend-go.md` | `prompt-dev-kotlin-springboot-senior.md` |
| Skills backend | N/A | 4 skills Kotlin obligatorias |
| Mocking | N/A | MockK (NO Mockito) |
| Test dominio | N/A | Pure Kotlin (`val x = X.crear(...)`) |
| Validación domain | N/A | ArchUnit (`@ArchTest`) |
| Null safety | N/A | CERO `!!` en producción |
| Coverage mínimo | N/A | domain ≥95% / global ≥85% |
| Flyway naming | `V[M].[m].[p]__desc.sql` | `V{n.m}__desc.sql` (sin patch) |

---

**Versión:** 1.0.0  
**Última Actualización:** 2026-03-18  
**Workflow asociado:** [1-workflow/WF-DEV-002-desarrollo-fullstack-kotlin.md](./WF-DEV-002-desarrollo-fullstack-kotlin.md)  
**Ver también:** [1-workflow/WF-DEV-002-prompts-invocacion.md](./WF-DEV-002-prompts-invocacion.md) (stack Go)
