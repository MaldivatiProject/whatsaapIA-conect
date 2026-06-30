# 🎯 SKILL: UX SENIOR DINÁMICO

**skill_id**: ux-senior-dinamico-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: ux  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: 
- `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-angular-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-react-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/2.frontend_senior/prompt-dev-frontend-vue3-quasar-senior.md`
- `2-agents/0.zns-audit/5.frontend_audit/` (cualquier agente de auditoría frontend)  
**dependencias**: ninguna (skill autónoma)

---

## 📌 Propósito de la Skill

Esta skill dota al agente de capacidades de **Diseño de Experiencia de Usuario a nivel Senior/Expert**, con foco especial en **dinamismo visual, microinteracciones, motion design y patrones de interacción avanzados**. Se activa en cualquier momento que el agente deba tomar decisiones sobre cómo el usuario experimenta e interactúa con una interfaz, priorizando interfaces vivas, fluidas y emocionalmente satisfactorias sin sacrificar rendimiento ni accesibilidad.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Principios Fundamentales de UX Senior

#### 1.1 Los 3 Pilares del UX Dinámico de Alto Impacto

```
UTILIDAD × USABILIDAD × DELEITE = Experiencia Memorable
```

- **Utilidad**: El usuario logra su objetivo en el menor número de pasos posible
- **Usabilidad**: La interfaz es intuitiva sin curva de aprendizaje (0 fricción cognitiva)
- **Deleite**: La interfaz genera placer, sorpresa positiva y deseo de regresar

> ❗ Un agente con esta skill nunca sacrifica Utilidad ni Usabilidad en nombre del Deleite. El dinamismo existe para **reforzar la función**, no para decorar.

#### 1.2 Principios No Negociables

| Principio | Descripción | Métrica |
|-----------|-------------|---------|
| **Feedback inmediato** | Toda acción del usuario recibe respuesta visual ≤ 100ms | Lighthouse TBT < 200ms |
| **Affordance clara** | Cada elemento interactivo comunica visualmente que es interactivo | 0 falsos affordances |
| **Motion con propósito** | Las animaciones guían la atención, no la distraen | Duración ≤ 400ms por microinteracción |
| **Consistencia sistémica** | El mismo patrón de interacción en todo el producto | Design Tokens unificados |
| **Jerarquía visual dinámica** | El foco visual se mueve con el flujo de la tarea | Eye-tracking patterns respetados |
| **Error recovery elegante** | Los errores son oportunidades de guía, no bloqueos | 100% de errores con mensaje accionable |
| **Estado vacío intencional** | Los estados vacíos (empty states) tienen propósito narrativo | 0 pantallas en blanco sin contexto |

---

### 2️⃣ Motion Design y Microinteracciones

#### 2.1 Sistema de Duración de Animaciones (Motion Timing)

```scss
// Tokens de duración — NO usar valores arbitrarios
$motion-instant:    50ms;   // Estados hover ligeros, tooltips
$motion-fast:      100ms;   // Feedback de click, focus rings
$motion-normal:    200ms;   // Dropdowns, modales pequeños, chips
$motion-medium:    300ms;   // Sidebars, drawers, transiciones de página
$motion-slow:      400ms;   // Onboarding, hero animations, splash
$motion-dramatic:  600ms;   // Transiciones de contexto completo (máximo permitido)

// REGLA: Nada que el usuario deba ESPERAR supera 400ms
// REGLA: Entrada de elementos: ease-out | Salida de elementos: ease-in
// REGLA: Transiciones de estado: ease-in-out
```

#### 2.2 Microinteracciones que Elevan la Calidad Percibida

