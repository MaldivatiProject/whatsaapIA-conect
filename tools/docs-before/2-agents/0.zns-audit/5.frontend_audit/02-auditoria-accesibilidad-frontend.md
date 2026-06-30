# Prompt: Auditoría de Accesibilidad Frontend (a11y)

---

## 🎯 Objetivo

Evaluar la accesibilidad de la aplicación frontend según estándares WCAG 2.1 nivel AA/AAA, garantizando que sea usable por personas con discapacidades visuales, auditivas, motoras o cognitivas.

---

## 📋 Alcance de la Auditoría

### 1. Cumplimiento WCAG 2.1

**Nivel A (Mínimo obligatorio)**
- Texto alternativo para imágenes
- Navegación por teclado
- Labels en formularios
- Contraste mínimo 3:1

**Nivel AA (Estándar recomendado)**
- Contraste 4.5:1 para texto normal
- Contraste 3:1 para texto grande (18pt+)
- Múltiples formas de navegación
- Focus visible
- Resize de texto hasta 200%

**Nivel AAA (Oro)**
- Contraste 7:1 para texto normal
- Contraste 4.5:1 para texto grande
- Sin timeouts automáticos
- Asistencia de entrada de datos

### 2. Categorías WCAG (POUR)

**Perceivable (Perceptible)**
- Alternativas de texto
- Contenido adaptable
- Distinguible (color, contraste, audio)

**Operable (Operable)**
- Accesible por teclado
- Tiempo suficiente
- Navegación clara
- Evitar contenido que cause convulsiones

**Understandable (Comprensible)**
- Legible
- Predecible
- Asistencia de entrada

**Robust (Robusto)**
- Compatible con tecnologías asistivas
- HTML semántico válido
- ARIA cuando es necesario

### 3. Tecnologías Asistivas

**Screen Readers**:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

**Herramientas**:
- Magnificadores de pantalla
- Navegación por voz
- Switches y joysticks
- Teclados alternativos

---

## 🔍 Metodología de Análisis

### Paso 1: Análisis Automático

#### axe DevTools (Chrome Extension)

```bash
# Instalar extension
# https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd

# Ejecutar en cada página clave:
1. Abrir DevTools (F12)
2. Tab "axe DevTools"
3. Click "Scan ALL of my page"
4. Exportar resultados (JSON/CSV)
```

**Documentar:**
- Critical issues
- Serious issues
- Moderate issues
- Minor issues

#### Lighthouse Accessibility

```bash
lighthouse https://[URL] \
  --only-categories=accessibility \
  --output=html \
  --output-path=./lighthouse-a11y.html
```

**Meta**: >95/100

#### WAVE (Web Accessibility Evaluation Tool)

```bash
# Online: https://wave.webaim.org/
# Extension: https://wave.webaim.org/extension/

# Analizar:
- Errors (0 deseado)
- Alerts (revisar cada uno)
- Contrast errors
- ARIA usage
```

### Paso 2: Análisis Manual

#### Test de Navegación por Teclado

**Checklist**:
```
[ ] Tab: Navega a todos los elementos interactivos
[ ] Shift+Tab: Navega hacia atrás
[ ] Enter/Space: Activa botones y links
[ ] Esc: Cierra modales y dropdowns
[ ] Arrows: Navega en menús y tabs
[ ] Focus visible en todos los elementos
[ ] Orden lógico de focus (top→bottom, left→right)
[ ] No hay "keyboard traps" (focus atrapado)
[ ] Skip links presentes ("Skip to main content")
```

**Ejecutar:**
1. Desconectar mouse
2. Navegar página completa solo con teclado
3. Intentar completar tarea crítica (ej: compra, registro)
4. Documentar elementos inaccesibles

#### Test con Screen Reader

**NVDA (Windows - Gratuito)**:
```bash
# Descargar: https://www.nvaccess.org/download/

# Comandos básicos:
NVDA + Q: Quit
NVDA + N: NVDA menu
Insert + Down: Leer todo
Insert + Up: Leer desde cursor
H: Navegar por headings
K: Navegar por links
F: Navegar por form fields
```

