# 🚀 SKILL: CI/CD EXPERT — PIPELINES, DOCKER, K8S & GITOPS

**skill_id**: cicd-expert  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: devops / ci-cd  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior  
**dependencias**: ninguna (skill autónoma)  
**referencia_stack**: Kotlin 2.x / Java 21 / Spring Boot 3.4.x / Gradle Kotlin DSL / Docker / GitHub Actions / Kubernetes / ArgoCD

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento profundo y los patrones canónicos para diseñar, implementar y revisar pipelines CI/CD de nivel production-grade para aplicaciones backend basadas en JVM (Kotlin/Java Spring Boot) y .NET Core. Cubre desde el build reproducible hasta el despliegue GitOps en Kubernetes, con quality gates (tests, cobertura, ArchUnit, lint), seguridad de imágenes (Trivy, OWASP Dependency Check) y gestión de secretos correcta.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Pipeline como código versionado** — El pipeline (`.github/workflows/*.yml`, `.gitlab-ci.yml`) vive en el mismo repositorio que el código. Ningún paso manual no reproducible.

2. **Fail-fast on quality gates** — El pipeline falla cuanto antes: lint → unit tests → integration tests → coverage threshold → ArchUnit → security scan → Docker build+scan → deploy. Cada etapa solo se ejecuta si la anterior pasa.

3. **Cero secretos en código o variables de entorno no protegidas** — Todos los secretos (DB passwords, JWT secret, Docker registry password) se inyectan desde el gestor de secretos del CI (GitHub Secrets, HashiCorp Vault) en tiempo de ejecución. **Nunca** en `application.properties` commiteado, nunca en Dockerfile `ENV`.

4. **Docker multi-stage build obligatorio** — La imagen final solo contiene el runtime (JRE / .NET runtime), nunca el JDK/SDK ni el código fuente. El usuario del contenedor es **non-root**.

5. **Coverage threshold como gate bloqueante** — Un PR que reduce la cobertura por debajo del umbral definido **no puede fusionarse**. El valor mínimo recomendado: 80% líneas, 75% ramas.

6. **ArchUnit en CI** — Las reglas de arquitectura hexagonal (el dominio no importa Spring/JPA) se verifican en cada ejecución del pipeline. Un violation → build rojo.

7. **Inmutabilidad de imágenes** — Las imágenes Docker se etiquetan con el SHA del commit (`sha-${GITHUB_SHA::8}`), nunca se sobreescribe una imagen existente. `latest` solo se apunta en `main`/`master`.

8. **GitOps con ArgoCD** — El pipeline CI produce y publica la imagen; el pipeline CD actualiza el manifiesto en un repositorio de infra (GitOps repo) y ArgoCD sincroniza el estado en Kubernetes. **El pipeline CI nunca hace `kubectl apply` directamente en producción.**

---

## 1️⃣ GITHUB ACTIONS — KOTLIN SPRING BOOT (Stack ZNS Zenapses)

### Patrón canónico: CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  JAVA_VERSION: '21'
  IMAGE_NAME: ghcr.io/${{ github.repository_owner }}/zns-aibos

