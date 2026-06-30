# Bloque de Validación Peer Review — Templates para HUT

Este documento contiene los templates para agregar al final de las Historias de Usuario Técnicas (HUT) después de completar el Peer Review.

---

## ✅ TEMPLATE: APROBADO

```markdown
---

## ✅ VALIDACIÓN PEER REVIEW

**Estado:** ✅ APROBADO  
**Fecha revisión:** [YYYY-MM-DD]  
**Revisor:** Peer Review Senior Agent v1.0  
**Reporte completo:** [PR-HUT-XXX-TIPO-SEC-fecha.md](../peer-reviews/PR-HUT-XXX-TIPO-SEC-fecha.md)

### Evidencias de Implementación

| Criterio de Aceptación | Test Asociado | Archivo:Línea | Resultado |
|------------------------|---------------|---------------|:---------:|
| Escenario 1: [Happy Path] | `[TestClass.testMethod()]` | `[Test].java:L##` | ✅ PASS |
| Escenario 2: [Validación errores] | `[TestClass.testMethod()]` | `[Test].java:L##` | ✅ PASS |
| Escenario 3: [Edge cases] | `[TestClass.testMethod()]` | `[Test].java:L##` | ✅ PASS |
| Escenario 4: [Seguridad] | `[TestClass.testMethod()]` | `[Test].java:L##` | ✅ PASS |

### Matriz de Cumplimiento

| Componente | Especificado | Implementado | Estado |
|------------|:------------:|:------------:|:------:|
| Entidad `[Nombre]` | ✅ | ✅ | ✅ OK |
| Endpoint `POST /api/v1/...` | ✅ | ✅ | ✅ OK |
| Tabla `[nombre_tabla]` | ✅ | ✅ | ✅ OK |
| Índice `idx_[campo]` | ✅ | ✅ | ✅ OK |

**Cumplimiento:** 100% (X/X elementos)

### Métricas de Calidad

| Métrica | Valor | Umbral | Estado |
|---------|:-----:|:------:|:------:|
| Cobertura Domain | XX% | 80% | ✅ |
| Cobertura Use Cases | XX% | 70% | ✅ |
| Cobertura Total | XX% | 70% | ✅ |
| Tests Pasando | XX/XX | 100% | ✅ |
| Code Smells | 0 | 0 | ✅ |
| Vulnerabilidades | 0 | 0 | ✅ |

### Commit/PR de Implementación

| Aspecto | Valor |
|---------|-------|
| **Branch** | `feature/HUT-XXX-TIPO-SEC-descripcion` |
| **Pull Request** | #[numero] |
| **Commit** | `[hash]` |
| **Merge Date** | [YYYY-MM-DD] |
| **Merged By** | [usuario] |

### Definition of Done

- [x] Código implementado siguiendo Clean Architecture
- [x] Tests unitarios pasando (cobertura >80% dominio)
- [x] Tests integración con Testcontainers
- [x] Tests E2E para endpoints API
- [x] Sin vulnerabilidades de seguridad
- [x] Code review aprobado
- [x] CI/CD pipeline pasando
- [x] Documentación actualizada

---
**Validado por:** Peer Review Senior Agent v1.0  
**Timestamp:** [YYYY-MM-DDTHH:MM:SSZ]  
**Re-review requerido:** ❌ NO
```

---

## ❌ TEMPLATE: RECHAZADO

```markdown
---

## ❌ VALIDACIÓN PEER REVIEW

**Estado:** ❌ RECHAZADO  
**Fecha revisión:** [YYYY-MM-DD]  
**Revisor:** Peer Review Senior Agent v1.0  
**Reporte completo:** [PR-HUT-XXX-TIPO-SEC-fecha.md](../peer-reviews/PR-HUT-XXX-TIPO-SEC-fecha.md)

### Issues Bloqueantes

| ID | Severidad | Descripción | Archivo:Línea | Acción Requerida |
|----|:---------:|-------------|---------------|------------------|
| ISS-001 | 🔴 CRÍTICO | [Descripción detallada del issue bloqueante] | `[archivo].java:L##` | [Acción correctiva específica] |
| ISS-002 | 🔴 CRÍTICO | [Descripción detallada del issue bloqueante] | `[archivo].java:L##` | [Acción correctiva específica] |

### Criterios No Cumplidos

| Criterio de Aceptación | Estado | Razón |
|------------------------|:------:|-------|
| Escenario X: [Nombre] | ❌ | [Razón por la que no cumple] |
| Escenario Y: [Nombre] | ❌ | [Razón por la que no cumple] |

### Métricas Actuales

| Métrica | Valor Actual | Umbral | Déficit |
|---------|:------------:|:------:|:-------:|
| Cobertura Domain | XX% | 80% | -XX% |
| Tests Pasando | XX/YY | 100% | X failing |

### Próximos Pasos

