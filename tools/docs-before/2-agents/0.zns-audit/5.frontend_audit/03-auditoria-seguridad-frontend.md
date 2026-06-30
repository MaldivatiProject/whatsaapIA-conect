# Prompt: Auditoría de Seguridad Frontend

---

## 🎯 Objetivo

Identificar vulnerabilidades de seguridad en el código frontend según OWASP Top 10 para aplicaciones web, incluyendo XSS, CSRF, exposición de secrets, dependencias vulnerables y configuraciones inseguras.

---

## 📋 Alcance - OWASP Top 10 Frontend

### 1. A03:2021 – Injection (XSS)
- **Cross-Site Scripting (XSS)**
  - Stored XSS
  - Reflected XSS
  - DOM-based XSS
- **dangerouslySetInnerHTML** sin sanitización
- **eval()** y construcción dinámica de código

### 2. A01:2021 – Broken Access Control
- **Autenticación client-side**
  - Tokens en localStorage (robo via XSS)
  - JWT sin validación server-side
  - Session management inseguro

### 3. A05:2021 – Security Misconfiguration
- **CORS mal configurado**
- **CSP ausente o débil**
- **X-Frame-Options**
- **Secrets hardcodeados**

### 4. A06:2021 – Vulnerable Components
- **Dependencias con CVEs**
- **npm audit** critical/high
- **Versiones desactualizadas**

### 5. A08:2021 – Software & Data Integrity
- **SRI (Subresource Integrity)** para CDN
- **HTTPS only**
- **No cache de datos sensibles**

---

## 🔍 Metodología

### Paso 1: Scanning Automático

```bash
# npm audit
npm audit --production
npm audit fix --force

# Snyk
npx snyk test
npx snyk monitor

# OWASP Dependency-Check
dependency-check --project "Frontend" --scan ./

# Retire.js (JS vulnerabilities)
npm install -g retire
retire --path ./src --outputformat json
```

### Paso 2: Análisis de Código

**Buscar Secrets Hardcodeados:**
```bash
# gitleaks
gitleaks detect --source . --verbose

# truffleHog
trufflehog git file://. --only-verified
```

**Buscar XSS potenciales:**
```bash
grep -r "dangerouslySetInnerHTML" src/
grep -r "innerHTML\|outerHTML" src/
grep -r "eval\(" src/
grep -r "Function(" src/
```

### Paso 3: Headers HTTP

```bash
# Verificar Security Headers
curl -I https://[URL]

# O con herramienta
npm install -g observatory-cli
observatory [URL]
```

**Headers críticos:**
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security`
- `Referrer-Policy`

---

## 📊 Hallazgos Críticos

### 🔴 H-FE-S-C-001: API Keys Hardcodeadas

```javascript
// ❌ CRÍTICO
const API_KEY = "sk-proj-abc123xyz789";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB1234567890",
  authDomain: "app.firebaseapp.com"
};

// ✅ CORRECTO
const API_KEY = process.env.REACT_APP_API_KEY;
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_DOMAIN
};
```

**Esfuerzo**: 2h  
**Prioridad**: 🔴 1  
**CVE Risk**: CRÍTICO

---

### 🔴 H-FE-S-C-002: XSS via dangerouslySetInnerHTML

```javascript
// ❌ CRÍTICO - XSS vulnerable
<div dangerouslySetInnerHTML={{__html: userComment}} />

// ✅ CORRECTO - Sanitizar
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userComment)
}} />
```

**Esfuerzo**: 4h  
**Prioridad**: 🔴 1

---

### 🟠 H-FE-S-H-001: JWT en localStorage

```javascript
// ❌ ALTO RIESGO - XSS puede robar token
localStorage.setItem('token', jwt);

// ✅ MEJOR - HttpOnly cookie (server-side)
// Backend:
res.cookie('token', jwt, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// Frontend: Cookie automática, no accesible via JS
```

**Esfuerzo**: 6h  
**Prioridad**: 🟠 2

---

## 📋 Template de Informe

```markdown
# Auditoría de Seguridad Frontend - [PROYECTO]

## 📊 Resumen

**Score**: XX/20 puntos  
**CVEs Críticos**: X  
**CVEs Altos**: X  
**Secrets expuestos**: X

## 🔴 Hallazgos Críticos

### 1. [H-FE-S-C-001] API Keys en Código
- **Ubicación**: `src/config/api.js:12`
- **Secrets**: 3 API keys, 2 tokens
- **Impacto**: Acceso no autorizado
- **Remediación**: Variables de entorno

### 2. [H-FE-S-C-002] 5 XSS Vulnerabilities
- **Ubicación**: `Comment.jsx`, `Profile.jsx`
- **Vector**: dangerouslySetInnerHTML
- **Remediación**: DOMPurify sanitization

## 🟠 Dependencias Vulnerables

| Paquete | Versión | CVE | Severidad | Fix |
|---------|---------|-----|-----------|-----|
| react-scripts | 4.0.3 | CVE-2021-44906 | HIGH | 5.0.1 |
| axios | 0.21.1 | CVE-2021-3749 | MODERATE | 0.21.2 |

## 🛠️ Roadmap

### Fase 1: Críticos (1 semana)
- [ ] Remover secrets hardcodeados (2h)
- [ ] Sanitizar XSS (4h)
- [ ] npm audit fix (2h)

### Fase 2: Altos (2 semanas)
- [ ] Implementar CSP headers (4h)
- [ ] Migrar tokens a httpOnly cookies (6h)
- [ ] Actualizar dependencias (4h)

---
*Auditoría completada: [Fecha]*
```

---

**Versión**: 1.0  
**Actualizado**: Noviembre 2025
