# ADR-XXX: [Título de la Decisión Arquitectónica]

**Fecha:** YYYY-MM-DD
**Estado:** Propuesta | Aceptada | Deprecada | Supersedida por ADR-YYY
**Autores:** [Nombres]
**Revisores:** [Nombres]
**Decisores:** [Nombres]

---

## Contexto y Problemática

**Descripción del Problema:**
[Descripción clara del problema o decisión que necesita ser tomada. Incluir contexto técnico y de negocio.]

**Pregunta a Responder:**
[Formulación clara de la pregunta arquitectónica que se busca responder]

**Ejemplos:**
- ¿Qué patrón arquitectónico debemos usar: monolito vs microservicios?
- ¿Qué base de datos debemos usar para el módulo de X?
- ¿Cómo manejamos la comunicación entre servicios?
- ¿Qué estrategia de caching implementamos?

**Factores de Decisión:**
- Performance requerido
- Escalabilidad esperada
- Complejidad operacional aceptable
- Expertise del equipo
- Presupuesto disponible
- Time-to-market
- [Otros factores relevantes]

---

## Opciones Consideradas

### Opción 1: [Nombre de la Opción]

**Descripción:**
[Descripción detallada de la opción]

**Pros:**
- ✅ [Ventaja 1]
- ✅ [Ventaja 2]
- ✅ [Ventaja 3]

**Contras:**
- ❌ [Desventaja 1]
- ❌ [Desventaja 2]
- ❌ [Desventaja 3]

**Costos:**
- Desarrollo: [Horas/Dinero]
- Infraestructura: [$/mes]
- Mantenimiento: [Horas/mes]

**Riesgos:**
- [Riesgo 1 con probabilidad e impacto]
- [Riesgo 2 con probabilidad e impacto]

---

### Opción 2: [Nombre de la Opción]

[Repetir estructura de Opción 1]

---

### Opción 3: [Nombre de la Opción]

[Repetir estructura de Opción 1]

---

## Matriz de Decisión

| Criterio | Peso | Opción 1 | Opción 2 | Opción 3 |
|----------|------|----------|----------|----------|
| Performance | 25% | 8/10 = 2.0 | 7/10 = 1.75 | 6/10 = 1.5 |
| Escalabilidad | 20% | 9/10 = 1.8 | 6/10 = 1.2 | 7/10 = 1.4 |
| Complejidad (inverso) | 15% | 5/10 = 0.75 | 8/10 = 1.2 | 7/10 = 1.05 |
| Costo (inverso) | 15% | 6/10 = 0.9 | 7/10 = 1.05 | 9/10 = 1.35 |
| Time-to-market | 15% | 7/10 = 1.05 | 9/10 = 1.35 | 8/10 = 1.2 |
| Expertise equipo | 10% | 8/10 = 0.8 | 6/10 = 0.6 | 7/10 = 0.7 |
| **TOTAL** | **100%** | **7.3** | **7.15** | **7.2** |

**Nota:** Menor puntuación es mejor para criterios inversos (complejidad, costo)

---

## Decisión

**Opción Seleccionada:** Opción [X] - [Nombre]

**Justificación:**
[Explicación detallada de por qué se seleccionó esta opción considerando:
- Alineación con requisitos del proyecto
- Balance de trade-offs
- Viabilidad de implementación
- Riesgos aceptables]

**Ejemplo:**
```
Seleccionamos la Opción 1 (Microservicios) porque:

1. El proyecto requiere alta escalabilidad (50k → 500k usuarios en 1 año)
2. Tenemos equipos independientes que pueden trabajar en paralelo
3. Diferentes módulos tienen requisitos de escalado distintos
4. El presupuesto permite la complejidad operacional adicional
5. El equipo de DevOps tiene experiencia con Kubernetes

Aunque la Opción 2 (Monolito Modular) tiene menor complejidad inicial,
no satisface los requisitos de escalabilidad a largo plazo y limitaría
la autonomía de los equipos.
```

---

## Consecuencias

### Consecuencias Positivas

- ✅ [Beneficio esperado 1]
- ✅ [Beneficio esperado 2]
- ✅ [Beneficio esperado 3]

