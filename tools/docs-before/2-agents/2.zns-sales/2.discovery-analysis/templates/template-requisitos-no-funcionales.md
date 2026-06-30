# 📊 Requisitos No Funcionales — {PROYECTO}

---

**Documento**: Requisitos No Funcionales Consolidados  
**Proyecto**: {PROYECTO}  
**Cliente**: {CLIENTE}  
**Versión**: 1.0  
**Fecha creación**: {YYYY-MM-DD}  
**Última actualización**: {YYYY-MM-DD}  
**Autor**: Discovery Analysis Agent  
**Metodología**: ZNS v2.2 | ISO/IEC 25010  

> **🎭 Enfoque:** Este documento debe ser analizado desde la perspectiva de un **Site Reliability Engineer (SRE) Senior y Performance Architect**, enfocándose en SLIs/SLOs/SLAs, capacity planning, fault tolerance y observability.

---

## 📋 Resumen Ejecutivo

| Categoría | Total RNFs | Críticos | Cuantificados |
|-----------|:----------:|:--------:|:-------------:|
| Performance | {X} | {X} | {X} ({XX%}) |
| Disponibilidad | {X} | {X} | {X} ({XX%}) |
| Seguridad | {X} | {X} | {X} ({XX%}) |
| Usabilidad | {X} | {X} | {X} ({XX%}) |
| Mantenibilidad | {X} | {X} | {X} ({XX%}) |
| Portabilidad | {X} | {X} | {X} ({XX%}) |
| **TOTAL** | **{XX}** | **{X}** | **{XX} ({XX%})** |

---

## 1. Performance y Escalabilidad

### RNF-PERF-001: Tiempo de Respuesta API

**Categoría**: Performance  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  
**Fuente**: {Documento, página/sección}

**Descripción**: 
Todos los endpoints de la API deben responder dentro de los tiempos especificados bajo condiciones normales de carga.

**Métricas y Objetivos**:

| Tipo de Operación | P50 (mediana) | P95 | P99 | Máximo |
|-------------------|:-------------:|:---:|:---:|:------:|
| Consultas simples (GET) | < 100ms | < 200ms | < 500ms | < 1s |
| Consultas complejas (búsquedas) | < 300ms | < 800ms | < 1.5s | < 3s |
| Operaciones de escritura (POST/PUT) | < 200ms | < 500ms | < 1s | < 2s |
| Transacciones complejas | < 500ms | < 1s | < 2s | < 5s |
| Generación de reportes | < 3s | < 5s | < 10s | < 30s |

**Condiciones de Medición**:
- Carga: {X} usuarios concurrentes
- Ambiente: Producción (o equivalente)
- Medición: Desde el servidor, excluyendo latencia de red del cliente

**Método de Validación**:
- Herramienta: {JMeter / Gatling / k6 / Artillery}
- Frecuencia: Cada deploy + pruebas semanales automatizadas
- Alertas: Si P95 > umbral durante 5 minutos consecutivos

**Dependencias**: RNF-INFRA-XXX (infraestructura), RNF-DB-XXX (base de datos)

---

### RNF-PERF-002: Escalabilidad Horizontal

**Categoría**: Performance / Escalabilidad  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  
**Fuente**: {Documento, página/sección}

**Descripción**:
El sistema debe escalar horizontalmente para manejar incrementos de carga sin degradación de performance.

**Objetivos de Escalabilidad**:

| Escenario | Usuarios Concurrentes | Transacciones/seg | Instancias |
|-----------|:---------------------:|:-----------------:|:----------:|
| Baseline (día normal) | {X} | {X} TPS | {X} |
| Pico regular | {X × 2} | {X × 2} TPS | {X} |
| Pico máximo esperado | {X × 5} | {X × 3} TPS | {X × 2} |
| Stress test | {X × 10} | {X × 5} TPS | Auto-scale |

**Criterios de Auto-scaling**:
- **Scale-up**: CPU > 70% por 3 minutos O memoria > 80%
- **Scale-down**: CPU < 30% por 10 minutos
- **Mínimo instancias**: {X}
- **Máximo instancias**: {X}

