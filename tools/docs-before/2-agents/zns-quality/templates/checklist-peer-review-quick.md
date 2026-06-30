# ✅ Checklist Rápido de Peer Review

> **Uso:** Checklist de validación rápida para Peer Review de HUTs  
> **Tiempo estimado:** 5-10 minutos para validación inicial

---

## 📋 PRE-REVIEW

- [ ] HUT cargada y leída completamente
- [ ] Código fuente localizado
- [ ] Tests identificados
- [ ] PR/Branch identificado

---

## 1️⃣ CUMPLIMIENTO ESPECIFICACIÓN

### Dominio
- [ ] Entidades implementadas según especificación
- [ ] Atributos con tipos correctos
- [ ] Métodos de negocio presentes
- [ ] Value Objects inmutables
- [ ] Validaciones de dominio

### API
- [ ] Endpoints con métodos HTTP correctos
- [ ] Rutas según especificación
- [ ] Request DTO con campos requeridos
- [ ] Response DTO con estructura esperada
- [ ] Códigos HTTP manejados (200, 201, 400, 401, 404, 422)

### Base de Datos
- [ ] Tabla(s) creada(s) con migración Flyway
- [ ] Columnas con tipos correctos
- [ ] Primary Keys definidas
- [ ] Foreign Keys con ON DELETE apropiado
- [ ] Índices para queries frecuentes
- [ ] Constraints según reglas de negocio

### Integraciones (si aplica)
- [ ] Cliente externo implementado
- [ ] Timeout configurado
- [ ] Retry policy implementado
- [ ] Circuit breaker (si crítico)
- [ ] Error handling completo

---

## 2️⃣ CRITERIOS DE ACEPTACIÓN

| Escenario | Implementado | Test Existe | Test Pasa |
|-----------|:------------:|:-----------:|:---------:|
| Happy Path | ☐ | ☐ | ☐ |
| Validación errores | ☐ | ☐ | ☐ |
| Edge cases | ☐ | ☐ | ☐ |
| Seguridad | ☐ | ☐ | ☐ |

---

## 3️⃣ TESTING

### Existencia
- [ ] Tests unitarios (domain)
- [ ] Tests integración (repositories)
- [ ] Tests E2E (API endpoints)

### Ejecución
```bash
./gradlew test
```
- [ ] Todos los tests pasan
- [ ] Sin tests skipped sin justificación

### Cobertura
- [ ] Domain ≥80%
- [ ] Application ≥70%
- [ ] Infrastructure ≥60%

---

## 4️⃣ CALIDAD DE CÓDIGO

### Arquitectura
- [ ] Hexagonal (ports & adapters)
- [ ] Dependencias hacia dominio
- [ ] Capas separadas correctamente

### SOLID
- [ ] Single Responsibility
- [ ] Dependency Inversion

### Clean Code
- [ ] Nombres descriptivos
- [ ] Sin código duplicado
- [ ] Sin código muerto

### Seguridad
- [ ] `@Valid` en DTOs
- [ ] `@PreAuthorize` en endpoints protegidos
- [ ] Sin secrets hardcoded
- [ ] Queries parametrizadas

### Errores
- [ ] Excepciones de dominio definidas
- [ ] GlobalExceptionHandler
- [ ] `@Transactional` donde corresponde

### Observabilidad
- [ ] Logging con niveles apropiados
- [ ] Sin datos sensibles en logs

---

## 5️⃣ VEREDICTO RÁPIDO

### Conteo

| Categoría | ✅ OK | ❌ Falta | ⚠️ Parcial |
|-----------|:-----:|:--------:|:----------:|
| Especificación | _ | _ | _ |
| Criterios Aceptación | _ | _ | _ |
| Testing | _ | _ | _ |
| Calidad Código | _ | _ | _ |

### Decisión

- [ ] ✅ **APROBADO** — 100% criterios, sin issues
- [ ] ⚠️ **CONDICIONAL** — >80% OK, issues menores
- [ ] ❌ **RECHAZADO** — Issues críticos, <80% criterios

---

## 📝 NOTAS RÁPIDAS

**Issues encontrados:**
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

**Próximos pasos:**
1. _____________________________________________________
2. _____________________________________________________

---

**Fecha:** _______________  
**Revisor:** _______________  
**HUT:** HUT-___-___-___ 
