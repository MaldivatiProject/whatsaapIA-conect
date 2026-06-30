# 🎯 WF-HUT-003 — Prompts de Invocación (Vue 3 + Quasar)

---

**workflow**: WF-HUT-003-technical-user-stories-vue  
**version**: 1.0.0  
**fecha_actualizacion**: 2026-03-17  
**tipo**: Prompts de Ejecución (Referencias a Agentes)  

---

## 📋 Principio de Diseño

> **Este archivo NO duplica el contenido de los agentes.**  
> Solo contiene **referencias** a los agentes y **parámetros específicos** de cada ejecución.

---

## 🗂️ Mapa de Agentes

| Operación | Agente | Ruta |
|-----------|--------|------|
| `/hut:crear` `/hut:afinar` | Technical Architect DDD | `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md` |
| `/hut:frontend` | Frontend Vue3/Quasar Senior | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md` |
| `/hut:design` | Frontend Vue3/Quasar Senior (Design Tokens) | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md` |
| `/hut:store` | Frontend Vue3/Quasar Senior (Pinia) | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md` |
| `/hut:e2e` | Frontend Vue3/Quasar Senior (Testing) | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md` |
| `/hut:validar` | Checklist Validation | `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md` |

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
| [PROMPT-001](#prompt-001-crear-huts-desde-hu) | `/hut:crear` | Crear HUTs frontend desde HU de negocio | Technical Architect DDD |
| [PROMPT-002](#prompt-002-afinar-huts-existentes) | `/hut:afinar` | Refinar HUTs existentes | Technical Architect DDD |
| [PROMPT-003](#prompt-003-huts-frontend-vue) | `/hut:frontend` | HUTs de componentes, composables y módulos Vue 3 | Frontend Vue3/Quasar Senior |
| [PROMPT-004](#prompt-004-huts-design-system) | `/hut:design` | HUTs de Design Tokens y Tailwind CSS | Frontend Vue3/Quasar Senior |
| [PROMPT-005](#prompt-005-huts-state-management) | `/hut:store` | HUTs de Pinia stores por dominio | Frontend Vue3/Quasar Senior |
| [PROMPT-006](#prompt-006-huts-testing) | `/hut:e2e` | HUTs de tests unitarios, componentes y e2e | Frontend Vue3/Quasar Senior |
| [PROMPT-007](#prompt-007-validar-huts) | `/hut:validar` | Verificar calidad HUTs | Checklist Validation |

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
- **Arquitectura:** Modular por Dominio + Vue 3 + TypeScript + Quasar + Pinia + Tailwind CSS + PostgreSQL 16
- **Stack Frontend:** Vue 3 (Composition API, script setup), TypeScript strict, Quasar, Pinia, Tailwind CSS, Vite, Vitest, Playwright

### Output Esperado
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/`

## FASES A EJECUTAR
1. FASE 1: Análisis Estratégico DDD (foco en módulos frontend por dominio)
2. FASE 2: Identificación de Bounded Contexts y módulos UI
3. FASE 3: Generación de HUTs por capa frontend (domain, application, infrastructure, ui)

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
- [ ] Agregar especificaciones de componentes Vue
- [ ] Detallar composables y stores Pinia
- [ ] Definir contratos API a consumir
- [ ] Agregar design tokens y especificaciones UI
- [ ] Agregar casos de prueba (unit, component, e2e)
- [ ] Definir guards de autorización y seguridad

### Checklist de Validación
Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Output
HUT actualizada en su ubicación original

¡Afinar HUT según gaps identificados!
```

---

## PROMPT-003: HUTs Frontend Vue (`/hut:frontend`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`  
**Template:** `2-agents/zns-tools/technical-user-stories/template-hut.md`  
**Tiempo estimado:** 45-90 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]
- **APIs a consumir:** [listar endpoints del backend / contratos OpenAPI]

### Componentes a Especificar
- [ ] Módulo por dominio (domain, application, infrastructure, ui)
- [ ] Composables de aplicación (casos de uso frontend)
- [ ] Composables de UI (presentación, formularios)
- [ ] Componentes Vue (`script setup`, props tipados, slots)
- [ ] Pages y Layouts del dominio
- [ ] Routing con lazy loading y guards de autorización
- [ ] Integración Quasar (SPA/SSR/PWA/Mobile si aplica)
- [ ] DTOs, adapters y mappers tipados
- [ ] Tests unitarios de composables y component tests

### Arquitectura de Módulo
```text
src/modules/[dominio]/
├── domain/models/          # Entidades, Value Objects
├── application/composables/ # Casos de uso frontend
├── infrastructure/api/      # Clientes HTTP, DTOs
├── infrastructure/mappers/  # Transformación DTO → Modelo
└── ui/components/           # Componentes Vue del dominio
```

### Reglas Críticas
- Cero `any` en TypeScript
- Componentes consumen composables, NO clientes HTTP directamente
- Modelos de dominio independientes de DTOs
- Sin datos sensibles en LocalStorage/sessionStorage
- Autenticación via cookies HttpOnly

### Template
Usar: `2-agents/zns-tools/technical-user-stories/template-hut.md`

### Output
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-UI-XXX-*.md`

¡Crear HUTs de Frontend Vue 3 + Quasar!
```

---

## PROMPT-004: HUTs Design System (`/hut:design`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`  
**Tiempo estimado:** 30-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]
- **Design System existente:** [referencia o tokens actuales si existen]

### Especificaciones a Generar
- [ ] Design Tokens: color, typography, spacing, radius, shadows, motion, z-index, breakpoints
- [ ] Tokens semánticos para dark mode y theming multi-brand/multi-tenant
- [ ] Integración de tokens con `tailwind.config.ts`
- [ ] Convención de uso de clases Tailwind en el proyecto
- [ ] Componentes base reutilizables del design system
- [ ] Accesibilidad (WCAG 2.1 AA): roles, labels, focus, estados

### Estructura de Tokens
```text
src/design-tokens/
├── colors.ts
├── typography.ts
├── spacing.ts
├── shadows.ts
├── motion.ts
└── index.ts
```

### Criterios de Validación
- No hay colores, espaciados ni tipografías hardcodeados
- Dark mode cubierto por tokens semánticos
- Componentes base cumplen WCAG 2.1 AA

### Output
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-DS-XXX-*.md`

¡Crear HUTs de Design System y Design Tokens!
```

---

## PROMPT-005: HUTs State Management (`/hut:store`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`  
**Tiempo estimado:** 30-45 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]
- **Bounded Context:** [contexto de dominio]

### Especificaciones a Generar
- [ ] Stores Pinia por dominio de negocio
- [ ] Separación de estado UI vs estado de negocio
- [ ] Acciones puras y getters derivados
- [ ] Política de persistencia selectiva (solo datos no sensibles)
- [ ] Invalidación de caché y sincronización con API
- [ ] Tests unitarios del store (Vitest)

### Template Store Pinia
```typescript
// stores/[dominio].store.ts
import { defineStore } from 'pinia'
import type { [Modelo] } from '@/modules/[dominio]/domain/models/[modelo]'

interface [Dominio]State {
  // solo datos no sensibles
}

export const use[Dominio]Store = defineStore('[dominio]', {
  state: (): [Dominio]State => ({}),
  getters: {},
  actions: {}
})
```

### Reglas Críticas
- Ningún store persiste access tokens, refresh tokens o secretos
- Cada store tiene un dominio claro y responsabilidad única
- Las acciones consumen servicios de aplicación, no clientes HTTP

### Output
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-STORE-XXX-*.md`

¡Crear HUTs de Pinia State Management!
```

---

## PROMPT-006: HUTs Testing (`/hut:e2e`)

**Agente:** `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`  
**Tiempo estimado:** 30-60 minutos

```markdown
Asume el rol definido en: `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS DE EJECUCIÓN

### Input: HU/HUT de Referencia
- **Ruta:** [ruta del archivo de referencia]
- **Flujos críticos a cubrir:** [listar flujos prioritarios]

### Niveles de Testing a Especificar
- [ ] Unit tests de composables de aplicación (Vitest)
- [ ] Unit tests de stores Pinia (Vitest)
- [ ] Component tests de flujos UI críticos (Testing Library)
- [ ] Tests de formularios: validación y feedback de error
- [ ] Tests de accesibilidad en componentes interactivos
- [ ] E2E de flujos core: autenticación, navegación, procesos del dominio (Playwright/Cypress)
- [ ] Tests responsive en diferentes viewports

### Estrategia de Testing
```text
E2E (Playwright/Cypress)     → Flujos críticos del usuario
  Component Tests (Testing Lib) → Flujos UI y accesibilidad
    Unit Tests (Vitest)          → Composables, stores, utils
```

### Criterios de Validación
- Composables de negocio con cobertura de casos de uso principales
- Formularios con tests de validación y feedback de error
- Stores con tests de acciones y getters
- Autenticación con cobertura e2e
- Tests estables sin datos hardcodeados frágiles

### Output
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-TEST-XXX-*.md`

¡Crear HUTs de Testing Frontend!
```

---

## PROMPT-007: Validar HUTs (`/hut:validar`)

**Checklist:** `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`  
**Tiempo estimado:** 15-20 minutos por HUT

```markdown
## VALIDACIÓN DE HUT

### HUT a Validar
- **Ruta:** [0-docs/3-technical-stories/[tipo]/HUT-XXX-*.md]

### Checklist de Validación
Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Criterios Generales
1. [ ] Título claro (HUT-[TIPO]-[NUM]-[descripcion])
2. [ ] Descripción técnica completa
3. [ ] Criterios de aceptación verificables (Given-When-Then)
4. [ ] Story Points estimados (Fibonacci)
5. [ ] Dependencias identificadas
6. [ ] Componentes técnicos especificados
7. [ ] Trazabilidad a HU de negocio
8. [ ] Tests definidos (unit, component, e2e)

### Criterios Específicos Vue 3 / Quasar
9. [ ] Cero `any` en TypeScript
10. [ ] Arquitectura modular por dominio respetada
11. [ ] Design Tokens integrados — sin estilos hardcodeados
12. [ ] Stores Pinia por dominio — sin datos sensibles
13. [ ] Componentes sin lógica de negocio compleja
14. [ ] Cliente HTTP con interceptores centralizados
15. [ ] Autenticación via cookies HttpOnly
16. [ ] Guards de autorización en rutas protegidas
17. [ ] Accesibilidad WCAG 2.1 AA
18. [ ] Lazy loading en rutas

### Output
Reporte de validación con gaps identificados

¡Validar HUT contra checklist!
```