**Ejemplo:**
- ✅ Escalabilidad independiente por servicio
- ✅ Deployments independientes (menos riesgo)
- ✅ Tecnologías heterogéneas posibles

### Consecuencias Negativas

- ⚠️ [Consecuencia negativa 1 y cómo mitigarla]
- ⚠️ [Consecuencia negativa 2 y cómo mitigarla]

**Ejemplo:**
- ⚠️ Mayor complejidad operacional → Mitigación: Invertir en observabilidad
- ⚠️ Overhead de comunicación inter-servicios → Mitigación: gRPC + caching

### Riesgos Aceptados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de debugging distribuido | Media | Alto | Distributed tracing (Jaeger) |
| Aumento de costos de infra | Alta | Medio | Optimización continua + right-sizing |
| Curva de aprendizaje del equipo | Baja | Medio | Training + documentación |

---

## Plan de Implementación

### Fase 1: Preparación (Semana 1-2)
- [ ] Setup de infraestructura base (Kubernetes cluster)
- [ ] Definir estándares de comunicación (gRPC)
- [ ] Setup de monitoreo (Prometheus + Grafana)
- [ ] Documentación de arquitectura

### Fase 2: Migración (Semana 3-8)
- [ ] Extraer primer microservicio (Auth)
- [ ] Implementar service mesh (Istio)
- [ ] Migrar servicios restantes uno por uno
- [ ] Testing exhaustivo en staging

### Fase 3: Optimización (Semana 9-12)
- [ ] Performance tuning
- [ ] Optimización de costos
- [ ] Documentación de runbooks
- [ ] Training del equipo

### Criterios de Éxito
- ✅ Todos los servicios desplegados independientemente
- ✅ Latencia p95 < 200ms mantenida
- ✅ Zero downtime en deployments
- ✅ Costos de infra dentro del presupuesto

---

## Validación y Revisión

### Supuestos

| Supuesto | Validación | Estado |
|----------|------------|--------|
| Tráfico crecerá 10x en 1 año | Analytics históricos | ✅ Validado |
| Equipo puede manejar complejidad K8s | Skills assessment | ⚠️ Requiere training |
| Presupuesto de $5k/mes es suficiente | Estimación de costos | ✅ Validado |

### Criterios de Revisión

**Esta decisión debe ser revisada si:**
- El tráfico proyectado no se materializa (< 20% crecimiento en 6 meses)
- Los costos exceden 150% del presupuesto
- El equipo no puede manejar la complejidad operacional
- Aparecen nuevas tecnologías que cambien el landscape

**Fecha de próxima revisión:** [Fecha + 6 meses]

---

## Referencias

### Documentos Relacionados
- **RFC-001:** Propuesta inicial de arquitectura
- **Spike-K8s:** Spike técnico de Kubernetes
- **ADR-005:** Decisión de cloud provider (AWS)

### Recursos Externos
- [Building Microservices - O'Reilly](https://example.com)
- [Microservices Patterns - Chris Richardson](https://microservices.io)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/)

### Herramientas y Frameworks
- Kubernetes 1.28+
- Istio 1.20+
- gRPC
- Prometheus + Grafana

---

## Aprobaciones

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Tech Lead | [Nombre] | [Firma] | YYYY-MM-DD |
| DevOps Lead | [Nombre] | [Firma] | YYYY-MM-DD |
| CTO | [Nombre] | [Firma] | YYYY-MM-DD |
| Product Owner | [Nombre] | [Firma] | YYYY-MM-DD |

---

## Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | YYYY-MM-DD | [Autor] | Versión inicial |
| 1.1 | YYYY-MM-DD | [Autor] | Actualización de costos estimados |

---

**Estado Final:** Aceptada
**Fecha de Decisión Final:** YYYY-MM-DD
**Implementación Iniciada:** YYYY-MM-DD
**Implementación Completada:** [Pendiente]

---

## Notas Adicionales

[Cualquier información adicional relevante, lecciones aprendidas, o consideraciones especiales]

---

*Plantilla basada en el formato MADR (Markdown Any Decision Records)*
*Adaptada para el Método ZNS*
