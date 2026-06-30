# Checklist de Seguridad por Capa - Método ZNS

## Introducción

Este checklist cubre las capas de seguridad basadas en el principio de **Defense in Depth** (defensa en profundidad). Cada capa debe tener controles independientes para que el fallo de una no comprometa todo el sistema.

---

## 1. Seguridad de Red (Network Layer)

### 1.1 Perímetro de Red

- [ ] **Firewall configurado** con reglas de entrada/salida restrictivas
- [ ] **WAF (Web Application Firewall)** implementado
  - [ ] Protección contra SQL Injection
  - [ ] Protección contra XSS
  - [ ] Protección contra CSRF
  - [ ] Rate limiting por IP
- [ ] **DDoS Protection** activa (CloudFlare, AWS Shield)
- [ ] **VPN/VPC** configurada para acceso administrativo
- [ ] **Bastion Hosts** para acceso a recursos internos
- [ ] **Network Segmentation** (subnets públicas/privadas)

### 1.2 Load Balancers

- [ ] **TLS/SSL termination** en load balancer
- [ ] **Health checks** configurados
- [ ] **Sticky sessions** si es necesario
- [ ] **Connection draining** habilitado
- [ ] **Rate limiting** por cliente

### 1.3 DNS

- [ ] **DNSSEC** habilitado
- [ ] **CAA records** configurados
- [ ] **DDoS protection** en DNS (CloudFlare)

---

## 2. Seguridad de Infraestructura (Infrastructure Layer)

### 2.1 Servidor / Contenedores

- [ ] **OS actualizado** (parches de seguridad)
- [ ] **Servicios innecesarios deshabilitados**
- [ ] **Puertos mínimos expuestos** (principle of least privilege)
- [ ] **SSH hardening**:
  - [ ] Deshabilitar login como root
  - [ ] Autenticación por clave pública únicamente
  - [ ] Cambiar puerto SSH default
  - [ ] Fail2ban configurado
- [ ] **Docker/Container security**:
  - [ ] Imágenes de fuentes confiables
  - [ ] Escaneo de vulnerabilidades (Trivy, Snyk)
  - [ ] Non-root user en containers
  - [ ] Read-only filesystem donde sea posible
  - [ ] Resource limits (CPU, memory)

### 2.2 Cloud Security (AWS/Azure/GCP)

- [ ] **IAM Roles** con permisos mínimos
- [ ] **MFA** habilitado para usuarios admin
- [ ] **Security Groups** restrictivos
- [ ] **NACLs** configurados
- [ ] **S3 Buckets** privados por default
  - [ ] Block public access enabled
  - [ ] Versioning habilitado
  - [ ] Encryption at rest
- [ ] **Secrets Manager** para credenciales
- [ ] **CloudTrail/Activity Logs** habilitados
- [ ] **GuardDuty/Security Center** activo

### 2.3 Kubernetes (si aplica)

- [ ] **RBAC** configurado (Role-Based Access Control)
- [ ] **Network Policies** definidas
- [ ] **Pod Security Policies/Standards**
- [ ] **Secrets encryption** at rest
- [ ] **Image scanning** en CI/CD
- [ ] **Service Mesh** (Istio) para mTLS
- [ ] **Admission Controllers** (OPA/Gatekeeper)

---

## 3. Seguridad de Aplicación (Application Layer)

### 3.1 Autenticación

- [ ] **Password Policy** robusto:
  - [ ] Mínimo 12 caracteres
  - [ ] Complejidad (mayúsculas, minúsculas, números, símbolos)
  - [ ] No permitir contraseñas comunes
  - [ ] Historial de contraseñas (no reutilizar últimas 5)
- [ ] **Password Hashing** seguro:
  - [ ] bcrypt (cost factor >= 12)
  - [ ] Argon2id (recomendado)
  - [ ] PBKDF2 (último recurso)
  - [ ] ❌ NUNCA MD5, SHA1, o plain text
- [ ] **Multi-Factor Authentication (MFA)**:
  - [ ] TOTP (Google Authenticator, Authy)
  - [ ] SMS (menos seguro, pero aceptable)
  - [ ] Requerido para admin/operaciones sensibles
- [ ] **OAuth 2.0 / OpenID Connect** para SSO
- [ ] **JWT Tokens** seguros:
  - [ ] Firmados con RS256 o HS256
  - [ ] Expiración corta (15 min access token)
  - [ ] Refresh tokens con rotación
  - [ ] Almacenados en httpOnly cookies (no localStorage)
- [ ] **Session Management**:
  - [ ] Session timeout (inactividad)
  - [ ] Absolute session timeout
  - [ ] Logout functionality
  - [ ] Concurrent session limit
- [ ] **Account Lockout** tras intentos fallidos (5-10 intentos)
- [ ] **CAPTCHA** para prevenir brute force

