# Requisitos No Funcionales - {PROJECT_NAME}

> **🎭 Enfoque:** Este documento debe ser analizado desde la perspectiva de un **Site Reliability Engineer (SRE) Senior y Performance Architect**, enfocándose en SLIs/SLOs/SLAs, capacity planning, fault tolerance y observability.

---

## 1. Performance y Escalabilidad

### RNF-001: Tiempo de Respuesta
- Consultas simples: < 200ms
- Transacciones: < 500ms


### RNF-002: Escalabilidad
- Usuarios concurrentes esperados:
- Crecimiento anual estimado:


## 2. Disponibilidad y Confiabilidad

### RNF-003: Disponibilidad (Uptime)
- **SLA**: 99.9%
- **Horario Crítico**: 24/7 / Lunes-Viernes

### RNF-004: Disaster Recovery
- **RPO** (Recovery Point Objective): < 1 hora
- **RTO** (Recovery Time Objective): < 4 horas


## 3. Seguridad

### RNF-005: Autenticación
- [ ] Usuario/Contraseña
- [ ] OAuth 2.0
- [ ] MFA

### RNF-006: Encriptación
- Datos en tránsito: TLS 1.3
- Datos en reposo: AES-256

### RNF-007: Compliance
- [ ] GDPR
- [ ] PCI-DSS
- [ ] HIPAA
- [ ] SOC 2


## 4. Restricciones Técnicas

### Tecnologías Mandatorias
- Lenguaje:
- Framework:
- Base de datos:
- Cloud provider:

### Presupuesto
- Desarrollo: $
- Infraestructura mensual: $


---
**Fecha de creación**: 2025-11-07
**Última actualización**:
**Versión**: 1.0
