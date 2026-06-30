# 🎯 Workflow: Technical User Stories (HUTs) Creation & Refinement for Vue 3 Frontend

---

**metodo**: ZNS v2.2  
**workflow_id**: WF-HUT-003  
**version**: 1.0.0  
**fecha_creacion**: 2026-03-17  
**ultima_actualizacion**: 2026-03-17  
**autor**: Orchestration Architect Senior  
**tipo**: Technical Decomposition & Backlog Creation  
**comando_inicio**: `/workflow:hut-vue`

**estandares_aplicados**:
- IEEE 29148-2018: Systems and software engineering — Requirements engineering
- Domain-Driven Design (Eric Evans)
- Hexagonal Architecture (Alistair Cockburn) — adaptada a frontend modular por dominio
- Test-Driven Development (Kent Beck)
- INVEST Criteria (Bill Wake)
- WCAG 2.1 AA: Accesibilidad web

**changelog**:
- v1.0.0: Variante del workflow HUT orientada a frontend Vue 3 + Quasar con agente Frontend Vue3/Quasar Senior y referencias actualizadas (2026-03-17)

---

## 🖥️ WF-HUT-003 | ORQUESTADOR HUTs VUE | `/workflow:hut-vue`

### 📋 MENÚ PRINCIPAL

> **Selecciona una opción escribiendo el número o comando**

| # | Comando | Operación | Descripción | Agente Principal |
|:-:|:-------:|:----------|:------------|:-----------------|
| `1` | `/hut:crear` | **📝 CREAR HUTs** | Descomponer HU de negocio en HUTs técnicas frontend | 🏗️ Technical Architect DDD |
| `2` | `/hut:afinar` | **✨ AFINAR HUTs** | Refinar/completar HUTs existentes | 🏗️ Technical Architect DDD |
| `3` | `/hut:frontend` | **🎨 HUTs Frontend Vue** | Generar HUTs específicas de Vue 3 + Quasar | 🎨 Frontend Vue3/Quasar Senior |
| `4` | `/hut:design` | **🎨 HUTs Design System** | Generar HUTs de Design Tokens y Tailwind CSS | 🎨 Frontend Vue3/Quasar Senior |
| `5` | `/hut:store` | **🗄️ HUTs State Management** | Generar HUTs de Pinia stores por dominio | 🎨 Frontend Vue3/Quasar Senior |
| `6` | `/hut:e2e` | **🧪 HUTs Testing** | Generar HUTs de tests unitarios, componentes y e2e | 🧪 QA Frontend |
| `7` | `/hut:validar` | **✅ VALIDAR HUTs** | Verificar completitud y calidad | 🔍 QA Validator |

---

### ⚡ ACCIONES RÁPIDAS

| Cmd | Acción |
|:---:|:-------|
| `h` | 📖 Mostrar ayuda detallada |
| `t` | 📋 Ver templates disponibles |
| `c` | 📑 Ver checklist de validación |
| `q` | ❌ Salir del workflow |

---