jobs:
  # ─── Job 1: Build, Tests y Quality Gates ──────────────────────────────────
  build-and-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK ${{ env.JAVA_VERSION }}
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: temurin  # ← eclipse-temurin, mismo que Dockerfile
          cache: gradle           # ← cachea ~/.gradle automáticamente

      - name: Grant execute permission for gradlew
        run: chmod +x gradlew

      # ── Lint: ktlint via Gradle ──────────────────────────────────────────
      - name: Lint (ktlint)
        run: ./gradlew ktlintCheck --no-daemon --parallel

      # ── Tests unitarios e integración (Testcontainers) ───────────────────
      - name: Run Tests
        run: ./gradlew test --no-daemon --parallel
        env:
          SPRING_PROFILES_ACTIVE: test

      # ── Cobertura + gate de umbral ────────────────────────────────────────
      - name: Generate JaCoCo Coverage Report
        run: ./gradlew jacocoTestReport --no-daemon

      - name: Enforce Coverage Threshold
        run: ./gradlew jacocoTestCoverageVerification --no-daemon
        # build.gradle.kts debe tener: minimum = BigDecimal("0.80")

      # ── ArchUnit (dominio sin Spring/JPA) ────────────────────────────────
      # Los tests ArchUnit ya corren dentro de ./gradlew test
      # jacocoTestCoverageVerification falla si ArchUnit tests no pasan

      # ── Seguridad: OWASP Dependency Check ────────────────────────────────
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'zns-aibos'
          path: '.'
          format: 'HTML'
          args: >
            --failOnCVSS 7
            --enableRetired
        env:
          JAVA_HOME: ${{ env.JAVA_HOME }}

      - name: Upload OWASP Report
        uses: actions/upload-artifact@v4
        with:
          name: owasp-report
          path: reports/

      # ── Reporte de cobertura como artefacto ──────────────────────────────
      - name: Upload Coverage Report
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: '**/build/reports/jacoco/'

  # ─── Job 2: Docker Build + Trivy Scan ─────────────────────────────────────
  docker-build-scan:
    runs-on: ubuntu-latest
    needs: build-and-test
    permissions:
      contents: read
      packages: write
      security-events: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # ← token automático GitHub Actions

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-,format=short          # sha-abc1234
            type=ref,event=branch                       # develop, main
            type=semver,pattern={{version}}             # v1.2.3 en tags

      - name: Build Docker image (NO push aún — solo para escanear)
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          load: true   # carga la imagen en el daemon local para Trivy

      - name: Scan Docker image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          format: sarif
          output: trivy-results.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'  # falla el pipeline si hay CRITICAL o HIGH

      - name: Upload Trivy SARIF to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-results.sarif

      # ── Push SOLO si superó el scan ───────────────────────────────────────
      - name: Push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Job 3: GitOps — Actualizar manifiesto en repo de infra ───────────────
  update-gitops-manifest:
    runs-on: ubuntu-latest
    needs: docker-build-scan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: read

    steps:
      - name: Checkout infra repo
        uses: actions/checkout@v4
        with:
          repository: ${{ github.repository_owner }}/zns-infra  # ← repo GitOps separado
          token: ${{ secrets.GITOPS_PAT }}  # PAT con write access al infra repo
          path: infra

      - name: Update image tag in Helm values
        run: |
          SHORT_SHA=$(echo ${{ github.sha }} | cut -c1-8)
          sed -i "s|tag: sha-.*|tag: sha-${SHORT_SHA}|g" infra/helm/zns-aibos/values.yaml
          git -C infra config user.name "ci-bot"
          git -C infra config user.email "ci@zenapses.com"
          git -C infra add helm/zns-aibos/values.yaml
          git -C infra commit -m "chore(deploy): bump zns-aibos to sha-${SHORT_SHA} [skip ci]"
          git -C infra push
      # ArgoCD detecta el cambio en el repo de infra y sincroniza automáticamente
```

### JaCoCo coverage threshold en `build.gradle.kts`

```kotlin
// build.gradle.kts (root o módulo de bootstrap)
tasks.named<JacocoReport>("jacocoTestReport") {
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
    // Excluir clases generadas, configs, DTOs de la cobertura
    classDirectories.setFrom(
        files(classDirectories.files.map { fileTree(it) {
            exclude(
                "**/config/**",
                "**/dto/**",
                "**/entity/**",
                "**/*Application*",
                "**/*Kt*"        // classes de nivel de archivo Kotlin
            )
        }})
    )
}

tasks.named<JacocoCoverageVerification>("jacocoTestCoverageVerification") {
    violationRules {
        rule {
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = BigDecimal("0.80")   // 80% líneas
            }
            limit {
                counter = "BRANCH"
                value = "COVEREDRATIO"
                minimum = BigDecimal("0.75")   // 75% ramas
            }
        }
    }
}

// Asegurar que coverage se verifica después de generar el reporte
tasks.named("check") {
    dependsOn("jacocoTestCoverageVerification")
}
```

---

## 2️⃣ DOCKERFILE — KOTLIN SPRING BOOT (Patrón canónico Zenapses)

```dockerfile
# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

# Cachear dependencias ANTES de copiar el código fuente
# (Cambios en código NO invalidan la capa de dependencias)
COPY gradle/ gradle/
COPY gradlew gradlew
COPY settings.gradle.kts build.gradle.kts gradle.properties ./
RUN chmod +x gradlew

# Descargar dependencias en una capa separada (cache de Docker layer)
RUN ./gradlew dependencies --no-daemon -q || true

# Copiar código fuente
COPY modules/ modules/

# Build sin tests (tests corren en CI antes del build de imagen)
RUN ./gradlew :zns-bootstrap:bootJar --no-daemon -q -x test

# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
# ↑ Solo JRE: ~100MB vs ~400MB con JDK. Sin compilador, sin herramientas de build.

# Hardening: usuario non-root
RUN addgroup -S zenapses && adduser -S zenapses -G zenapses

WORKDIR /app

