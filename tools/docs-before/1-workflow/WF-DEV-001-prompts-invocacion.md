# 🎯 WF-DEV-001 — Prompts de Invocación

---

**workflow**: WF-DEV-001-desarrollo-fullstack  
**version**: 2.0.0  
**fecha_actualizacion**: 2026-02-07  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.

---

## 🗂️ Mapa de Agentes

| Step | Agente | Ruta |
|------|--------|------|
| STEP-002 | Database Senior | `2-agents/5.zns-develop/4.database_senior/prompt_dev_database_senior.md` |
| STEP-003 | Flyway Specialist | `2-agents/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md` |
| STEP-004 | Backend Senior | `2-agents/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md` |
| STEP-005 | Frontend Senior | `2-agents/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md` |

---

## 📋 ÍNDICE DE PROMPTS

| Prompt | Objetivo | Agente |
|--------|----------|--------|
| [PROMPT-001](#prompt-001-workflow-completo) | Ejecutar desarrollo completo | Orquestador |
| [PROMPT-002](#prompt-002-diseño-base-de-datos) | Diseñar modelo PostgreSQL | Database Senior |
| [PROMPT-003](#prompt-003-migraciones-flyway) | Crear migraciones | Flyway Specialist |
| [PROMPT-004](#prompt-004-desarrollo-backend) | Implementar backend | Backend Senior |
| [PROMPT-005](#prompt-005-desarrollo-frontend) | Implementar frontend | Frontend Senior |

---

## PROMPT-001: Workflow Completo

**Workflow:** `1-workflow/WF-DEV-001-desarrollo-fullstack.md`  
**Tiempo estimado:** 4-8 horas

```markdown
Ejecuta el workflow: `1-workflow/WF-DEV-001-desarrollo-fullstack.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto:** MI-TOGA
- **Feature:** [DESCRIPCIÓN DEL FEATURE]
- **HUT relacionada:** HUT-XXX

## SECUENCIA
1. STEP-002: Database → `2-agents/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`
2. STEP-003: Flyway → `2-agents/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`
3. STEP-004: Backend → `2-agents/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`
4. STEP-005: Frontend → `2-agents/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`

¡Ejecutar desarrollo completo!
```

---

## PROMPT-002: Diseño Base de Datos

**Agente:** `2-agents/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`  
**Tiempo estimado:** 30-60 minutos

```markdown
Asume el rol definido en: `2-agents/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`

## PARÁMETROS DE EJECUCIÓN

### Entidades a Modelar
[LISTAR ENTIDADES Y RELACIONES]

### Bounded Context
- **Schema:** [nombre]_schema
- **Proyecto:** `0-docs/1-backend/0-mitoga-project/`

### Requisitos
- Dual Key Pattern (pkid_ + uuid_)
- Campos de auditoría (created_at, updated_at, created_by, updated_by)
- Naming conventions PostgreSQL

### Output
- DDL de tablas
- Índices
- Diagrama ER (Mermaid)

¡Diseñar modelo de datos!
```

---

## PROMPT-003: Migraciones Flyway

**Agente:** `2-agents/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`  
**Tiempo estimado:** 20-30 minutos

```markdown
Asume el rol definido en: `2-agents/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`

## PARÁMETROS DE EJECUCIÓN

### Input
- DDL del STEP-002 (Database)

### Proyecto Flyway
- **Ruta:** `0-docs/1-backend/3-mitoga-flyway/`
- **Migraciones:** `src/main/resources/db/migration/`

### Naming Convention
V[MAJOR].[MINOR].[PATCH]__[descripcion_snake_case].sql

### Output
Scripts SQL en directorio de migraciones

¡Crear scripts de migración!
```

---

## PROMPT-004: Desarrollo Backend

**Agente:** `2-agents/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`  
**Tiempo estimado:** 2-4 horas

```markdown
Asume el rol definido en: `2-agents/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Feature
[DESCRIPCIÓN DEL FEATURE]

### Proyecto
- **Ruta:** `0-docs/1-backend/0-mitoga-project/`
- **Package base:** `com.mitoga`

### Arquitectura
- Hexagonal + DDD
- Capas: domain → application → infrastructure → presentation

### Componentes a Crear
- [ ] Entity/Aggregate
- [ ] Repository (Port + Adapter)
- [ ] Use Case / Application Service
- [ ] REST Controller
- [ ] DTOs (Request/Response)
- [ ] Tests unitarios

### HUT de Referencia
`0-docs/0-Technical_stories/[HUT-XXX].md`

¡Implementar backend!
```

---

## PROMPT-005: Desarrollo Frontend

**Agente:** `2-agents/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`  
**Tiempo estimado:** 2-4 horas

```markdown
Asume el rol definido en: `2-agents/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Feature
[DESCRIPCIÓN DEL FEATURE]

### Proyecto
- **Ruta:** `0-docs/2-frontend/apps/[app]/`
- **Framework:** Angular 18

### APIs a Consumir
[LISTAR ENDPOINTS DEL BACKEND]

### Componentes a Crear
- [ ] Feature Module
- [ ] Components (Smart + Dumb)
- [ ] Services
- [ ] Models/Interfaces
- [ ] Routing
- [ ] Tests

### HUT de Referencia
`0-docs/0-Technical_stories/[HUT-XXX].md`

¡Implementar frontend!
```

---

## 🚀 Ejemplos de Uso Rápido

### Solo Backend:

```markdown
Asume el rol: `2-agents/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`
Feature: Sistema de notificaciones
Proyecto: `0-docs/1-backend/0-mitoga-project/`
¡Implementar!
```

### Solo Database:

```markdown
Asume el rol: `2-agents/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`
Entidades: User, Notification, NotificationPreference
Schema: notifications_schema
¡Diseñar modelo!
```

---

## 📚 REFERENCIAS

| Recurso | Ruta |
|---------|------|
| Workflow Principal | [WF-DEV-001-desarrollo-fullstack.md](./WF-DEV-001-desarrollo-fullstack.md) |
| Database Senior | [prompt_dev_database_senior.md](../2-agents/5.zns-develop/4.database_senior/prompt_dev_database_senior.md) |
| Flyway Specialist | [prompt_dev_senior_flyway.md](../2-agents/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md) |
| Backend Senior | [prompt-dev-springboot-senior.md](../2-agents/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md) |
| Frontend Senior | [prompt-dev-frontend-angular-senior.md](../2-agents/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md) |

---

**Versión:** 2.0.0  
**Cambio:** Refactorizado para usar referencias a agentes en lugar de duplicar contenido
