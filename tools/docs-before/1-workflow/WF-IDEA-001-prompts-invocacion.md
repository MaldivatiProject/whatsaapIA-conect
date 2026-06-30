# 💡 WF-IDEA-001 — Prompts de Invocación

---

**workflow**: WF-IDEA-001-idea-a-hu  
**version**: 1.0.0  
**fecha_creacion**: 2026-03-18  
**tipo**: Prompts de Ejecución (Referencias a Agentes)

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido del agente.**  
> Solo contiene **referencias** al agente y **parámetros específicos** de cada ejecución.

---

## 🗂️ Mapa de Agente

| Operación | Agente | Ruta |
|-----------|--------|------|
| Todas las operaciones | Idea to HU Senior | `2-agents/zns-tools/prompt-idea-a-hu-senior.md` |

---

## 📋 ÍNDICE DE PROMPTS

| Prompt | Comando | Objetivo |
|--------|---------|----------|
| [PROMPT-001](#prompt-001-nueva-idea) | `/idea:nueva` | Capturar nueva idea y generar HU formal |
| [PROMPT-002](#prompt-002-refinar-hu) | `/idea:refinar` | Completar/mejorar una HU incompleta |
| [PROMPT-003](#prompt-003-validar-hu) | `/idea:validar` | Verificar HU contra criterios INVEST |
| [PROMPT-004](#prompt-004-dividir-hu) | `/idea:split` | Dividir HU grande en múltiples HUs atómicas |

---

## PROMPT-001: Nueva Idea → HU (`/idea:nueva`)

**Agente:** `2-agents/zns-tools/prompt-idea-a-hu-senior.md`  
**Tiempo estimado:** 20-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tools/prompt-idea-a-hu-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Contexto del Proyecto
- **Proyecto:** [NOMBRE_PROYECTO]
- **Dominio de negocio:** [ej: e-commerce, salud, fintech, SaaS B2B]
- **Código de dominio:** [ej: USR, PAY, AUTH, NOTIF, INV]

### Idea a procesar
[PEGAR AQUÍ LA IDEA EN TEXTO LIBRE — sin estructura requerida]

### Output Esperado
- **Ruta:** `00-docs/2-context-hu/[codigo_dominio_lowercase]/HU-[DOMINIO]-[NNN].md`
- **Incluir:** narrativa Como/Quiero/Para, criterios Gherkin, Scope Boundary, Mapa de Actores, Glosario, Handoff WF-HUT-001

## FASES A EJECUTAR
1. FASE 0: Inicialización — confirmar contexto del proyecto
2. FASE 1: Captura bruta de la idea (sin interrupciones)
3. FASE 2: Paraphrase Confirmation y elicitación 5W1H
4. FASE 3: Redacción de la HU formal
5. FASE 4: Validación INVEST (6/6 criterios)
6. FASE 5: Guardar en `00-docs/2-context-hu/[dominio]/`

## PROTOCOLOS OBLIGATORIOS
- Assumption Tagging: marcar [ASUMIDO] todo dato no confirmado
- Verification Gate antes de redactar la HU
- Máximo 3 preguntas por turno
- No generar borrador antes de completar la elicitación

¡Ejecutar captura completa!
```

---

## PROMPT-002: Refinar HU Existente (`/idea:refinar`)

**Agente:** `2-agents/zns-tools/prompt-idea-a-hu-senior.md`  
**Tiempo estimado:** 15-30 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tools/prompt-idea-a-hu-senior.md`

## PARÁMETROS DE EJECUCIÓN

### HU a Refinar
- **Ruta:** `00-docs/2-context-hu/[dominio]/HU-[DOMINIO]-[NNN].md`
- **Contenido actual:** [PEGAR CONTENIDO O INDICAR RUTA]

### Tipo de Refinamiento
- [ ] Completar criterios de aceptación Gherkin faltantes
- [ ] Agregar Scope Boundary (In/Out)
- [ ] Definir Requisitos No Funcionales con umbrales
- [ ] Verificar y completar Mapa de Actores
- [ ] Completar Glosario del Dominio
- [ ] Otro: [ESPECIFICAR]

### Output Esperado
- HU mejorada guardada en la misma ruta
- Changelog dentro del archivo con nota de refinamiento

## EJECUTAR
- Identificar campos faltantes o incompletos
- Elicitar información adicional al usuario sólo para los campos faltantes
- Aplicar Verification Gate antes de actualizar
- Verificar nuevamente criterios INVEST al finalizar

¡Ejecutar refinamiento!
```

---

## PROMPT-003: Validar HU Existente (`/idea:validar`)

**Agente:** `2-agents/zns-tools/prompt-idea-a-hu-senior.md`  
**Tiempo estimado:** 10-15 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tools/prompt-idea-a-hu-senior.md`

## PARÁMETROS DE EJECUCIÓN

### HU a Validar
- **Ruta:** `00-docs/2-context-hu/[dominio]/HU-[DOMINIO]-[NNN].md`
- **Contenido:** [PEGAR CONTENIDO O INDICAR RUTA]

### Validación a Ejecutar
Verificar contra los siguientes criterios:

**INVEST:**
- [ ] Independiente
- [ ] Negociable
- [ ] Valiosa
- [ ] Estimable
- [ ] Small (1-3 sprints)
- [ ] Testeable

**Estructura completa:**
- [ ] Narrativa Como/Quiero/Para
- [ ] Mínimo 1 criterio Gherkin happy path
- [ ] Mínimo 1 criterio Gherkin de error
- [ ] Scope Boundary (In Scope + Out of Scope)
- [ ] Mapa de Actores
- [ ] Glosario del Dominio

### Output Esperado
- Reporte de validación con criterios ✅/❌
- Lista priorizada de mejoras si hay criterios fallidos
- Recomendación: ✅ Lista para WF-HUT-001 / ⚠️ Requiere refinamiento

¡Ejecutar validación!
```

---

## PROMPT-004: Dividir HU Grande (`/idea:split`)

**Agente:** `2-agents/zns-tools/prompt-idea-a-hu-senior.md`  
**Tiempo estimado:** 20-30 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tools/prompt-idea-a-hu-senior.md`

## PARÁMETROS DE EJECUCIÓN

### HU a Dividir
- **Ruta original:** `00-docs/2-context-hu/[dominio]/HU-[DOMINIO]-[NNN].md`
- **Contenido:** [PEGAR CONTENIDO O INDICAR RUTA]

### Motivo del split
[INDICAR por qué se considera grande: múltiples actores, múltiples flujos, demasiados criterios de aceptación, etc.]

### Output Esperado
- Análisis de los puntos de división naturales (value slicing)
- N HUs atómicas derivadas, cada una:
  - En `00-docs/2-context-hu/[dominio]/HU-[DOMINIO]-[NNN].md`
  - Con ID correlativo al original (ej: HU-AUTH-002, HU-AUTH-003)
- HU original marcada como `Estado: Deprecada` con referencia a las HUs hijas

## REGLAS DE SPLIT
- Cada HU resultante debe pasar INVEST independientemente
- El valor de negocio no puede quedar incompleto en ninguna HU hija
- Máximo 3-5 criterios Gherkin por HU resultante

¡Ejecutar análisis y split!
```

---

## 📋 PROMPT DE INVOCACIÓN RÁPIDA (Copia & Pega)

> Para casos donde ya tienes la idea clara y solo necesitas el flujo mínimo:

```markdown
Asume el rol definido en: `2-agents/zns-tools/prompt-idea-a-hu-senior.md`

Proyecto: [NOMBRE]
Dominio: [NOMBRE_DOMINIO]  
Código: [COD]

Idea: [TU IDEA EN TEXTO LIBRE]

Output: `00-docs/2-context-hu/[cod_lowercase]/HU-[COD]-[NNN].md`

Ejecutar flujo completo: captura → elicitación → redacción → INVEST → guardar.
```

---

## 🔗 Workflows Relacionados

| Workflow | Comando | Cuándo usar |
|----------|---------|-------------|
| `WF-HUT-001` | `/workflow:hut` | Después de generar la HU — para descomponer en HUTs técnicas |
| `WF-DEV-001` | `/workflow:dev` | Después de tener HUTs — para implementar el código |
