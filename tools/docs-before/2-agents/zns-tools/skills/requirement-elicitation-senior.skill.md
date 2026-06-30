# 🎯 SKILL: REQUIREMENT ELICITATION SENIOR

**skill_id**: requirement-elicitation-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: prompting  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: Agentes de análisis de negocio, Product Owner, Business Analyst, agentes de captura de ideas  
**dependencias**: `anti-hallucination-prompting.skill.md` (recomendada en paralelo)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con técnicas senior de **elicitación de requisitos** para transformar ideas brutas o necesidades vagas en historias de usuario formales, bien estructuradas y listas para ser descompuestas en historias técnicas (HUTs). Aplica el estándar IEEE 29148-2018 y los criterios INVEST como guías de calidad, usando patrones probados de entrevistas estructuradas para extracción de información de alta fidelidad.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Valor antes que solución** — La HU debe capturar el *por qué* (valor de negocio) antes de describir el *qué* (funcionalidad). El cómo (implementación) pertenece a las HUTs.
2. **Actor real, no genérico** — "Usuario" es inválido. Debe ser "Administrador de plataforma", "Cliente final autenticado", "Sistema externo de pagos", etc.
3. **Criterios de aceptación verificables** — Cada criterio debe poder ser probado como verdadero/falso sin ambigüedad. "El sistema debe ser rápido" → inválido. "El sistema responde en ≤ 2 segundos para el 95% de las solicitudes" → válido.
4. **INVEST como filtro final** — Antes de cerrar la HU, validar que cumple los 6 criterios INVEST.
5. **Scope explícito = In/Out** — Toda HU debe declarar explícitamente qué está DENTRO y qué está FUERA del scope.
6. **Una necesidad por HU** — Si en una sesión emergen 3 necesidades distintas, son 3 HUs distintas, no una.

---

### Técnicas y Patrones

#### TÉCNICA 1: Marco 5W1H para Elicitación

El 5W1H es el esqueleto de toda HU. No cerrar ninguna sección sin haber respondido cada dimensión:

| Dimensión | Pregunta | Mapea a sección de la HU |
|-----------|----------|--------------------------|
| **Who** (¿Quién?) | ¿Qué actor o rol realiza esta acción? | Actor de la narrativa |
| **What** (¿Qué?) | ¿Qué capacidad necesita el sistema? | Capacidad / funcionalidad |
| **Why** (¿Por qué?) | ¿Qué valor de negocio genera? ¿Qué problema resuelve? | Beneficio de la narrativa |
| **When** (¿Cuándo?) | ¿En qué momento o condición se activa? | Precondiciones y contexto |
| **Where** (¿Dónde?) | ¿En qué parte del sistema / flujo sucede? | Contexto del sistema |
| **How much** (¿Cuánto?) | ¿Qué umbrales o volúmenes definen el éxito? | NFRs y criterios de aceptación |

**Uso práctico en la entrevista:**
```markdown
Voy a hacerte 6 preguntas clave para entender bien tu necesidad:

1. [WHO] ¿Qué tipo de usuario o sistema necesita esto? (sé específico: no "usuario", sino qué rol)
2. [WHAT] ¿Qué acción concreta necesita poder hacer en el sistema?
3. [WHY] ¿Qué le pasa a ese usuario si NO puede hacer eso hoy? ¿Cuál es el impacto de negocio?
4. [WHEN] ¿En qué contexto o condición ocurre esta necesidad? (durante el onboarding, al final del mes, solo cuando hay error, etc.)
5. [WHERE] ¿En qué módulo, página, flujo o proceso del sistema encaja esto?
6. [HOW MUCH] ¿Hay algún número, volumen o umbral que defina que funciona bien? (ej: menos de 3 segundos, hasta 10.000 registros, etc.)
```

---

#### TÉCNICA 2: Criterios de Aceptación Gherkin (Given-When-Then)

Todo criterio de aceptación debe seguir el patrón Gherkin para ser verificable y no ambiguo:

```gherkin
Escenario: [Nombre descriptivo del escenario]
  Dado que [precondición del sistema o del actor]
  Cuando [acción que realiza el actor]
  Entonces [resultado observable y verificable]
  Y [resultado adicional si aplica]
```

**Tipos obligatorios de escenarios a cubrir:**

| Tipo | Descripción | Obligatorio |
|------|-------------|-------------|
| **Happy Path** | Flujo exitoso estándar | ✅ Sí |
| **Validación de input** | Datos inválidos o incompletos | ✅ Sí |
| **Límite de scope** | Acciones que el actor NO puede hacer | ✅ Sí |
| **Estado del sistema** | Sistema en condición especial (caído, cargando, vacío) | 🟡 Recomendado |
| **Concurrencia** | Dos actores hacen la misma acción simultáneamente | 🔶 Si aplica |

**Técnica de elicitación para criterios de aceptación:**
```markdown
Imagina que la funcionalidad ya está implementada y tienes que probarla.
Describe 3 pruebas concretas que harías para confirmar que funciona correctamente:

1. La prueba más básica (el flujo normal que debería funcionar)
2. Una prueba donde algo sale mal (dato incorrecto, permiso insuficiente, etc.)
3. Una prueba de un caso límite o raro (qué pasa al borde del funcionamiento normal)
```

