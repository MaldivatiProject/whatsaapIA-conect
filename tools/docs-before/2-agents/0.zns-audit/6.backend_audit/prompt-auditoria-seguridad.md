# Prompt - Auditoría de Seguridad

---
**Método:** ZNS  
**Versión:** 1.2  
**Prompt Version:** 1.0.0  
**Área:** Seguridad y Compliance  
**Prioridad:** 🔴 CRÍTICA  
**Duración Estimada:** 3 horas  
**Dependencias:** Acceso a código fuente, dependencias declaradas  
**Salida:** `05-deliverables/audit-report-{fecha}/04-auditoria-seguridad.md`

---

## 🎯 Objetivo

Evaluar la **postura de seguridad** del proyecto MI-TOGA, identificando vulnerabilidades, malas prácticas y riesgos de seguridad que puedan comprometer la confidencialidad, integridad o disponibilidad de la aplicación y sus datos.

---

## 👔 Perfil del Auditor

Rol: **Senior Security Engineer & Penetration Tester**

Experiencia en:
- Auditorías de seguridad de aplicaciones web (OWASP Top 10)
- Análisis de vulnerabilidades y pentesting
- Secure SDLC y threat modeling
- Compliance (GDPR, PCI-DSS, ISO 27001, Ley Habeas Data Colombia)
- Criptografía aplicada y gestión de secretos
- Autenticación y autorización avanzada (OAuth 2.0, OIDC, JWT)

---

## 🔍 Áreas de Evaluación

### 1. OWASP Top 10 (2021)

#### A01: Broken Access Control
**Verificar:**
- [ ] Validación de permisos en todos los endpoints de API
- [ ] Prevención de IDOR (Insecure Direct Object References)
- [ ] No exposición de IDs predecibles o secuenciales
- [ ] Autorización basada en roles (RBAC) implementada correctamente
- [ ] No bypass de autenticación mediante manipulación de URLs
- [ ] Protección contra privilege escalation

**Hallazgos comunes a buscar:**
```java
// ❌ VULNERABLE: Sin validación de propiedad
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userService.findById(id); // Cualquiera puede ver cualquier usuario
}

// ✅ CORRECTO: Validación de permisos
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id, Authentication auth) {
    User currentUser = (User) auth.getPrincipal();
    if (!currentUser.getId().equals(id) && !currentUser.hasRole("ADMIN")) {
        throw new AccessDeniedException("No autorizado");
    }
    return userService.findById(id);
}
```

---

#### A02: Cryptographic Failures
**Verificar:**
- [ ] Uso de TLS 1.3 o TLS 1.2 mínimo (no TLS 1.0/1.1)
- [ ] Cifrado de datos sensibles en reposo (bcrypt para passwords, AES-256 para PII)
- [ ] No almacenamiento de passwords en texto plano
- [ ] Uso de algoritmos de hash seguros (bcrypt, Argon2, NO MD5/SHA1)
- [ ] Gestión segura de secretos (no hardcoded en código)
- [ ] Rotación de secretos y llaves de cifrado

**Buscar en código:**
```bash
# Buscar passwords hardcoded
grep -r "password\s*=\s*['\"]" --include="*.java" --include="*.ts" --include="*.js"

# Buscar uso de MD5 o SHA1
grep -r "MessageDigest.getInstance(\"MD5\")" --include="*.java"
grep -r "MessageDigest.getInstance(\"SHA-1\")" --include="*.java"

# Buscar credenciales hardcoded
grep -ri "api[_-]key\|apikey\|api[_-]secret" --include="*.java" --include="*.properties" --include="*.yml"
```

---

#### A03: Injection
**Verificar:**
- [ ] Uso de consultas parametrizadas (PreparedStatement, NO string concatenation)
- [ ] Validación y sanitización de inputs
- [ ] Uso de ORM correctamente (JPA/Hibernate sin SQL nativo riesgoso)
- [ ] Protección contra Command Injection
- [ ] Validación de uploads de archivos (tipo, tamaño, contenido)
- [ ] Prevención de XSS (sanitización de HTML, uso de CSP)

