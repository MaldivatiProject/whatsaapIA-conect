# 📘 WF-DEPLOY-001: Prompts de Invocación

---

**workflow_id**: WF-DEPLOY-001  
**version**: 1.0.0  
**fecha**: 2026-02-07  
**proposito**: Prompts listos para invocar cada agente del workflow de despliegue

---

## 🎯 Índice de Agentes

| Agente | Step | Prompt |
|--------|------|--------|
| **AGT-TERRAFORM** | STEP-003/004 | [Ir al Prompt](#agt-terraform---senior-terraform-engineer) |
| **AGT-FINDEVSECOPS** | STEP-000/002/005/006/007 | [Ir al Prompt](#agt-findevsecops---findevsecops-engineer) |

---

## AGT-TERRAFORM - Senior Terraform Engineer

### Ubicación del Prompt Maestro

```
2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-terraform.md
```

### Prompt de Invocación - Terraform Plan

```markdown
@role: Senior Terraform Infrastructure Engineer
@context: WF-DEPLOY-001 | STEP-003 | Terraform Plan
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-terraform.md

## 📋 TAREA: Generar Plan de Infraestructura

### Ambiente
- **Ambiente**: ${ENV}  <!-- dev | staging | prod -->
- **Región AWS**: us-east-1
- **Proyecto**: MI-TOGA

### Directorio Terraform
```
0-docs/6-infrastructure/0-terraform/
```

### Comandos a Ejecutar
1. Inicializar Terraform:
   ```powershell
   cd "d:\Documents\2.maldivati_workspace\00-anwico\2.MI-TOGA\0-docs\6-infrastructure\0-terraform"
   make init ENV=${ENV}
   ```

2. Generar Plan:
   ```powershell
   make plan ENV=${ENV}
   ```

3. Mostrar resumen de cambios:
   - Recursos a crear
   - Recursos a modificar
   - Recursos a destruir

### Salida Esperada
- Plan guardado en `tfplan.${ENV}`
- Resumen de cambios para aprobación humana
```

### Prompt de Invocación - Terraform Apply

```markdown
@role: Senior Terraform Infrastructure Engineer
@context: WF-DEPLOY-001 | STEP-004 | Terraform Apply
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-terraform.md

## ⚡ TAREA: Aplicar Cambios de Infraestructura

### Pre-requisitos
- ✅ Plan aprobado en STEP-003
- ✅ Plan guardado en `tfplan.${ENV}`

### Comandos a Ejecutar
```powershell
cd "d:\Documents\2.maldivati_workspace\00-anwico\2.MI-TOGA\0-docs\6-infrastructure\0-terraform"

# Aplicar plan aprobado
terraform apply tfplan.${ENV}

# Capturar outputs
make output ENV=${ENV}
```

### Outputs a Capturar
- `vpc_id`
- `rds_endpoint`
- `alb_dns_name`
- `ecr_repository_urls`
- `ecs_cluster_arn`

### Guardar Outputs
```powershell
terraform output -json > outputs.${ENV}.json
```
```

---

## AGT-FINDEVSECOPS - FinDevSecOps Engineer

### Ubicación del Prompt Maestro

```
2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md
```

### Prompt de Invocación - Pre-requisitos (STEP-000)

```markdown
@role: Senior FinDevSecOps Engineer
@context: WF-DEPLOY-001 | STEP-000 | Verificar Pre-requisitos
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md

## 🔐 TAREA: Verificar Pre-requisitos de Despliegue

### Verificaciones Requeridas

1. **AWS CLI**
   ```powershell
   aws --version
   aws sts get-caller-identity
   ```

2. **Terraform**
   ```powershell
   terraform version
   ```

3. **Docker**
   ```powershell
   docker --version
   docker info
   ```

4. **Git**
   ```powershell
   git --version
   git status
   ```

5. **Conexión ECR**
   ```powershell
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}
   ```

### Salida Esperada
```yaml
prereq_check:
  status: "PASS"
  aws_cli: "OK"
  terraform: "OK"
  docker: "OK"
  git: "OK"
  ecr_login: "OK"
```
```

### Prompt de Invocación - Git Update (STEP-002)

```markdown
@role: Senior FinDevSecOps Engineer
@context: WF-DEPLOY-001 | STEP-002 | Git Update
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md

## 📝 TAREA: Actualizar Git y Crear Tag de Versión

### Información de Release
- **Versión**: ${VERSION}
- **Ambiente**: ${ENV}
- **Componentes**: ${COMPONENTES}

### Proceso

1. **Verificar estado**
   ```powershell
   git status
   git log --oneline -5
   ```

2. **Commit cambios** (si hay)
   ```powershell
   git add .
   git commit -m "release(${ENV}): v${VERSION}

   Componentes:
   - ${COMPONENTES}
   
   Ticket: ${TICKET_ID}"
   ```

3. **Crear tag**
   ```powershell
   git tag -a "v${VERSION}-${ENV}" -m "Release ${VERSION} para ${ENV}"
   ```

4. **Push**
   ```powershell
   git push origin $(git branch --show-current)
   git push origin --tags
   ```
```

### Prompt de Invocación - Build & Push (STEP-005)

```markdown
@role: Senior FinDevSecOps Engineer
@context: WF-DEPLOY-001 | STEP-005 | Build & Push Docker
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md

## 🐳 TAREA: Build y Push de Imágenes Docker

### Configuración
- **Versión**: ${VERSION}
- **ECR Registry**: ${ECR_REGISTRY}
- **Ambiente**: ${ENV}

### Proceso por Componente

#### Backend - API Gateway
```powershell
cd "d:\Documents\2.maldivati_workspace\00-anwico\2.MI-TOGA\0-docs\4-source-code\0-backend\1-apigateway-service"

# Build Gradle
.\gradlew.bat clean build -x test

# Build Docker
docker build -t mitoga/apigateway:${VERSION} .

# Tag para ECR
docker tag mitoga/apigateway:${VERSION} ${ECR_REGISTRY}/mitoga-apigateway:${VERSION}

# Push
docker push ${ECR_REGISTRY}/mitoga-apigateway:${VERSION}
```

#### Backend - MS Usuarios
```powershell
cd "d:\Documents\2.maldivati_workspace\00-anwico\2.MI-TOGA\0-docs\4-source-code\0-backend\3-msusuarios"

.\gradlew.bat clean build -x test
docker build -t mitoga/msusuarios:${VERSION} .
docker tag mitoga/msusuarios:${VERSION} ${ECR_REGISTRY}/mitoga-msusuarios:${VERSION}
docker push ${ECR_REGISTRY}/mitoga-msusuarios:${VERSION}
```

#### Frontend - WebApp
```powershell
cd "d:\Documents\2.maldivati_workspace\00-anwico\2.MI-TOGA\0-docs\4-source-code\1-frontend\apps"

npm ci
npm run build -- --configuration=production
docker build -t mitoga/webapp:${VERSION} .
docker tag mitoga/webapp:${VERSION} ${ECR_REGISTRY}/mitoga-webapp:${VERSION}
docker push ${ECR_REGISTRY}/mitoga-webapp:${VERSION}
```
```

### Prompt de Invocación - Deploy (STEP-006)

```markdown
@role: Senior FinDevSecOps Engineer
@context: WF-DEPLOY-001 | STEP-006 | Deploy Aplicación
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md

## 🚀 TAREA: Desplegar Aplicación en AWS

### Configuración
- **Ambiente**: ${ENV}
- **Cluster ECS**: mitoga-${ENV}-cluster
- **Versión**: ${VERSION}

### Orden de Despliegue

#### 1. Flyway Migrations
```powershell
cd "d:\Documents\2.maldivati_workspace\00-anwico\2.MI-TOGA\0-docs\4-source-code\0-backend\2-mitoga-flyway"

$env:SPRING_PROFILES_ACTIVE = "${ENV}"
.\gradlew.bat flywayInfo
.\gradlew.bat flywayMigrate
```

#### 2. Backend Services
```powershell
# API Gateway
aws ecs update-service `
  --cluster mitoga-${ENV}-cluster `
  --service mitoga-apigateway-${ENV} `
  --force-new-deployment

# Esperar estabilización
aws ecs wait services-stable `
  --cluster mitoga-${ENV}-cluster `
  --services mitoga-apigateway-${ENV}

# MS Usuarios
aws ecs update-service `
  --cluster mitoga-${ENV}-cluster `
  --service mitoga-msusuarios-${ENV} `
  --force-new-deployment
```

#### 3. Frontend
```powershell
# Si usa S3 + CloudFront
aws s3 sync dist/ s3://mitoga-webapp-${ENV}/ --delete
aws cloudfront create-invalidation --distribution-id ${CF_ID} --paths "/*"
```
```

### Prompt de Invocación - Validación (STEP-007)

```markdown
@role: Senior FinDevSecOps Engineer
@context: WF-DEPLOY-001 | STEP-007 | Validación Post-Deploy
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md

## ✅ TAREA: Validar Despliegue

### Health Checks

```powershell
# API Gateway
Invoke-RestMethod -Uri "https://${ALB_DNS}/actuator/health"

# MS Usuarios
Invoke-RestMethod -Uri "https://${ALB_DNS}/api/usuarios/actuator/health"

# Frontend
Invoke-WebRequest -Uri "https://${WEBAPP_URL}" -UseBasicParsing
```

### Verificar Logs
```powershell
aws logs tail /ecs/mitoga-apigateway-${ENV} --since 10m
aws logs filter-log-events --log-group-name /ecs/mitoga-apigateway-${ENV} --filter-pattern "ERROR"
```

### Verificar Métricas
```powershell
# CPU Utilization
aws cloudwatch get-metric-statistics `
  --namespace AWS/ECS `
  --metric-name CPUUtilization `
  --dimensions Name=ClusterName,Value=mitoga-${ENV}-cluster `
  --start-time (Get-Date).AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --end-time (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --period 60 `
  --statistics Average
```

### Criterios de Éxito
- ✅ Health checks retornan HTTP 200
- ✅ No hay errores en logs recientes
- ✅ CPU < 80%, Memory < 85%
- ✅ ALB HealthyHostCount > 0
```

---

## 🔙 Prompt de Rollback

```markdown
@role: Senior FinDevSecOps Engineer
@context: WF-DEPLOY-001 | ROLLBACK | Emergencia
@prompt: 2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md

## 🚨 TAREA: Rollback de Emergencia

### Motivo del Rollback
- **Razón**: ${RAZON}
- **Versión actual**: ${VERSION_ACTUAL}
- **Versión objetivo**: ${VERSION_ANTERIOR}

### Proceso de Rollback

1. **Identificar versión anterior**
   ```powershell
   git tag -l --sort=-v:refname | Select-Object -First 5
   ```

2. **Rollback ECS**
   ```powershell
   # Obtener task definition anterior
   aws ecs describe-task-definition `
     --task-definition mitoga-apigateway-${ENV} `
     --query 'taskDefinition.revision'
   
   # Rollback a versión anterior
   aws ecs update-service `
     --cluster mitoga-${ENV}-cluster `
     --service mitoga-apigateway-${ENV} `
     --task-definition mitoga-apigateway-${ENV}:${REVISION_ANTERIOR}
   ```

3. **Verificar rollback**
   ```powershell
   aws ecs wait services-stable --cluster mitoga-${ENV}-cluster --services mitoga-apigateway-${ENV}
   Invoke-RestMethod -Uri "https://${ALB_DNS}/actuator/health"
   ```

4. **Notificar equipo**
   - Enviar notificación SNS
   - Crear incidente en sistema de tracking
```

---

## 📋 Comandos Rápidos

| Comando | Descripción | Step |
|---------|-------------|------|
| `/deploy:prereq` | Verificar pre-requisitos | STEP-000 |
| `/deploy:plan` | Terraform plan | STEP-003 |
| `/deploy:apply` | Terraform apply | STEP-004 |
| `/deploy:build` | Build & Push Docker | STEP-005 |
| `/deploy:app` | Deploy aplicación | STEP-006 |
| `/deploy:validate` | Validación post-deploy | STEP-007 |
| `/deploy:rollback` | Rollback emergencia | N/A |

---

## 🔗 Referencias

| Recurso | Path |
|---------|------|
| Workflow Principal | `1-workflow/WF-DEPLOY-001-despliegue-aws.md` |
| Agente Terraform | `2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-terraform.md` |
| Agente FinDevSecOps | `2-agents/zns-tecnical-team/5.zns-devOps/12.devsecops/prompt-senior-FinDevSecOps.md` |
| Terraform IaC | `0-docs/6-infrastructure/0-terraform/` |
| Makefile | `0-docs/6-infrastructure/0-terraform/Makefile` |

---

**Metodología:** ZNS v2.2  
**Mantenedor:** Orchestration Architect Senior
