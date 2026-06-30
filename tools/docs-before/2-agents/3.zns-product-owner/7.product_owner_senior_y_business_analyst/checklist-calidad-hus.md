# Checklist de Calidad para Historias de Usuario

**Versión:** 1.0.0  
**Última actualización:** 2025-11-08  
**Basado en:** INVEST Criteria, IEEE 29148, Agile Alliance Standards

---

## 📋 Instrucciones de Uso

Este checklist debe aplicarse a **cada Historia de Usuario** antes de considerarla lista para desarrollo. Una HU debe cumplir **100% de los criterios obligatorios** para entrar en un sprint.

**Roles que deben validar:**
- Product Owner (todos los criterios)
- Tech Lead (criterios técnicos)
- UX Designer (criterios de experiencia)
- QA Lead (criterios de testabilidad)

---

## ✅ Parte 1: INVEST Criteria (Obligatorio)

### I - Independent (Independiente)

- [ ] **La HU puede desarrollarse sin depender de otras HUs en el mismo sprint**
- [ ] Si tiene dependencias, están documentadas en la sección "Dependencias"
- [ ] Las dependencias críticas están completadas o en progreso avanzado
- [ ] No hay dependencias circulares (A depende de B, B depende de A)

**Preguntas de validación:**
- ¿Puedo iniciar esta HU sin esperar a que otra termine?
- ¿Las dependencias están en módulos/equipos diferentes que puedan bloquearme?

**Acciones si falla:**
- Identificar qué debe completarse primero
- Considerar dividir la HU en partes independientes
- Documentar dependencias explícitamente

---

### N - Negotiable (Negociable)

- [ ] **La HU describe QUÉ (objetivo), no CÓMO (implementación)**
- [ ] Los detalles técnicos están abiertos a decisión del equipo de desarrollo
- [ ] No especifica tecnologías concretas (salvo restricciones validadas)
- [ ] Permite diferentes soluciones técnicas que cumplan los criterios de aceptación

**Ejemplo:**
```markdown
❌ RÍGIDO (No negociable):
"Cuando el usuario busca, el sistema debe usar Elasticsearch con sharding 
de 3 nodos y almacenar en Redis con TTL de 5 minutos..."

✅ FLEXIBLE (Negociable):
"Cuando el usuario busca, los resultados se muestran en <2 segundos 
con disponibilidad 99.9%"
```

**Preguntas de validación:**
- ¿El equipo tiene libertad para elegir el enfoque técnico?
- ¿Estoy especificando soluciones en lugar de problemas?

**Acciones si falla:**
- Reescribir eliminando detalles de implementación
- Mover detalles técnicos a "Notas de diseño" (sugerencias, no requisitos)

---

### V - Valuable (Valiosa)

- [ ] **El valor de negocio está claramente explicado**
- [ ] La sección "🎯 Valor de Negocio" responde: ¿Por qué es importante?
- [ ] Se puede medir el impacto (métrica cuantificable)
- [ ] Un stakeholder no técnico entiende el valor sin explicaciones extras
- [ ] La historia aporta valor a un usuario final (no es solo técnica)

**Métricas válidas de valor:**
- Incremento en conversión (%)
- Reducción de tiempo de tarea (minutos/horas)
- Mejora en NPS/CSAT
- Incremento en revenue ($)
- Reducción de costos operativos ($)
- Reducción de errores/tickets de soporte (%)

**Preguntas de validación:**
- ¿Un usuario final notaría si esta HU no se implementa?
- ¿Puedo justificar el ROI de esta historia?

**Acciones si falla:**
- Redefinir el beneficio desde la perspectiva del usuario
- Si no hay valor claro, evaluar si es realmente necesaria
- Considerar si es una tarea técnica (spike, refactor) en lugar de HU

---

### E - Estimable (Estimable)

- [ ] **El equipo puede estimar esfuerzo con confianza razonable**
- [ ] Los criterios de aceptación son suficientemente claros
- [ ] No hay incertidumbres técnicas críticas sin resolver
- [ ] Story points están en escala Fibonacci (1, 2, 3, 5, 8, 13, 21)
- [ ] Si estimación es >13 SP, considerar dividir

**Señales de que NO es estimable:**
- "No sabemos cómo hacer esto"
- "Depende de investigar la tecnología X"
- "Necesitamos un spike primero"
- Estimaciones varían >200% entre miembros del equipo