---

#### TÉCNICA 3: Clasificación de Requisitos Funcionales vs No Funcionales

Separar explícitamente durante la elicitación:

**Funcionales (QUÉ hace el sistema):**
```markdown
Preguntas que revelan RFs:
- "¿Qué debería poder hacer el usuario que hoy no puede?"
- "¿Qué información necesita ver/crear/editar/eliminar?"
- "¿Qué proceso o flujo de trabajo debe ser automatizado?"
```

**No Funcionales (CON QUÉ CALIDAD lo hace):**

| Categoría NFR | Pregunta de elicitación | Ejemplo de criterio medible |
|---------------|------------------------|-----------------------------|
| **Performance** | ¿Hay expectativas de tiempo de respuesta o volumen? | Respuesta ≤ 2s p95 bajo 1000 usuarios concurrentes |
| **Seguridad** | ¿Hay restricciones de acceso, autenticación o datos sensibles? | Solo usuarios con rol ADMIN pueden ejecutar esta acción |
| **Disponibilidad** | ¿Debe estar disponible 24/7? ¿Tiene ventanas de mantenimiento? | 99.9% uptime, mantenimiento máximo 2h/mes |
| **Usabilidad** | ¿Hay expectativas sobre curva de aprendizaje o accesibilidad? | Completa en ≤ 3 clics desde el menú principal |
| **Escalabilidad** | ¿Se espera crecimiento en usuarios o datos? | Soportar hasta 100.000 usuarios registrados |
| **Regulatorio** | ¿Hay leyes, normas o estándares que apliquen? | Cumplir GDPR / Ley 1581 de Colombia |

---

#### TÉCNICA 4: Modelo de Madurez de la HU (INVEST)

Antes de cerrar la HU, evaluar con el criterio INVEST:

```markdown
## ✅ Checklist INVEST

| Criterio | ¿Cumple? | Indicador de fallo |
|----------|----------|--------------------|
| **I - Independent** | ✅ / ❌ | Depende de otra HU para ser implementada? |
| **N - Negotiable** | ✅ / ❌ | ¿La solución técnica está prescrita en la HU? |
| **V - Valuable** | ✅ / ❌ | ¿Tiene un beneficio de negocio claro y medible? |
| **E - Estimable** | ✅ / ❌ | ¿Un desarrollador puede estimar su esfuerzo? |
| **S - Small** | ✅ / ❌ | ¿Puede implementarse en 1 sprint (≤ 2 semanas)? |
| **T - Testable** | ✅ / ❌ | ¿Tiene criterios de aceptación verificables? |
```

**Si algún criterio falla**:
- `I` falla → Identificar dependencia y documentarla; evaluar si puede implementarse en paralelo
- `N` falla → Mover la solución técnica prescrita a una HUT o sección de "Restricciones técnicas conocidas"
- `V` falla → No continuar. Revisar con el usuario hasta tener valor claro
- `E` falla → HU muy vaga. Refinar con más preguntas 5W1H
- `S` falla → Descomponer en 2+ HUs independientes
- `T` falla → Escribir criterios de aceptación Gherkin antes de cerrar

---

#### TÉCNICA 5: Mapa de Actores y Roles

Antes de escribir la narrativa, construir el mapa de actores:

```markdown
## Mapa de Actores para [Nombre de la Funcionalidad]

| Actor | Tipo | Acción sobre la funcionalidad | ¿Actor principal? |
|-------|------|-------------------------------|-------------------|
| [Rol 1] | Humano / Sistema / Externo | [qué hace] | Sí / No |
| [Rol 2] | Humano / Sistema / Externo | [qué hace] | Sí / No |

**Actor primario** (sobre quien se redacta la narrativa): [Rol X]
**Actores secundarios** (mencionados en criterios de aceptación): [Rol Y, Rol Z]
```

**Preguntas para extraer el mapa de actores:**
```markdown
1. ¿Quién inicia esta acción? (el actor principal que da el disparador)
2. ¿Quién o qué responde a esa acción? (puede ser el sistema, un proceso, otro rol)
3. ¿Hay alguien que necesita aprobar o supervisar este proceso?
4. ¿Algún sistema externo está involucrado? (APIs, servicios de terceros, otras plataformas)
5. ¿Quién NO debería tener acceso a esta funcionalidad? (actores excluidos)
```

---

#### TÉCNICA 6: Scope Boundary (Frontera de Alcance)

Toda HU debe cerrar con dos listas explícitas:

```markdown
## 🔲 In Scope (INCLUYE)
- [Funcionalidad/condición/actor que SÍ forma parte de esta HU]
- [...]

## 🚫 Out of Scope (NO INCLUYE)
- [Funcionalidad/condición/actor que explícitamente NO se debe implementar como parte de esta HU]
- [...]

## 🔜 Dependencias y HUs Relacionadas
- **Depende de**: [HU-XXX] — [Razón de la dependencia]
- **Habilita**: [HU-XXX] — [Qué desbloquea]
- **Relacionada con**: [HU-XXX] — [Relación]
```