##### a) Botones con feedback háptico visual
```typescript
// Angular — Botón con ripple effect + state feedback
@Component({
  selector: 'zns-button',
  standalone: true,
  template: `
    <button
      [class]="buttonState()"
      (mousedown)="startRipple($event)"
      (click)="handleClick()"
      [attr.aria-busy]="loading()">

      <!-- Ripple layer -->
      <span class="ripple-container" aria-hidden="true">
        @for (ripple of ripples(); track ripple.id) {
          <span class="ripple"
                [style.left.px]="ripple.x"
                [style.top.px]="ripple.y"
                (animationend)="removeRipple(ripple.id)">
          </span>
        }
      </span>

      <!-- Content with loading state -->
      <span class="btn-content" [class.opacity-0]="loading()">
        <ng-content />
      </span>

      @if (loading()) {
        <span class="btn-spinner" role="status" aria-label="Cargando...">
          <svg class="animate-spin" viewBox="0 0 24 24">...</svg>
        </span>
      }
    </button>
  `
})
export class ZnsButtonComponent {
  loading = input<boolean>(false);
  ripples = signal<{id: number; x: number; y: number}[]>([]);

  buttonState = computed(() => [
    'relative overflow-hidden',
    'transition-all duration-200 ease-out',
    'active:scale-[0.97]',           // ← microinteracción de presión
    'focus-visible:ring-2 focus-visible:ring-offset-2',
    this.loading() ? 'cursor-wait' : 'cursor-pointer'
  ].join(' '));

  startRipple(event: MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ripple = { id: Date.now(), x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.ripples.update(r => [...r, ripple]);
  }

  removeRipple(id: number) {
    this.ripples.update(r => r.filter(ripple => ripple.id !== id));
  }
}
```

##### b) Skeleton Screens > Spinners
```typescript
// REGLA: Nunca mostrar spinner genérico si la estructura del contenido es conocida
// Siempre usar skeleton que replique la forma del contenido final

@Component({
  selector: 'zns-user-card-skeleton',
  standalone: true,
  template: `
    <div class="animate-pulse" aria-busy="true" aria-label="Cargando usuario...">
      <div class="flex gap-3 p-4">
        <div class="rounded-full bg-neutral-200 dark:bg-neutral-700 h-12 w-12 shrink-0"></div>
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
          <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  `
})
export class UserCardSkeletonComponent {}
```

##### c) Transiciones de página con View Transitions API
```typescript
// Angular 18+ — Transiciones de navegación fluidas
// En app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions({
      onViewTransitionCreated: ({ transition }) => {
        // Cancelar si el usuario prefiere reducir movimiento
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          transition.skipTransition();
        }
      }
    }))
  ]
};
```

```css
/* CSS — Transiciones personalizadas por ruta */
::view-transition-old(root) {
  animation: fade-out 200ms ease-in forwards;
}
::view-transition-new(root) {
  animation: fade-in 200ms ease-out forwards;
}

@keyframes fade-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-8px); }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

#### 2.3 Regla WCAG para Motion: `prefers-reduced-motion`
```scss
// OBLIGATORIO en TODO proyecto — nunca omitir
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 3️⃣ Patrones de Interacción UX Senior

#### 3.1 Progressive Disclosure (Revelación Progresiva)
Muestra solo lo necesario para la tarea actual. Reduce la carga cognitiva.

```
Nivel 1: Acción principal visible → siempre
Nivel 2: Opciones secundarias → visible al hover o clic en "más"
Nivel 3: Configuración avanzada → colapsada por defecto, expandible
```

#### 3.2 Optimistic UI
Actualiza la UI inmediatamente asumiendo éxito, revierte en caso de error. Elimina la espera percibida.

```typescript
// Patrón Optimistic Update en Angular + Signal
toggleFavorite(item: Item) {
  // 1. Actualiza UI inmediatamente (optimista)
  this.items.update(list =>
    list.map(i => i.id === item.id ? { ...i, isFavorite: !i.isFavorite } : i)
  );

  // 2. Llama al servidor en background
  this.itemService.toggleFavorite(item.id).pipe(
    catchError(() => {
      // 3. Revierte si falla + notifica al usuario
      this.items.update(list =>
        list.map(i => i.id === item.id ? { ...i, isFavorite: item.isFavorite } : i)
      );
      this.toast.error('No se pudo guardar. Intenta de nuevo.');
      return EMPTY;
    })
  ).subscribe();
}
```

#### 3.3 Gestalt en Diseño de Interfaces
Aplica principios Gestalt para guiar la percepción sin texto explicativo:

| Principio | Aplicación práctica |
|-----------|---------------------|
| **Proximidad** | Agrupa elementos relacionados con `gap` consistente (8px, 16px, 24px) |
| **Similitud** | Misma categoría = mismo tratamiento visual (color, forma, tamaño) |
| **Figura/fondo** | Usa sombras y capas para crear profundidad: `shadow-sm` < `shadow-md` < `shadow-xl` |
| **Continuidad** | Las listas y grids alinean el ojo hacia el siguiente elemento |
| **Cierre** | Usa formas incompletas para sugerir interactividad (tooltips, cards elevadas) |