COPY --from=builder /workspace/modules/zns-bootstrap/build/libs/*.jar app.jar
RUN chown zenapses:zenapses app.jar

USER zenapses    # ← NUNCA correr como root en producción

EXPOSE 8080

# Health check embebido (para Docker Compose y K8s readiness sin probe externo)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

**Reglas del Dockerfile:**
- ✅ `eclipse-temurin:21-jdk-alpine` en build, `eclipse-temurin:21-jre-alpine` en runtime
- ✅ Copiar `gradle/` y `gradlew` ANTES que el código fuente (layer caching)
- ✅ `USER zenapses` obligatorio (non-root)
- ✅ `-XX:+UseContainerSupport` para que la JVM respete los límites de memoria del contenedor
- ✅ `-XX:MaxRAMPercentage=75.0` (evitar OOM killer: la JVM no consume toda la RAM del pod)
- ❌ **NUNCA** `ENV JWT_SECRET=...` en Dockerfile — secretos via Kubernetes Secrets o Vault

---

## 3️⃣ KUBERNETES — MANIFIESTOS CANÓNICOS

### Deployment con health checks y resource limits

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zns-aibos
  namespace: zenapses-prod
  labels:
    app: zns-aibos
    version: "{{ .Values.image.tag }}"
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0   # ← Zero-downtime deployment
  selector:
    matchLabels:
      app: zns-aibos
  template:
    metadata:
      labels:
        app: zns-aibos
    spec:
      securityContext:
        runAsNonRoot: true          # ← K8s rechaza si el contenedor intenta correr como root
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: zns-aibos
          image: ghcr.io/zenapses/zns-aibos:{{ .Values.image.tag }}
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "prod"
            - name: DB_PASSWORD             # ← Secreto desde K8s Secret, NO hardcodeado
              valueFrom:
                secretKeyRef:
                  name: zns-aibos-secrets
                  key: db-password
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: zns-aibos-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:             # ← K8s no envía tráfico hasta que esté listo
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:              # ← K8s reinicia el pod si deja de responder
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
            failureThreshold: 5
```

**Spring Boot Actuator — configurar grupos de health en `application.yml`:**

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true          # habilita /actuator/health/readiness y /liveness
      show-details: never      # NUNCA exponer detalles de health en producción
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

---

## 4️⃣ ARGOCD — GITOPS PATTERN

```
Repositorio de app (código) ──── CI Pipeline ────► Imagen Docker (GHCR)
                                       │
                                       ▼
Repositorio de infra (manifiestos) ◄── actualiza values.yaml con nuevo tag
                  │
                   │  ArgoCD observa y sincroniza
                  ▼
        Kubernetes Cluster (prod/staging)
```

**Reglas GitOps:**
- El repositorio de infra contiene **solo manifiestos YAML / Helm charts** — sin código de aplicación
- El pipeline CI actualiza `values.yaml` con el nuevo tag vía `sed` + commit + push
- ArgoCD sincroniza automáticamente (auto-sync activado o manual con aprobación en prod)
- **NUNCA** `kubectl apply` desde el pipeline CI en producción — solo en staging/review
- La historia de Git del repositorio de infra es el audit trail de todos los despliegues

---

## 5️⃣ JAVA SPRING BOOT — Adaptaciones

> Los patrones de CI/CD son **idénticos** para Java 21 + Spring Boot 3.4.x. Las únicas diferencias son:

```yaml
# .github/workflows/ci.yml — sección de lint
- name: Lint (Checkstyle)
  run: ./gradlew checkstyleMain checkstyleTest --no-daemon
  # ó con Maven:
  # run: mvn checkstyle:check -q

# Test con Maven (si el proyecto usa Maven en lugar de Gradle):
- name: Run Tests (Maven)
  run: mvn verify -q -Dmaven.test.failure.ignore=false
  env:
    SPRING_PROFILES_ACTIVE: test

# JaCoCo con Maven (plugin en pom.xml)
- name: Enforce Coverage (Maven)
  run: mvn jacoco:report jacoco:check -q
```

**Dockerfile Java 21 (idéntico al Kotlin — misma base image eclipse-temurin:21):**

```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace
COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml ./
RUN ./mvnw dependency:go-offline -q  # cachear dependencias Maven
COPY src src
RUN ./mvnw package -q -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S zenapses && adduser -S zenapses -G zenapses
WORKDIR /app
COPY --from=builder /workspace/target/*.jar app.jar
RUN chown zenapses:zenapses app.jar
USER zenapses
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

---

## 6️⃣ .NET CORE — Adaptaciones

```yaml
# .github/workflows/ci-dotnet.yml
name: CI Pipeline — .NET Core

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 8
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Run Tests with Coverage
        run: |
          dotnet test --no-build --configuration Release \
            --collect:"XPlat Code Coverage" \
            --results-directory ./coverage

      - name: Enforce Coverage Threshold (ReportGenerator)
        run: |
          dotnet tool install -g dotnet-reportgenerator-globaltool
          reportgenerator \
            -reports:"coverage/**/coverage.cobertura.xml" \
            -targetdir:"coverage/report" \
            -reporttypes:Html \
            -assemblyfilters:"+ZNS.*"
          # Para gate: usar coverlet con threshold
          # dotnet test ... -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Threshold=80

      - name: Security Scan (Trivy filesystem)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: CRITICAL,HIGH
          exit-code: '1'
