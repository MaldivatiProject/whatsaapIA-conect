# 🔍 Agente de Auditoría Técnica Integral - ZNS v2.0

## 📋 Descripción General

El **Agente de Auditoría Técnica Integral** es un sistema completo de auditoría de nivel senior que evalúa proyectos de software en 7 dimensiones críticas:

1. 🛡️ **Seguridad** - Vulnerabilidades, OWASP Top 10, compliance
2. 🏗️ **Arquitectura** - Patrones, diseño, escalabilidad
3. 💎 **Calidad de Código** - Complejidad, duplicación, mantenibilidad
4. 🎨 **Patrones de Diseño** - SOLID, GoF patterns, best practices
5. ⏱️ **Obsolescencia** - Deuda técnica, tecnologías EOL, CVEs
6. ⚡ **Performance** - Optimización, cuellos de botella
7. 🧪 **Testing & DevOps** - Cobertura, CI/CD, observabilidad

---

## 🎯 Objetivos del Agente

- ✅ Proporcionar **evaluación objetiva** del estado técnico del proyecto
- ✅ Identificar **riesgos críticos** que impiden paso a producción
- ✅ Generar **roadmap priorizado** de remediación
- ✅ Establecer **baseline de calidad** para mejora continua
- ✅ Documentar **decisiones arquitectónicas** y deuda técnica

---

## 📁 Estructura de Carpetas

```
02-agents/5.audit_comprehensive/
│
├── README.md                                    # Este archivo
├── prompt-maestro-auditoria.md                  # Prompt principal orquestador
│
├── Prompts Individuales de Auditoría:
├── prompt-auditoria-seguridad.md                # Seguridad (CRÍTICO - 3h)
├── prompt-auditoria-arquitectura.md             # Arquitectura (ALTO - 3h)
├── prompt-auditoria-calidad-codigo.md           # Calidad (MEDIO - 4h)
└── prompts-auditoria-complementarios.md         # Patrones, Performance, Obsolescencia, Testing (6h)

05-deliverables/templates/
├── plantilla-resumen-ejecutivo.md               # Para stakeholders no técnicos
├── plantilla-roadmap-remediacion.md             # Plan de acción detallado
├── plantilla-matriz-riesgos.xlsx                # (Crear según necesidad)
└── plantilla-informe-tecnico.md                 # (Crear según necesidad)
```

---

## 🚀 Cómo Usar Este Agente

### Paso 1: Preparación (30 minutos)

**1.1. Verificar Acceso**
```bash
# Acceder al código fuente
cd "d:\Documents\2.maldivati_workspace\1.filiales\02.mitoga_auditoria\ZES-METHOD\00-raw-inputs\code"

# Verificar acceso a documentación consolidada
ls "d:\Documents\2.maldivati_workspace\1.filiales\02.mitoga_auditoria\ZES-METHOD\01-context-consolidated"
```

**1.2. Crear Carpeta de Salida**
```powershell
$fecha = Get-Date -Format "yyyy-MM-dd"
$outputDir = "d:\Documents\2.maldivati_workspace\1.filiales\02.mitoga_auditoria\ZES-METHOD\05-deliverables\audit-report-$fecha"
New-Item -ItemType Directory -Path $outputDir -Force
```

**1.3. Instalar Herramientas (si no están instaladas)**
```bash
# Java - Checkstyle, PMD
./gradlew checkstyleMain pmdMain

# JavaScript/TypeScript - ESLint
npm install -g eslint

# Seguridad - OWASP Dependency Check
./gradlew dependencyCheckAnalyze

# SonarQube (opcional, requiere servidor)
# sonar-scanner
```

---

### Paso 2: Ejecutar Auditorías (10-16 horas)

#### 2.1. Auditoría de Seguridad (PRIORIDAD 1) - 3 horas

**Prompt:** `prompt-auditoria-seguridad.md`