### 💬 ACCIÓN REQUERIDA

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 ¿Qué operación deseas realizar?                             │
│                                                                 │
│  Escribe el NÚMERO (1-7) o el COMANDO                           │
│  Ejemplo: "1" o "/hut:crear"                                    │
└─────────────────────────────────────────────────────────────────┘
```

**👤 Tu selección:** `___`

---

## 🗂️ MAPA DE AGENTES ORQUESTADOS

### Agente Principal: Technical Architect DDD

| Campo | Valor |
|-------|-------|
| **ID** | `AGT-TECH-ARCHITECT` |
| **Prompt** | `2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md` |
| **Rol** | Arquitecto Técnico Senior & Especialista DDD |
| **Capacidades** | Descomposición HU→HUTs, Análisis DDD, Diseño Modular por Dominio |

### Agentes Especializados (zns-tecnical-team)

| Agente | Prompt | Especialidad |
|--------|--------|--------------|
| 🎨 **Frontend Vue3/Quasar Senior** | `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md` | Vue 3, TypeScript, Composition API, Quasar, Pinia, Tailwind CSS, Microfrontends |
| 🐘 **Database Senior** | `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md` | PostgreSQL, Modelado, Índices |
| 🗄️ **Flyway Specialist** | `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt_dev_senior_flyway.md` | Migraciones, Versionado DB |

### Templates Disponibles

| Template | Ruta | Uso |
|----------|------|-----|
| 📋 **HUT Genérica** | `2-agents/zns-tools/technical-user-stories/template-hut.md` | HUTs de dominio/aplicación |
| 🔌 **HUT API** | `2-agents/zns-tools/technical-user-stories/template-hut-api.md` | Endpoints REST (contratos a consumir) |
| 🐘 **HUT Database** | `2-agents/zns-tools/technical-user-stories/template-hut-database.md` | Modelo de datos |
| 🔗 **HUT Integration** | `2-agents/zns-tools/technical-user-stories/template-hut-integration.md` | Integraciones externas |
| ✅ **Checklist Validación** | `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md` | Verificación calidad |

### Stack Tecnológico del Workflow

| Tecnología | Versión / Detalle | Rol |
|------------|-------------------|-----|
| **Vue 3** | Composition API, `script setup` | Framework UI |
| **TypeScript** | `strict: true`, cero `any` | Tipado estático |
| **Quasar** | SPA, SSR, PWA, Mobile (Capacitor) | Framework UI multi-plataforma |
| **Pinia** | Stores por dominio | State management |
| **Tailwind CSS** | Utility-first + Design Tokens | Estilos |
| **Vite** | Aliases, code splitting, env vars | Toolchain / Build |
| **Vitest** | Unit + Component tests | Testing unitario |
| **Playwright / Cypress** | Tests e2e | Testing end-to-end |
| **Axios** | Interceptores centralizados | Cliente HTTP |

---

## 📝 OPCIÓN 1: CREAR HUTs (`/hut:crear`)

### Flujo de Ejecución

```
HU Negocio → Análisis DDD → Bounded Context → Módulos Frontend → HUTs por Capa (domain, application, infrastructure, ui)
```

### Paso 1: Proporcionar HU de Entrada

```markdown
## INPUT REQUERIDO

Proporciona la Historia de Usuario de Negocio:
- **Opción A:** Ruta del archivo: `0-docs/1-business-analysis/2-user-stories/HU-XXX.md`
- **Opción B:** Pegar contenido directamente (título, descripción, criterios Gherkin)
```

### Paso 2: Invocar Agente Principal

```markdown
@agent: Asume el rol definido en:
`2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`

## PARÁMETROS
- **HU Input:** [HU-XXX o contenido]
- **Proyecto:** MI-TOGA
- **Arquitectura:** Modular por Dominio + Vue 3 + TypeScript + Quasar + Pinia + Tailwind CSS + PostgreSQL 16

## EJECUTAR
FASE 1: Análisis Estratégico DDD (foco en módulos frontend por dominio)
FASE 2: Identificación de Bounded Contexts y módulos UI
FASE 3: Generación de HUTs por capa frontend (domain, application, infrastructure, ui)

## OUTPUT
Directorio: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/`
```

### Paso 3: Delegar a Agentes Especializados (si aplica)

| Capa | Agente a Invocar |
|------|------------------|
| Domain/Application Frontend | Technical Architect (ya ejecutando) |
| Frontend Vue 3 + Quasar | `/hut:frontend` → `prompt-dev-frontend-vue3-quasar-senior.md` |
| Design System / Tokens | `/hut:design` → `prompt-dev-frontend-vue3-quasar-senior.md` |
| State Management (Pinia) | `/hut:store` → `prompt-dev-frontend-vue3-quasar-senior.md` |
| Testing Frontend | `/hut:e2e` → `prompt-dev-frontend-vue3-quasar-senior.md` |

---

## ✨ OPCIÓN 2: AFINAR HUTs (`/hut:afinar`)

### Flujo de Refinamiento

```
HUT Existente → Análisis Gaps → Completar Specs → Validar → Actualizar
```

### Paso 1: Identificar HUT a Afinar

```markdown
## INPUT REQUERIDO

¿Qué HUT deseas afinar?
- **Ruta:** `0-docs/3-technical-stories/[tipo]/HUT-XXX-*.md`
- **Tipo de refinamiento:**
  - [ ] Completar criterios de aceptación
  - [ ] Agregar especificaciones de componentes Vue
  - [ ] Detallar composables y stores Pinia
  - [ ] Definir contratos API a consumir
  - [ ] Agregar design tokens y especificaciones UI
  - [ ] Agregar casos de prueba (unit, component, e2e)
  - [ ] Definir guards de autorización y seguridad
```

### Paso 2: Invocar Agente con Contexto