**Crecimiento Proyectado**:
| Año | Usuarios Registrados | Concurrentes Peak | Crecimiento |
|:---:|:--------------------:|:-----------------:|:-----------:|
| Año 1 | {X} | {X} | — |
| Año 2 | {X} | {X} | +{X%} |
| Año 3 | {X} | {X} | +{X%} |

---

### RNF-PERF-003: Capacidad de Throughput

**Categoría**: Performance  
**Prioridad**: Should Have  
**Criticidad**: 🟡 Media  

**Objetivos**:
| Métrica | Objetivo | Mínimo Aceptable |
|---------|:--------:|:----------------:|
| Requests por segundo (RPS) | {X} | {X × 0.7} |
| Transacciones por segundo (TPS) | {X} | {X × 0.7} |
| Mensajes procesados/hora | {X} | {X × 0.7} |

---

## 2. Disponibilidad y Confiabilidad

### RNF-AVAIL-001: Disponibilidad del Sistema (SLA)

**Categoría**: Disponibilidad  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  
**Fuente**: {Documento, página/sección}

**Service Level Agreement (SLA)**:

| Componente | SLA Objetivo | SLA Mínimo | Downtime Permitido/Mes |
|------------|:------------:|:----------:|:----------------------:|
| API Principal | 99.9% | 99.5% | 43.8 min / 3.65 hrs |
| Base de Datos | 99.95% | 99.9% | 21.9 min / 43.8 min |
| Servicios Críticos | 99.9% | 99.5% | 43.8 min / 3.65 hrs |
| Portal Web | 99.5% | 99.0% | 3.65 hrs / 7.3 hrs |

**Ventana de Mantenimiento**:
- **Horario**: {Domingos 02:00-06:00 UTC-5}
- **Frecuencia**: {Mensual / Trimestral}
- **Notificación**: {72 horas de anticipación}

**Exclusiones del SLA**:
- Mantenimientos programados (notificados)
- Fuerza mayor (desastres naturales)
- Problemas de conectividad del cliente

---

### RNF-AVAIL-002: Disaster Recovery (DR)

**Categoría**: Disponibilidad / Resiliencia  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  

**Objetivos de Recuperación**:

| Métrica | Objetivo | Máximo Tolerado |
|---------|:--------:|:---------------:|
| **RPO** (Recovery Point Objective) | < 15 min | < 1 hora |
| **RTO** (Recovery Time Objective) | < 1 hora | < 4 horas |
| **MTTR** (Mean Time To Repair) | < 30 min | < 2 horas |
| **MTBF** (Mean Time Between Failures) | > 720 hrs | > 168 hrs |

**Estrategia de DR**:
| Nivel | Estrategia | RPO | RTO |
|-------|------------|:---:|:---:|
| Tier 1 (Crítico) | Active-Active Multi-Region | 0 | < 5 min |
| Tier 2 (Importante) | Hot Standby | < 15 min | < 1 hr |
| Tier 3 (Normal) | Warm Standby | < 1 hr | < 4 hr |

**Plan de Backups**:
| Tipo | Frecuencia | Retención | Ubicación |
|------|:----------:|:---------:|-----------|
| Full backup | Diario (02:00 UTC) | 30 días | {Región secundaria} |
| Incremental | Cada 4 horas | 7 días | {Misma región} |
| Transaction logs | Continuo | 24 horas | {Multi-AZ} |

---

### RNF-AVAIL-003: Tolerancia a Fallos

**Categoría**: Resiliencia  
**Prioridad**: Should Have  
**Criticidad**: 🟡 Media  

**Patrones de Resiliencia Requeridos**:
- [ ] Circuit Breaker (con fallback)
- [ ] Retry con exponential backoff
- [ ] Bulkhead (aislamiento de fallos)
- [ ] Timeout configurables
- [ ] Graceful degradation

**Escenarios de Fallo y Comportamiento Esperado**:
| Escenario | Comportamiento Esperado | Tiempo de Recuperación |
|-----------|-------------------------|:----------------------:|
| Fallo de instancia | Auto-heal, redistribuir tráfico | < 2 min |
| Fallo de zona/AZ | Failover automático a AZ secundaria | < 5 min |
| Fallo de servicio externo | Circuit breaker + respuesta cacheada | Inmediato |
| Fallo de BD primaria | Promover réplica | < 30 seg |

