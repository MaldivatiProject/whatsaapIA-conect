# 🎯 WF-QA-001 — Prompts de Invocación

---

**workflow**: WF-QA-001-quality-assurance  
**version**: 2.0.0  
**fecha_actualizacion**: 2026-02-07  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.
>
> **Agente** = La clase/función (definición completa)  
> **Prompt de Invocación** = La llamada con argumentos (parámetros de ejecución)

---

## 🗂️ Mapa de Agentes

| Prompt | Agente | Ruta |
|--------|--------|------|
| PROMPT-001 a 004 | QA Orchestrator | `1-workflow/WF-QA-001-quality-assurance.md` |
| PROMPT-003 | Peer Review Senior | `2-agents/zns-quality/prompt-peer-review-senior.md` |

---

## 📋 ÍNDICE DE PROMPTS

| Prompt | Objetivo | Duración Est. |
|--------|----------|:-------------:|
| [PROMPT-001](#prompt-001-ejecutar-workflow-completo) | Ejecutar workflow completo | 2-4 horas |
| [PROMPT-002](#prompt-002-escanear-huts) | Solo escanear e inventariar HUTs | 15 min |
| [PROMPT-003](#prompt-003-peer-review-hut-específica) | Peer Review de HUT específica | 30-45 min |
| [PROMPT-004](#prompt-004-actualizar-dashboard) | Actualizar dashboard de QA | 10 min |

---

## PROMPT-001: Ejecutar Workflow Completo

**Agente:** Workflow definido en `1-workflow/WF-QA-001-quality-assurance.md`  
**Sub-agente:** `2-agents/zns-quality/prompt-peer-review-senior.md`  
**Tiempo estimado:** 2-4 horas

```markdown
Ejecuta el workflow definido en: `1-workflow/WF-QA-001-quality-assurance.md`

## PARÁMETROS DE EJECUCIÓN
- **Proyecto:** MI-TOGA
- **Directorio HUTs:** `0-docs/3-technical-stories/`
- **Directorio Código:** `0-docs/4-source-code/`
- **Directorio Output:** `0-docs/5-quality-assurance/`

## AGENTE PARA PEER REVIEW
Para cada HUT, invocar: `2-agents/zns-quality/prompt-peer-review-senior.md`

## PRIORIZACIÓN
1. Prioridad ALTA primero
2. Tipo INFRA antes que otros (fundacional)
3. Sprint menor primero (más antiguo)

¡Ejecutar desde STEP-001!
```

---

## PROMPT-002: Escanear HUTs

**Agente:** STEP-001 y STEP-002 del workflow  
**Tiempo estimado:** 15 minutos

```markdown
Ejecuta STEP-001 y STEP-002 del workflow: `1-workflow/WF-QA-001-quality-assurance.md`

## PARÁMETROS
- **Directorio a escanear:** `0-docs/3-technical-stories/`
- **Patrón de archivos:** `HUT-*.md`

## OUTPUT ESPERADO
Inventario en: `0-docs/5-quality-assurance/inventario-huts.md`

¡Solo escaneo, sin ejecutar reviews!
```

---

## PROMPT-003: Peer Review HUT Específica

**Agente:** `2-agents/zns-quality/prompt-peer-review-senior.md`  
**Templates:** `2-agents/zns-quality/templates/`  
**Tiempo estimado:** 30-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-quality/prompt-peer-review-senior.md`

## PARÁMETROS DE EJECUCIÓN

### HUT a Validar
- **ID:** HUT-INFRA-001
- **Archivo:** `0-docs/3-technical-stories/0-infra/HUT-INFRA-001-flyway-migration-project.md`

### Código Relacionado
- **Ruta:** `0-docs/4-source-code/0-backend/2-mitoga-flyway/`
- **Tests:** `src/test/java/`

### Templates a Usar
- **Reporte:** `2-agents/zns-quality/templates/template-peer-review-report.md`
- **Validación HUT:** `2-agents/zns-quality/templates/template-hut-validation-block.md`

### Output Esperado
- **Reporte:** `0-docs/5-quality-assurance/0-peer-reviews/reports/PR-HUT-INFRA-001-2026-02-07.md`
- **Actualizar HUT** con bloque de validación

¡Ejecutar Peer Review completo siguiendo el proceso del agente!
```

---

## PROMPT-004: Actualizar Dashboard

**Agente:** STEP-008 y STEP-009 del workflow  
**Tiempo estimado:** 10 minutos

```markdown
Ejecuta STEP-008 y STEP-009 del workflow: `1-workflow/WF-QA-001-quality-assurance.md`

## PARÁMETROS
- **Fuente inventario:** `0-docs/3-technical-stories/`
- **Fuente reportes:** `0-docs/5-quality-assurance/0-peer-reviews/reports/PR-*.md`
- **Dashboard a actualizar:** `0-docs/5-quality-assurance/0-peer-reviews/dashboard-qa.md`

¡Consolidar métricas y actualizar dashboard!
```

---

## 🎯 Ejemplo de Uso Completo

### Para validar HUT-INFRA-001:

```markdown
Asume el rol definido en: `2-agents/zns-quality/prompt-peer-review-senior.md`

PARÁMETROS:
- HUT: `0-docs/3-technical-stories/0-infra/HUT-INFRA-001-flyway-migration-project.md`
- Código: `0-docs/4-source-code/0-backend/2-mitoga-flyway/`
- Output: `0-docs/5-quality-assurance/0-peer-reviews/reports/PR-HUT-INFRA-001-2026-02-07.md`

¡Comenzar!
```

### Para ciclo completo de QA:

```markdown
Ejecuta workflow: `1-workflow/WF-QA-001-quality-assurance.md`
Proyecto: MI-TOGA
¡Desde STEP-001!
```

---

## 📚 REFERENCIAS

| Recurso | Ruta |
|---------|------|
| Workflow Principal | [WF-QA-001-quality-assurance.md](./WF-QA-001-quality-assurance.md) |
| Agente Peer Review | [prompt-peer-review-senior.md](../2-agents/zns-quality/prompt-peer-review-senior.md) |
| Template Reporte | [template-peer-review-report.md](../2-agents/zns-quality/templates/template-peer-review-report.md) |
| Template Validación | [template-hut-validation-block.md](../2-agents/zns-quality/templates/template-hut-validation-block.md) |

---

**Versión:** 2.0.0  
**Cambio:** Refactorizado para usar referencias a agentes en lugar de duplicar contenido
