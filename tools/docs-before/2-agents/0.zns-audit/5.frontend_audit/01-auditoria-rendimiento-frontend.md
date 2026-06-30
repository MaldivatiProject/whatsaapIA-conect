# Prompt: Auditoría de Rendimiento Frontend (Performance)

---

## 🎯 Objetivo

Evaluar el rendimiento de la aplicación frontend midiendo Core Web Vitals, bundle size, lazy loading, caching, y optimizaciones de carga. Identificar cuellos de botella que afectan la experiencia del usuario.

---

## 📋 Alcance de la Auditoría

### 1. Core Web Vitals
- **LCP (Largest Contentful Paint)**: Tiempo de carga del elemento principal
  - Meta: <2.5 segundos (Good)
  - Aceptable: 2.5-4 segundos (Needs Improvement)
  - Malo: >4 segundos (Poor)

- **INP (Interaction to Next Paint)**: Respuesta a interacciones
  - Meta: <200ms (Good)
  - Aceptable: 200-500ms (Needs Improvement)
  - Malo: >500ms (Poor)

- **CLS (Cumulative Layout Shift)**: Estabilidad visual
  - Meta: <0.1 (Good)
  - Aceptable: 0.1-0.25 (Needs Improvement)
  - Malo: >0.25 (Poor)

- **TTFB (Time to First Byte)**: Respuesta del servidor
  - Meta: <800ms (Good)
  - Aceptable: 800ms-1.8s (Needs Improvement)
  - Malo: >1.8s (Poor)

### 2. Bundle Analysis
- **Tamaño inicial**: <200KB (gzipped)
- **Chunks**: Correctamente divididos por rutas
- **Vendor bundle**: <300KB
- **Dead code**: Detectar código no usado
- **Tree shaking**: Verificar que funcione

### 3. Carga de Recursos
- **Imágenes**:
  - Formato moderno (WebP, AVIF)
  - Lazy loading implementado
  - Responsive images (srcset)
  - Compresión adecuada
  
- **Fonts**:
  - font-display: swap
  - Preload de fonts críticas
  - Subset de caracteres
  
- **CSS/JS**:
  - Minificación
  - Critical CSS inline
  - Defer/async scripts

### 4. Caching Strategy
- **Service Worker**: PWA capabilities
- **HTTP Caching**: Cache-Control headers
- **CDN**: Uso de CDN para assets
- **Asset versioning**: Cache busting

### 5. Rendering Performance
- **React/Vue/Angular**:
  - Re-renders innecesarios
  - Memo/useMemo/useCallback
  - Virtual scrolling para listas
  - Code splitting por rutas
  
- **JavaScript**:
  - Long tasks (>50ms)
  - Main thread blocking
  - Hydration time (SSR)

---

## 🔍 Metodología de Análisis

### Paso 1: Lighthouse CI (Desktop & Mobile)

```bash
# Instalar Lighthouse CI
npm install -g @lhci/cli

# Ejecutar auditoría
lhci autorun --collect.numberOfRuns=3 --collect.url="https://[URL]"

# O manualmente
lighthouse https://[URL] \
  --preset=desktop \
  --output=html \
  --output-path=./lighthouse-desktop.html

lighthouse https://[URL] \
  --preset=mobile \
  --output=html \
  --output-path=./lighthouse-mobile.html
```

**Documentar:**
- Performance Score (0-100)
- Metrics: FCP, LCP, TBT, CLS, SI
- Opportunities (mejoras detectadas)
- Diagnostics (problemas encontrados)

### Paso 2: Bundle Analysis

**Para Webpack:**
```bash
# Instalar plugin
npm install --save-dev webpack-bundle-analyzer

# Ejecutar build con análisis
npm run build -- --analyze
```

**Para Vite:**
```bash
# Instalar plugin
npm install --save-dev rollup-plugin-visualizer

# Ejecutar build
npm run build
```