---

## 3. Seguridad

### RNF-SEC-001: Autenticación

**Categoría**: Seguridad  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  
**Fuente**: {Documento, página/sección}

**Métodos de Autenticación**:
- [x] OAuth 2.0 / OpenID Connect
- [x] JWT (JSON Web Tokens)
- [ ] SAML 2.0 (SSO empresarial)
- [ ] MFA (Multi-Factor Authentication)
- [ ] Passwordless (magic links / WebAuthn)

**Especificaciones de Tokens**:
| Parámetro | Valor |
|-----------|-------|
| Algoritmo de firma | RS256 / ES256 |
| Tiempo de vida Access Token | 15 minutos |
| Tiempo de vida Refresh Token | 7 días |
| Rotación de claves | Cada 90 días |

**Políticas de Contraseñas** (si aplica):
| Regla | Valor |
|-------|-------|
| Longitud mínima | 12 caracteres |
| Complejidad | Mayúsculas + minúsculas + números + símbolos |
| Historial | Últimas 12 contraseñas |
| Expiración | 90 días (o nunca con MFA activo) |
| Bloqueo por intentos fallidos | 5 intentos → bloqueo 30 min |

---

### RNF-SEC-002: Autorización

**Categoría**: Seguridad  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  

**Modelo de Autorización**: {RBAC / ABAC / Híbrido}

**Roles del Sistema**:
| Rol | Descripción | Permisos (alto nivel) |
|-----|-------------|----------------------|
| Admin | Administrador del sistema | Full access |
| Manager | Gestor de operaciones | CRUD en su área |
| User | Usuario estándar | Read + Create limitado |
| ReadOnly | Solo lectura | Read only |
| API | Servicios externos | Endpoints específicos |

**Principios de Seguridad**:
- [x] Principle of Least Privilege
- [x] Defense in Depth
- [x] Separation of Duties
- [x] Fail Secure

---

### RNF-SEC-003: Encriptación

**Categoría**: Seguridad  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  

**Encriptación en Tránsito**:
| Protocolo | Versión Mínima | Cipher Suites |
|-----------|:--------------:|---------------|
| TLS | 1.2 (preferido 1.3) | AES-256-GCM, ChaCha20 |
| HTTPS | Obligatorio | HSTS habilitado |

**Encriptación en Reposo**:
| Dato | Algoritmo | Key Management |
|------|-----------|----------------|
| Base de datos | AES-256-GCM | AWS KMS / Azure Key Vault |
| Archivos/S3 | AES-256 | Managed keys |
| Backups | AES-256-GCM | Customer managed keys |
| PII sensible | AES-256 + Tokenización | HSM |

**Datos Sensibles (PII/PCI)**:
| Campo | Clasificación | Tratamiento |
|-------|---------------|-------------|
| {Campo 1} | PII | Encriptado + Masked en logs |
| {Campo 2} | PCI | Tokenizado |
| {Campo 3} | Confidencial | Encriptado |

---

### RNF-SEC-004: Compliance y Regulaciones

**Categoría**: Seguridad / Compliance  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  

**Regulaciones Aplicables**:
| Regulación | Aplica | Requisitos Clave |
|------------|:------:|------------------|
| GDPR | ✅/❌ | Consentimiento, derecho al olvido, portabilidad |
| PCI-DSS | ✅/❌ | Tokenización, auditoría, segmentación de red |
| HIPAA | ✅/❌ | BAA, encriptación, access logs |
| SOC 2 Type II | ✅/❌ | Controles de seguridad, disponibilidad |
| ISO 27001 | ✅/❌ | ISMS, gestión de riesgos |
| Ley local {X} | ✅/❌ | {Requisitos específicos} |