**Preguntas de validación:**
- ¿Todos los desarrolladores entienden qué construir?
- ¿Hay tecnologías/integraciones desconocidas?
- ¿El alcance es claro o ambiguo?

**Acciones si falla:**
- Crear un **Spike** (timebox de investigación) antes de estimar
- Refinar la historia con más detalles
- Dividir en partes más pequeñas y estimables

---

### S - Small (Pequeña)

- [ ] **La HU puede completarse en 1 sprint (1-2 semanas)**
- [ ] Story points: idealmente 3-8 SP, máximo 13 SP
- [ ] Si es >13 SP, se descompone en HUs más pequeñas
- [ ] Una sola persona/pair puede completarla
- [ ] Tiene un objetivo claro y acotado (no es una épica disfrazada)

**Guía de tamaño:**
| Story Points | Esfuerzo | Tiempo | Tamaño |
|--------------|----------|--------|--------|
| 1-2 SP | Trivial | 0.5-1 día | ✅ Muy pequeña |
| 3-5 SP | Bajo | 1-3 días | ✅ Pequeña (ideal) |
| 8 SP | Medio | 3-5 días | ⚠️ Mediana (límite) |
| 13 SP | Alto | 5-8 días | 🔴 Grande (dividir) |
| 21+ SP | Muy alto | 2+ semanas | 🔴 Épica (descomponer) |

**Técnicas de división:**
- Por rol de usuario (estudiante vs. tutor)
- Por flujo (crear vs. editar vs. eliminar)
- Por complejidad (versión simple vs. avanzada)
- Por regla de negocio (validación básica vs. compleja)
- Por UI (pantalla principal vs. modales/secundarias)

**Preguntas de validación:**
- ¿Puedo demostrar valor al final del sprint?
- ¿Es lo suficientemente pequeña para tener feedback rápido?

**Acciones si falla:**
- Aplicar técnicas de división
- Crear épica y descomponerla en 3-8 HUs

---

### T - Testable (Testeable)

- [ ] **Los criterios de aceptación son verificables objetivamente**
- [ ] Cada criterio usa formato Given-When-Then
- [ ] Los "Then" especifican observables claros (no ambiguos)
- [ ] QA puede escribir casos de prueba solo leyendo los AC
- [ ] Incluye escenarios de error y edge cases
- [ ] Métricas cuantificables cuando aplica (tiempo, cantidad, etc.)

**Ejemplos de criterios testeables vs. no testeables:**

```markdown
❌ NO TESTEABLE (ambiguo):
"Entonces la página carga rápido"
"El sistema es fácil de usar"
"Se muestran resultados relevantes"

✅ TESTEABLE (específico):
"Entonces la página carga en <2 segundos (medido con Lighthouse)"
"El formulario tiene labels y es navegable con teclado (WCAG 2.1 AA)"
"Los resultados incluyen tutores con rating ≥4.0 ordenados por disponibilidad"
```

**Preguntas de validación:**
- ¿Un tester puede validar esto con un script automatizado?
- ¿Los criterios son medibles o solo subjetivos?
- ¿Cubro flujo feliz + errores + edge cases?

**Acciones si falla:**
- Reescribir criterios con métricas concretas
- Agregar escenarios de error faltantes
- Consultar con QA para validar claridad

---

## ✅ Parte 2: Formato y Estructura (Obligatorio)

### Formato Given-When-Then (Gherkin)

- [ ] **Todos los criterios de aceptación usan sintaxis Gherkin**
- [ ] Cada escenario tiene nombre descriptivo
- [ ] "Given" establece precondiciones/contexto
- [ ] "When" describe la acción del usuario
- [ ] "Then" especifica resultado observable
- [ ] Se usa "Y" para pasos adicionales (no "And" en español)

**Ejemplo correcto:**
```gherkin
### Escenario 1: Login exitoso con credenciales válidas

Dado que soy un estudiante registrado con email "juan@example.com"
Y mi contraseña es "Pass123!"
Cuando ingreso mis credenciales en el formulario de login
Y hago clic en "Iniciar sesión"
Entonces soy redirigido al dashboard de estudiante
Y veo el mensaje de bienvenida "Hola, Juan"
Y mi sesión expira en 30 minutos (token JWT)
```

---

### Trazabilidad