**Ejemplos a buscar:**
```java
// ❌ SQL INJECTION VULNERABLE
String query = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);

// ✅ SEGURO: Consulta parametrizada
String query = "SELECT * FROM users WHERE username = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, username);
ResultSet rs = pstmt.executeQuery();

// ❌ XSS VULNERABLE (React sin escape)
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ SEGURO: React escapa por defecto
<div>{userInput}</div>
```

---

#### A04: Insecure Design
**Verificar:**
- [ ] Threat modeling realizado
- [ ] Principio de mínimo privilegio aplicado
- [ ] Defensa en profundidad (múltiples capas de seguridad)
- [ ] Rate limiting en endpoints públicos
- [ ] Circuit breakers para llamadas externas
- [ ] Validación de lógica de negocio (no solo validación técnica)

---

#### A05: Security Misconfiguration
**Verificar:**
- [ ] No exposición de stack traces en producción
- [ ] Deshabilitado directory listing
- [ ] Headers de seguridad configurados (HSTS, X-Frame-Options, CSP, etc.)
- [ ] CORS configurado restrictivamente (no `Access-Control-Allow-Origin: *`)
- [ ] Deshabilitadas features innecesarias (debug mode, actuator sin auth)
- [ ] Configuración segura de cookies (HttpOnly, Secure, SameSite)
- [ ] No información sensible en logs

**Buscar en configuración:**
```yaml
# ❌ VULNERABLE: Spring Boot Actuator sin seguridad
management:
  endpoints:
    web:
      exposure:
        include: "*"

# ✅ SEGURO: Actuator protegido
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized
```

---

#### A06: Vulnerable and Outdated Components
**Verificar:**
- [ ] Ejecutar `npm audit` / `yarn audit` (Node.js)
- [ ] Ejecutar `mvn dependency-check:check` (Java)
- [ ] Revisar CVEs conocidos en dependencias
- [ ] Ninguna dependencia con severidad CRITICAL sin patch
- [ ] Plan de actualización de dependencias (renovate/dependabot)

**Comandos a ejecutar:**
```bash
# Backend Java
cd 00-raw-inputs/code/1-backend/2.mitoga_project
./gradlew dependencyCheckAnalyze

# Frontend Node.js
cd 00-raw-inputs/code/2-frontend/apps/web/1.mitoga_web
npm audit --audit-level=moderate
```

---

#### A07: Identification and Authentication Failures
**Verificar:**
- [ ] Multi-factor authentication (MFA) disponible
- [ ] Protección contra brute force (rate limiting, CAPTCHA)
- [ ] Session management seguro (timeouts, invalidación en logout)
- [ ] Políticas de passwords robustas (mínimo 8 caracteres, complejidad)
- [ ] No permitir passwords débiles comunes (top 10,000 passwords)
- [ ] Protección contra session fixation
- [ ] JWT tokens con expiración razonable (< 1 hora access token)

**Buscar en código:**
```java
// ❌ VULNERABLE: JWT sin expiración
Jwts.builder()
    .setSubject(username)
    .signWith(key)
    .compact();

// ✅ SEGURO: JWT con expiración de 15 minutos
Jwts.builder()
    .setSubject(username)
    .setIssuedAt(new Date())
    .setExpiration(new Date(System.currentTimeMillis() + 900000)) // 15 min
    .signWith(key)
    .compact();
```

---

#### A08: Software and Data Integrity Failures
**Verificar:**
- [ ] Validación de integridad en CI/CD pipeline
- [ ] Uso de checksums/hashes para verificar dependencias
- [ ] No deserialización insegura de objetos
- [ ] Firmado de artefactos de build
- [ ] Protección contra supply chain attacks

---

#### A09: Security Logging and Monitoring Failures
**Verificar:**
- [ ] Logging de eventos de seguridad (login, logout, acceso denegado)
- [ ] No logging de información sensible (passwords, tokens, PII)
- [ ] Alertas configuradas para eventos anómalos
- [ ] Logs centralizados y protegidos
- [ ] Retention policy de logs (mínimo 90 días)
- [ ] Monitoreo de intentos de acceso no autorizado

---