1. [ ] Corregir issue ISS-001: [descripción breve]
2. [ ] Corregir issue ISS-002: [descripción breve]
3. [ ] Implementar tests faltantes para escenario X
4. [ ] Ejecutar tests localmente y verificar todos pasen
5. [ ] Actualizar PR con correcciones
6. [ ] Solicitar nueva revisión (re-review)

### Timeline Sugerido

| Acción | Responsable | Fecha Límite |
|--------|-------------|--------------|
| Corrección issues | [Dev] | [YYYY-MM-DD] |
| Re-review | Peer Review Agent | [YYYY-MM-DD] |

---
**Revisado por:** Peer Review Senior Agent v1.0  
**Timestamp:** [YYYY-MM-DDTHH:MM:SSZ]  
**Re-review requerido:** ✅ SÍ — Después de correcciones
```

---

## ⚠️ TEMPLATE: APROBADO CONDICIONAL

```markdown
---

## ⚠️ VALIDACIÓN PEER REVIEW

**Estado:** ⚠️ APROBADO CONDICIONAL  
**Fecha revisión:** [YYYY-MM-DD]  
**Revisor:** Peer Review Senior Agent v1.0  
**Reporte completo:** [PR-HUT-XXX-TIPO-SEC-fecha.md](../peer-reviews/PR-HUT-XXX-TIPO-SEC-fecha.md)

### Resumen

La implementación cumple con los criterios de aceptación principales y es funcional.
Se identificaron issues menores que no bloquean el merge pero deben resolverse antes del release a producción.

### Evidencias de Implementación

| Criterio de Aceptación | Test Asociado | Resultado | Estado |
|------------------------|---------------|:---------:|:------:|
| Escenario 1: [Happy Path] | `[test()]` | ✅ PASS | ✅ OK |
| Escenario 2: [Validación] | `[test()]` | ✅ PASS | ✅ OK |
| Escenario 3: [Edge case] | `[test()]` | ✅ PASS | ⚠️ Parcial |

### Issues Menores (No Bloqueantes)

| ID | Severidad | Descripción | Archivo:Línea | Acción Sugerida | Ticket |
|----|:---------:|-------------|---------------|-----------------|--------|
| ISS-001 | 🟡 MENOR | [Descripción del issue] | `[archivo]:L##` | [Mejora sugerida] | [JIRA-XXX] |
| ISS-002 | 🟡 MENOR | [Descripción del issue] | `[archivo]:L##` | [Mejora sugerida] | [JIRA-XXX] |

### Métricas de Calidad

| Métrica | Valor | Umbral | Estado | Nota |
|---------|:-----:|:------:|:------:|------|
| Cobertura Domain | XX% | 80% | ✅ | |
| Cobertura Use Cases | XX% | 70% | ⚠️ | 2% bajo umbral |
| Tests Pasando | XX/XX | 100% | ✅ | |

### Condiciones para Release a Producción

Antes de release a producción, deben completarse:

- [ ] Resolver ISS-001: [descripción]
- [ ] Resolver ISS-002: [descripción]
- [ ] Aumentar cobertura de tests en [área específica]
- [ ] [Otra condición si aplica]

### Commit/PR de Implementación

| Aspecto | Valor |
|---------|-------|
| **Branch** | `feature/HUT-XXX-TIPO-SEC-descripcion` |
| **Pull Request** | #[numero] |
| **Merge Permitido** | ✅ A develop |
| **Release Permitido** | ⚠️ Después de resolver condiciones |

### Tickets de Deuda Técnica Creados

| Ticket | Descripción | Prioridad | Sprint |
|--------|-------------|:---------:|--------|
| [JIRA-XXX] | [Descripción issue menor] | Media | Sprint X+1 |
| [JIRA-YYY] | [Descripción mejora] | Baja | Backlog |

---
**Revisado por:** Peer Review Senior Agent v1.0  
**Timestamp:** [YYYY-MM-DDTHH:MM:SSZ]  
**Re-review requerido:** ❌ NO — Seguimiento en tickets creados
```

---

## 📋 Instrucciones de Uso

### Cuándo usar cada template:

| Estado | Cuándo Aplicar |
|--------|----------------|
| ✅ **APROBADO** | 100% criterios cumplidos, tests pasando, sin issues |
| ❌ **RECHAZADO** | Issues críticos, tests fallando, criterios faltantes (>20%) |
| ⚠️ **CONDICIONAL** | >80% criterios OK, solo issues menores, funcional |

### Proceso de actualización:

1. Completar Peer Review siguiendo el prompt
2. Generar reporte en `05-deliverables/peer-reviews/`
3. Seleccionar template apropiado según veredicto
4. Copiar template al final del archivo HUT original
5. Reemplazar todos los placeholders `[...]` con datos reales
6. Guardar y commitear cambios

### Campos obligatorios a completar:

- Fecha de revisión
- Link al reporte completo
- Todos los escenarios con sus tests
- Métricas de cobertura
- Datos del PR/commit
- Issues encontrados (si los hay)

---

**Versión:** 1.0.0  
**Última actualización:** 2026-02-07  
**Autor:** Prompt Engineer Senior — Método ZNS v2.2