### 3.2 Autorización

- [ ] **Principle of Least Privilege**
- [ ] **RBAC (Role-Based Access Control)**:
  - [ ] Roles bien definidos (User, Admin, Moderator)
  - [ ] Permisos granulares por recurso
- [ ] **ABAC (Attribute-Based)** si se requiere
- [ ] **Ownership validation** (usuario solo accede a sus recursos)
- [ ] **Verificación en backend** (nunca confiar en frontend)

### 3.3 Input Validation

- [ ] **Validación en servidor** (nunca solo cliente)
- [ ] **Whitelist validation** (permitir solo lo esperado)
- [ ] **Tipo de datos** validado (string, number, email, UUID)
- [ ] **Longitud** validada (min/max characters)
- [ ] **Formato** validado (regex para email, teléfono, etc.)
- [ ] **Sanitización de HTML** (DOMPurify, sanitize-html)
- [ ] **SQL Injection prevention**:
  - [ ] Usar ORM/Query builder
  - [ ] Prepared statements
  - [ ] ❌ NUNCA concatenar strings en queries
- [ ] **NoSQL Injection prevention**:
  - [ ] Validar tipos de datos
  - [ ] Sanitizar operadores ($where, $regex)
- [ ] **Command Injection prevention**:
  - [ ] Evitar exec/eval
  - [ ] Usar librerías seguras
  - [ ] Validar parámetros de comandos
- [ ] **Path Traversal prevention**:
  - [ ] Validar rutas de archivos
  - [ ] Usar path.join, no concatenación
  - [ ] Whitelist de directorios permitidos

### 3.4 Output Encoding

- [ ] **XSS Prevention**:
  - [ ] Encoding de HTML entities
  - [ ] Content-Security-Policy header
  - [ ] X-XSS-Protection header
  - [ ] Usar frameworks que escapen automáticamente (React, Vue)
- [ ] **JSON encoding** proper
- [ ] **URL encoding** cuando sea necesario

### 3.5 CSRF Protection

- [ ] **CSRF Tokens** en formularios
- [ ] **SameSite cookies** (Strict or Lax)
- [ ] **Double Submit Cookie** pattern
- [ ] **Verificar Origin/Referer** headers

### 3.6 CORS Configuration

- [ ] **Allowed Origins** explícitos (no `*`)
- [ ] **Allowed Methods** mínimos necesarios
- [ ] **Allowed Headers** específicos
- [ ] **Credentials** solo si es necesario
- [ ] **Max Age** configurado

### 3.7 Headers de Seguridad

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

- [ ] **HSTS** (HTTP Strict Transport Security)
- [ ] **X-Frame-Options** (Clickjacking prevention)
- [ ] **X-Content-Type-Options** (MIME sniffing prevention)
- [ ] **Content-Security-Policy** (XSS prevention)
- [ ] **Referrer-Policy**
- [ ] **Permissions-Policy** (antes Feature-Policy)

### 3.8 API Security

- [ ] **Rate Limiting** por IP/usuario:
  - [ ] Autenticados: 100 req/min
  - [ ] No autenticados: 20 req/min
  - [ ] Respuesta 429 con Retry-After header
- [ ] **API Keys** rotación periódica
- [ ] **API Versioning** (v1, v2)
- [ ] **Request Size Limits** (10 MB max)
- [ ] **Timeout** configurado (30s max)
- [ ] **HTTPS only** (redirect HTTP → HTTPS)

### 3.9 File Upload Security

- [ ] **Tipo de archivo** validado (MIME type)
- [ ] **Extensión** validada (whitelist)
- [ ] **Tamaño máximo** (5-10 MB)
- [ ] **Antivirus scan** (ClamAV)
- [ ] **Almacenamiento separado** (S3, no filesystem)
- [ ] **Nombre de archivo** sanitizado
- [ ] **Servir con CDN** (no directamente del servidor)
- [ ] **Content-Disposition** header (force download)

### 3.10 Error Handling

- [ ] **No exponer stack traces** en producción
- [ ] **Mensajes de error genéricos** al cliente
- [ ] **Logging detallado** en servidor
- [ ] **Error codes consistentes**
- [ ] **No revelar información sensible** (rutas, versiones)

---

## 4. Seguridad de Datos (Data Layer)

### 4.1 Encryption