```markdown
@agent: Asume el rol definido en:
`2-agents/zns-tools/technical-user-stories/prompt-technical-user-stories.md`

## PARÁMETROS
- **HUT a afinar:** [ruta del archivo]
- **Tipo refinamiento:** [selección del usuario]
- **Contexto adicional:** [información complementaria]

## EJECUTAR
- Leer HUT existente
- Identificar gaps según checklist
- Completar secciones faltantes
- Validar contra `checklist-huts-validation.md`

## OUTPUT
HUT actualizada en su ubicación original
```

---

## 🎨 OPCIÓN 3: HUTs Frontend Vue (`/hut:frontend`)

### Invocar Frontend Vue3/Quasar Senior

```markdown
@agent: Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS
- **HU/HUT de referencia:** [ruta]
- **Componentes a especificar:**
  - [ ] Módulo por dominio (domain, application, infrastructure, ui)
  - [ ] Composables de aplicación (casos de uso)
  - [ ] Composables de UI (presentación)
  - [ ] Componentes Vue (`script setup`, props tipados)
  - [ ] Pages y Layouts
  - [ ] Routing con lazy loading y guards
  - [ ] Integración Quasar (SPA/SSR/PWA/Mobile si aplica)
  - [ ] DTOs, adapters y mappers tipados
  - [ ] Tests unitarios de composables y component tests

## TEMPLATE
Usar: `2-agents/zns-tools/technical-user-stories/template-hut.md`

## ARQUITECTURA DE REFERENCIA
```text
src/modules/[dominio]/
├── domain/
│   ├── models/          # Entidades, Value Objects, reglas de negocio frontend
│   └── rules/
├── application/
│   ├── composables/     # Casos de uso frontend
│   └── services/
├── infrastructure/
│   ├── api/             # Clientes HTTP, DTOs, adapters
│   │   ├── [dominio].api.ts
│   │   └── [dominio].dto.ts
│   └── mappers/         # Transformación DTO → Modelo de dominio
└── ui/
    ├── components/      # Componentes Vue específicos del dominio
    ├── pages/           # Páginas del dominio
    ├── layouts/         # Layouts del dominio
    └── composables/     # Composables específicos de UI
```

## REGLAS CRÍTICAS
- Cero `any` en TypeScript
- La capa `ui` NO conoce directamente a `infrastructure`
- Componentes consumen composables, no llaman directamente a clientes HTTP
- Modelos de dominio independientes de DTOs de la API
- Ningún token, secreto o dato sensible en LocalStorage/sessionStorage
- Autenticación via cookies HttpOnly

## OUTPUT
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-UI-XXX-*.md`
```

---

## 🎨 OPCIÓN 4: HUTs Design System (`/hut:design`)

### Invocar Frontend Vue3/Quasar Senior — Foco Design Tokens

```markdown
@agent: Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS
- **HU/HUT de referencia:** [ruta]
- **Especificaciones:**
  - [ ] Design Tokens: color, typography, spacing, radius, shadows, motion, z-index, breakpoints
  - [ ] Tokens semánticos para dark mode y theming multi-brand/multi-tenant
  - [ ] Integración de tokens con `tailwind.config.ts`
  - [ ] Convención de uso de clases Tailwind en el proyecto
  - [ ] Componentes base reutilizables del design system
  - [ ] Accesibilidad (WCAG 2.1 AA): roles, labels, focus, estados

## ESTRUCTURA DE TOKENS
```text
src/design-tokens/
├── colors.ts
├── typography.ts
├── spacing.ts
├── shadows.ts
├── motion.ts
└── index.ts
```

## CRITERIOS DE VALIDACIÓN
- [ ] No hay colores, espaciados ni tipografías hardcodeados fuera del sistema de tokens
- [ ] El dark mode está cubierto por tokens semánticos
- [ ] Los tokens están documentados y son trazables al design system
- [ ] Los componentes base cumplen WCAG 2.1 AA

## OUTPUT
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-DS-XXX-*.md`
```

---

## 🗄️ OPCIÓN 5: HUTs State Management (`/hut:store`)

### Invocar Frontend Vue3/Quasar Senior — Foco Pinia Stores

```markdown
@agent: Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS
- **HU/HUT de referencia:** [ruta]
- **Especificaciones:**
  - [ ] Stores Pinia por dominio de negocio
  - [ ] Separación de estado UI vs estado de negocio
  - [ ] Acciones puras y getters derivados
  - [ ] Política de persistencia selectiva (solo datos no sensibles)
  - [ ] Invalidación de caché y sincronización con API
  - [ ] Tests unitarios del store

## TEMPLATE STORE PINIA
```typescript
// stores/[dominio].store.ts
import { defineStore } from 'pinia'
import type { [Modelo] } from '@/modules/[dominio]/domain/models/[modelo]'

