# 🎯 WF-DOC-001 — Prompts de Invocación

---

**workflow**: WF-DOC-001-documentacion-tecnica  
**version**: 1.0.0  
**fecha_actualizacion**: 2026-05-12  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.

---

## 🗂️ Mapa de Agentes

| Step | Agente | Ruta |
|------|--------|------|
| ALL | Technical Documentation Senior | `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md` |

### Skill Requerida

| Skill | Ruta |
|-------|------|
| Technical Documentation IEEE/ISO Expert | `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md` |

---

## 📋 ÍNDICE DE PROMPTS

| Prompt | Objetivo | Modo |
|--------|----------|------|
| [PROMPT-001](#prompt-001-workflow-completo) | Documentación completa de cierre/release | 📚 COMPLETO |
| [PROMPT-002](#prompt-002-snapshot-feature) | Documentar 1 feature/módulo específico | 📸 SNAPSHOT |
| [PROMPT-003](#prompt-003-incremental-sprint) | Documentar avance del sprint | 📋 INCREMENTAL |
| [PROMPT-004](#prompt-004-release-notes) | Generar release notes | 🚀 RELEASE |
| [PROMPT-005](#prompt-005-validar-documentacion) | Auditar documentación existente | ✅ VALIDAR |
| [PROMPT-006](#prompt-006-onboarding) | Generar guía de onboarding | 👋 ONBOARDING |

---

## PROMPT-001: Workflow Completo (Documentación de Cierre)

**Workflow**: `1-workflow/WF-DOC-001-documentacion-tecnica.md`  
**Agente**: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`  
**Skill**: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`  
**Modo**: 📚 COMPLETO  
**Tiempo estimado**: 4-8 horas

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`

Carga la skill: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`

Ejecuta el workflow: `1-workflow/WF-DOC-001-documentacion-tecnica.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto**: [NOMBRE DEL PROYECTO]
- **Versión**: [X.Y.Z]
- **Modo**: COMPLETO (📚)
- **Código Backend**: `0-docs/4-source-code/0-backend/`
- **Código Frontend**: `0-docs/4-source-code/1-frontend/`
- **HUs**: `0-docs/2-context-hu/`
- **HUTs**: `0-docs/3-technical-stories/`
- **Output**: `0-docs/9-technical-docs/`

## OBJETIVO
Generar documentación técnica y funcional COMPLETA del proyecto siguiendo estándares IEEE/ISO.
Incluir: SAD, APIs, Modelo de Datos, Frontend, Infraestructura, Seguridad, Release Notes, 
Glosario, Trazabilidad y Guía de Onboarding.

## ENTREGABLES ESPERADOS
- `0-docs/9-technical-docs/README.md` (Índice maestro)
- `0-docs/9-technical-docs/01-arquitectura/` (SAD + C4 + ADRs)
- `0-docs/9-technical-docs/02-backend/` (APIs + Modelo de Datos + Módulos)
- `0-docs/9-technical-docs/03-frontend/` (Componentes + Estado + Integraciones)
- `0-docs/9-technical-docs/04-infraestructura/` (Despliegue + CI/CD)
- `0-docs/9-technical-docs/05-seguridad/` (Auth + OWASP)
- `0-docs/9-technical-docs/06-releases/release-v[X.Y.Z].md`
- `0-docs/9-technical-docs/07-onboarding/` (Guía dev + Convenciones)
- `0-docs/9-technical-docs/glosario.md`
- `0-docs/9-technical-docs/trazabilidad.md`

¡Comenzar con STEP-001: Escanear Proyecto!
```

---

## PROMPT-002: Snapshot de Feature

**Agente**: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`  
**Skill**: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`  
**Modo**: 📸 SNAPSHOT  
**Tiempo estimado**: 30-60 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`

Carga la skill: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto**: [NOMBRE DEL PROYECTO]
- **Feature a documentar**: [NOMBRE/DESCRIPCIÓN DEL FEATURE]
- **HU relacionada**: [HU-XXX]
- **HUTs relacionadas**: [HUT-XXX-001, HUT-XXX-002, ...]
- **Modo**: SNAPSHOT (📸)

## CÓDIGO A ANALIZAR
- **Backend**: `0-docs/4-source-code/0-backend/[ruta-al-modulo]/`
- **Frontend**: `0-docs/4-source-code/1-frontend/[ruta-al-componente]/`

## OBJETIVO
Documentar SOLO el feature [NOMBRE] de forma completa:
- Diagrama de secuencia del flujo
- API endpoints involucrados
- Modelo de datos utilizado
- Componentes frontend (si aplica)
- Reglas de negocio implementadas

## OUTPUT
- `0-docs/9-technical-docs/02-backend/modulos/mod-[feature].md`
- `0-docs/9-technical-docs/02-backend/apis/api-[feature].md` (si aplica)

¡Documentar feature!
```

---

## PROMPT-003: Incremental (Avance Sprint)

**Agente**: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`  
**Skill**: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`  
**Modo**: 📋 INCREMENTAL  
**Tiempo estimado**: 1-3 horas

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`

Carga la skill: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto**: [NOMBRE DEL PROYECTO]
- **Sprint/Iteración**: [Número o nombre]
- **Modo**: INCREMENTAL (📋)

## FEATURES NUEVOS EN ESTE SPRINT
1. [Feature 1]: HU-XXX — [Descripción breve]
2. [Feature 2]: HU-XXX — [Descripción breve]
3. [Feature N]: HU-XXX — [Descripción breve]

## CÓDIGO NUEVO/MODIFICADO
- **Backend**: `0-docs/4-source-code/0-backend/[rutas-modificadas]/`
- **Frontend**: `0-docs/4-source-code/1-frontend/[rutas-modificadas]/`

## OBJETIVO
Actualizar documentación técnica con los features del sprint actual:
- Documentar features nuevos
- Actualizar diagramas de arquitectura si hubo cambios
- Actualizar índice maestro
- Actualizar changelog documental

¡Documentar avance del sprint!
```

---

## PROMPT-004: Release Notes

**Agente**: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`  
**Skill**: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`  
**Modo**: 🚀 RELEASE  
**Tiempo estimado**: 20-30 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`

Carga la skill: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto**: [NOMBRE DEL PROYECTO]
- **Versión del Release**: [X.Y.Z]
- **Fecha del Release**: [YYYY-MM-DD]
- **Ambiente**: [Staging | Producción]
- **Modo**: RELEASE (🚀)

## CONTENIDO DEL RELEASE
### Nuevas Funcionalidades
- [Feature 1]: [Descripción] (HU-XXX)
- [Feature 2]: [Descripción] (HU-XXX)

### Correcciones
- [Bug 1]: [Descripción]

### Breaking Changes (si aplica)
- [Cambio 1]: [Descripción + guía de migración]

## OBJETIVO
Generar release notes profesionales en:
`0-docs/9-technical-docs/06-releases/release-v[X.Y.Z].md`

¡Generar release notes!
```

---

## PROMPT-005: Validar Documentación Existente

**Agente**: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`  
**Skill**: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`  
**Modo**: ✅ VALIDAR  
**Tiempo estimado**: 30-60 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`

Carga la skill: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto**: [NOMBRE DEL PROYECTO]
- **Documentación a auditar**: `0-docs/9-technical-docs/`
- **Código de referencia**: `0-docs/4-source-code/`
- **Modo**: VALIDAR (✅)

## OBJETIVO
Auditar toda la documentación existente contra:
1. Estándares IEEE (26511, 1063, 29148, 42010)
2. Estándares ISO (26514, 15289, 12207, 25010)
3. Sincronización con código actual (¿la doc refleja el código real?)
4. Completitud (¿hay gaps documentales?)

## ENTREGABLE
Reporte de auditoría con:
- Porcentaje de conformidad IEEE/ISO
- Lista de no conformidades con prioridad
- Recomendaciones de corrección
- Estado de sincronización doc↔código

¡Auditar documentación!
```

---

## PROMPT-006: Guía de Onboarding

**Agente**: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`  
**Skill**: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`  
**Modo**: 👋 ONBOARDING  
**Tiempo estimado**: 30-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/prompt-doc-technical-senior.md`

Carga la skill: `2-agents/zns-tools/skills/technical-documentation-ieee-iso-expert.skill.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto**: [NOMBRE DEL PROYECTO]
- **Stack**: [Ej: Spring Boot + PostgreSQL + Next.js + TypeScript]
- **Modo**: ONBOARDING (👋)

## OBJETIVO
Generar guía de onboarding para desarrolladores nuevos que incluya:
1. Setup del ambiente de desarrollo (paso a paso)
2. Arquitectura del proyecto (resumen visual)
3. Convenciones del equipo (naming, commits, branching, PRs)
4. Flujo de desarrollo (branch → code → test → PR → merge)
5. Recursos y documentación clave (links internos)
6. FAQ técnico

## ENTREGABLES
- `0-docs/9-technical-docs/07-onboarding/guia-desarrollador.md`
- `0-docs/9-technical-docs/07-onboarding/convenciones.md`

¡Generar guía de onboarding!
```

---

## 📋 REFERENCIA RÁPIDA DE INVOCACIÓN

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INVOCACIÓN RÁPIDA — Copiar y ajustar parámetros entre [ ]             │
│                                                                         │
│  📚 Completo:    Usar PROMPT-001 (cierre/release, 4-8h)                │
│  📸 Snapshot:    Usar PROMPT-002 (1 feature, 30-60 min)                │
│  📋 Incremental: Usar PROMPT-003 (avance sprint, 1-3h)                │
│  🚀 Release:     Usar PROMPT-004 (release notes, 20-30 min)           │
│  ✅ Validar:     Usar PROMPT-005 (auditoría IEEE/ISO, 30-60 min)      │
│  👋 Onboarding:  Usar PROMPT-006 (guía para devs nuevos, 30-45 min)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**FIN DEL DOCUMENTO — v1.0.0**
