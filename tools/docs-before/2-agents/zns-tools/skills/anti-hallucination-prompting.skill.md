# 🎯 SKILL: ANTI-HALLUCINATION PROMPTING

**skill_id**: prompting-anti-hallucination-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: prompting  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: Todos los agentes de elicitación, análisis y generación de contenido  
**dependencias**: ninguna

---

## 📌 Propósito de la Skill

Esta skill equipa a los agentes con un conjunto de técnicas probadas para **reducir al mínimo las alucinaciones** durante la fase de captura de ideas, elicitación de requisitos y redacción de artefactos. Aplica cuando el agente opera con entradas incompletas, ambiguas o contradictorias, forzando un ciclo explícito de **anclar → confirmar → avanzar** antes de producir cualquier output.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Minimal Claim Principle** — Solo afirmar lo que se puede derivar **directamente** del input del usuario. Toda inferencia debe ser etiquetada.
2. **Assumption Tagging** — Todo dato no provisto explícitamente lleva la etiqueta `[ASUMIDO]`. Todo dato confirmado por el usuario lleva `[CONFIRMADO]`. Nunca mezclar ambos en el output final.
3. **Grounding Rule** — Cuando el agente elabora, debe citar textualmente la fuente: "El usuario indicó: _'...'_, por lo tanto...". Sin cita → sin elaboración.
4. **Verification Gate** — Ninguna fase puede comenzar hasta que el usuario haya validado explícitamente el output de la fase anterior. No existe avance automático.
5. **Contradication First** — Si el input del usuario contradice lo dicho anteriormente, el agente **detiene el flujo** y resuelve la contradicción antes de continuar.
6. **Negative Space Rule** — Todo artefacto debe incluir una sección de exclusiones explícitas (qué NO hace, qué NO aplica). Sin esto, el agente asume por defecto.

---

### Técnicas y Patrones

#### TÉCNICA 1: Assumption Tagging Protocol

Todo dato que el agente derive (no reciba explícitamente) debe marcarse en dos momentos:

**Durante la síntesis (borrador):**
```markdown
- Actor principal: Administrador de plataforma [CONFIRMADO]
- Frecuencia de uso: Diaria [ASUMIDO — pendiente confirmación]
- Integración con terceros: No aplica [ASUMIDO — pendiente confirmación]
```

**En el checkpoint de validación (preguntar al usuario):**
```markdown
## ⚠️ Validación de Suposiciones

He completado el borrador con los siguientes datos que **asumí** (no los mencionaste explícitamente).
Por favor confirma o corrige cada uno:

| # | Dato asumido | ¿Es correcto? | Corrección (si aplica) |
|---|-------------|---------------|------------------------|
| 1 | Frecuencia de uso: diaria | Sí / No | _______________ |
| 2 | Sin integración con terceros | Sí / No | _______________ |
| 3 | Solo usuarios autenticados | Sí / No | _______________ |
```

**Regla**: No generar el output final hasta que la tabla esté 100% respondida.

---

#### TÉCNICA 2: Verification Gate (Puerta de Verificación)

Antes de iniciar cada nueva fase, mostrar un resumen de lo consolidado y pedir confirmación explícita:

```markdown
## ✅ Checkpoint Fase [N] — Verificación Antes de Continuar

**Resumen de lo capturado hasta ahora:**

- **Actor**: [valor] [CONFIRMADO/ASUMIDO]
- **Necesidad**: [valor] [CONFIRMADO/ASUMIDO]
- **Valor de negocio**: [valor] [CONFIRMADO/ASUMIDO]

---

¿Está correcto este resumen?

**🔴 Si hay algo incorrecto** → Dímelo y lo corrijo antes de continuar.  
**🟢 Si está correcto** → Responde "OK" o "Continuar" para avanzar a la Fase [N+1].
```

**Anti-patrón a evitar**: Preguntar "¿Todo bien?" (demasiado vago). La pregunta debe ser sobre elementos específicos.

---

#### TÉCNICA 3: Paraphrase Confirmation

Cuando el usuario provider una idea inicial larga o ambigua, el agente la reformula y pide validación antes de procesarla:

```markdown
## 🔄 Entendí tu idea así:

> "[Reformulación en 2-3 oraciones claras y estructuradas]"

¿Es correcto este entendimiento?

- **Sí** → Continuamos con la elicitación detallada
- **No** → Corrígeme en los puntos que no están bien
```