**Checklist**:
```
[ ] Heading structure lógica (h1 → h2 → h3)
[ ] Links descriptivos (no "click here")
[ ] Imágenes con alt text relevante
[ ] Formularios con labels asociados
[ ] Botones con texto/aria-label
[ ] Landmarks (nav, main, aside, footer)
[ ] Live regions para contenido dinámico
[ ] Estados anunciados (cargando, error, éxito)
```

#### Test de Contraste

**Chrome DevTools**:
```
1. Abrir DevTools (F12)
2. Inspeccionar elemento de texto
3. Ver "Contrast ratio" en panel de Styles
4. Verificar ✓ AA o ✓ AAA
```

**Herramienta automática**:
```bash
# Pa11y para CI/CD
npm install -g pa11y

pa11y https://[URL] \
  --standard WCAG2AA \
  --reporter json > accessibility-report.json
```

### Paso 3: Testing con Usuarios Reales

**Opcional pero recomendado**:
- 2-3 usuarios con screen readers
- 2-3 usuarios con navegación por teclado
- 1-2 usuarios con magnificadores
- 1 usuario con lector de Braille

**Duración**: 30-60 min por usuario  
**Compensación**: $50-100 por sesión

---

## 📊 Hallazgos Comunes y Severidad

### 🔴 CRÍTICOS (Bloqueadores para usuarios con discapacidad)

#### H-FE-A-C-001: Imágenes Sin Alt Text

**Descripción**: Imágenes importantes sin atributo `alt`, inaccesibles para usuarios ciegos.

**Impacto**:
- 100% de contenido perdido para screen readers
- Violación WCAG 1.1.1 (Nivel A)
- Posible demanda legal (ADA)

**Cómo Detectar**:
```bash
# Buscar imágenes sin alt
grep -r "<img" src/ | grep -v 'alt=' | wc -l

# axe DevTools: "Images must have alternate text"
```

**Ejemplos**:
```jsx
// ❌ CRÍTICO
<img src="/logo.png" />
<img src="/product.jpg" alt="" />  // Decorativa OK, informativa NO

// ✅ CORRECTO
<img src="/logo.png" alt="Company Logo" />
<img src="/product.jpg" alt="Blue t-shirt with white stripes, size M" />

// ✅ Decorativa (no aporta info)
<img src="/decoration.svg" alt="" role="presentation" />
```

**Remediation Automática**:
```bash
# ESLint rule
npm install --save-dev eslint-plugin-jsx-a11y

// .eslintrc
{
  "extends": ["plugin:jsx-a11y/recommended"],
  "rules": {
    "jsx-a11y/alt-text": "error"
  }
}
```

**Esfuerzo**: 2-4 horas (dependiendo de cantidad)  
**Prioridad**: 🔴 1 (INMEDIATO)  
**Legal Risk**: ⚠️ ALTO (ADA compliance)

---

#### H-FE-A-C-002: Navegación por Teclado Imposible

**Descripción**: Elementos interactivos (<div onclick>, etc.) no accesibles por teclado.

**Impacto**:
- Usuarios con discapacidades motoras bloqueados
- Violación WCAG 2.1.1 (Nivel A)

**Cómo Detectar**:
```javascript
// Buscar divs/spans con onclick
grep -r "onClick" src/ | grep -E "<div|<span"

// Test manual: Intentar navegar con Tab
```