- [ ] **Módulo identificado** (Auth, Marketplace, Payments, etc.)
- [ ] **Épica asignada** (a qué grupo de HUs pertenece)
- [ ] **Requisito funcional vinculado** (RF-XXX)
- [ ] **Requisitos no funcionales aplicables** (RNF-XXX si aplica)
- [ ] **Prioridad MoSCoW asignada** (MUST/SHOULD/COULD/WON'T)

---

### Estimación

- [ ] **Story points asignados** (Fibonacci: 1,2,3,5,8,13,21)
- [ ] **Complejidad indicada** (Baja/Media/Alta)
- [ ] Si >13 SP, justificación de por qué no se divide
- [ ] Estimación consensuada (Planning Poker o similar)

---

### Dependencias

- [ ] **Dependencias hacia atrás documentadas** (qué debe completarse antes)
- [ ] **Dependencias hacia adelante** (qué bloquea esta HU)
- [ ] **Historias relacionadas listadas** (mismo módulo/flujo)
- [ ] Dependencias críticas con riesgo de bloqueo identificadas

---

### Definition of Done

- [ ] **Checklist de DoD incluida**
- [ ] Incluye: código, tests, documentación, deploy, demo
- [ ] Criterios técnicos (cobertura, linters, seguridad)
- [ ] Criterios de calidad (performance, accesibilidad)
- [ ] Validación por stakeholders

---

## ✅ Parte 3: Calidad de Redacción (Obligatorio)

### Lenguaje y Claridad

- [ ] **Usa lenguaje de negocio** (no jerga técnica innecesaria)
- [ ] Un stakeholder no técnico entiende la HU sin explicaciones
- [ ] El título es auto-explicativo (máximo 60 caracteres)
- [ ] No hay acrónimos sin definir
- [ ] Lenguaje consistente con el dominio del proyecto

**Ejemplos:**
```markdown
❌ TÉCNICO (malo):
"Como usuario, quiero que el endpoint /api/auth/login retorne 
JWT en header Authorization..."

✅ NEGOCIO (bueno):
"Como estudiante, quiero iniciar sesión con mi email para 
acceder a mi dashboard personalizado"
```

---

### Perspectiva del Usuario

- [ ] **La HU está escrita desde el punto de vista del usuario final**
- [ ] No dice "Como desarrollador..." (esas son tareas técnicas)
- [ ] No dice "Como sistema..." (foco en humanos, no máquinas)
- [ ] Especifica ROL concreto (Estudiante, Tutor, Admin, no "Usuario")

---

### Beneficio Explícito

- [ ] **La cláusula "Para [beneficio]" está presente y clara**
- [ ] El beneficio es tangible (no genérico como "tener funcionalidad")
- [ ] Conecta con objetivos de negocio o del usuario

**Ejemplos:**
```markdown
❌ VAGO:
"Para tener la funcionalidad de búsqueda"

✅ ESPECÍFICO:
"Para encontrar tutores calificados en menos de 30 segundos 
y aumentar mi confianza en la plataforma"
```

---

## ✅ Parte 4: Cobertura de Escenarios (Recomendado)

### Escenarios Mínimos

- [ ] **Escenario 1: Flujo feliz** (todo funciona correctamente)
- [ ] **Escenario 2: Flujo alternativo** (variación válida del flujo)
- [ ] **Escenario 3: Manejo de errores** (entrada inválida, error de servicio)
- [ ] **Escenario 4: Edge cases** (valores límite, casos extremos)

**Ejemplo de cobertura completa:**
```gherkin
Escenario 1: Pago exitoso con tarjeta válida (flujo feliz)
Escenario 2: Pago con cupón de descuento (alternativo)
Escenario 3: Pago rechazado por tarjeta expirada (error)
Escenario 4: Pago con monto mínimo ($500 COP) (edge case)
```

---

### Requisitos No Funcionales en AC

- [ ] **Performance:** Tiempos de respuesta especificados (si aplica)
- [ ] **Seguridad:** Validaciones, encriptación (si aplica)
- [ ] **Accesibilidad:** WCAG 2.1 AA, navegación con teclado (si aplica)
- [ ] **Usabilidad:** Mensajes de error claros, feedback visual

---

## ✅ Parte 5: Completitud (Recomendado)

### Secciones Obligatorias

- [ ] 📋 Historia de Usuario (Como-Quiero-Para)
- [ ] 🎯 Valor de Negocio
- [ ] ✅ Criterios de Aceptación (3-5 escenarios)
- [ ] 🔗 Trazabilidad (módulo, épica, RF, prioridad)
- [ ] 📊 Estimación (story points, complejidad)
- [ ] 🔄 Dependencias
- [ ] ✔️ Definition of Done

### Secciones Opcionales pero Recomendadas

- [ ] 📝 Descripción Detallada
- [ ] 🧪 Notas de Testing
- [ ] 🎨 Notas de Diseño (wireframes, flujos UX)
- [ ] ⚠️ Riesgos y Supuestos
- [ ] 📌 Etiquetas (tags)

---

## ✅ Parte 6: Validación Cross-Funcional (Obligatorio)

### Checkpoint con Desarrollo

- [ ] **Un desarrollador junior puede entender qué construir**
- [ ] Los criterios de aceptación son suficientemente claros
- [ ] No hay ambigüedades técnicas críticas
- [ ] El alcance es realista para el sprint

**Pregunta clave:** "¿Podría un dev junior implementar esto sin preguntarme 10 veces?"

---

### Checkpoint con QA

- [ ] **Un tester puede escribir casos de prueba solo leyendo los AC**
- [ ] Los escenarios cubren happy path + errores + edge cases
- [ ] Los criterios son verificables (no subjetivos)
- [ ] Hay datos de prueba disponibles o fáciles de crear

**Pregunta clave:** "¿QA puede automatizar estos tests sin inventar criterios?"

---

### Checkpoint con UX/Diseño

- [ ] **Un diseñador UX sabe qué pantallas/flujos crear**
- [ ] Los wireframes existen o están en progreso
- [ ] El flujo de usuario es claro y lógico
- [ ] Se consideró accesibilidad (WCAG 2.1)

**Pregunta clave:** "¿UX puede diseñar la interfaz sin asumir comportamientos?"

---

### Checkpoint con Negocio/PO

- [ ] **Un stakeholder de negocio valida el valor sin explicaciones extras**
- [ ] La prioridad es correcta (alineada con roadmap)
- [ ] El valor de negocio justifica el esfuerzo
- [ ] Los criterios de aceptación reflejan necesidades reales

**Pregunta clave:** "¿El CEO/cliente entendería por qué estamos construyendo esto?"

---

## 📊 Scoring de Calidad

### Nivel de Cumplimiento

| Criterios Cumplidos | Nivel | Acción |
|---------------------|-------|--------|
| 100% (Parte 1-3) | ⭐⭐⭐ Excelente | ✅ Lista para sprint |
| 90-99% | ⭐⭐ Buena | ⚠️ Refinar detalles menores |
| 70-89% | ⭐ Regular | 🔴 Requiere refinamiento |
| <70% | ❌ Insuficiente | 🚫 No lista, rehacer |

---

## 🔄 Proceso de Refinamiento

Si una HU **NO pasa** el checklist:

1. **Identificar** qué criterios específicos fallan
2. **Refinar** la HU con el equipo (PO + Dev + UX + QA)
3. **Documentar** cambios en "Historial de Cambios"
4. **Re-validar** con este checklist
5. **Aprobar** solo cuando cumple 100% de Parte 1-3

---

## 📚 Referencias

- **INVEST Criteria:** [Bill Wake, 2003](https://xp123.com/articles/invest-in-good-stories-and-smart-tasks/)
- **User Story Mapping:** [Jeff Patton, 2014](https://www.jpattonassociates.com/user-story-mapping/)
- **Gherkin Syntax:** [Cucumber BDD](https://cucumber.io/docs/gherkin/)
- **IEEE 29148:2018:** Requirements Engineering Standard
- **Agile Alliance:** [User Story Definition](https://www.agilealliance.org/glossary/user-stories/)

---

## 📝 Plantilla de Firma de Aprobación

```markdown
## ✅ Aprobación de Historia de Usuario

**Historia:** HU-XXX - [Título]

| Rol | Nombre | Aprobación | Fecha | Comentarios |
|-----|--------|------------|-------|-------------|
| Product Owner | [Nombre] | ✅ / ❌ | 2025-11-08 | Valor de negocio validado |
| Tech Lead | [Nombre] | ✅ / ❌ | 2025-11-08 | Estimación realista |
| QA Lead | [Nombre] | ✅ / ❌ | 2025-11-08 | Criterios testeables |
| UX Designer | [Nombre] | ✅ / ❌ | 2025-11-08 | Flujo claro y usable |

**Decisión Final:** ✅ APROBADA para Sprint X  
**Próximo paso:** Planning Poker para estimar SP
```

---

**Versión del Checklist:** 1.0.0  
**Mantenido por:** Método ZNS - User Stories Agent  
**Última revisión:** 2025-11-08