**Para Next.js:**
```bash
# Instalar plugin
npm install @next/bundle-analyzer

# En next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

# Ejecutar
ANALYZE=true npm run build
```

**Documentar:**
- Tamaño total del bundle (gzipped)
- Top 10 dependencias más pesadas
- Chunks generados y sus tamaños
- Assets sin lazy loading
- Código duplicado entre chunks

### Paso 3: Network Waterfall Analysis

**Chrome DevTools > Network:**
1. Abrir en modo incógnito (sin cache)
2. Throttling: Fast 3G / Slow 3G
3. Capturar carga completa de la página
4. Exportar HAR file

**Analizar:**
- Cascada de recursos (waterfall)
- Recursos bloqueantes (críticos)
- Tiempo de carga por tipo (CSS, JS, images, fonts)
- Recursos sin cachear
- Redirects innecesarios
- Recursos 404

### Paso 4: Runtime Performance

**Chrome DevTools > Performance:**
1. Grabar 6 segundos de interacción (scroll, click, typing)
2. Analizar flamegraph
3. Identificar long tasks

**Documentar:**
- Long tasks (>50ms)
- Forced reflows (layout thrashing)
- Expensive functions
- Memory leaks (si aplica)

### Paso 5: Web Vitals Measurement

**Instalar CrUX (Chrome User Experience Report):**
```bash
npm install web-vitals
```

**Implementar medición:**
```javascript
import {onCLS, onFID, onLCP, onINP, onTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  console.log(metric);
  // Enviar a analytics
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

**Documentar métricas reales del usuario (RUM):**
- 75th percentile de cada métrica
- Comparación con field data de CrUX

---

## 📊 Hallazgos Comunes y Severidad

### 🔴 CRÍTICOS (Bloqueadores)

#### H-FE-P-C-001: Bundle Inicial >1MB
**Descripción**: El bundle inicial supera 1MB (sin gzip), causando tiempos de carga inaceptables en redes lentas.

**Impacto**: 
- LCP >5 segundos en 3G
- Abandono del 53% de usuarios móviles
- SEO penalizado por Google

**Cómo Detectar**:
```bash
# Build del proyecto
npm run build

# Verificar tamaño
ls -lh dist/static/js/main.*.js
# Si >1MB sin gzip → CRÍTICO
```

**Remediation**:
```javascript
// 1. Code splitting por rutas
// Antes
import Home from './pages/Home';
import About from './pages/About';

// Después
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));

// 2. Dynamic imports para componentes pesados
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// 3. Analizar y remover dependencias pesadas
// Revisar bundle analyzer para identificar culpables
```

**Esfuerzo**: 8-16 horas  
**Prioridad**: 🔴 1 (INMEDIATO)

---

#### H-FE-P-C-002: LCP >4 Segundos
**Descripción**: Largest Contentful Paint supera 4 segundos, afectando severamente UX.

**Impacto**:
- Percepción de lentitud extrema
- Bounce rate aumentado 32%
- Core Web Vitals FAIL

**Cómo Detectar**:
```bash
# Lighthouse
lighthouse [URL] --only-categories=performance

# Buscar en reporte:
# "Largest Contentful Paint" > 4s
```

**Remediation**:
```html
<!-- 1. Preload de imagen hero -->
<link rel="preload" as="image" href="/hero.webp" />

<!-- 2. Priority hints -->
<img src="/hero.webp" fetchpriority="high" />

<!-- 3. Server-side rendering (Next.js) -->
export async function getServerSideProps() {
  return { props: { data } };
}

<!-- 4. Optimizar imagen hero -->
<!-- Convertir a WebP/AVIF -->
<!-- Usar CDN con transformación automática -->
```

**Esfuerzo**: 4-8 horas  
**Prioridad**: 🔴 1

---

#### H-FE-P-C-003: Sin Lazy Loading de Imágenes
**Descripción**: Todas las imágenes se cargan al inicio, incluso las fuera del viewport.

**Impacto**:
- Bandwidth desperdiciado
- LCP inflado
- Experiencia lenta en móviles

**Cómo Detectar**:
```bash
# Buscar imágenes sin loading="lazy"
grep -r "<img" src/ | grep -v 'loading="lazy"' | wc -l
# Si >10 imágenes sin lazy → CRÍTICO
```

**Remediation**:
```jsx
// React
<img 
  src="/image.jpg" 
  loading="lazy"  // ✅ Native lazy loading
  alt="Description"
