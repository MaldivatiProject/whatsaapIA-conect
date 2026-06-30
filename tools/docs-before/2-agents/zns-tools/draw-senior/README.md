# 🏗️ draw-senior — Especialista en Diagramas C4 y Despliegue

**metodo**: ZNS v2.2  
**directorio**: `2-agents/zns-tools/draw-senior/`  
**last_updated**: 2026-04-17  
**mantenido_por**: Prompt Engineer Senior ZNS

---

## ¿Qué es este agente?

**Draw Senior** es un agente especializado en transformar definiciones de arquitectura (ADRs, HUs técnicas, descripciones de stack) en diagramas C4 y de deployment de **máxima claridad visual y UX**, listos para ser embebidos en documentación técnica, presentados a stakeholders o versionados en Git.

---

## 📁 Estructura del Directorio

```
draw-senior/
├── README.md                                    ← Este archivo
├── prompt-draw-c4-deployment-senior.md          ← Agente principal (usar este)
└── skills/
    ├── c4-model-diagram-expert.skill.md         ← Skill: C4 Model L1/L2/L3/Deployment
    ├── deployment-diagram-ux-expert.skill.md    ← Skill: Deployment + UX de diagramas
    └── plantuml-png-export-expert.skill.md      ← Skill: Exportación PNG 300 DPI + batch
```

---

## 🚀 Cómo Usar Este Agente

### Invocación directa

```
Hola, necesito que asumas el rol de Draw Senior — Especialista en Diagramas C4 y Despliegue ZNS.

SISTEMA: [nombre del sistema]

DEFINICIÓN DE ARQUITECTURA:
[Tu definición aquí]

INSTRUCCIONES:
Sigue el prompt maestro en: 2-agents/zns-tools/draw-senior/prompt-draw-c4-deployment-senior.md

¡Comencemos!
```

---

## 🎯 Qué Produce Este Agente

| Entregable | Formato | Audiencia |
|------------|---------|-----------|
| C4 L1 — System Context | `.puml` | Stakeholders, gerencia, usuarios |
| C4 L2 — Container | `.puml` | Developers, arquitectos, DevOps |
| C4 L3 — Component (x servicio) | `.puml` | Developers del servicio específico |
| Deployment PROD | `.puml` + `.png` | SRE, DevOps, Platform Engineers |
| Deployment STAGING | `.puml` + `.png` | SRE, QA, DevOps |
| Deployment DEV | `.puml` + `.png` | Developers del equipo |
| PNGs 300 DPI | `png/*.png` | Todos (documentación, Confluence, PRs) |
| Índice de Diagramas | `README.md` | Todo el equipo |

---

## 🔌 Skills Inyectadas

| Skill | Nivel | Archivo |
|-------|-------|---------|
| C4 Model Diagram Expert | Expert | [skills/c4-model-diagram-expert.skill.md](skills/c4-model-diagram-expert.skill.md) |
| Deployment Diagram UX Expert | Expert | [skills/deployment-diagram-ux-expert.skill.md](skills/deployment-diagram-ux-expert.skill.md) |
| PlantUML PNG Export Expert | Senior | [skills/plantuml-png-export-expert.skill.md](skills/plantuml-png-export-expert.skill.md) |

---

## 📐 Estándar de Herramientas

- **PlantUML** — Formato de fuente (`.puml`), versionable en Git
- **C4-PlantUML** — Biblioteca oficial de Simon Brown
- **aws-icons-for-plantuml** — Iconografía AWS oficial
- **Draw.io** — Refinamiento visual y exportación multi-formato

---

*Agente creado con metodología ZNS v2.2 — Prompt Engineer Senior*