interface [Dominio]State {
  // solo datos no sensibles
}

export const use[Dominio]Store = defineStore('[dominio]', {
  state: (): [Dominio]State => ({
    // estado inicial tipado
  }),
  getters: {
    // getters derivados
  },
  actions: {
    // acciones puras, llaman a servicios de aplicación
  }
})
```

## REGLAS CRÍTICAS
- Ningún store persiste access tokens, refresh tokens, secretos o datos sensibles
- Cada store tiene un dominio claro y una responsabilidad única
- Las acciones consumen servicios de aplicación, no clientes HTTP directamente

## OUTPUT
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-STORE-XXX-*.md`
```

---

## 🧪 OPCIÓN 6: HUTs Testing (`/hut:e2e`)

### Invocar Frontend Vue3/Quasar Senior — Foco Testing

```markdown
@agent: Asume el rol definido en:
`2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`

## PARÁMETROS
- **HU/HUT de referencia:** [ruta]
- **Niveles de testing:**
  - [ ] Unit tests de composables de aplicación (Vitest)
  - [ ] Unit tests de stores Pinia (Vitest)
  - [ ] Component tests de flujos UI críticos (Testing Library)
  - [ ] Tests de formularios: validación y feedback de error
  - [ ] Tests de accesibilidad en componentes interactivos
  - [ ] E2E de flujos core: autenticación, navegación, procesos del dominio (Playwright/Cypress)
  - [ ] Tests responsive en diferentes viewports

## ESTRATEGIA DE TESTING
```text
┌─────────────────────────────────────────┐
│  E2E Tests (Playwright/Cypress)         │ ← Flujos críticos del usuario
│  ┌─────────────────────────────────┐    │
│  │  Component Tests (Testing Lib)  │    │ ← Flujos UI y accesibilidad
│  │  ┌─────────────────────────┐    │    │
│  │  │  Unit Tests (Vitest)    │    │    │ ← Composables, stores, utils
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## CRITERIOS DE VALIDACIÓN
- [ ] Composables de negocio tienen cobertura de casos de uso principales
- [ ] Formularios tienen tests de validación y feedback de error
- [ ] Stores tienen tests de acciones y getters
- [ ] Flujo de autenticación tiene cobertura e2e
- [ ] Flujos críticos del dominio tienen al menos un happy path cubierto
- [ ] Tests estables, sin datos hardcodeados frágiles

## OUTPUT
HUTs en: `0-docs/3-technical-stories/[bounded-context]/[HU-XXX]/HUT-TEST-XXX-*.md`
```

---

## ✅ OPCIÓN 7: VALIDAR HUTs (`/hut:validar`)

### Proceso de Validación

```markdown
## CHECKLIST DE VALIDACIÓN

Usar: `2-agents/zns-tools/technical-user-stories/checklist-huts-validation.md`

### Criterios Generales:
1. [ ] Título claro y descriptivo (formato HUT-[TIPO]-[NUM]-[descripcion])
2. [ ] Descripción técnica completa
3. [ ] Criterios de aceptación verificables (Given-When-Then)
4. [ ] Story Points estimados (Fibonacci: 1,2,3,5,8)
5. [ ] Dependencias identificadas
6. [ ] Componentes técnicos especificados
7. [ ] Trazabilidad a HU de negocio
8. [ ] Tests definidos (unit, component, e2e)

### Criterios Específicos Vue 3 / Quasar:
9. [ ] Cero `any` en TypeScript — tipos explícitos en props, composables y stores
10. [ ] Arquitectura modular por dominio respetada (domain, application, infrastructure, ui)
11. [ ] Design Tokens integrados con Tailwind — sin estilos hardcodeados
12. [ ] Stores Pinia por dominio — sin datos sensibles persistidos
13. [ ] Componentes no contienen lógica de negocio compleja
14. [ ] Cliente HTTP con interceptores centralizados — no llamadas directas desde componentes
15. [ ] Autenticación via cookies HttpOnly — sin tokens en LocalStorage/sessionStorage
16. [ ] Guards de autorización en todas las rutas protegidas
17. [ ] Accesibilidad WCAG 2.1 AA en componentes interactivos
18. [ ] Lazy loading en rutas por defecto
```

---

## 🔐 REGLAS DE SEGURIDAD FRONTEND (transversales)

> Estas reglas aplican a TODAS las HUTs generadas por este workflow.