**Ejemplos**:
```jsx
// ❌ CRÍTICO - No accesible por teclado
<div onClick={handleClick}>Click me</div>
<span onClick={handleSubmit}>Submit</span>

// ✅ CORRECTO - Usar elementos semánticos
<button onClick={handleClick}>Click me</button>
<button onClick={handleSubmit}>Submit</button>

// ✅ Si REALMENTE necesitas div (no recomendado)
<div 
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

**Remediation**:
```javascript
// ESLint rule
"jsx-a11y/click-events-have-key-events": "error",
"jsx-a11y/no-static-element-interactions": "error"
```

**Esfuerzo**: 4-8 horas  
**Prioridad**: 🔴 1  
**Legal Risk**: ⚠️ ALTO

---

#### H-FE-A-C-003: Formularios Sin Labels

**Descripción**: Campos de formulario sin `<label>` asociado o `aria-label`.

**Impacto**:
- Screen readers no anuncian qué campo es
- Usuarios no saben qué información poner
- Violación WCAG 1.3.1, 4.1.2 (Nivel A)

**Cómo Detectar**:
```bash
# axe DevTools: "Form elements must have labels"

# Buscar inputs sin label
grep -r "<input" src/ | grep -v "aria-label\|id="
```

**Ejemplos**:
```jsx
// ❌ CRÍTICO
<input type="text" placeholder="Email" />

// ✅ CORRECTO - Label explícito
<label htmlFor="email">Email</label>
<input type="text" id="email" name="email" />

// ✅ CORRECTO - Label implícito
<label>
  Email
  <input type="text" name="email" />
</label>

// ✅ CORRECTO - aria-label (cuando label visible no es posible)
<input 
  type="search" 
  aria-label="Search products"
  placeholder="Search..."
/>
```

**Remediation**:
```javascript
// ESLint rule
"jsx-a11y/label-has-associated-control": "error"
```

**Esfuerzo**: 2-4 horas  
**Prioridad**: 🔴 1

---

### 🟠 ALTOS

#### H-FE-A-H-001: Contraste Insuficiente

**Descripción**: Texto con contraste <4.5:1 (AA) o <3:1 para texto grande.

**Impacto**:
- Ilegible para usuarios con baja visión (16% de población)
- Violación WCAG 1.4.3 (Nivel AA)

**Cómo Detectar**:
```bash
# Chrome DevTools > Inspeccionar > Contrast ratio

# Herramienta automática
npm install -g @adobe/leonardo-contrast-colors

# axe DevTools: "Elements must have sufficient color contrast"
```

**Ejemplos**:
```css
/* ❌ Contraste 2.8:1 (FAIL AA) */
.text-gray {
  color: #999;  /* Gris claro */
  background: #fff;  /* Blanco */
}

/* ✅ Contraste 7.2:1 (PASS AAA) */
.text-gray {
  color: #595959;  /* Gris oscuro */
  background: #fff;
}

/* ✅ Texto grande (18pt+) necesita solo 3:1 */
.heading {
  font-size: 24px;
  color: #767676;  /* 4.6:1 - PASS AA large text */
}
```

**Remediation**:
```javascript
// Usar variables de color pre-testeadas
const colors = {
  text: {
    primary: '#212121',   // 16:1 contrast
    secondary: '#595959', // 7:1 contrast
    tertiary: '#757575',  // 4.6:1 contrast
  },
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
  },
};
```

**Esfuerzo**: 4-6 horas  
**Prioridad**: 🟠 2

---

#### H-FE-A-H-002: Focus No Visible

**Descripción**: Outline de focus removido sin alternativa visual.

**Impacto**:
- Usuarios de teclado no saben dónde están
- Violación WCAG 2.4.7 (Nivel AA)

**Cómo Detectar**:
```css
/* Buscar en CSS */
grep -r "outline: none" src/
grep -r "outline: 0" src/
```

**Ejemplos**:
```css
/* ❌ CRÍTICO - Focus invisible */
button:focus {
  outline: none;
}

/* ✅ CORRECTO - Outline nativo */
button:focus {
  /* No tocar outline, dejar por defecto */
}

/* ✅ CORRECTO - Custom focus visible */
button:focus {
  outline: 3px solid #4CAF50;
  outline-offset: 2px;
}