**No avanzar** hasta recibir confirmación. No asumir que la reformulación es correcta.

---

#### TÉCNICA 4: Contradiction Detection

El agente debe mantener internamente un **registro de afirmaciones** del usuario. Si el usuario introduce una afirmación que contradice una anterior:

```markdown
## ⚠️ Detección de Inconsistencia

He notado una posible contradicción entre dos de tus respuestas:

- **Antes dijiste**: "[cita textual de la afirmación anterior]"
- **Ahora dijiste**: "[cita textual de la nueva afirmación]"

¿Cuál es la versión correcta?
1. La primera afirmación (descartar la segunda)
2. La segunda afirmación (descartar la primera)
3. Ambas son correctas — te explico el matiz: [____]
```

**Sin resolver la contradicción, no generar ningún output.**

---

#### TÉCNICA 5: Confidence Scoring en Output

Al producir el borrador de la HU, incluir un bloque de confianza que muestra transparencia sobre la calidad del input:

```markdown
## 📊 Índice de Confianza del Artefacto

| Sección | Confianza | Datos confirmados / Total |
|---------|-----------|--------------------------|
| Narrativa principal | 🟢 Alta | 5/5 datos confirmados |
| Reglas de negocio | 🟡 Media | 3/5 datos confirmados |
| Criterios de aceptación | 🔴 Baja | 1/4 datos confirmados |
| Exclusiones | 🟡 Media | 2/3 datos confirmados |

**Recomendación**: Revisar secciones en 🔴 antes de pasar al agente de HUTs.
```

---

#### TÉCNICA 6: Negative Space Elicitation

Antes de cerrar cualquier artefacto, hacer SIEMPRE estas preguntas sobre el espacio negativo:

```markdown
Para completar la HU con precisión, necesito que me respondas estas preguntas sobre lo que el sistema NO debe hacer:

1. ¿Hay funcionalidades similares que NO deben incluirse en este alcance?
2. ¿Hay tipos de usuarios que explícitamente NO deben poder realizar esta acción?
3. ¿Hay escenarios de negocio donde esta funcionalidad debe estar DESHABILITADA?
4. ¿Existe alguna restricción técnica conocida (herramientas, lenguajes, plataformas) que NO se deba usar?
```

**El espacio negativo define el scope con la misma importancia que el espacio positivo.**

---

#### TÉCNICA 7: Chunking Progresivo

No hacer múltiples preguntas complejas simultáneamente. Seguir la regla:
- **Máximo 3 preguntas por turno**
- Cada pregunta debe ser **independiente** de la respuesta de las otras
- Ordenar de **más amplia → más específica** (no al revés)
- Solo si el usuario responde todas, avanzar al siguiente chunk

```markdown
## ❌ Anti-patrón (NO hacer):
"Dime el actor, su rol, su nivel de acceso, las reglas de negocio, los 
criterios de aceptación, las integraciones y las restricciones de seguridad."

## ✅ Correcto (Chunking):
"Empecemos por lo más fundamental:
1. ¿Quién es el actor principal que usa esta funcionalidad? (ej: Administrador, Cliente final, Sistema externo)
2. ¿Qué problema concreto necesita resolver esta persona HOY que no puede resolver?
3. Si esta funcionalidad existiera mañana, ¿cuál sería la primera acción que ese usuario haría?"
```

---

### Estándares de Referencia

- **IEEE 29148-2018**: Requirements Engineering — restringe afirmaciones no verificables
- **INCOSE SE Handbook**: Systems thinking que requiere definición de límites explícitos
- **Google DeepMind — Alignment Research**: Grounding como mecanismo de reducción de alucinaciones
- **Anthropic Constitutional AI**: Auto-corrección basada en principios declarados
- **Chain-of-Thought Prompting (Wei et al., 2022)**: Razonamiento paso a paso reduce errores

---

## ✅ Criterios de Aplicación (cuándo usar esta skill)

- Cuando el agente recibe ideas vagas, incompletas o ambiguas del usuario
- Cuando el agente debe generar artefactos formales (HU, HUT, ADR, diagrama) a partir de input no estructurado
- Cuando hay riesgo de que el agente "rellene" gaps con conocimiento general en lugar de datos del usuario
- Cuando el output del agente será consumido por otro agente en cadena (pipeline de agentes)
- Cuando la falta de precisión puede generar retrabajo costoso en fases posteriores del proyecto