| Regla | Descripción |
|-------|-------------|
| 🚫 **No LocalStorage/sessionStorage para datos sensibles** | Prohibido almacenar access tokens, refresh tokens, secretos, credenciales, datos bancarios o datos personales críticos |
| 🍪 **Cookies HttpOnly** | Autenticación basada en cookies `HttpOnly`, `Secure`, `SameSite` como patrón preferido |
| 🔑 **Tokens de corta vida** | Cifrado y minimización de datos en cliente |
| 🛡️ **Guards de acceso** | Defensa en profundidad en el router y en composables de autorización |
| 🧹 **Preferencias no sensibles** | Solo preferencias de UI no sensibles pueden persistirse en cliente |

---

## 🚨 ANTI-PATTERNS A DETECTAR EN VALIDACIÓN

❌ Guardar tokens de acceso o refresh tokens en `localStorage` o `sessionStorage`  
❌ Usar `any` en TypeScript como salida rápida o temporal  
❌ Poner lógica de negocio compleja en templates Vue  
❌ Crear un store global monolítico en lugar de stores por dominio  
❌ Llamar a clientes HTTP directamente desde componentes Vue  
❌ Hardcodear colores, espaciados o tipografías fuera de los design tokens  
❌ Ignorar accesibilidad en componentes interactivos  
❌ Usar microfrontends sin necesidad real de escalabilidad de equipo o dominio  
❌ Diseñar componentes sin props tipados o con interfaces incompletas  
❌ Omitir manejo de estados de error, carga y vacío en la UI  

---

<details><summary>📊 Historial de Decisiones</summary>

| # | ⏰ Hora | 📍 Paso | 💬 Pregunta | ✅ Decisión |
|:-:|:------:|:------:|-------------|-------------|
| - | - | - | _Workflow no iniciado_ | - |

</details>

---

### 🔔 NOTIFICACIONES

| ⚠️ | Mensaje |
|:--:|---------|
| 🟡 | Esperando selección de operación (1-7)... |

---

## 📋 EXECUTIVE SUMMARY

### Workflow Objective

This workflow orchestrates the **creation and refinement of Technical User Stories (HUTs)** from Business User Stories (HUs) **focused on Vue 3 frontend**, coordinating specialized agents:

| Agent | Role | Artifacts |
|-------|------|-----------|
| **AGT-TECH-ARCHITECT** | Senior Technical Architect & DDD Expert | HUTs, Bounded Contexts, Módulos Frontend |
| **AGT-FRONTEND-VUE** | Senior Vue 3 / Quasar / TypeScript Engineer | HUT-UI, Components, Composables, Stores, Design Tokens, Tests |
| **AGT-DATABASE** | Senior PostgreSQL Engineer | HUT-INFRA (Database), Schemas, Migrations |
| **AGT-QA-FRONTEND** | QA Frontend Specialist | HUT-TEST, Unit, Component, E2E |

### Output Directory

```
0-docs/3-technical-stories/
├── README.md                               # Technical Backlog Index
├── [bounded-context]/                      # Per Bounded Context folder
│   ├── HU-XXX/                            # Per Business User Story folder
│   │   ├── HUT-XXX-UI-01-*.md            # Frontend UI Layer HUTs (components, pages, layouts)
│   │   ├── HUT-XXX-DS-01-*.md            # Design System / Design Tokens HUTs
│   │   ├── HUT-XXX-STORE-01-*.md         # Pinia Store HUTs
│   │   ├── HUT-XXX-COMP-01-*.md          # Composable / Application Logic HUTs
│   │   ├── HUT-XXX-SEC-01-*.md           # Security (auth guards, session) HUTs
│   │   ├── HUT-XXX-TEST-01-*.md          # Testing Strategy HUTs
│   │   └── README.md                      # HU Summary & HUT Index
│   └── README.md                          # Bounded Context Summary
```

### Quality Metrics

| Metric | Target | Minimum Threshold |
|--------|--------|-------------------|
| **HUT Coverage** | 100% of HU scenarios | ≥ 95% |
| **Specs Completeness** | Implementation-ready | ≥ 90% |
| **TypeScript Strictness** | Cero `any` | 100% |
| **Security Compliance** | No secrets in client | 100% |
| **Accessibility** | WCAG 2.1 AA | 100% interactive components |
| **Test Coverage Plan** | Unit + Component + E2E | ≥ 80% critical paths |
| **Traceability Matrix** | 100% bidirectional | 100% |
