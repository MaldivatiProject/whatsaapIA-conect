# 🔍 ZNS Quality — Agentes de Calidad y Validación

> **Fase:** Quality Assurance  
> **Metodología:** ZNS v2.2  
> **Última actualización:** 2026-02-07

---

## 📋 Contenido de esta Carpeta

### Prompts de Agentes

| Archivo | Descripción | Rol |
|---------|-------------|-----|
| [prompt-peer-review-senior.md](./prompt-peer-review-senior.md) | Agente de Peer Review que valida código vs HUT | Senior Code Reviewer |

### Templates

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| [template-peer-review-report.md](./templates/template-peer-review-report.md) | Plantilla para reporte completo de Peer Review | Generar `PR-HUT-XXX-*.md` |
| [template-hut-validation-block.md](./templates/template-hut-validation-block.md) | Bloques de validación para agregar a HUTs | Actualizar HUT post-review |
| [checklist-peer-review-quick.md](./templates/checklist-peer-review-quick.md) | Checklist rápido de validación | Revisión inicial 5-10 min |

---

## 🎯 Objetivo del Módulo

Garantizar la **calidad y trazabilidad** entre especificaciones técnicas (HUTs) y código implementado mediante:

1. **Peer Review estructurado** — Validación exhaustiva código vs especificación
2. **Evidencias documentadas** — Trazabilidad de cada criterio de aceptación
3. **Métricas de calidad** — Cobertura, tests, estándares de código
4. **Actualización de estado** — HUTs actualizadas con resultado de validación

---

## 🔄 Flujo de Trabajo

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO PEER REVIEW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. HUT Especificada        2. Código Implementado             │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │ HUT-XXX-TIPO-XX │        │ feature/HUT-XXX │                │
│  │                 │        │                 │                │
│  │ • Criterios     │        │ • Entities      │                │
│  │ • Componentes   │───────▶│ • Services      │                │
│  │ • Tests esp.    │        │ • Controllers   │                │
│  │ • DoD           │        │ • Tests         │                │
│  └─────────────────┘        └─────────────────┘                │
│           │                          │                         │
│           │     ┌────────────────────┘                         │
│           │     │                                              │
│           ▼     ▼                                              │
│  ┌─────────────────────────────────────┐                       │
│  │     3. PEER REVIEW SENIOR           │                       │
│  │                                     │                       │
│  │  • Cruce especificación vs código   │                       │
│  │  • Validación criterios aceptación  │                       │
│  │  • Ejecución y análisis de tests    │                       │
│  │  • Evaluación calidad de código     │                       │
│  │  • Generación de reporte            │                       │
│  └─────────────────────────────────────┘                       │
│                      │                                         │
│                      ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   4. VEREDICTO                          │  │
│  ├──────────────┬──────────────────┬──────────────────────┤  │
│  │ ✅ APROBADO  │ ⚠️ CONDICIONAL   │ ❌ RECHAZADO         │  │
│  │              │                  │                      │  │
│  │ • Merge OK   │ • Merge develop  │ • Correcciones req.  │  │
│  │ • HUT ✅     │ • Tickets deuda  │ • Re-review          │  │
│  │ • Release OK │ • Resolver pre-  │ • HUT pendiente      │  │
│  │              │   release        │                      │  │
│  └──────────────┴──────────────────┴──────────────────────┘  │
│                      │                                         │
│                      ▼                                         │
│  ┌─────────────────────────────────────┐                       │
│  │     5. ACTUALIZACIÓN HUT            │                       │
│  │                                     │                       │
│  │  • Agregar bloque de validación     │                       │
│  │  • Evidencias de implementación     │                       │
│  │  • Métricas de calidad              │                       │
│  │  • Link a reporte PR                │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Métricas y Umbrales

### Cobertura de Tests

| Capa | Mínimo | Objetivo | Crítico |
|------|:------:|:--------:|:-------:|
| Domain (Entities, VOs) | 80% | 90%+ | <70% |
| Application (Use Cases) | 70% | 80%+ | <60% |
| Infrastructure (Repos) | 60% | 70%+ | <50% |
| Presentation (Controllers) | 50% | 60%+ | <40% |

### Criterios de Decisión

| Veredicto | Criterios Cumplidos | Issues Críticos | Tests |
|-----------|:-------------------:|:---------------:|:-----:|
| ✅ Aprobado | 100% | 0 | 100% pass |
| ⚠️ Condicional | ≥80% | 0 | 100% pass |
| ❌ Rechazado | <80% | ≥1 | <100% pass |

---

## 🚀 Cómo Usar

### 1. Ejecutar Peer Review

```
Hola, necesito que asumas el rol de Peer Review Senior.

CONTEXTO:
- Proyecto: MI-TOGA
- HUT a validar: HUT-001-API-01 — Endpoint de registro de usuario
- Ubicación HUT: 05-deliverables/huts/usuarios/HUT-001-API-01-registro-usuario.md
- Código fuente: src/main/java/com/mitoga/usuarios/
- Tests: src/test/java/com/mitoga/usuarios/

OBJETIVO:
Realizar Peer Review cruzando HUT con código implementado.

¡Comencemos!
```

### 2. Archivos Generados

Después del Peer Review se generan:

```
05-deliverables/
├── huts/
│   └── [modulo]/
│       └── HUT-XXX-*.md  ← Actualizada con bloque validación
│
└── peer-reviews/
    ├── PR-HUT-XXX-TIPO-SEC-2026-02-07.md  ← Reporte completo
    └── logs/
        └── PR-LOG-2026-02-07.md  ← Log de auditoría
```

---

## 📚 Relacionados

- [prompt-technical-user-stories.md](../zns-product-owner/8.technical-user-stories/prompt-technical-user-stories.md) — Generación de HUTs
- [template-hut.md](../zns-product-owner/8.technical-user-stories/template-hut.md) — Template de HUT
- [checklist-huts-validation.md](../zns-product-owner/8.technical-user-stories/checklist-huts-validation.md) — Validación de HUTs

---

## 📝 Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-02-07 | Versión inicial: Peer Review Senior Agent |

---

**Autor:** Prompt Engineer Senior — Método ZNS v2.2  
**Mantenedor:** ZNS Quality Team