#### A10: Server-Side Request Forgery (SSRF)
**Verificar:**
- [ ] Validación de URLs en llamadas HTTP del backend
- [ ] Whitelist de dominios permitidos
- [ ] No seguir redirects automáticamente en llamadas server-side
- [ ] Protección contra localhost bypass (127.0.0.1, ::1)

---

### 2. Autenticación y Autorización

#### JWT Security
**Verificar:**
- [ ] Algoritmo de firma seguro (HS256 mínimo, RS256 recomendado)
- [ ] Secret key con entropía suficiente (> 256 bits)
- [ ] Validación de firma en TODOS los endpoints protegidos
- [ ] Claims mínimos necesarios (no PII innecesaria)
- [ ] Refresh token implementado correctamente (rotación)
- [ ] Token revocation mechanism (blacklist o whitelist)

---

#### Spring Security Configuration
**Revisar:**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            // ✅ CSRF protection habilitada
            .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
            
            // ✅ CORS restrictivo
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // ✅ Autorización granular
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            
            // ✅ Session management seguro
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .maximumSessions(1)
                .maxSessionsPreventsLogin(true)
            )
            .build();
    }
}
```

---

### 3. Protección de Datos Sensibles

#### Datos en Reposo
**Verificar:**
- [ ] Passwords hasheadas con bcrypt (cost factor >= 10)
- [ ] PII cifrada en base de datos (AES-256)
- [ ] Tokens de sesión almacenados de forma segura
- [ ] Backups cifrados

#### Datos en Tránsito
**Verificar:**
- [ ] TLS configurado en todos los endpoints
- [ ] Redirección automática HTTP → HTTPS
- [ ] HSTS header habilitado
- [ ] Certificado SSL válido (no self-signed en producción)

---

### 4. Headers de Seguridad HTTP

**Verificar presencia y configuración:**

```http
✅ Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: DENY
✅ X-XSS-Protection: 1; mode=block
✅ Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Permissions-Policy: geolocation=(), camera=(), microphone=()
```

**Configuración en Spring Boot:**
```java
http.headers(headers -> headers
    .contentSecurityPolicy("default-src 'self'")
    .referrerPolicy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
    .permissionsPolicy(policy -> policy.policy("geolocation=(), camera=(), microphone=()"))
);
```

---

### 5. Compliance y Regulaciones

#### Ley 1581 de 2012 - Habeas Data (Colombia)
**Verificar:**
- [ ] Política de privacidad clara y accesible
- [ ] Obtención de consentimiento explícito para datos personales
- [ ] Mecanismo de ejercicio de derechos (acceso, rectificación, cancelación)
- [ ] Notificación de violaciones de datos (< 48 horas)
- [ ] Transferencia de datos solo con consentimiento

#### GDPR (si hay usuarios en Europa)
**Verificar:**
- [ ] Right to be forgotten implementado
- [ ] Data portability (exportar datos en formato legible)
- [ ] Privacy by design y by default
- [ ] DPO (Data Protection Officer) designado

---

### 6. Seguridad en Dependencias

**Ejecutar análisis:**

```bash
# Java - OWASP Dependency Check
./gradlew dependencyCheckAnalyze

# Node.js - npm audit
npm audit --audit-level=high

# Snyk (requiere cuenta)
snyk test

# Trivy (Docker images)
trivy image mitoga/backend:latest
```

**Revisar:**
- [ ] CVEs con CVSS >= 7.0 (CRÍTICO)
- [ ] CVEs con CVSS 4.0-6.9 (ALTO)
- [ ] Dependencias deprecated
- [ ] Licencias incompatibles

---

## 📊 Plantilla de Hallazgo de Seguridad

```markdown
### H-SEC-{SEVERIDAD}-{NÚMERO}: {Título del Hallazgo}

**Severidad:** 🔴 CRÍTICO / 🟠 ALTO / 🟡 MEDIO / 🟢 BAJO  
**CVSS Score:** {0.0-10.0}  
**CWE ID:** CWE-{número} - {nombre}  
**OWASP:** A{número} - {categoría}

**Componente Afectado:**
- Archivo: `{ruta/archivo.java}`
- Línea: {número}
- Función/Método: `{nombre()}`