## ❌ Anti-patrones (cuándo NO / errores a evitar)

- **No** usar Assumption Tagging si el usuario ya proporcionó todos los datos explícitamente → genera ruido innecesario
- **No** hacer Verification Gate en cada oración → conversación inviable; usar solo al final de cada fase
- **No** mostrar el Confidence Scoring antes de que el usuario haya respondido todas las preguntas → sesga las respuestas
- **No** generar "un borrador para guiar" antes de completar la elicitación → el usuario se enfocará en corregir el borrador en lugar de pensar desde cero (anchoring bias)
- **No** etiquetar como `[ASUMIDO]` algo que el usuario dijo implícitamente pero con claridad suficiente → usar criterio: si cualquier lector entendería lo mismo, es `[CONFIRMADO]`

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Idea vaga recibida

**Input del usuario:**
> "Quiero que los usuarios puedan ver su historial de pagos"

**Proceso (aplicando Anti-Hallucination)**:

En lugar de generar directamente:
```
Como usuario, quiero ver mi historial de pagos para consultar mis transacciones pasadas.
Criterios: mostrar fecha, monto, estado. Paginado de 20 en 20.
```

El agente debe aplicar Paraphrase Confirmation primero:
```markdown
## 🔄 Entendí tu idea así:
> "Un usuario autenticado puede acceder a una vista que lista sus pagos realizados anteriormente en el sistema."

¿Es correcto?

Si es así, necesito precisar algunos detalles:
1. ¿"Usuario" se refiere al cliente final, a un administrador, o a ambos?
2. ¿"Historial" incluye pagos de todos los estados (exitosos, fallidos, pendientes) o solo exitosos?
3. ¿Existe algún límite de tiempo para el historial? (ej: últimos 12 meses, desde el inicio)
```

### Ejemplo 2: Contradicción detectada

**Turno 1**: "Solo los administradores pueden cancelar un pedido"  
**Turno 5**: "El cliente puede cancelar si el pedido está en estado 'pendiente'"

```markdown
## ⚠️ Detección de Inconsistencia

Hay una contradicción entre dos de tus respuestas:

- **Turno 1 dijiste**: "Solo los administradores pueden cancelar un pedido"
- **Turno 5 dijiste**: "El cliente puede cancelar si el pedido está en estado 'pendiente'"

¿Cuál es la versión correcta?
1. Solo administradores (en todos los casos)
2. El cliente puede cancelar en estado 'pendiente'; el administrador puede cancelar en cualquier estado
3. Otra combinación: ____
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente sección en su archivo `.md`:

```markdown
### SKILL ACTIVA: ANTI-HALLUCINATION PROMPTING → ver: 2-agents/zns-tools/skills/anti-hallucination-prompting.skill.md

**Protocolo obligatorio antes de generar cualquier output:**

1. **Assumption Tagging**: Todo dato no recibido explícitamente del usuario → marcar `[ASUMIDO]`
2. **Verification Gate**: Al final de cada fase, mostrar resumen y pedir "OK" antes de continuar
3. **Paraphrase Confirmation**: Reformular la idea recibida y pedir validación ANTES de procesarla
4. **Contradiction Detection**: Si el usuario se contradice → detener y resolver ANTES de continuar
5. **Negative Space**: Preguntar explícitamente qué NO debe hacer el sistema antes de cerrar la HU
6. **Chunking**: Máximo 3 preguntas por turno, de mayor a menor amplitud
7. **No anticipar outputs**: No generar borradores "para guiar" antes de completar la elicitación
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica                                    | Valor esperado                           |
|--------------------------------------------|------------------------------------------|
| Datos `[ASUMIDO]` en output final          | 0 (todos deben estar `[CONFIRMADO]`)     |
| Verificaciones de fase ejecutadas          | 1 por fase del agente (100%)             |
| Contradicciones detectadas y resueltas     | 100% (0 contradicciones en output final) |
| Preguntas de Negative Space respondidas    | Mínimo 4 por HU generada                |
| Índice de Confianza mínimo para output     | 🟢 Alta en narrativa y criterios de AC  |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — 7 técnicas senior anti-alucinación para elicitación y generación de artefactos
