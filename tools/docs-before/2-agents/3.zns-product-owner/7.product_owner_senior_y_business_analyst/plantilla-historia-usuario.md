# HU-XXX: [Título Descriptivo en Imperativo]

> **Ejemplo:** HU-042: Buscar tutores por materia y nivel

---

## 📋 Historia de Usuario

**Como** [rol específico del usuario],  
**Quiero** [acción o funcionalidad deseada],  
**Para** [beneficio o valor de negocio que obtengo].

> **Ejemplo:**  
> **Como** estudiante de secundaria,  
> **Quiero** buscar tutores de matemáticas para mi nivel,  
> **Para** encontrar ayuda especializada que mejore mis calificaciones.

---

## 🎯 Valor de Negocio

[Explicar el impacto de negocio de esta historia. Responder: ¿Por qué es importante? ¿Qué métrica mejora?]

**Métricas impactadas:**
- Conversión de visitante a usuario registrado
- Tiempo promedio hasta primera reserva
- NPS (Net Promoter Score)
- Revenue por usuario

**Impacto estimado:** [Alto / Medio / Bajo]

> **Ejemplo:**  
> Esta historia es crítica para el funnel de conversión. El 78% de los estudiantes que usan la búsqueda avanzada realizan una reserva en las siguientes 48 horas (vs. 32% sin búsqueda). 
> 
> **Impacto:** Incremento proyectado del 40% en reservas del MVP.

---

## 📝 Descripción Detallada

[Contexto adicional, flujo esperado del usuario, consideraciones importantes. Máximo 3-4 párrafos.]

> **Ejemplo:**  
> Los estudiantes llegan a la plataforma buscando ayuda específica para una materia y nivel educativo concreto (primaria, secundaria, universidad). La búsqueda debe ser simple e intuitiva, mostrando resultados relevantes ordenados por rating y disponibilidad.
> 
> El sistema debe manejar casos donde no hay resultados disponibles, sugiriendo ampliar criterios o notificar cuando haya nuevos tutores.

---

## ✅ Criterios de Aceptación

### Escenario 1: Búsqueda exitosa con resultados (Flujo feliz)

**Dado que** soy un estudiante registrado en la plataforma  
**Y** estoy en la página de búsqueda de tutores  
**Cuando** selecciono "Matemáticas" como materia  
**Y** selecciono "Secundaria" como nivel  
**Y** hago clic en "Buscar"  
**Entonces** veo una lista de tutores que enseñan matemáticas a nivel secundaria  
**Y** los resultados están ordenados por rating (de mayor a menor)  
**Y** cada resultado muestra: nombre, foto, rating, precio/hora, disponibilidad próxima  
**Y** el tiempo de respuesta es menor a 2 segundos

---

### Escenario 2: Búsqueda sin resultados

**Dado que** estoy en la página de búsqueda  
**Cuando** selecciono "Química Cuántica" como materia  
**Y** selecciono "Primaria" como nivel  
**Y** hago clic en "Buscar"  
**Entonces** veo el mensaje "No encontramos tutores que coincidan con tu búsqueda"  
**Y** veo la sugerencia "Intenta ampliar tu búsqueda o configura una alerta para ser notificado"  
**Y** veo un botón "Ampliar búsqueda"

---

### Escenario 3: Búsqueda sin seleccionar criterios obligatorios

**Dado que** estoy en la página de búsqueda  
**Cuando** hago clic en "Buscar" sin seleccionar materia  
**Entonces** veo el mensaje de error "Por favor selecciona al menos una materia"  
**Y** el campo "Materia" se resalta en rojo  
**Y** el sistema NO ejecuta la búsqueda

---

### Escenario 4: Filtrar resultados por disponibilidad

**Dado que** tengo resultados de búsqueda visibles  
**Cuando** activo el filtro "Disponible hoy"  
**Entonces** los resultados se actualizan mostrando solo tutores con al menos 1 horario disponible hoy  
**Y** el contador muestra "X tutores disponibles hoy"

---

### Escenario 5: Accesibilidad - Lector de pantalla

**Dado que** uso un lector de pantalla (NVDA/JAWS)  
**Cuando** navego por los resultados de búsqueda  
**Entonces** el lector anuncia claramente cada tutor con formato: "[Nombre], rating [X] estrellas, [Y] pesos por hora"  
**Y** los controles de filtro son navegables con teclado (Tab)  
**Y** cumple WCAG 2.1 nivel AA

---

## 🔗 Trazabilidad

- **Módulo:** Marketplace
- **Épica:** Descubrimiento de Tutores
- **Requisito Funcional:** [RF-012] Búsqueda y Filtrado de Tutores
- **Requisito No Funcional:** 
  - [RNF-PERF-003] Tiempo de respuesta <2s
  - [RNF-ACC-001] Cumplir WCAG 2.1 AA
- **Prioridad:** **MUST HAVE** (MVP)

---

## 📊 Estimación

- **Story Points:** 5 (Fibonacci scale)
- **Esfuerzo Estimado:** 3-5 días (asumiendo velocidad de equipo de 20 SP/sprint)
- **Complejidad:** Media
- **Incertidumbre:** Baja (problema conocido, tecnología probada)

**Justificación de estimación:**
- Frontend: Componente de búsqueda con filtros (2 días)
- Backend: Endpoint GET /api/tutors con query params (1 día)
- Testing: Tests unitarios + E2E (1 día)
- Integración: Conexión con servicio de disponibilidad (1 día)

---

## 🔄 Dependencias

### Depende de (debe completarse primero):
- **[HU-010]** Crear modelo de datos de Tutor
- **[HU-011]** Endpoint de listado básico de tutores

