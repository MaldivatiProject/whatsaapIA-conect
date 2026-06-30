# 🔐 Security Assessment Template

---

**Proyecto**: [NOMBRE_PROYECTO]  
**Fecha**: [YYYY-MM-DD]  
**Evaluador**: [NOMBRE]  
**Versión**: 1.0  

---

## 📋 Executive Summary

| Métrica | Valor | Status |
|---------|-------|--------|
| **Overall Security Score** | X/100 | 🟢/🟡/🔴 |
| **Critical Findings** | X | 🔴 |
| **High Findings** | X | 🟠 |
| **Medium Findings** | X | 🟡 |
| **Low Findings** | X | 🟢 |

### Recomendación General
[Breve resumen ejecutivo de la postura de seguridad y acciones prioritarias]

---

## 1️⃣ Identity & Access Management (IAM)

### 1.1 Multi-Factor Authentication
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| MFA para usuarios root/admin | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| MFA para todos los usuarios IAM | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| MFA para acceso a consola | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 1.2 Principle of Least Privilege
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| No uso de políticas con wildcards (*) | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Service accounts con permisos mínimos | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Revisión periódica de permisos | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| Roles separados por ambiente | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### 1.3 Credential Management
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Rotación automática de credenciales | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| No credenciales hardcoded | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Uso de roles en lugar de keys | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### Hallazgos IAM
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| IAM-001 | 🔴 Crítica | [Descripción] | [Acción] |
| IAM-002 | 🟠 Alta | [Descripción] | [Acción] |

---

## 2️⃣ Network Security

### 2.1 Network Segmentation
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| VPCs segregadas por ambiente | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Subnets privadas para workloads | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Subnets públicas solo para LBs | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 2.2 Security Groups / Firewalls
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| No reglas con 0.0.0.0/0 para SSH/RDP | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Principio de mínimo acceso | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Reglas documentadas | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### 2.3 Web Application Firewall (WAF)
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| WAF habilitado en endpoints públicos | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Reglas OWASP Top 10 activas | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Rate limiting configurado | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### Hallazgos Network
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| NET-001 | 🔴 Crítica | [Descripción] | [Acción] |

---

## 3️⃣ Data Security

### 3.1 Encryption at Rest
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Databases encriptadas (RDS/DynamoDB) | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Storage encriptado (S3/EBS) | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| KMS keys con rotación | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Backups encriptados | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 3.2 Encryption in Transit
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| TLS 1.2+ para todas las comunicaciones | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Certificados válidos y gestionados | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| mTLS entre microservicios | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### 3.3 Data Classification
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Política de clasificación definida | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| Tags de sensibilidad aplicados | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| DLP configurado | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### Hallazgos Data Security
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| DATA-001 | 🔴 Crítica | [Descripción] | [Acción] |

---

## 4️⃣ Container & Kubernetes Security

### 4.1 Image Security
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Base images from approved registry | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| No CRITICAL CVEs en imágenes | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Imágenes firmadas (Cosign/Notary) | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| Image scanning en pipeline | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 4.2 Pod Security
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| No containers running as root | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| No privileged containers | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Read-only root filesystem | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Resource limits definidos | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Security Context configurado | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 4.3 Network Policies
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Network Policies por namespace | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Default deny ingress | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Default deny egress | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### 4.4 Runtime Security
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Runtime protection (Falco/Sysdig) | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Anomaly detection configurado | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| Audit logging habilitado | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### Hallazgos Container/K8s
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| K8S-001 | 🔴 Crítica | [Descripción] | [Acción] |

---

## 5️⃣ Secrets Management

### 5.1 Secrets Storage
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Vault/Secrets Manager implementado | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| No secrets en código/repos | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| No secrets en variables de entorno | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 5.2 Secrets Lifecycle
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Rotación automática configurada | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Audit logging de acceso a secrets | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Proceso de revocación definido | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### Hallazgos Secrets
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| SEC-001 | 🔴 Crítica | [Descripción] | [Acción] |

---

## 6️⃣ Logging & Monitoring