/>

// O con library
import { LazyLoadImage } from 'react-lazy-load-image-component';

<LazyLoadImage
  src="/image.jpg"
  alt="Description"
  effect="blur"
/>
```

**Esfuerzo**: 2 horas  
**Prioridad**: 🔴 1

---

### 🟠 ALTOS

#### H-FE-P-H-001: CLS >0.25 (Layout Shifts)
**Descripción**: Elementos que se mueven durante la carga, causando frustración.

**Impacto**:
- UX pobre (clicks accidentales)
- Core Web Vitals FAIL
- Penalización SEO

**Cómo Detectar**:
```bash
# Lighthouse reporte
# Buscar "Cumulative Layout Shift" > 0.25

# O manual: DevTools > Performance
# Grabar carga de página
# Ver "Experience" track para layout shifts
```

**Remediation**:
```css
/* 1. Reservar espacio para imágenes */
img {
  aspect-ratio: 16 / 9; /* ✅ Previene shift */
  width: 100%;
  height: auto;
}

/* 2. Skeleton screens */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  animation: loading 1.5s infinite;
}

/* 3. Font loading con fallback */
@font-face {
  font-family: 'CustomFont';
  src: url('/font.woff2');
  font-display: swap; /* ✅ Evita FOIT */
}
```

**Esfuerzo**: 4 horas  
**Prioridad**: 🟠 2

---

#### H-FE-P-H-002: Dependencias Sin Tree Shaking
**Descripción**: Librerías completas importadas cuando solo se usa una función.

**Impacto**:
- Bundle inflado innecesariamente
- +200KB de código no usado

**Cómo Detectar**:
```javascript
// Buscar imports completos
grep -r "import \* as" src/
grep -r "import lodash" src/

// Bundle analyzer mostrará librerías completas
```

**Remediation**:
```javascript
// ❌ MALO
import _ from 'lodash';
import moment from 'moment';
import * as Icons from 'react-icons/fa';

// ✅ BUENO
import debounce from 'lodash/debounce';
import { format } from 'date-fns';
import { FaHome, FaUser } from 'react-icons/fa';
```

**Esfuerzo**: 2 horas  
**Prioridad**: 🟠 2

---

### 🟡 MEDIOS

#### H-FE-P-M-001: Imágenes Sin Optimizar
**Descripción**: Imágenes en PNG/JPG sin compresión, >500KB.

**Remediation**:
```bash
# Convertir a WebP
npm install -g @squoosh/cli

squoosh-cli --webp auto *.jpg

# Next.js Image Optimization
<Image 
  src="/photo.jpg"
  width={800}
  height={600}
  quality={75}
  alt="Photo"
/>
```

**Esfuerzo**: 3 horas  
**Prioridad**: 🟡 3

---

## 📋 Template de Informe de Rendimiento

```markdown
# Auditoría de Rendimiento Frontend - [PROYECTO]