**Ejecutar:**
```bash
# 1. Escaneo de vulnerabilidades
cd 00-raw-inputs/code/1-backend/2.mitoga_project
./gradlew dependencyCheckAnalyze

cd ../../2-frontend/apps/web/1.mitoga_web
npm audit --audit-level=moderate

# 2. Revisar configuración de seguridad
# - Spring Security config
# - JWT implementation
# - CORS configuration
# - Headers de seguridad

# 3. Buscar hardcoded secrets
grep -r "password\s*=\s*" --include="*.java" --include="*.properties"
grep -r "api[_-]key" --include="*.ts" --include="*.js"
```

**Salida:** `04-auditoria-seguridad.md`

---

#### 2.2. Auditoría de Obsolescencia (PRIORIDAD 2) - 2 horas

**Prompt:** `prompts-auditoria-complementarios.md` (sección Obsolescencia)

**Ejecutar:**
```bash
# 1. Verificar versiones
java -version
node --version
psql --version

# 2. Analizar dependencias desactualizadas
./gradlew dependencyUpdates  # Backend
npm outdated                 # Frontend

# 3. Buscar prácticas deprecated
grep -r "@Deprecated" src/
grep -r "deprecated" node_modules/ --include="package.json"
```

**Salida:** `05-auditoria-obsolescencia.md`

---

#### 2.3. Auditoría de Arquitectura (PRIORIDAD 3) - 3 horas

**Prompt:** `prompt-auditoria-arquitectura.md`

**Ejecutar:**
```bash
# 1. Analizar estructura de paquetes
tree src/ -L 3

# 2. Identificar patrón arquitectónico
# - Revisar separación de capas
# - Verificar SoC (Separation of Concerns)
# - Evaluar cohesión y acoplamiento

# 3. Documentar decisiones arquitectónicas
# - Crear ADRs faltantes
# - Generar diagramas C4
```

**Salida:** `01-auditoria-arquitectura.md`

---

#### 2.4. Auditoría de Calidad de Código (PRIORIDAD 4) - 4 horas

**Prompt:** `prompt-auditoria-calidad-codigo.md`

**Ejecutar:**
```bash
# 1. Análisis estático
./gradlew checkstyleMain pmdMain spotbugsMain

# 2. Cobertura de tests
./gradlew jacocoTestReport
# Ver: build/reports/jacoco/test/html/index.html

# 3. Complejidad ciclomática
# SonarQube o herramientas de IDE

# 4. Duplicación de código
# CPD (Copy/Paste Detector)
```

**Salida:** `02-auditoria-calidad-codigo.md`

---

#### 2.5. Auditorías Complementarias (PRIORIDAD 5) - 6 horas

**Prompt:** `prompts-auditoria-complementarios.md`

**Incluye:**
- Patrones de Diseño (2h)
- Performance (2h)
- Testing & DevOps (2h)

**Salida:**
- `03-auditoria-patrones-diseno.md`
- `06-auditoria-performance.md`
- `07-auditoria-testing-devops.md`

---

### Paso 3: Consolidación (2-3 horas)

#### 3.1. Generar Resumen Ejecutivo

**Usar plantilla:** `05-deliverables/templates/plantilla-resumen-ejecutivo.md`

**Contenido:**
- Calificación global: ___/100
- Top 5 hallazgos críticos
- Roadmap de alto nivel
- Estimación de esfuerzo
- Recomendaciones estratégicas

**Salida:** `00-executive-summary.md`

---

#### 3.2. Consolidar Matriz de Riesgos

**Formato Excel:**
| ID | Hallazgo | Severidad | Área | Impacto | Probabilidad | Riesgo | Esfuerzo | Responsable |
|----|----------|-----------|------|---------|--------------|--------|----------|-------------|
| H-SEC-C-001 | ... | Crítico | Seguridad | Alto | Alta | Crítico | 8h | Security Lead |

**Salida:** `08-matriz-riesgos-consolidada.xlsx`

---

#### 3.3. Crear Roadmap de Remediación

**Usar plantilla:** `05-deliverables/templates/plantilla-roadmap-remediacion.md`

**Organizar por:**
- Sprint 1-2 (Semanas 1-2): Críticos
- Sprint 3-4 (Semanas 3-4): Altos
- Sprint 5-12 (Meses 2-3): Medios
- Backlog: Bajos