### 6.1 Security Logging
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| CloudTrail/Activity Log habilitado | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| Logs centralizados | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Retención según compliance | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Logs inmutables | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### 6.2 Security Alerting
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| Alertas de seguridad configuradas | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Alertas de login fallido | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Alertas de cambios IAM | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Escalation process definido | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### Hallazgos Logging
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| LOG-001 | 🟠 Alta | [Descripción] | [Acción] |

---

## 7️⃣ Compliance

### 7.1 Framework Compliance (seleccionar aplicables)

#### SOC 2
| Control | Estado | Evidencia | Gap |
|---------|--------|-----------|-----|
| CC6.1 - Logical Access | ⬜ ✅ ❌ | [Link] | [Gap] |
| CC6.2 - System Access | ⬜ ✅ ❌ | [Link] | [Gap] |
| CC6.6 - Transmission Security | ⬜ ✅ ❌ | [Link] | [Gap] |

#### GDPR (si aplica)
| Control | Estado | Evidencia | Gap |
|---------|--------|-----------|-----|
| Art. 32 - Security of processing | ⬜ ✅ ❌ | [Link] | [Gap] |
| Art. 25 - Data protection by design | ⬜ ✅ ❌ | [Link] | [Gap] |

### Hallazgos Compliance
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| COMP-001 | 🟠 Alta | [Descripción] | [Acción] |

---

## 8️⃣ CI/CD Security

### 8.1 Pipeline Security
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| SAST integrado en pipeline | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| SCA (dependency scanning) | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Container scanning | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| IaC scanning | ⬜ ✅ ❌ | [Link] | 🟠 Alta |
| Secrets detection | ⬜ ✅ ❌ | [Link] | 🔴 Crítica |
| DAST en staging | ⬜ ✅ ❌ | [Link] | 🟡 Media |

### 8.2 Supply Chain Security
| Control | Estado | Evidencia | Prioridad |
|---------|--------|-----------|-----------|
| SBOM generado | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| Imágenes firmadas | ⬜ ✅ ❌ | [Link] | 🟡 Media |
| Dependency pinning | ⬜ ✅ ❌ | [Link] | 🟠 Alta |

### Hallazgos CI/CD
| ID | Severidad | Descripción | Remediación |
|----|-----------|-------------|-------------|
| CICD-001 | 🟠 Alta | [Descripción] | [Acción] |

---

## 📊 Resumen de Hallazgos

### Por Severidad
```
🔴 Crítica: X hallazgos
🟠 Alta:    X hallazgos
🟡 Media:   X hallazgos
🟢 Baja:    X hallazgos
─────────────────────────
📊 Total:   X hallazgos
```

### Por Categoría
| Categoría | Critical | High | Medium | Low |
|-----------|----------|------|--------|-----|
| IAM | X | X | X | X |
| Network | X | X | X | X |
| Data | X | X | X | X |
| Container/K8s | X | X | X | X |
| Secrets | X | X | X | X |
| Logging | X | X | X | X |
| Compliance | X | X | X | X |
| CI/CD | X | X | X | X |

---

## 🎯 Plan de Remediación

### Prioridad Inmediata (0-7 días)
| ID | Hallazgo | Owner | Deadline | Status |
|----|----------|-------|----------|--------|
| IAM-001 | [Descripción] | [Team] | [Fecha] | ⬜ |
| NET-001 | [Descripción] | [Team] | [Fecha] | ⬜ |

### Corto Plazo (7-30 días)
| ID | Hallazgo | Owner | Deadline | Status |
|----|----------|-------|----------|--------|
| DATA-001 | [Descripción] | [Team] | [Fecha] | ⬜ |

### Mediano Plazo (30-90 días)
| ID | Hallazgo | Owner | Deadline | Status |
|----|----------|-------|----------|--------|
| LOG-001 | [Descripción] | [Team] | [Fecha] | ⬜ |

---

## ✍️ Firmas

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Evaluador | [Nombre] | _____________ | [Fecha] |
| Security Lead | [Nombre] | _____________ | [Fecha] |
| CTO/CISO | [Nombre] | _____________ | [Fecha] |

---

**Próxima revisión programada**: [Fecha]  
**Frecuencia de evaluación**: Trimestral