```

**Dockerfile .NET 8:**

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /src
COPY *.sln ./
COPY src/ src/
RUN dotnet restore
RUN dotnet publish src/ZNS.Api/ZNS.Api.csproj \
    -c Release -o /app/publish --no-restore \
    /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
RUN addgroup -S zenapses && adduser -S zenapses -G zenapses
WORKDIR /app
COPY --from=builder /app/publish .
RUN chown -R zenapses:zenapses /app
USER zenapses
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "ZNS.Api.dll"]
```

---

## ⚠️ ANTI-PATTERNS CI/CD — NUNCA HACER

| Anti-pattern | Consecuencia | Solución correcta |
|---|---|---|
| `ENV JWT_SECRET=abc123` en Dockerfile | Secreto visible en `docker inspect` y registros de imagen | `secretKeyRef` en K8s Secret o Vault Agent Injector |
| `kubectl apply` en pipeline CI a producción directamente | Despliegue sin review, sin audit trail, sin rollback GitOps | GitOps: actualizar values.yaml en repo de infra → ArgoCD sincroniza |
| Imagen etiquetada solo con `latest` | Imposible rollback a versión anterior | Siempre etiquetar con SHA del commit (`sha-abc1234`) |
| `runs-on: self-hosted` sin hardening | Escalación de privilegios si el runner es comprometido | Usar runners efímeros o GitHub hosted; si self-hosted: sin privilegios root, aislado |
| Tests de integración contra base de datos de producción en CI | Datos corruptos, tests no reproducibles | Testcontainers (PostgreSQL efímero por ejecución de test) |
| Ignorar failures de cobertura (`continue-on-error: true`) | La cobertura decrece silenciosamente | Gate bloqueante: el pipeline debe fallar |
| `--no-verify` en hooks de Git para saltarse el pipeline | El código llega sin validaciones al repositorio | Proteger branches con branch protection rules en GitHub |
| Publicar imagen sin scan de vulnerabilidades | Imagen con CVE críticos en producción | Trivy scan antes del push, fallar si CRITICAL/HIGH |
| Correr el contenedor como `root` | Escalación de privilegios si el proceso es comprometido | `USER nobody` / `runAsNonRoot: true` en pod spec |
| Secretos como variables de entorno en `docker-compose.yml` commiteado | Contraseñas en el repositorio | `.env` en `.gitignore`; usar `.env.example` con valores fake |
| Un job único para todo el pipeline | Si falla un test, no sabes cuál fue de entre 100 | Jobs separados y paralelos: lint, test, coverage, scan, build |
| Saltarse ArchUnit en CI | Violaciones arquitecturales sin detección | Los tests ArchUnit deben ser parte de `./gradlew test` — no opcionales |

---

## ✅ CHECKLIST DE REVISIÓN — CI/CD EN PULL REQUESTS

Antes de mergear cualquier cambio que afecte el pipeline o el Dockerfile:

- [ ] ¿El Dockerfile tiene multi-stage build (JDK → JRE o SDK → Runtime)?
- [ ] ¿El usuario del contenedor es non-root (`USER zenapses` / `runAsNonRoot: true`)?
- [ ] ¿La imagen está etiquetada con el SHA del commit (`sha-${GITHUB_SHA::8}`)?
- [ ] ¿El build de imagen ocurre DESPUÉS de que todos los tests pasen?
- [ ] ¿Trivy scan bloquea el push si hay CRITICAL o HIGH CVEs?
- [ ] ¿El coverage threshold está configurado como gate bloqueante (`exit-code: 1`)?
- [ ] ¿Los secretos se inyectan desde GitHub Secrets / K8s Secrets / Vault, NO hardcodeados?
- [ ] ¿Los health probes de K8s apuntan a `/actuator/health/readiness` y `/liveness`?
- [ ] ¿El despliegue a producción usa GitOps (ArgoCD) y NO `kubectl apply` directo desde CI?
- [ ] ¿La imagen tiene `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0` en el `ENTRYPOINT`?
- [ ] ¿ArchUnit tests están incluidos en el `./gradlew test` y ejecutados en CI?
- [ ] ¿`OWASP Dependency Check` o `Trivy filesystem` escanea las dependencias?