/* ✅ MODERNO - :focus-visible (oculta en click, muestra en Tab) */
button:focus {
  outline: none;
}
button:focus-visible {
  outline: 3px solid #4CAF50;
  outline-offset: 2px;
}
```

**Remediation global**:
```css
/* Reset focus para todo el sitio */
*:focus-visible {
  outline: 3px solid var(--primary-color);
  outline-offset: 2px;
}

/* O usar librería */
npm install focus-visible
```

**Esfuerzo**: 2 horas  
**Prioridad**: 🟠 2

---

#### H-FE-A-H-003: Sin Estructura de Headings

**Descripción**: Sin `<h1>` o headings fuera de orden (h1 → h3 sin h2).

**Impacto**:
- Screen readers usan headings para navegar
- Usuarios ciegos se pierden en la página
- Violación WCAG 1.3.1, 2.4.6 (Nivel AA)

**Cómo Detectar**:
```javascript
// Chrome DevTools Console
[...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
  .map(h => h.tagName);

// axe DevTools: "Heading levels should only increase by one"
```

**Ejemplos**:
```jsx
// ❌ CRÍTICO - Sin h1, salto de niveles
<h2>Section Title</h2>
<h4>Subsection</h4>

// ✅ CORRECTO - Jerarquía lógica
<h1>Page Title</h1>
  <h2>Main Section</h2>
    <h3>Subsection</h3>
    <h3>Another Subsection</h3>
  <h2>Another Section</h2>
```

**Remediation**:
```jsx
// Componente reutilizable
const Heading = ({ level, children }) => {
  const Tag = `h${level}`;
  return <Tag>{children}</Tag>;
};

// Uso con Context para auto-incrementar
<HeadingProvider>
  <Heading>Page Title</Heading>  {/* h1 */}
  <Heading>Section</Heading>     {/* h2 */}
  <Heading>Subsection</Heading>  {/* h3 */}
</HeadingProvider>
```

**Esfuerzo**: 3 horas  
**Prioridad**: 🟠 2

---

### 🟡 MEDIOS

#### H-FE-A-M-001: Links No Descriptivos

**Descripción**: Links genéricos como "Click here", "Read more".

**Impacto**:
- Screen readers listan todos los links
- "Click here" x30 no es útil
- Violación WCAG 2.4.4 (Nivel A)

**Remediation**:
```jsx
// ❌ MALO
<a href="/article">Click here</a>
<a href="/product">Read more</a>

// ✅ BUENO
<a href="/article">Read the accessibility guidelines</a>
<a href="/product">View product details for Blue Sneakers</a>

// ✅ ALTERNATIVA - Ocultar visualmente pero mantener para SR
<a href="/article">
  Read more<span className="sr-only"> about accessibility guidelines</span>
</a>
```

**Esfuerzo**: 2 horas  
**Prioridad**: 🟡 3

---

## 📋 Template de Informe de Accesibilidad

```markdown
# Auditoría de Accesibilidad (a11y) - [PROYECTO]

---
**Fecha**: [DD/MM/YYYY]  
**Auditor**: [Nombre]  
**Estándar**: WCAG 2.1 Nivel AA  
**Herramientas**: axe DevTools, Lighthouse, WAVE, NVDA  
**URL**: [https://...]

---

## 📊 Resumen Ejecutivo

### Calificación de Accesibilidad

```
┌────────────────────────────────────┐
│   ACCESIBILIDAD: XX/20 puntos     │
│                                    │
│   Lighthouse a11y: XX/100          │
│   WCAG AA: XX% cumplimiento        │
│   Estado: [CUMPLE|NO CUMPLE]       │
└────────────────────────────────────┘
```

### Cumplimiento WCAG 2.1

| Principio | Nivel A | Nivel AA | Nivel AAA |
|-----------|---------|----------|-----------|
| **Perceivable** | XX/YY (XX%) | XX/YY (XX%) | XX/YY (XX%) |
| **Operable** | XX/YY (XX%) | XX/YY (XX%) | XX/YY (XX%) |
| **Understandable** | XX/YY (XX%) | XX/YY (XX%) | XX/YY (XX%) |
| **Robust** | XX/YY (XX%) | XX/YY (XX%) | XX/YY (XX%) |
| **TOTAL** | **XX%** | **XX%** | **XX%** |

**Meta**: 100% Nivel A + 100% Nivel AA

---

## 🔍 Hallazgos por Herramienta

### axe DevTools Results

| Severidad | Count | % of Total |
|-----------|-------|------------|
| 🔴 Critical | X | XX% |
| 🟠 Serious | X | XX% |
| 🟡 Moderate | X | XX% |
| 🔵 Minor | X | XX% |
| **TOTAL** | **XX** | **100%** |

### Lighthouse Accessibility Score

| Auditoría | Puntaje | Pasó |
|-----------|---------|------|
| **Accessibility** | XX/100 | [✓/✗] |
| - [aria-*] attributes valid | X | [✓/✗] |
| - [id] attributes unique | X | [✓/✗] |
| - Image elements have [alt] | X | [✓/✗] |
| - Form elements have labels | X | [✓/✗] |
| - Background/foreground colors have sufficient contrast | X | [✓/✗] |

### WAVE Results

- **Errors**: XX (Meta: 0)
- **Alerts**: XX (Revisar cada uno)
- **Contrast Errors**: XX (Meta: 0)
- **Missing Alt**: XX (Meta: 0)
- **ARIA Issues**: XX (Meta: 0)

---

## 🎯 Top 10 Hallazgos de Accesibilidad

### CRÍTICOS (🔴)

**1. [H-FE-A-C-001] 47 Imágenes Sin Alt Text**
- **WCAG**: 1.1.1 (Level A)
- **Impacto**: Contenido crítico invisible para 2.2B de personas con discapacidad visual
- **Ubicación**: `/products`, `/gallery`
- **Esfuerzo**: 3 horas
- **Prioridad**: 1

**2. [H-FE-A-C-002] Navegación por Teclado Bloqueada en Modal**
- **WCAG**: 2.1.1, 2.1.2 (Level A)
- **Impacto**: Usuarios de teclado atrapados, no pueden cerrar modal
- **Ubicación**: `Modal.jsx`, línea 45
- **Esfuerzo**: 2 horas
- **Prioridad**: 1

**3. [H-FE-A-C-003] 15 Campos de Formulario Sin Label**
- **WCAG**: 1.3.1, 4.1.2 (Level A)
- **Impacto**: Formularios completamente inaccesibles
- **Ubicación**: `ContactForm.jsx`, `CheckoutForm.jsx`
- **Esfuerzo**: 2 horas
- **Prioridad**: 1

### ALTOS (🟠)

**4. [H-FE-A-H-001] Contraste Insuficiente en 28 Elementos**
- **WCAG**: 1.4.3 (Level AA)
- **Impacto**: Texto ilegible para 16% de usuarios
- **Ratios**: 2.1:1 - 4.2:1 (necesita 4.5:1)
- **Ubicación**: Botones secundarios, texto gris
- **Esfuerzo**: 4 horas
- **Prioridad**: 2

**5. [H-FE-A-H-002] Focus Invisible en Botones**
- **WCAG**: 2.4.7 (Level AA)
- **Impacto**: Navegación por teclado ciega
- **Código**: `button:focus { outline: none; }`
- **Esfuerzo**: 2 horas
- **Prioridad**: 2

---

## 🧪 Resultados de Testing Manual

### Navegación por Teclado

✅ **Funciona Correctamente:**
- Header navigation
- Footer links
- Main content skiplink

❌ **Problemas Encontrados:**
- Dropdown menu no accesible (Esc no cierra)
- Carousel no navegable con arrows
- Modal sin focus trap
- Tabs sin aria-selected

### Screen Reader (NVDA)

✅ **Funciona Correctamente:**
- Heading structure
- Landmark regions (nav, main, footer)
- Alt text en logo e iconos críticos

❌ **Problemas Encontrados:**
- Spinner de carga sin aria-live
- Mensajes de error no anunciados
- Tooltip solo visual (aria-describedby faltante)
- Accordion sin aria-expanded

### Contraste de Color

**Elementos con contraste insuficiente:**

| Elemento | Color Texto | Color Fondo | Ratio | Requerido | Estado |
|----------|-------------|-------------|-------|-----------|--------|
| `.btn-secondary` | #999 | #fff | 2.8:1 | 4.5:1 | ❌ FAIL |
| `.muted-text` | #aaa | #fff | 2.3:1 | 4.5:1 | ❌ FAIL |
| `.badge` | #007bff | #fff | 4.2:1 | 4.5:1 | ❌ FAIL |

---

## 🛠️ Roadmap de Remediación

### Fase 1: Cumplimiento Nivel A (Sprint 1 - 1 semana)
**Esfuerzo**: 12 horas  
**Meta**: 100% cumplimiento WCAG A

- [ ] Agregar alt text a todas las imágenes (3h)
- [ ] Fix keyboard navigation en modal/dropdown (3h)
- [ ] Labels en todos los form fields (2h)
- [ ] Corregir heading structure (2h)
- [ ] ARIA roles básicos (nav, main, footer) (2h)

### Fase 2: Cumplimiento Nivel AA (Sprint 2-3 - 2 semanas)
**Esfuerzo**: 16 horas  
**Meta**: 100% cumplimiento WCAG AA

- [ ] Corregir contraste de colores (4h)
- [ ] Focus visible en todos los elementos (2h)
- [ ] Skip links funcionales (1h)
- [ ] Keyboard traps resueltos (3h)
- [ ] ARIA states (aria-expanded, aria-selected) (3h)
- [ ] Live regions para contenido dinámico (3h)

### Fase 3: Optimizaciones AAA (Sprint 4+ - Opcional)
**Esfuerzo**: 8 horas  
**Meta**: Mejoras de UX avanzadas

- [ ] Contraste AAA (7:1) en elementos críticos (3h)
- [ ] Error prevention en formularios (2h)
- [ ] Consistent navigation (2h)
- [ ] Abbr/acronym explanations (1h)

---

## 📈 KPIs y Métricas de Éxito

### Pre-Remediación
- Lighthouse a11y: XX/100
- axe errors: XX
- WCAG AA compliance: XX%
- Keyboard navigation: XX% functional

### Post-Remediación (Objetivo)
- Lighthouse a11y: >95/100
- axe errors: 0 critical, 0 serious
- WCAG AA compliance: 100%
- Keyboard navigation: 100% functional

### Legal & Business Impact
- **Legal risk**: REDUCIDO (ADA compliance)
- **Market size**: +2.2B usuarios potenciales
- **SEO boost**: +5-10% (a11y factor en ranking)
- **Brand reputation**: MEJORADO

---

## 📎 Anexos

- `axe-devtools-report.json` - Reporte axe completo
- `lighthouse-a11y.html` - Reporte Lighthouse
- `wave-report.pdf` - WAVE analysis
- `keyboard-navigation-test.mp4` - Video de testing
- `screen-reader-issues.txt` - Notas de NVDA testing

---

**Próxima Auditoría**: [Fecha tras remediación]  
**Responsable**: [Nombre]  
**Contacto**: [Email]

---

*Fin de Auditoría de Accesibilidad*
```

---

## ✅ Checklist de Completitud

- [ ] axe DevTools ejecutado en todas las páginas clave
- [ ] Lighthouse a11y score documentado
- [ ] WAVE analysis completo
- [ ] Keyboard navigation testeado manualmente
- [ ] Screen reader testing (NVDA/JAWS)
- [ ] Contrast checker usado
- [ ] Cumplimiento WCAG calculado (% por nivel)
- [ ] Top 10 hallazgos priorizados
- [ ] Roadmap con estimaciones
- [ ] Evidencia (screenshots/videos) adjunta
- [ ] Score calculado (/20 puntos)

---

**Versión**: 1.0  
**Actualizado**: Noviembre 2025