### Bloquea a (debe completarse antes de iniciar):
- **[HU-043]** Filtros avanzados (precio, rating, geolocalización)
- **[HU-044]** Guardar búsquedas favoritas

### Relacionada con:
- **[HU-040]** Ver perfil detallado de tutor (mismo módulo)
- **[HU-050]** Reservar sesión con tutor (flujo siguiente)

---

## 🧪 Notas de Testing

### Casos de prueba clave para QA:

1. **Happy path:** Búsqueda con resultados múltiples
2. **Empty state:** Búsqueda sin resultados
3. **Validaciones:** Campos obligatorios vacíos
4. **Performance:** 1000 tutores en BD, búsqueda <2s
5. **Edge cases:** 
   - Búsqueda con caracteres especiales
   - Búsqueda mientras se cargan datos
   - Cambio rápido de filtros (debounce)

### Datos de prueba requeridos:

```sql
-- Mínimo 50 tutores de prueba
-- 10+ materias diferentes
-- Variedad de niveles educativos
-- Ratings de 3.0 a 5.0
-- Precios de $10,000 a $80,000 COP/hora
```

### Consideraciones de automatización:

- **Unitarias:** Tests del hook `useTutorSearch()` con mock data
- **Integración:** Tests de API `/api/tutors?subject=X&level=Y`
- **E2E:** Cypress automation del flujo completo de búsqueda

---

## 🎨 Notas de Diseño

- **Wireframes:** [Enlace a Figma - Búsqueda de Tutores v2.1]
- **Flujo UX:** [User Journey Map - Discovery Phase]
- **Assets necesarios:**
  - Icono de lupa (búsqueda)
  - Iconos de materias (matemáticas, ciencias, etc.)
  - Empty state illustration (búsqueda sin resultados)
- **Copy UX:**
  - Placeholder: "¿Qué quieres aprender hoy?"
  - CTA: "Buscar tutores"
  - Empty state: "Amplía tu búsqueda para encontrar más tutores"

---

## ⚠️ Riesgos y Supuestos

### Supuestos:
- Los tutores tienen perfiles completos con materia y nivel documentados
- El catálogo de materias está predefinido (no es texto libre)
- La disponibilidad de tutores se actualiza en tiempo real o near-real-time
- Los estudiantes conocen su nivel educativo (primaria/secundaria/universidad)

### Riesgos:
- **Performance:** Si hay 10,000+ tutores, búsqueda sin índices puede ser lenta
  - *Mitigación:* Índices en columnas `subject` y `level` en BD
- **UX:** Si hay muchos resultados (100+), puede ser abrumador
  - *Mitigación:* Paginación de 20 resultados por página
- **Calidad de datos:** Tutores con perfiles incompletos afectan relevancia
  - *Mitigación:* Validar perfil completo antes de mostrar en búsqueda

### Preguntas abiertas:
- ¿Permitimos búsqueda por texto libre o solo por dropdown?
- ¿Implementamos búsqueda predictiva (typeahead)?
- ¿Mostramos tutores "no disponibles" al final de resultados?

---

## ✔️ Definition of Done (DoD)

- [ ] **Código desarrollado** y pusheado a feature branch
- [ ] **Code review** aprobado por al menos 1 desarrollador senior
- [ ] **Tests unitarios** escritos y pasando (>80% cobertura)
  - `useTutorSearch.test.tsx`
  - `TutorSearchFilters.test.tsx`
- [ ] **Tests de integración** pasando
  - `GET /api/tutors` con diferentes query params
- [ ] **Tests E2E** pasando en Cypress
  - `tutor-search.spec.ts`
- [ ] **Criterios de aceptación validados** por Product Owner en staging
- [ ] **Documentación técnica** actualizada
  - README del módulo de búsqueda
  - API docs (OpenAPI/Swagger)
- [ ] **Sin errores críticos** en SonarQube/ESLint
- [ ] **Sin vulnerabilidades** de seguridad (Snyk, npm audit)
- [ ] **Desplegado en staging** y funcional
- [ ] **Demo realizada** con stakeholders (PO, UX, QA)
- [ ] **Performance validado**: Lighthouse score >90, búsqueda <2s
- [ ] **Accesibilidad validada**: Axe DevTools 0 issues críticos, navegable con teclado
- [ ] **Responsive design**: Funciona en mobile, tablet, desktop
- [ ] **Internacionalización**: Strings externalizados (i18n ready)

---

## 📌 Etiquetas (Tags)

`#marketplace` `#busqueda` `#mvp` `#sprint-2` `#frontend` `#backend` `#prioridad-alta` `#e2e-test` `#performance-critical`

---

## 📅 Historial de Cambios

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| 2025-11-08 | 1.0 | [PO Name] | Creación inicial de la historia |
| 2025-11-10 | 1.1 | [PO Name] | Agregados criterios de accesibilidad (Escenario 5) |
| 2025-11-12 | 1.2 | [Dev Lead] | Refinamiento de estimación tras spike técnico |

---

## 👥 Participantes

- **Product Owner:** [Nombre] (Aprobación final)
- **Tech Lead:** [Nombre] (Revisión técnica)
- **UX Designer:** [Nombre] (Validación de flujo)
- **QA Lead:** [Nombre] (Estrategia de testing)
- **Desarrollador Asignado:** [Nombre] (Implementación)

---

**Estado:** 📝 To Do | 🟡 In Progress | ✅ Done | 🚫 Blocked  
**Última actualización:** 2025-11-08  
**Sprint:** Sprint 2 (Semana del 11 al 22 de noviembre)
