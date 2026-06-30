# 🎯 WF-HUT-001 — Prompts de Invocación

---

**workflow**: WF-HUT-001-technical-user-stories  
**version**: 2.1.0  
**fecha_actualizacion**: 2026-02-07  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.

---

## 🗂️ Mapa de Agentes Actualizado

| Operación | Agente | Ruta |
|-----------|--------|------|
| `/hut:crear` `/hut:afinar` | Technical Architect DDD | `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md` |
| `/hut:backend` | Backend Senior Spring Boot | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md` |
| `/hut:frontend` | Frontend Senior Angular | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md` |
| `/hut:database` | Database Senior PostgreSQL | `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md` |
| Flyway | Flyway Specialist | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md` |

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
| [PROMPT-003](#prompt-003-huts-backend) | `/hut:backend` | HUTs específicas Spring Boot | Backend Senior |
| [PROMPT-004](#prompt-004-huts-frontend) | `/hut:frontend` | HUTs específicas Angular | Frontend Senior |
| [PROMPT-005](#prompt-005-huts-database) | `/hut:database` | HUTs de modelo de datos | Database Senior |
| [PROMPT-006](#prompt-006-validar-huts) | `/hut:validar` | Verificar calidad HUTs | Checklist Validation |

---

## PROMPT-001: Crear HUTs desde HU (`/hut:crear`)

**Agente:** `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`  
**Tiempo estimado:** 45-90 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`

## PARÁMETROS DE EJECUCIÓN

### Historia de Usuario de Negocio
[PEGAR AQUÍ LA HU DE NEGOCIO O RUTA: 0-docs/1-business-analysis/2-user-stories/HU-XXX.md]

### Contexto del Proyecto
- **Proyecto:** MI-TOGA
- **Arquitectura:** Hexagonal + DDD + Spring Boot 3.4 + Angular 18 + PostgreSQL 16

### Output Esperado
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/`

## FASES A EJECUTAR
1. FASE 1: Análisis Estratégico DDD
2. FASE 2: Identificación de Bounded Contexts y Aggregates
3. FASE 3: Generación de HUTs por capa

¡Ejecutar descomposición completa!
```

---

## PROMPT-002: Afinar HUTs Existentes (`/hut:afinar`)

**Agente:** `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`  
**Checklist:** `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`  
**Tiempo estimado:** 30-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`

## PARÁMETROS DE EJECUCIÓN

### HUT a Afinar
- **Ruta:** [0-docs/3-technical-stories/[tipo]/HUT-XXX-*.md]

### Tipo de Refinamiento
- [ ] Completar criterios de aceptación
- [ ] Agregar especificaciones técnicas
- [ ] Detallar contratos API
- [ ] Definir modelo de datos
- [ ] Agregar casos de prueba

### Checklist de Validación
Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Output
HUT actualizada en su ubicación original

¡Afinar HUT según gaps identificados!
```

---

## PROMPT-003: HUTs Backend (`/hut:backend`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`  
**Template:** `2-agents/zns-tools/technical-user-stories/template-hut-api.md`  
**Tiempo estimado:** 45-60 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]

### Componentes a Especificar
- [ ] Entities/Aggregates (Domain Layer)
- [ ] Repositories Port + Adapter (Infrastructure)
- [ ] Use Cases / Application Services
- [ ] REST Controllers (Presentation)
- [ ] DTOs Request/Response
- [ ] Tests unitarios e integración

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut-api.md`

### Output
Directorio: `0-docs/3-technical-stories/2-api/HUT-API-XXX-*.md`

¡Crear HUTs de Backend Spring Boot!
```

---

## PROMPT-004: HUTs Frontend (`/hut:frontend`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`  
**Template:** `2-agents/zns-tools/technical-user-stories/template-hut.md`  
**Tiempo estimado:** 45-60 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]
- **APIs a consumir:** [listar endpoints del backend]

### Componentes a Especificar
- [ ] Feature Module
- [ ] Components (Smart + Dumb)
- [ ] Services
- [ ] Models/Interfaces
- [ ] Routing
- [ ] Tests

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut.md`

### Output
Directorio: `0-docs/3-technical-stories/1-domain/[bounded-context]/HUT-UI-XXX-*.md`

¡Crear HUTs de Frontend Angular!
```

---

## PROMPT-005: HUTs Database (`/hut:database`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`  
**Template:** `2-agents/zns-tools/technical-user-stories/template-hut-database.md`  
**Tiempo estimado:** 30-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: Aggregates del análisis DDD
- **Entidades a persistir:** [LISTAR]
- **Schema:** [nombre]_schema