**Auditoría y Logging**:
| Evento | Log Requerido | Retención |
|--------|:-------------:|:---------:|
| Login/Logout | ✅ | 1 año |
| Cambios de datos sensibles | ✅ | 2 años |
| Acceso a PII | ✅ | 1 año |
| Cambios de configuración | ✅ | 1 año |
| Errores de seguridad | ✅ | 90 días |

---

## 4. Usabilidad y Accesibilidad

### RNF-USAB-001: Accesibilidad Web

**Categoría**: Usabilidad  
**Prioridad**: Should Have  
**Criticidad**: 🟡 Media  

**Estándar**: WCAG 2.1 Nivel {AA / AAA}

**Requisitos de Accesibilidad**:
- [ ] Contraste mínimo 4.5:1 (texto normal)
- [ ] Navegación completa por teclado
- [ ] Textos alternativos en imágenes
- [ ] Formularios con labels asociados
- [ ] Estructura semántica de headings
- [ ] Focus visible en elementos interactivos
- [ ] Compatible con screen readers

---

### RNF-USAB-002: Compatibilidad de Dispositivos

**Categoría**: Usabilidad  
**Prioridad**: Must Have  
**Criticidad**: 🟡 Media  

**Navegadores Soportados**:
| Navegador | Versiones | Prioridad |
|-----------|-----------|:---------:|
| Chrome | Últimas 2 versiones | Alta |
| Firefox | Últimas 2 versiones | Alta |
| Safari | Últimas 2 versiones | Alta |
| Edge | Últimas 2 versiones | Media |
| Mobile Safari (iOS) | iOS 14+ | Alta |
| Chrome Mobile (Android) | Android 10+ | Alta |

**Resoluciones Soportadas**:
| Tipo | Resolución | Breakpoint |
|------|:----------:|:----------:|
| Mobile | 320px - 767px | xs, sm |
| Tablet | 768px - 1023px | md |
| Desktop | 1024px - 1439px | lg |
| Large Desktop | 1440px+ | xl |

---

### RNF-USAB-003: Performance Percibida (UX)

**Categoría**: Usabilidad / Performance  
**Prioridad**: Should Have  
**Criticidad**: 🟡 Media  

**Core Web Vitals**:
| Métrica | Objetivo | Aceptable | Pobre |
|---------|:--------:|:---------:|:-----:|
| LCP (Largest Contentful Paint) | < 2.5s | < 4s | > 4s |
| FID (First Input Delay) | < 100ms | < 300ms | > 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 | > 0.25 |
| TTFB (Time to First Byte) | < 200ms | < 500ms | > 500ms |

---

## 5. Mantenibilidad

### RNF-MAINT-001: Cobertura de Tests

**Categoría**: Mantenibilidad  
**Prioridad**: Should Have  
**Criticidad**: 🟡 Media  

**Objetivos de Cobertura**:
| Tipo de Test | Cobertura Objetivo | Mínimo | Herramienta |
|--------------|:------------------:|:------:|-------------|
| Unit Tests | 80% | 70% | {JUnit/Jest/pytest} |
| Integration Tests | 60% | 50% | {Testcontainers} |
| E2E Tests | Flujos críticos | 100% críticos | {Playwright/Cypress} |
| Contract Tests | APIs públicas | 100% | {Pact} |

---

### RNF-MAINT-002: Estándares de Código

**Categoría**: Mantenibilidad  
**Prioridad**: Should Have  
**Criticidad**: 🟡 Media  

**Métricas de Calidad**:
| Métrica | Umbral | Herramienta |
|---------|:------:|-------------|
| Complejidad ciclomática | ≤ 10 por método | SonarQube |
| Duplicación de código | ≤ 3% | SonarQube |
| Technical Debt Ratio | ≤ 5% | SonarQube |
| Code Smells críticos | 0 | SonarQube |
| Vulnerabilidades | 0 críticas/altas | Snyk/Dependabot |

---

## 6. Restricciones Técnicas

### RNF-TECH-001: Stack Tecnológico

**Categoría**: Restricciones  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  
**Fuente**: {Documento, página/sección}