---
**Fecha**: [DD/MM/YYYY]  
**Auditor**: [Nombre]  
**Framework**: [React/Angular/Vue/Next.js]  
**Versión**: [X.Y.Z]  
**Ambiente**: [Production/Staging/Local]  
**URL**: [https://...]

---

## 📊 Resumen Ejecutivo

### Calificación de Rendimiento

```
┌────────────────────────────────────┐
│   RENDIMIENTO: XX/25 puntos       │
│                                    │
│   Lighthouse Score: XX/100         │
│   Estado: [BUENO|REGULAR|CRÍTICO] │
└────────────────────────────────────┘
```

### Core Web Vitals

| Métrica | Valor Actual | Meta | Estado | Impacto |
|---------|--------------|------|--------|---------|
| **LCP** | X.Xs | <2.5s | 🔴/🟡/🟢 | [ALTO/MEDIO/BAJO] |
| **INP** | XXms | <200ms | 🔴/🟡/🟢 | [ALTO/MEDIO/BAJO] |
| **CLS** | X.XX | <0.1 | 🔴/🟡/🟢 | [ALTO/MEDIO/BAJO] |
| **TTFB** | XXXms | <800ms | 🔴/🟡/🟢 | [ALTO/MEDIO/BAJO] |

### Lighthouse Scores (Desktop / Mobile)

| Categoría | Desktop | Mobile | Delta |
|-----------|---------|--------|-------|
| Performance | XX/100 | XX/100 | ±X |
| FCP | X.Xs | X.Xs | ±X.Xs |
| LCP | X.Xs | X.Xs | ±X.Xs |
| TBT | XXms | XXms | ±XXms |
| CLS | X.XX | X.XX | ±X.XX |
| SI | X.Xs | X.Xs | ±X.Xs |

---

## 🎯 Top 5 Hallazgos de Rendimiento

1. **[H-FE-P-C-001]** Bundle inicial de 1.2MB - 🔴 CRÍTICO
   - Impacto: LCP de 6.2s en 3G
   - Esfuerzo: 16h
   - Prioridad: 1

2. **[H-FE-P-C-002]** 150 imágenes sin lazy loading - 🔴 CRÍTICO
   - Impacto: 3.5MB de datos desperdiciados
   - Esfuerzo: 4h
   - Prioridad: 1

3. **[H-FE-P-H-001]** CLS de 0.32 por ads dinámicos - 🟠 ALTO
   - Impacto: UX pobre, clicks accidentales
   - Esfuerzo: 8h
   - Prioridad: 2

4. **[H-FE-P-H-002]** Sin code splitting en rutas - 🟠 ALTO
   - Impacto: Bundle monolítico
   - Esfuerzo: 12h
   - Prioridad: 2

5. **[H-FE-P-M-001]** Fonts sin optimizar - 🟡 MEDIO
   - Impacto: FOUT visible 500ms
   - Esfuerzo: 2h
   - Prioridad: 3

---

## 📦 Bundle Analysis

### Tamaños de Bundle

| Chunk | Size (gzip) | Size (raw) | % of Total |
|-------|-------------|------------|------------|
| main.js | XXX KB | XXX KB | XX% |
| vendor.js | XXX KB | XXX KB | XX% |
| runtime.js | XXX KB | XXX KB | XX% |
| **TOTAL** | **XXX KB** | **XXX KB** | **100%** |

### Top 10 Dependencias Pesadas

| Dependencia | Tamaño (gzip) | ¿Necesaria? | Alternativa |
|-------------|---------------|-------------|-------------|
| moment.js | 72 KB | No | date-fns (6 KB) |
| lodash | 25 KB | Parcial | lodash-es + tree-shake |
| ... | ... | ... | ... |

### Oportunidades de Optimización

- [ ] Remover moment.js → date-fns (-66 KB)
- [ ] Code splitting en rutas (-200 KB inicial)
- [ ] Tree shaking de lodash (-15 KB)
- [ ] Lazy load de react-icons (-45 KB)

---

## 🖼️ Análisis de Imágenes

### Estadísticas

- **Total de imágenes**: XXX
- **Con lazy loading**: XX (XX%)
- **Sin optimizar**: XX (XX%)
- **Formato moderno (WebP)**: XX (XX%)
- **Tamaño promedio**: XXX KB

### Recomendaciones

1. **Implementar lazy loading**: +XX imágenes
2. **Convertir a WebP**: Ahorro estimado de XXX KB
3. **Responsive images**: Usar srcset para móviles
4. **CDN con auto-optimization**: Cloudinary/ImageKit

---

## ⚡ Análisis de Rendering

### Re-renders Innecesarios

**Componentes detectados:**
```javascript
// Componente: ProductList
// Re-renders: 15 veces en 3 segundos
// Causa: Prop drilling sin memo

// Solución:
const ProductList = React.memo(({ products }) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.products === nextProps.products;
});
```

### Long Tasks

| Task | Duración | Archivo | Línea |
|------|----------|---------|-------|
| Parse JSON | 85ms | api.js | 45 |
| Render Table | 120ms | Table.jsx | 102 |

---

## 🚀 Roadmap de Optimización

### Fase 1: Quick Wins (Sprint 1 - 1 semana)
**Esfuerzo**: 8 horas  
**Impacto**: +15 puntos Lighthouse

- [ ] Implementar lazy loading de imágenes (2h)
- [ ] Habilitar Gzip/Brotli en servidor (1h)
- [ ] Preload de recursos críticos (2h)
- [ ] Optimizar fonts (font-display: swap) (1h)
- [ ] Minificar CSS/JS (config) (2h)

### Fase 2: Code Splitting (Sprint 2-3 - 2 semanas)
**Esfuerzo**: 20 horas  
**Impacto**: +20 puntos, -400KB bundle

- [ ] React.lazy() para rutas (8h)
- [ ] Dynamic imports para componentes pesados (6h)
- [ ] Tree shaking de dependencias (4h)
- [ ] Análisis y remoción de código muerto (2h)

### Fase 3: Optimizaciones Avanzadas (Sprint 4-6 - 3 semanas)
**Esfuerzo**: 32 horas  
**Impacto**: +10 puntos, mejor UX

- [ ] Implementar Service Worker (PWA) (12h)
- [ ] SSR/SSG para páginas críticas (12h)
- [ ] Skeleton screens y placeholders (4h)
- [ ] Virtual scrolling para listas (4h)

---

## 📈 KPIs y Métricas de Éxito

### Pre-Optimización
- Lighthouse Performance: XX/100
- LCP: X.Xs
- Bundle size: XXX KB
- Time to Interactive: X.Xs

### Post-Optimización (Objetivo)
- Lighthouse Performance: >90/100
- LCP: <2.5s
- Bundle size: <200 KB
- Time to Interactive: <3.5s

### ROI Estimado
- **Inversión**: XX horas @ $XXX/hora = $X,XXX
- **Beneficio**: 
  - +X% conversión (datos de Google: 1s → 7% conversión)
  - -X% bounce rate
  - +X posiciones en SEO
- **ROI**: XXX%

---

## 🛠️ Herramientas Utilizadas

- ✅ Lighthouse CI v11.5
- ✅ webpack-bundle-analyzer v4.9
- ✅ Chrome DevTools
- ✅ WebPageTest
- ✅ GTmetrix

---

## 📎 Anexos

- `lighthouse-desktop.html` - Reporte Lighthouse Desktop
- `lighthouse-mobile.html` - Reporte Lighthouse Mobile
- `bundle-analysis.html` - Visualización de bundle
- `network-waterfall.har` - Network HAR file
- `performance-trace.json` - Chrome Performance trace

---

**Próxima Re-auditoría**: [Fecha]  
**Responsable**: [Nombre]  
**Contacto**: [Email]

---

*Fin de Auditoría de Rendimiento*
```

---

## ✅ Checklist de Completitud

Antes de dar por finalizada la auditoría:

- [ ] Lighthouse ejecutado (desktop + mobile)
- [ ] Bundle analyzer generado
- [ ] Core Web Vitals documentados
- [ ] Network waterfall analizado
- [ ] Top 10 hallazgos priorizados
- [ ] Roadmap con estimaciones
- [ ] Reportes HTML adjuntos
- [ ] Score calculado (/25 puntos)
- [ ] Recomendaciones accionables
- [ ] Informe sin errores tipográficos

---

**Versión**: 1.0  
**Actualizado**: Noviembre 2025