#### 3.4 Emotional Design — Los 3 Niveles de Norman
```
Nivel Visceral  → Primera impresión visual (color, forma, tipografía, ilustraciones)
Nivel Conductual → Facilidad de uso, feedback, control del usuario
Nivel Reflexivo  → Significado, identidad, satisfacción post-uso ("¡qué bien hecho está esto!")
```

Un agente con esta skill considera los 3 niveles en cada componente que diseña o implementa.

#### 3.5 Estados de UI — Los 7 que SIEMPRE deben existir
Todo componente de datos debe manejar explícitamente:

| Estado | Descripción | Ejemplo visual |
|--------|-------------|----------------|
| `idle` | Sin inicializar | Nada o placeholder neutro |
| `loading` | Cargando datos | Skeleton screen |
| `success` | Datos cargados | Contenido real |
| `empty` | Sin datos que mostrar | Ilustración + CTA motivador |
| `error` | Error de red/servidor | Mensaje + botón reintentar |
| `partial` | Carga parcial / paginando | Contenido + indicador de más |
| `stale` | Datos desactualizados | Badge "Actualizar disponible" |

```typescript
// Signal para manejar estado completo
type UiState<T> = {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'partial' | 'stale';
  data?: T;
  error?: string;
};

uiState = signal<UiState<User[]>>({ status: 'idle' });
```

---

### 4️⃣ Sistemas de Diseño y Design Tokens

#### 4.1 Estructura de Design Tokens de Calidad Senior
```scss
// NUNCA usar valores hardcoded — Todo pasa por tokens
:root {
  // Primitivos (no usar directamente en componentes)
  --color-blue-500: #3b82f6;
  --space-4: 1rem;

  // Semánticos (usar SIEMPRE en componentes)
  --color-action-primary:    var(--color-blue-500);
  --color-action-primary-hover: #2563eb;
  --color-surface-default:   #ffffff;
  --color-surface-elevated:  #f8fafc;
  --color-text-primary:      #0f172a;
  --color-text-secondary:    #64748b;
  --color-text-disabled:     #94a3b8;
  --color-border-default:    #e2e8f0;
  --color-feedback-error:    #ef4444;
  --color-feedback-success:  #22c55e;
  --color-feedback-warning:  #f59e0b;
  --color-feedback-info:     #3b82f6;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  --shadow-card: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
  --shadow-elevated: 0 4px 6px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.05);
  --shadow-modal: 0 20px 25px rgba(0,0,0,.1), 0 10px 10px rgba(0,0,0,.04);
}
```

#### 4.2 Componentes con Dark Mode nativo
```typescript
// REGLA: Dark mode desde diseño inicial, nunca como afterthought
@Component({
  template: `
    <div class="
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-700
      text-neutral-900 dark:text-neutral-100
      shadow-card transition-colors duration-200
    ">
      ...
    </div>
  `
})
```

---

### 5️⃣ UX Writing y Microcopy

#### 5.1 Principios de Microcopy de Nivel Senior

| Contexto | ❌ Junior | ✅ Senior/Expert |
|----------|-----------|-----------------|
| Botón de envío | "Submit" | "Guardar cambios" / "Confirmar pedido" |
| Estado vacío | "No hay datos" | "Aún no tienes proyectos. ¡Crea el primero!" [+ CTA] |
| Error de red | "Error 500" | "Tuvimos un problema al cargar tus datos. Inténtalo de nuevo." |
| Confirmación de borrado | "¿Estás seguro?" | "¿Eliminar 'Proyecto Alpha'? Esta acción no se puede deshacer." |
| Placeholder | "Escribe aquí" | "Ej: nombre@empresa.com" |
| Tooltip | "Info" | "El nombre aparecerá en tu perfil público" |

#### 5.2 Tonos según Contexto
- **Onboarding**: Motivador, cálido, en segunda persona ("¡Empecemos por lo importante!")
- **Errores bloqueantes**: Empático, directo, con solución ("No pudimos conectarnos. Verifica tu red e intenta de nuevo.")
- **Acciones destructivas**: Neutro, claro, con consecuencias explícitas
- **Éxito**: Celebratorio pero breve ("¡Listo! Tu perfil fue actualizado.")

---

### 6️⃣ Accesibilidad Avanzada como Parte del Dinamismo