**Descripción:**
{Descripción detallada de la vulnerabilidad}

**Evidencia:**
```{lenguaje}
// Código vulnerable
{snippet de código}
```

**Explotabilidad:**
- Complejidad de ataque: {Baja/Media/Alta}
- Privilegios requeridos: {Ninguno/Bajo/Alto}
- Interacción de usuario: {Requerida/No requerida}

**Impacto:**
- Confidencialidad: {Ninguno/Bajo/Alto/Crítico}
- Integridad: {Ninguno/Bajo/Alto/Crítico}
- Disponibilidad: {Ninguno/Bajo/Alto/Crítico}

**Escenario de Ataque:**
{Descripción paso a paso de cómo un atacante podría explotar esto}

**Recomendación:**
```{lenguaje}
// Código corregido
{snippet de código seguro}
```

**Referencias:**
- OWASP: {link}
- CWE: {link}
- CVE: CVE-{año}-{número} (si aplica)

**Esfuerzo de Remediación:** {horas/días}  
**Prioridad:** {1-5}  
**Responsable Sugerido:** {rol}  
**Fecha Límite:** {fecha}
```

---

## 🎯 Checklist de Seguridad

### Autenticación y Sesiones
- [ ] MFA disponible para roles administrativos
- [ ] Timeout de sesión configurado (< 30 minutos inactividad)
- [ ] Logout invalidation efectiva
- [ ] Password policy robusta (min 8 chars, complejidad)
- [ ] Protección contra brute force (rate limiting)
- [ ] CAPTCHA en formularios de login
- [ ] Account lockout después de N intentos fallidos

### Autorización
- [ ] RBAC implementado consistentemente
- [ ] Principio de mínimo privilegio
- [ ] Validación de permisos en backend (no solo frontend)
- [ ] No IDOR vulnerabilities
- [ ] Protección contra privilege escalation

### Datos
- [ ] Passwords con bcrypt (cost >= 10)
- [ ] PII cifrada en reposo (AES-256)
- [ ] TLS 1.2+ en tránsito
- [ ] No datos sensibles en logs
- [ ] No datos sensibles en URLs

### Configuración
- [ ] Debug mode deshabilitado en producción
- [ ] Stack traces no expuestos
- [ ] Actuator/endpoints admin protegidos
- [ ] CORS restrictivo (no wildcard)
- [ ] Headers de seguridad configurados

### Dependencias
- [ ] Sin CVEs críticos sin parchear
- [ ] Dependencias actualizadas (< 6 meses)
- [ ] npm audit / dependency-check ejecutado
- [ ] Renovate/Dependabot configurado

### Infraestructura
- [ ] Secretos en vault/secrets manager (no hardcoded)
- [ ] Variables de entorno para configuración sensible
- [ ] Backups cifrados
- [ ] Logs centralizados y protegidos

### Compliance
- [ ] Política de privacidad publicada
- [ ] Consentimiento de usuarios documentado
- [ ] Mecanismo de ejercicio de derechos (ARCO)
- [ ] Registro de tratamiento de datos

---

## 📈 Métricas de Seguridad

| Métrica | Objetivo | Crítico Si |
|---------|----------|------------|
| CVEs críticos no parcheados | 0 | > 0 |
| CVEs altos no parcheados | < 3 | > 10 |
| Dependencias outdated | < 10% | > 30% |
| Tiempo de parche (días) | < 7 | > 30 |
| Cobertura de análisis SAST | 100% | < 80% |
| False positives rate | < 15% | > 40% |

---

## 🚀 Entrega

**Documento:** `04-auditoria-seguridad.md`

**Secciones requeridas:**
1. Resumen Ejecutivo (calificación, hallazgos críticos)
2. Metodología y Herramientas
3. Hallazgos Críticos (detallados)
4. Hallazgos Altos
5. Hallazgos Medios
6. Hallazgos Bajos
7. Checklist de Compliance
8. Roadmap de Remediación
9. Anexos (logs de herramientas)

---

**Próximo Paso:** Ejecutar `prompt-auditoria-obsolescencia.md`