**En Tránsito:**
- [ ] **TLS 1.3** (o mínimo TLS 1.2)
- [ ] **Certificados válidos** (Let's Encrypt, DigiCert)
- [ ] **Perfect Forward Secrecy** habilitado
- [ ] **Deshabilitar SSL, TLS 1.0, TLS 1.1**

**En Reposo:**
- [ ] **Database encryption** at rest (AES-256)
- [ ] **S3 bucket encryption** (SSE-S3, SSE-KMS)
- [ ] **EBS volumes encrypted**
- [ ] **Backup encryption**
- [ ] **Encryption keys** rotación periódica

### 4.2 Datos Sensibles

**PII (Personally Identifiable Information):**
- [ ] **Identificar y clasificar** datos PII
- [ ] **Minimizar recolección** (data minimization)
- [ ] **Consentimiento explícito** del usuario
- [ ] **Encriptar campos sensibles**:
  - [ ] Email (opcional, depende del caso)
  - [ ] Teléfono
  - [ ] Dirección
  - [ ] Número de documento
- [ ] **Masking en logs** (ofuscar últimos 4 dígitos)
- [ ] **Derecho al olvido** (GDPR)
- [ ] **Portabilidad de datos** (export function)

**Datos de Pago (PCI-DSS):**
- [ ] **NUNCA almacenar CVV/CVV2**
- [ ] **Tokenización** de tarjetas (Stripe, PayU)
- [ ] **PAN** (Primary Account Number) truncado
- [ ] **PCI-DSS compliance** si se almacena
- [ ] **Logs de acceso** a datos de pago
- [ ] **Segmentación de red** (cardholder data environment)

**Datos de Salud (HIPAA):**
- [ ] **PHI encryption** at rest y in transit
- [ ] **Access logs** completos
- [ ] **BAA** (Business Associate Agreement)
- [ ] **Audit trails** inmutables
- [ ] **Breach notification** procedures

### 4.3 Base de Datos

- [ ] **Acceso con credenciales únicas** (no root)
- [ ] **Principle of least privilege** (permisos mínimos)
- [ ] **Conexión encriptada** (SSL/TLS)
- [ ] **IP Whitelisting** (solo servidores app)
- [ ] **No expuesta a internet** (subnet privada)
- [ ] **Backups automáticos** diarios
- [ ] **Backup encryption**
- [ ] **Punto de restauración** testado
- [ ] **Audit logging** habilitado
- [ ] **SQL Injection** prevention (ORM, prepared statements)

### 4.4 Secrets Management

- [ ] **NUNCA en código fuente**
- [ ] **NUNCA en Git** (.env en .gitignore)
- [ ] **Usar Secrets Manager**:
  - [ ] AWS Secrets Manager
  - [ ] HashiCorp Vault
  - [ ] Azure Key Vault
  - [ ] Google Secret Manager
- [ ] **Rotación automática** de secrets
- [ ] **Acceso auditado** (quién accedió cuándo)
- [ ] **Environment variables** en runtime
- [ ] **Diferentes secrets** por ambiente (dev, staging, prod)

---

## 5. Seguridad en CI/CD

### 5.1 Source Code

- [ ] **Git branch protection** (main/master)
- [ ] **Code review** obligatorio (PR)
- [ ] **SAST** (Static Application Security Testing):
  - [ ] SonarQube
  - [ ] Semgrep
  - [ ] Checkmarx
- [ ] **Dependency scanning**:
  - [ ] npm audit / yarn audit
  - [ ] Snyk
  - [ ] Dependabot
  - [ ] OWASP Dependency-Check
- [ ] **Secret scanning**:
  - [ ] GitGuardian
  - [ ] TruffleHog
  - [ ] GitHub Secret Scanning
- [ ] **.gitignore** configurado (.env, credentials)
- [ ] **Signed commits** (GPG)

### 5.2 Build Process

- [ ] **Builds reproducibles**
- [ ] **Dependency lock files** (package-lock.json, yarn.lock)
- [ ] **Private npm registry** (si es necesario)
- [ ] **Container image scanning**:
  - [ ] Trivy
  - [ ] Snyk Container
  - [ ] AWS ECR scanning
- [ ] **SBOM** (Software Bill of Materials)

### 5.3 Deployment

- [ ] **Secrets inyectados** en runtime (no hardcoded)
- [ ] **Immutable infrastructure**
- [ ] **Blue-Green deployment** (rollback fácil)
- [ ] **Smoke tests** post-deployment
- [ ] **DAST** (Dynamic Application Security Testing):
  - [ ] OWASP ZAP
  - [ ] Burp Suite
- [ ] **Penetration testing** periódico

---

## 6. Seguridad Operacional

### 6.1 Monitoring & Logging

- [ ] **Centralized logging** (ELK, Splunk, CloudWatch)
- [ ] **Log retention** (compliance requirements):
  - [ ] ERROR/FATAL: 90 días
  - [ ] WARN: 30 días
  - [ ] INFO: 7 días
- [ ] **Structured logging** (JSON)
- [ ] **Correlation IDs** para tracing
- [ ] **Sensitive data** NO en logs (passwords, tokens, PII)
- [ ] **Immutable logs** (WORM storage)
- [ ] **Log tampering** detection

### 6.2 Security Monitoring

- [ ] **SIEM** (Security Information and Event Management):
  - [ ] Splunk
  - [ ] AWS Security Hub
  - [ ] Azure Sentinel
- [ ] **IDS/IPS** (Intrusion Detection/Prevention)
- [ ] **File Integrity Monitoring** (FIM)
- [ ] **Anomaly detection** (ML-based)
- [ ] **Security alerts**:
  - [ ] Multiple failed logins
  - [ ] Unusual API usage
  - [ ] Privilege escalation attempts
  - [ ] Data exfiltration patterns

### 6.3 Incident Response

- [ ] **Incident Response Plan** documentado
- [ ] **Runbooks** para incidentes comunes
- [ ] **On-call rotation** definida
- [ ] **Communication plan** (stakeholders)
- [ ] **Forensics** capabilities
- [ ] **Post-mortem** process

### 6.4 Backup & Disaster Recovery

- [ ] **Automated backups** (daily)
- [ ] **Backup testing** (restore drill mensual)
- [ ] **Off-site backups** (different region)
- [ ] **RPO** (Recovery Point Objective) definido
- [ ] **RTO** (Recovery Time Objective) definido
- [ ] **Disaster Recovery** plan documentado
- [ ] **Failover** testing

---

## 7. Compliance & Legal

### 7.1 GDPR (EU)

- [ ] **Consentimiento explícito** para procesamiento
- [ ] **Privacy Policy** publicada
- [ ] **Cookie consent** banner
- [ ] **Derecho al olvido** (delete account)
- [ ] **Derecho de acceso** (export data)
- [ ] **Derecho de rectificación** (edit data)
- [ ] **Data minimization**
- [ ] **Privacy by design**
- [ ] **DPO** (Data Protection Officer) asignado
- [ ] **DPIA** (Data Protection Impact Assessment)
- [ ] **Breach notification** (72 horas)

### 7.2 PCI-DSS (Payments)

- [ ] **SAQ** (Self-Assessment Questionnaire) completado
- [ ] **AOC** (Attestation of Compliance)
- [ ] **Quarterly scans** (ASV)
- [ ] **Annual penetration testing**
- [ ] **Network segmentation**
- [ ] **No almacenar CVV**
- [ ] **Tokenización** de PANs
- [ ] **Encryption** of cardholder data

### 7.3 HIPAA (Healthcare)

- [ ] **BAA** con proveedores
- [ ] **PHI encryption**
- [ ] **Access controls** estrictos
- [ ] **Audit logs** completos
- [ ] **Risk assessment** anual
- [ ] **Training** del personal
- [ ] **Breach notification** procedures

### 7.4 SOC 2

- [ ] **Type I** (design de controles)
- [ ] **Type II** (efectividad de controles)
- [ ] **Trust Service Criteria**:
  - [ ] Security
  - [ ] Availability
  - [ ] Processing Integrity
  - [ ] Confidentiality
  - [ ] Privacy

---

## 8. Security Testing

### 8.1 Automated Testing

- [ ] **Unit tests** con casos de seguridad
- [ ] **SAST** en CI/CD
- [ ] **DAST** en staging
- [ ] **Dependency scanning** continuo
- [ ] **Container scanning** pre-deploy
- [ ] **Infrastructure scanning** (Terraform, CloudFormation)

### 8.2 Manual Testing

- [ ] **Code review** con foco en seguridad
- [ ] **Penetration testing** anual (mínimo)
- [ ] **Security audit** por terceros
- [ ] **Red team** exercises

### 8.3 Bug Bounty

- [ ] **Programa de bug bounty** (HackerOne, Bugcrowd)
- [ ] **Responsible disclosure** policy
- [ ] **Reward tiers** definidos

---

## 9. Security Training

- [ ] **Developer security training** (OWASP Top 10)
- [ ] **Phishing awareness** training
- [ ] **Social engineering** awareness
- [ ] **Secure coding** guidelines
- [ ] **Security champions** program

---

## 10. Checklist por Severity

### 🔴 CRÍTICO (Blocker para producción)

- [ ] Encryption en tránsito (TLS)
- [ ] Encryption en reposo (DB, S3)
- [ ] Password hashing seguro (bcrypt, Argon2)
- [ ] SQL Injection prevention
- [ ] XSS prevention
- [ ] Authentication & Authorization
- [ ] Secrets NO en código
- [ ] Firewall configurado
- [ ] HTTPS only

### 🟡 ALTO (Debe implementarse pronto)

- [ ] MFA para admin
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Input validation completa
- [ ] Security headers
- [ ] Audit logging
- [ ] Vulnerability scanning
- [ ] Backup automáticos

### 🟢 MEDIO (Mejora continua)

- [ ] WAF
- [ ] DDoS protection
- [ ] SIEM
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] Security training
- [ ] Incident response plan

---

**Última actualización:** 2025-11-07
**Versión:** 1.0
**Método ZNS - Security Checklist**