> ❗ El dinamismo visual INCLUYE accesibilidad. Una interfaz dinámica que excluye usuarios con discapacidades visuales o motoras NO es Senior.

#### Checklist de Accesibilidad para Componentes Dinámicos

```typescript
// Componente dinámico accesible — Angular
@Component({
  template: `
    <!-- ARIA live regions para contenido que cambia dinámicamente -->
    <div aria-live="polite" aria-atomic="false" class="sr-only" id="status-announcer">
      {{ statusMessage() }}
    </div>

    <!-- Focus trap en modales -->
    <div cdkTrapFocus [cdkTrapFocusAutoCapture]="true" role="dialog"
         [attr.aria-labelledby]="'modal-title-' + modalId"
         [attr.aria-describedby]="'modal-desc-' + modalId">
      ...
    </div>

    <!-- Notificaciones temporales accesibles -->
    <div role="alert" aria-live="assertive" [class.sr-only]="!hasError()">
      {{ errorMessage() }}
    </div>
  `
})
```

| Requisito | Mínimo WCAG AA | Meta Expert |
|-----------|---------------|-------------|
| Color contrast (texto normal) | 4.5:1 | 7:1 |
| Color contrast (texto grande 18pt+) | 3:1 | 4.5:1 |
| Área de toque mínima | 24×24px | 44×44px (WCAG 2.2) |
| Focus visible | Visible | `ring-2` + offset + color de marca |
| Keyboard navigation | Funcional | Full, lógica, con skip links |
| Screen reader | Semántica correcta | ARIA patterns completos |
| Reduced motion | Respetado | Experiencia alternativa equivalente |

---

## ✅ Criterios de Aplicación

- Cuando el agente diseña o implementa cualquier componente con estado visual
- Cuando se evalúa o audita experiencia de usuario de una interfaz existente
- Cuando se define o revisa un Design System o sus tokens
- Cuando el agente decide sobre transiciones, animaciones o feedback visual
- Cuando se redacta microcopy, mensajes de error, tooltips o estados vacíos

---

## ❌ Anti-patrones (el agente NUNCA debe hacer esto)

- ❌ **Animar por estética pura**: Toda animación debe tener un propósito funcional (guiar atención, confirmar acción, indicar carga)
- ❌ **Ignorar `prefers-reduced-motion`**: Es un requisito de accesibilidad, no opcional
- ❌ **Spinners genéricos**: Si la estructura del contenido es conocida, usar skeleton screens
- ❌ **Estados vacíos mudos**: Un estado vacío sin contexto ni CTA es un abandono de usuario
- ❌ **Animaciones >600ms en flujos de tarea**: El usuario espera, la percepción de lentitud aumenta
- ❌ **Dark mode como afterthought**: Diseñar siempre en ambos modos desde el inicio
- ❌ **Valores de design hardcodeados**: Nunca `color: #3b82f6` directo, siempre `var(--color-action-primary)`
- ❌ **Optimistic UI sin rollback**: Si se actualiza optimistamente, el error SIEMPRE revierte y notifica
- ❌ **Microcopy genérico en errores**: "Error" o "Algo salió mal" no ayuda al usuario a resolver el problema
- ❌ **Focus invisible**: En ninguna circunstancia los estilos deben incluir `outline: none` sin un reemplazo visible

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Transformación de un botón básico a dinámico Senior

**Input (básico)**:
```html
<button (click)="save()">Guardar</button>
```

**Output (UX Senior Dinámico)**:
```typescript
@Component({
  selector: 'zns-save-button',
  template: `
    <button
      type="button"
      [disabled]="loading() || disabled()"
      [attr.aria-busy]="loading()"
      [attr.aria-label]="loading() ? 'Guardando cambios...' : 'Guardar cambios'"
      class="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2
             rounded-lg font-medium text-sm
             bg-blue-600 hover:bg-blue-700 active:bg-blue-800
             text-white
             transition-all duration-200 ease-out
             active:scale-[0.97]
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-blue-500 focus-visible:ring-offset-2
             disabled:opacity-50 disabled:cursor-not-allowed
             dark:bg-blue-500 dark:hover:bg-blue-400"
      (click)="handleSave()">

      @if (loading()) {
        <svg class="animate-spin h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span>Guardando...</span>
      } @else if (saved()) {
        <svg class="h-4 w-4 text-green-300" aria-hidden="true" ...>✓</svg>
        <span>Guardado</span>
      } @else {
        <ng-content />
      }
    </button>
  `
})
export class ZnsSaveButtonComponent {
  loading = input<boolean>(false);
  disabled = input<boolean>(false);
  saved = signal(false);
  clicked = output<void>();

  handleSave() {
    this.clicked.emit();
    // Feedback visual de éxito temporal
    setTimeout(() => this.saved.set(false), 2000);
  }
}
```