**Salida:** `09-roadmap-remediacion.md`

---

#### 3.4. Generar Informe Técnico Completo

**Consolidar:**
- Todas las 7 auditorías individuales
- Anexar logs de herramientas
- Incluir evidencias (screenshots, código)
- Referencias y estándares

**Salida:** `10-informe-tecnico-completo.md` (80-120 páginas)

---

### Paso 4: Revisión y Entrega (1 hora)

**Checklist de Completitud:**
- [ ] 7 auditorías individuales completadas
- [ ] Resumen ejecutivo generado (2-3 páginas)
- [ ] Matriz de riesgos consolidada (Excel)
- [ ] Roadmap de remediación detallado
- [ ] Informe técnico completo (80-120 págs)
- [ ] Mínimo 30 hallazgos documentados
- [ ] Calificación global calculada
- [ ] Todos los hallazgos críticos tienen plan de acción
- [ ] Documentos revisados y sin inconsistencias

---

## 📊 Outputs Esperados

### Documentos Generados (12 archivos)

```
05-deliverables/audit-report-YYYY-MM-DD/
│
├── 00-executive-summary.md                 # ⭐ Para stakeholders
├── 01-auditoria-arquitectura.md
├── 02-auditoria-calidad-codigo.md
├── 03-auditoria-patrones-diseno.md
├── 04-auditoria-seguridad.md              # ⭐ CRÍTICO
├── 05-auditoria-obsolescencia.md
├── 06-auditoria-performance.md
├── 07-auditoria-testing-devops.md
├── 08-matriz-riesgos-consolidada.xlsx     # ⭐ Para tracking
├── 09-roadmap-remediacion.md              # ⭐ Plan de acción
├── 10-informe-tecnico-completo.md         # ⭐ Documento maestro
├── 11-checklist-compliance.xlsx
└── 12-metricas-y-kpis.xlsx
```

---

## 🎯 Criterios de Calificación

### Escala Global

| Calificación | Rango | Interpretación |
|--------------|-------|----------------|
| A - Excelente | 90-100 | ✅ Listo para producción enterprise |
| B - Bueno | 75-89 | ✅ Mejoras menores antes de producción |
| C - Aceptable | 60-74 | ⚠️ Requiere mejoras planificadas |
| D - Deficiente | 40-59 | 🔴 Remediación urgente requerida |
| F - Crítico | 0-39 | 🔴 No apto para producción |

### Ponderación por Área

| Área | Peso | Justificación |
|------|------|---------------|
| Seguridad | 25% | Crítico - Protección de datos y usuarios |
| Calidad Código | 20% | Mantenibilidad a largo plazo |
| Arquitectura | 15% | Base para escalabilidad |
| Obsolescencia | 15% | Riesgo técnico y CVEs |
| Patrones Diseño | 10% | Calidad estructural |
| Performance | 10% | Experiencia de usuario |
| Testing/DevOps | 5% | Confianza en despliegues |

---

## 🚦 Niveles de Severidad

### 🔴 CRÍTICO (Bloqueante)
- **SLA:** < 7 días
- **Ejemplos:**
  - Vulnerabilidades explotables (CVSS > 7.0)
  - Exposición de credenciales
  - Pérdida de datos potencial
  - Incumplimiento legal

### 🟠 ALTO (Importante)
- **SLA:** < 30 días
- **Ejemplos:**
  - Vulnerabilidades moderadas (CVSS 4.0-6.9)
  - Performance crítico (> 5s)
  - Deuda técnica bloqueante
  - Dependencias EOL próximo

### 🟡 MEDIO (Moderado)
- **SLA:** < 90 días
- **Ejemplos:**
  - Code smells persistentes
  - Falta de tests
  - Documentación incompleta
  - Optimizaciones de performance

### 🟢 BAJO (Mejora)
- **SLA:** Backlog
- **Ejemplos:**
  - Refactorings cosméticos
  - Actualizaciones menores
  - Mejoras de legibilidad