**Técnica de elicitación para scope boundary:**
```markdown
Para definir bien el alcance, necesito que me ayudes con esto:

1. ¿Hay funcionalidades PARECIDAS a esta que NO deben estar incluidas en este trabajo? (evitar scope creep)
2. ¿Esta HU depende de que otra funcionalidad ya esté lista primero?
3. Si entregamos solo esto, ¿el usuario ya obtiene valor? ¿O falta algo más para que sea útil?
```

---

### Estándares de Referencia

- **IEEE 29148-2018**: Systems and software engineering — Requirements Engineering
- **INVEST (Bill Wake, 2003)**: Criteria for good user stories
- **Gherkin Specification Language (Dan North / Cucumber)**: Given-When-Then para criterios de aceptación
- **FURPS (Hewlett-Packard)**: Framework de categorías de requisitos (Functionality, Usability, Reliability, Performance, Supportability)
- **MoSCoW Prioritization**: Must Have / Should Have / Could Have / Won't Have

---

## ✅ Criterios de Aplicación (cuándo usar esta skill)

- Al transformar una idea bruta o conversación del usuario en una HU formal
- Cuando la entrada del usuario carece de actor, criterios de aceptación o valor de negocio claro
- Cuando se detectan múltiples funcionalidades mezcladas en una sola descripción (split necesario)
- Cuando la HU existente no pasa el filtro INVEST y necesita refinamiento

## ❌ Anti-patrones (cuándo NO / errores a evitar)

- **No incluir detalles de implementación** en la HU (stack tecnológico, endpoints, tablas de BD) → van en HUTs
- **No saltarse la técnica INVEST** cuando la HU "parece clara" → es cuando más se necesita
- **No usar "el usuario"** como actor → siempre especificar el rol concreto
- **No aceptar criterios de aceptación en lenguaje natural ambiguo** → convertirlos a Gherkin siempre
- **No mezclar múltiples necesidades en una HU** por conveniencia → una necesidad = una HU
- **No omitir el Out of Scope** porque "es obvio" → lo que no se explicita, se implementa

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Idea bruta → HU bien formada

**Input del usuario:**
> "Quiero que el admin pueda gestionar usuarios"

**Resultado de aplicar la skill (después de elicitación completa)**:

```markdown
## Historia de Usuario: HU-USR-001 — Gestión de Cuentas de Usuario por Administrador

Como Administrador de Plataforma,
Quiero poder crear, editar, suspender y eliminar cuentas de usuario,
Para mantener el directorio de usuarios activo, actualizado y libre de accesos no autorizados.

### Criterios de Aceptación:
Escenario 1 - Creación exitosa:
  Dado que estoy autenticado como Administrador
  Cuando completo el formulario de nuevo usuario con datos válidos y presiono "Crear"
  Entonces el sistema crea la cuenta, envía email de bienvenida al nuevo usuario
  Y la cuenta aparece en el listado de usuarios activos

Escenario 2 - Email duplicado:
  Dado que intento crear un usuario con un email ya registrado
  Cuando presiono "Crear"
  Entonces el sistema muestra el error "El email ya está en uso" sin crear la cuenta

### In Scope:
- Crear, editar, suspender, eliminar usuarios individuales

### Out of Scope:
- Importación masiva de usuarios (HU-USR-003)
- Gestión de roles y permisos (HU-RBAC-001)
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente sección en su archivo `.md`:

```markdown
### SKILL ACTIVA: REQUIREMENT ELICITATION SENIOR → ver: 2-agents/zns-tools/skills/requirement-elicitation-senior.skill.md

**Protocolo de elicitación obligatorio:**

1. **5W1H completo**: No cerrar ningún campo de la HU sin haber respondido Who, What, Why, When, Where, How Much
2. **Actor específico**: Rechazar "usuario" genérico. Requerir rol concreto del sistema
3. **Criterios de aceptación Gherkin**: Mínimo 1 escenario happy path + 1 escenario de error
4. **Checklist INVEST**: Evaluar antes de cerrar la HU. Si falla cualquier criterio → refinar antes de entregar
5. **Scope Boundary explícito**: Toda HU entregada debe tener secciones "In Scope" y "Out of Scope"
6. **NFRs categorizados**: Identificar si aplican Performance, Seguridad, Disponibilidad, Regulatorio
7. **Una necesidad = una HU**: Si emergen múltiples necesidades → crear múltiples HUs separadas
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica                                          | Valor esperado                          |
|--------------------------------------------------|-----------------------------------------|
| Campos 5W1H completados en la HU                 | 6/6 (100%)                              |
| Criterios de aceptación en formato Gherkin        | 100% de los criterios                   |
| Escenarios mínimos por HU (happy + error + edge) | ≥ 2 escenarios por HU                  |
| Checklist INVEST aprobado                        | 6/6 criterios ✅                        |
| Sección Out of Scope documentada                 | Presente en 100% de las HUs             |
| NFRs identificados y medibles                    | Al menos 1 NFR con umbral numérico      |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — 6 técnicas senior de elicitación, marco 5W1H, Gherkin, INVEST, Scope Boundary