### Requisitos Obligatorios
- Dual Key Pattern (pkid_ + uuid_)
- Campos de auditoría (created_at, updated_at, created_by, updated_by)
- Naming conventions PostgreSQL

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut-database.md`

### Output
- `0-docs/3-technical-stories/0-infra/HUT-INFRA-DB-XXX-tablas.md`
- `0-docs/3-technical-stories/0-infra/HUT-INFRA-DB-XXX-indices.md`

¡Crear HUTs de Database PostgreSQL!
```

---

## PROMPT-006: Validar HUTs (`/hut:validar`)

**Checklist:** `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`  
**Tiempo estimado:** 15-20 minutos por HUT

```markdown
## VALIDACIÓN DE HUT

### HUT a Validar
- **Ruta:** [0-docs/3-technical-stories/[tipo]/HUT-XXX-*.md]

### Checklist de Validación
Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Criterios a Verificar
1. [ ] Título claro (HUT-[TIPO]-[NUM]-[descripcion])
2. [ ] Descripción técnica completa
3. [ ] Criterios de aceptación verificables (Given-When-Then)
4. [ ] Story Points estimados (Fibonacci)
5. [ ] Dependencias identificadas
6. [ ] Componentes técnicos especificados
7. [ ] Trazabilidad a HU de negocio
8. [ ] Tests definidos

### Output
Reporte de validación con gaps identificados

¡Validar HUT contra checklist!
```

---

## PROMPT-FLYWAY: HUTs de Migraciones (complementario)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`  
**Tiempo estimado:** 20-30 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md`

## PARÁMETROS DE EJECUCIÓN

### Input: DDL de HUTs de Database
[REFERENCIAR HUT-XXX-INFRA-DB-01]

### Proyecto Flyway
- **Ruta:** `0-docs/4-source-code/0-backend/2-mitoga-flyway/`
- **Migraciones:** `src/main/resources/db/migration/`

### Naming Convention
V[MAJOR].[MINOR].[PATCH]__[descripcion_snake_case].sql

### Output
- `0-docs/3-technical-stories/0-infra/HUT-INFRA-FLY-XXX-migraciones.md`

¡Crear HUTs de Migraciones Flyway!
```

---

## 🚀 FLUJO RÁPIDO DE EJECUCIÓN

### Opción A: Descomposición Completa (recomendado)

```markdown
# 1. Crear HUTs desde HU de negocio
/hut:crear → Ejecutar PROMPT-001

# 2. Si necesita detalle Backend
/hut:backend → Ejecutar PROMPT-003

# 3. Si necesita detalle Database
/hut:database → Ejecutar PROMPT-005

# 4. Si necesita detalle Frontend
/hut:frontend → Ejecutar PROMPT-004

# 5. Validar resultado
/hut:validar → Ejecutar PROMPT-006
```

### Opción B: Afinar HUT existente

```markdown
# 1. Identificar gaps en HUT
/hut:validar → Ver checklist

# 2. Afinar HUT
/hut:afinar → Ejecutar PROMPT-002
```

---

## 📚 REFERENCIAS ACTUALIZADAS

| Recurso | Ruta |
|---------|------|
| Workflow Principal | [WF-HUT-001-technical-user-stories.md](./WF-HUT-001-technical-user-stories.md) |
| **Technical Architect DDD** | [prompt-technical-user-stories.md](../2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md) |
| **Backend Senior** | [prompt-dev-springboot-senior.md](../2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md) |
| **Database Senior** | [prompt_dev_database_senior.md](../2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md) |
| **Frontend Senior** | [prompt-dev-frontend-angular-senior.md](../2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md) |
| **Flyway Specialist** | [prompt_dev_senior_flyway.md](../2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md) |
| Template HUT | [template-hut.md](../2-agents/zns-tools/technical-user-stories/template-hut.md) |
| Template HUT API | [template-hut-api.md](../2-agents/zns-tools/technical-user-stories/template-hut-api.md) |
| Template HUT Database | [template-hut-database.md](../2-agents/zns-tools/technical-user-stories/template-hut-database.md) |
| Checklist Validación | [checklist-huts-validation.md](../2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md) |

---

**Versión:** 2.1.0  
**Cambio:** Rutas actualizadas a `zns-tools/technical-user-stories` y `zns-tecnical-team`, menú de comandos `/hut:*`
