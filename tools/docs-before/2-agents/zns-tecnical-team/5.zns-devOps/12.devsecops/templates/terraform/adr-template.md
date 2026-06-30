# 📋 Terraform Architecture Decision Record (ADR) Template

## ADR-[NUMBER]: [TÍTULO BREVE]

### Metadata
- **Status**: [Proposed | Accepted | Deprecated | Superseded]
- **Date**: YYYY-MM-DD
- **Author**: [Nombre]
- **Reviewers**: [Lista de revisores]
- **Supersedes**: [ADR que reemplaza, si aplica]
- **Superseded by**: [ADR que lo reemplaza, si aplica]

---

## Context

### Problema
[Describir el problema o decisión que necesita tomarse]

### Background
[Contexto adicional, requisitos de negocio, restricciones técnicas]

### Drivers
- [Driver 1]: [Descripción]
- [Driver 2]: [Descripción]
- [Driver 3]: [Descripción]

---

## Decision

**Decisión**: [Declaración clara de la decisión tomada]

### Justificación
[Por qué se tomó esta decisión sobre las alternativas]

---

## Options Considered

### Option 1: [Nombre de la opción]
**Descripción**: [Breve descripción]

**Pros**:
- ✅ [Ventaja 1]
- ✅ [Ventaja 2]

**Cons**:
- ❌ [Desventaja 1]
- ❌ [Desventaja 2]

**Costo estimado**: $XXX/mes

---

### Option 2: [Nombre de la opción]
**Descripción**: [Breve descripción]

**Pros**:
- ✅ [Ventaja 1]
- ✅ [Ventaja 2]

**Cons**:
- ❌ [Desventaja 1]
- ❌ [Desventaja 2]

**Costo estimado**: $XXX/mes

---

### Option 3: [Nombre de la opción] ← **SELECCIONADA**
**Descripción**: [Breve descripción]

**Pros**:
- ✅ [Ventaja 1]
- ✅ [Ventaja 2]

**Cons**:
- ❌ [Desventaja 1]
- ❌ [Desventaja 2]

**Costo estimado**: $XXX/mes

---

## Comparison Matrix

| Criterio | Peso | Option 1 | Option 2 | Option 3 |
|----------|------|----------|----------|----------|
| Costo | 25% | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Complejidad | 20% | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Escalabilidad | 25% | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Seguridad | 20% | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Mantenibilidad | 10% | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Total** | 100% | **2.35** | **2.65** | **2.75** |

---

## Consequences

### Positive
- ✅ [Consecuencia positiva 1]
- ✅ [Consecuencia positiva 2]
- ✅ [Consecuencia positiva 3]

### Negative
- ⚠️ [Consecuencia negativa 1]
- ⚠️ [Consecuencia negativa 2]

### Risks
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| [Riesgo 1] | Alta/Media/Baja | Alto/Medio/Bajo | [Mitigación] |
| [Riesgo 2] | Alta/Media/Baja | Alto/Medio/Bajo | [Mitigación] |

---

## Implementation

### Terraform Changes Required
```hcl
# Ejemplo de cambios necesarios
module "example" {
  source = "./modules/example"
  # ...
}
```

### Migration Steps
1. [ ] [Paso 1]
2. [ ] [Paso 2]
3. [ ] [Paso 3]

### Rollback Plan
[Describir cómo revertir si es necesario]

---

## Validation

### Success Criteria
- [ ] [Criterio 1]
- [ ] [Criterio 2]
- [ ] [Criterio 3]

### Metrics to Monitor
- [Métrica 1]: [Valor esperado]
- [Métrica 2]: [Valor esperado]

---

## References

- [Link a documentación relevante]
- [Link a diseño de arquitectura]
- [Link a tickets relacionados]

---

## Changelog

| Fecha | Autor | Cambio |
|-------|-------|--------|
| YYYY-MM-DD | [Nombre] | Creación inicial |
| YYYY-MM-DD | [Nombre] | [Cambio] |