---

## 🛠️ Herramientas Recomendadas

### Seguridad
- ✅ OWASP Dependency Check
- ✅ Snyk
- ✅ npm audit / yarn audit
- ✅ Trivy (Docker images)
- ⚠️ OWASP ZAP (requiere setup)

### Calidad
- ✅ SonarQube/SonarCloud
- ✅ Checkstyle (Java)
- ✅ ESLint (TypeScript/JavaScript)
- ✅ PMD, SpotBugs

### Cobertura
- ✅ JaCoCo (Java)
- ✅ Jest (JavaScript)
- ⚠️ Codecov (requiere cuenta)

### Performance
- ✅ Lighthouse (web)
- ⚠️ k6, JMeter (load testing)
- ⚠️ Clinic.js (profiling Node.js)

---

## 📞 Soporte y Contacto

### Documentación Adicional

- **Método ZNS v2.0:** `README.md` principal del proyecto
- **Fase 0 - Consolidación:** `02-agents/0.consolidation_context/`
- **Fase 1 - Análisis Obsolescencia:** `02-agents/1.obsolescence_analysis/`
- **Fase 2 - Arquitectura:** `02-agents/2.definition_of_architecture/`

### Preguntas Frecuentes

**Q: ¿Cuánto tiempo toma una auditoría completa?**  
A: 12-20 horas dependiendo del tamaño del proyecto.

**Q: ¿Puedo ejecutar solo algunas auditorías?**  
A: Sí, pero se recomienda al menos Seguridad y Obsolescencia como mínimo.

**Q: ¿Cada cuánto debo auditar?**  
A: Auditoría completa cada 6 meses, parcial (seguridad) cada 3 meses.

**Q: ¿Los hallazgos son automáticos o requieren análisis?**  
A: Híbrido - herramientas automáticas + análisis experto manual.

---

## 📚 Referencias

### Estándares
- **OWASP Top 10 (2021):** https://owasp.org/Top10/
- **ISO/IEC 25010:** Software Quality Model
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework

### Guías de Estilo
- **Google Java Style Guide:** https://google.github.io/styleguide/javaguide.html
- **Airbnb JavaScript Style Guide:** https://github.com/airbnb/javascript

### Herramientas
- **SonarQube:** https://www.sonarqube.org/
- **OWASP Dependency Check:** https://jeremylong.github.io/DependencyCheck/
- **Snyk:** https://snyk.io/

---

## ✅ Checklist Pre-Inicio

Antes de comenzar la auditoría, verificar:

- [ ] Acceso completo al repositorio del código fuente
- [ ] Documentación consolidada generada (Fase 0 - ZNS)
- [ ] Credenciales para entornos de prueba (opcional)
- [ ] Herramientas de análisis instaladas
  - [ ] Java JDK (para proyectos Java)
  - [ ] Node.js (para proyectos JavaScript/TypeScript)
  - [ ] Gradle/Maven
  - [ ] npm/yarn
- [ ] Carpeta de salida creada en `05-deliverables/`
- [ ] Tiempo asignado (12-20 horas) bloqueado en calendario
- [ ] Stakeholders informados sobre auditoría en curso

---

## 🎬 Inicio Rápido

**Para comenzar ahora:**

1. Leer `prompt-maestro-auditoria.md`
2. Ejecutar `prompt-auditoria-seguridad.md` (PRIORIDAD 1)
3. Continuar con orden sugerido en maestro
4. Usar plantillas en `05-deliverables/templates/`

---

## 📄 Licencia y Uso

Este agente es parte del **Método ZNS v2.0** para auditoría y modernización de aplicaciones.

**Autor:** GitHub Copilot - Senior Technical Auditor  
**Versión:** 1.0.0  
**Fecha de Creación:** 8 de noviembre de 2025  
**Última Actualización:** 8 de noviembre de 2025

---

**¿Listo para auditar?**

👉 **Siguiente paso:** Abrir `prompt-maestro-auditoria.md` y seguir las instrucciones.

---

*Fin del README - Agente de Auditoría Técnica Integral*