**Stack Obligatorio**:
| Capa | Tecnología | Versión | Razón |
|------|------------|---------|-------|
| Backend | {Java/Node.js/Python/etc.} | {Versión} | {Política interna / Expertise} |
| Framework | {Spring Boot/Express/Django} | {Versión} | {Estándar corporativo} |
| Base de Datos | {PostgreSQL/MySQL/MongoDB} | {Versión} | {Licenciamiento / Expertise} |
| Cache | {Redis/Memcached} | {Versión} | {Performance} |
| Message Queue | {RabbitMQ/Kafka/SQS} | {Versión} | {Arquitectura existente} |
| Cloud Provider | {AWS/Azure/GCP} | — | {Contrato existente} |

**Restricciones de Infraestructura**:
| Restricción | Valor | Razón |
|-------------|-------|-------|
| Región primaria | {us-east-1 / eu-west-1} | {Latencia / Compliance} |
| Región DR | {us-west-2} | {DR requirements} |
| Containerización | {Docker + Kubernetes / ECS} | {Estándar} |
| CI/CD | {GitHub Actions / Jenkins} | {Herramienta existente} |

---

### RNF-TECH-002: Presupuesto de Infraestructura

**Categoría**: Restricciones  
**Prioridad**: Must Have  
**Criticidad**: 🔴 Alta  

**Presupuesto Mensual**:
| Componente | Estimación | Máximo |
|------------|:----------:|:------:|
| Compute (EC2/ECS) | $ {X} | $ {X × 1.2} |
| Database (RDS) | $ {X} | $ {X × 1.2} |
| Storage (S3) | $ {X} | $ {X × 1.2} |
| Networking | $ {X} | $ {X × 1.2} |
| Otros servicios | $ {X} | $ {X × 1.2} |
| **TOTAL** | **$ {X}** | **$ {X × 1.2}** |

---

## 7. Observabilidad

### RNF-OBS-001: Logging

**Categoría**: Observabilidad  
**Prioridad**: Must Have  
**Criticidad**: 🟡 Media  

**Especificaciones de Logging**:
| Aspecto | Especificación |
|---------|----------------|
| Formato | JSON estructurado |
| Niveles | ERROR, WARN, INFO, DEBUG |
| Correlación | Request ID / Trace ID en todos los logs |
| Retención | 30 días hot, 90 días cold |
| Herramienta | {CloudWatch / ELK / Datadog} |

---

### RNF-OBS-002: Métricas y Alertas

**Categoría**: Observabilidad  
**Prioridad**: Must Have  
**Criticidad**: 🟡 Media  

**Métricas Obligatorias**:
| Categoría | Métricas | Alerta Si... |
|-----------|----------|--------------|
| Application | Response time, Error rate, Throughput | P95 > 500ms, Error > 1% |
| Infrastructure | CPU, Memory, Disk, Network | CPU > 80%, Mem > 85% |
| Business | Transactions, Active users | Anomalía detectada |
| Database | Connections, Query time, Replication lag | Lag > 1s |

---

## 8. Trazabilidad

### Matriz RNF → Fuente

| RNF | Fuente | Página/Sección | Stakeholder |
|:----|--------|----------------|-------------|
| RNF-PERF-001 | {Documento} | {Pág X} | {CTO/Architect} |
| RNF-SEC-001 | {Documento} | {Pág X} | {Security} |

---

## 9. Gaps y Pendientes

| # | RNF | Pregunta/Gap | Impacto | Estado |
|:-:|:----|--------------|:-------:|:------:|
| 1 | RNF-XXX | {Métrica no definida por el cliente} | Alto | ⏳ |
| 2 | RNF-XXX | {Valor por confirmar} | Medio | ⏳ |

---

## 📊 Estadísticas del Documento

| Métrica | Valor |
|---------|:-----:|
| Total RNFs documentados | {XX} |
| RNFs con métricas cuantificadas | {XX} ({XX%}) |
| RNFs críticos | {XX} |
| Gaps pendientes | {XX} |

---

## 📝 Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | {YYYY-MM-DD} | {Nombre} | Versión inicial |

---

**Generado por**: Discovery Analysis Agent  
**Metodología**: ZNS v2.2  
**Estándar**: ISO/IEC 25010:2011 (SQuaRE)