### Ejemplo 2: Empty State motivador

**Input (básico)**:
```html
<p>No tienes tareas</p>
```

**Output (UX Senior)**:
```typescript
@Component({
  selector: 'zns-empty-tasks',
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center"
         role="region" aria-label="Sin tareas">
      <!-- Ilustración SVG contextual (no stock generic) -->
      <div class="mb-6 opacity-60" aria-hidden="true">
        <!-- SVG de cuaderno vacío con lápiz -->
      </div>

      <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
        Tu lista está vacía por ahora
      </h3>
      <p class="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs mb-6">
        Crea tu primera tarea y empieza a organizar tu trabajo del día.
      </p>

      <button class="..." (click)="createFirst.emit()">
        + Crear primera tarea
      </button>
    </div>
  `
})
export class EmptyTasksComponent {
  createFirst = output<void>();
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente frontend, agrega **la siguiente sección** después de su sección de "Mentalidad y Principios" o "Estándares de Calidad":

```markdown
---

## 🎨 SKILL ACTIVA: UX SENIOR DINÁMICO
> **Referencia completa**: `2-agents/zns-tools/skills/ux-senior-dinamico.skill.md`

### Principios de Dinamismo UX que aplica SIEMPRE este agente:

**Motion con propósito**:
- Timings: instant=50ms | fast=100ms | normal=200ms | medium=300ms | slow=400ms (máximo en flujos de tarea)
- `ease-out` para entradas, `ease-in` para salidas, `ease-in-out` para transiciones de estado
- OBLIGATORIO: `prefers-reduced-motion` siempre implementado

**Microinteracciones de calidad Expert**:
- Botones: ripple effect + `active:scale-[0.97]` + estados loading/success/error explícitos
- Skeleton screens (nunca spinners genéricos cuando la estructura del contenido es conocida)
- View Transitions API para navegación entre páginas (Angular 18+)
- Optimistic UI con rollback garantizado en caso de error

**7 estados de UI obligatorios** en todo componente de datos:
`idle → loading → success → empty → error → partial → stale`

**Design Tokens**:
- Nunca valores hardcodeados de color, espaciado o sombra en componentes
- Dark mode desde diseño inicial (nunca afterthought)
- Variables semánticas: `--color-action-primary`, `--color-surface-default`, etc.

**Gestalt aplicada**:
- Proximidad: gap consistente (8/16/24px)
- Figura/fondo: jerarquía de sombras (`shadow-sm < shadow-md < shadow-xl`)
- Continuidad: alineación que guía el ojo al siguiente elemento

**UX Writing**:
- Empty states: ilustración contextual + texto motivador + CTA
- Errores: empáticos, directos, con solución ("Tuvimos un problema... intenta de nuevo")
- Botones: verbos contextuales ("Guardar cambios") nunca genéricos ("Submit")
- Confirmaciones destructivas: incluyen el nombre del objeto a eliminar

**Accesibilidad como parte del dinamismo** (WCAG 2.2 AA mínimo):
- `aria-live` para contenido que cambia dinámicamente
- Focus visible siempre con ring + offset (nunca `outline: none` sin reemplazo)
- Áreas de toque ≥ 44×44px
- Color contrast ratio texto normal ≥ 4.5:1
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Lighthouse Accessibility | ≥ 95/100 |
| Lighthouse Performance | ≥ 90/100 |
| WCAG 2.2 AA Compliance | 100% |
| Color Contrast (texto normal) | ≥ 4.5:1 |
| Color Contrast (texto grande) | ≥ 3:1 |
| Touch Target mínimo | 44×44px |
| Duración max animación en flujo | ≤ 400ms |
| Duración max animación dramática | ≤ 600ms |
| Estados de UI por componente | 7 de 7 |
| Reducción de movimiento | Implementado en 100% de animaciones |
| Design tokens hardcodeados | 0 |
| Empty states sin CTA | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — UX Senior Dinámico para agentes frontend ZNS
