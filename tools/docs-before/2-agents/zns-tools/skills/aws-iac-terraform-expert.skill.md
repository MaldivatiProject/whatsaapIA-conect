# 🏗️ SKILL: AWS IaC TERRAFORM EXPERT

**skill_id**: aws-iac-terraform-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: devops / iac / terraform / aws  
**last_updated**: 2026-03-21  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-engineer-prompt-senior, zns-devops, prompt-dev-backend-go, prompt-dev-kotlin-springboot-senior  
**dependencias**: aws-cloud-architecture-senior (recomendada)  
**referencia_stack**: Terraform ≥ 1.7, AWS Provider ≥ 5.x, Terragrunt (patrones DRY), GitHub Actions CI/CD

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento expert de Infrastructure-as-Code (IaC) con Terraform para AWS. Cubre la estructura de módulos, gestión de estado remoto, variables y outputs, security hardening, patrones DRY con Terragrunt, y la integración en pipelines CI/CD con gates de `plan` y `apply`. Aplicar cuando se diseñan prompts para agentes de DevOps/Infra, o cuando el agente recibe como tarea generar, revisar o auditar código Terraform para AWS.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Estado remoto SIEMPRE — nunca `terraform.tfstate` local en producción**
   ```hcl
   # backend.tf
   terraform {
     backend "s3" {
       bucket         = "mtg-mitoga-terraform-state"
       key            = "prod/main.tfstate"
       region         = "us-east-1"
       encrypt        = true                  # SSE-S3 mínimo, SSE-KMS ideal
       dynamodb_table = "mtg-mitoga-tf-locks" # DynamoDB para state locking
       # kms_key_id   = "arn:aws:kms:..."    # Habilitar con CMK
     }
   }
   ```
   - El bucket de state tiene versioning habilitado y block_public_access en todos los flags.
   - La tabla DynamoDB tiene `billing_mode = "PAY_PER_REQUEST"` (no se sabe el throughput de locks).

2. **Estructura de módulos reutilizables**
   ```
   infrastructure/
   ├── modules/                  # módulos reutilizables por el proyecto
   │   ├── vpc/
   │   │   ├── main.tf
   │   │   ├── variables.tf
   │   │   ├── outputs.tf
   │   │   └── README.md         # obligatorio: describe inputs/outputs
   │   ├── ecs-service/
   │   ├── aurora-cluster/
   │   ├── elasticache/
   │   └── alb/
   ├── environments/
   │   ├── dev/
   │   │   ├── main.tf           # invoca módulos con valores de dev
   │   │   ├── variables.tf
   │   │   ├── terraform.tfvars  # valores de dev — NO en git si tiene secrets
   │   │   └── backend.tf
   │   ├── staging/
   │   └── prod/
   └── versions.tf               # constraints de versiones (raíz)
   ```

3. **Versiones fijadas — reproducibilidad total**
   ```hcl
   # versions.tf
   terraform {
     required_version = ">= 1.7.0, < 2.0.0"
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.40"   # permite patch pero no minor mayor
       }
       random = {
         source  = "hashicorp/random"
         version = "~> 3.6"
       }
     }
   }
   ```

4. **Variables con validación — no aceptar valores inválidos**
   ```hcl
   variable "environment" {
     description = "Ambiente de despliegue"
     type        = string
     validation {
       condition     = contains(["dev", "staging", "prod"], var.environment)
       error_message = "environment debe ser dev, staging o prod."
     }
   }

   variable "ecs_cpu" {
     description = "CPU units para ECS task (256, 512, 1024, 2048, 4096)"
     type        = number
     default     = 512
     validation {
       condition     = contains([256, 512, 1024, 2048, 4096], var.ecs_cpu)
       error_message = "ecs_cpu debe ser uno de los valores Fargate válidos."
     }
   }
   ```

5. **Secrets NUNCA en variables Terraform plaintext**
   ```hcl
   # ❌ MAL: secret como variable con default en código
   variable "db_password" {
     default = "SuperSecret123!"  # NUNCA
   }

   # ✅ BIEN: secreto gestionado por AWS Secrets Manager, referenciado opcionalmente
   data "aws_secretsmanager_secret_version" "db" {
     secret_id = "/${var.environment}/mitoga/db/password"
   }
   # El valor se usa solo via ARN en ECS task definition → secrets[].valueFrom
   ```

---

### Módulos Clave y Sus Patrones

#### Módulo: `ecs-service`

```hcl
# modules/ecs-service/variables.tf
variable "cluster_id"         { type = string }
variable "task_cpu"           { type = number; default = 512 }
variable "task_memory"        { type = number; default = 1024 }
variable "image_uri"          { type = string }
variable "desired_count"      { type = number; default = 1 }
variable "container_port"     { type = number; default = 8080 }
variable "target_group_arn"   { type = string }
variable "security_group_ids" { type = list(string) }
variable "subnet_ids"         { type = list(string) }
variable "log_group_name"     { type = string }
variable "secrets"            { type = list(object({ name = string; valueFrom = string })); default = [] }

# modules/ecs-service/main.tf — fragmento
resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false  # NUNCA true en subnets privadas
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.service_name
    container_port   = var.container_port
  }

  lifecycle {
    ignore_changes = [desired_count]  # controlado por Auto Scaling, no por Terraform
  }
}
```

#### Módulo: `aurora-cluster`

```hcl
# Patrón canónico RDS Aurora PostgreSQL
resource "aws_rds_cluster" "this" {
  cluster_identifier      = "${local.prefix}-db"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = var.db_name
  master_username         = var.master_username
  manage_master_user_password = true  # Secrets Manager gestionado por RDS
  
  vpc_security_group_ids  = [aws_security_group.rds.id]
  db_subnet_group_name    = aws_db_subnet_group.this.name
  
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.rds.arn
  
  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"
  skip_final_snapshot     = var.environment != "prod"  # siempre snapshot final en prod
  
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = local.tags
}

resource "aws_rds_cluster_instance" "writer" {
  count              = 1
  identifier         = "${local.prefix}-db-writer"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.db_instance_class
  engine             = aws_rds_cluster.this.engine
  publicly_accessible = false  # aislado en subnets isolated
}

resource "aws_rds_cluster_instance" "reader" {
  count              = var.environment == "prod" ? 1 : 0  # reader solo en prod
  identifier         = "${local.prefix}-db-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.db_instance_class
  engine             = aws_rds_cluster.this.engine
  publicly_accessible = false
}
```

#### Módulo: `alb`

```hcl
# ALB con HTTPS obligatorio, HTTP redirect, WAF optional
resource "aws_lb" "this" {
  name               = "${local.prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  
  enable_deletion_protection = var.environment == "prod"
  drop_invalid_header_fields = true  # seguridad: descarta headers malformados

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"  # TLS 1.3 preferido
  certificate_arn   = var.acm_certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

---

### CI/CD Terraform — Gates en GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  pull_request:
    branches: [main]
    paths: ["infrastructure/**"]
  push:
    branches: [main]
    paths: ["infrastructure/**"]

jobs:
  terraform-plan:
    name: Terraform Plan (PR Gate)
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    permissions:
      id-token: write   # OIDC para asumir rol IAM sin credenciales estáticas
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_PLAN_ROLE_ARN }}
          aws-region: us-east-1

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "~1.7"

      - name: Terraform Init
        run: terraform init -backend-config="key=prod/main.tfstate"
        working-directory: infrastructure/environments/prod

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        id: plan
        run: terraform plan -detailed-exitcode -out=tfplan 2>&1 | tee plan.txt
        working-directory: infrastructure/environments/prod

      - name: Comment PR with Plan
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('infrastructure/environments/prod/plan.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan\n\`\`\`\n${plan.substring(0, 60000)}\n\`\`\``
            });

  terraform-apply:
    name: Terraform Apply (main only)
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production   # requiere aprobación manual en entornos críticos
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials (OIDC — Apply Role con más permisos)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TERRAFORM_APPLY_ROLE_ARN }}
          aws-region: us-east-1
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "~1.7"
      - run: terraform init && terraform apply -auto-approve
        working-directory: infrastructure/environments/prod
```

**Patrón de seguridad OIDC (NUNCA `AWS_ACCESS_KEY_ID` estáticos en CI):**
```hcl
# IAM OIDC Identity Provider para GitHub Actions
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "terraform_plan" {
  name = "${local.prefix}-github-terraform-plan"
  assume_role_policy = jsonencode({
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:org/repo:*"
        }
      }
    }]
  })
}
```

---

### Locals y Data Sources — Patrones Comunes

```hcl
# locals.tf — en cada ambiente
locals {
  prefix      = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = var.owner
    UpdatedAt   = timestamp()  # útil para rastrear cuándo se aplicó
  }
}

# Data sources críticos
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" { state = "available" }
data "aws_vpc" "selected" { id = var.vpc_id }

# Referencia a secret creado por RDS (manage_master_user_password = true)
data "aws_secretsmanager_secret" "rds_master" {
  name = "rds!cluster-${aws_rds_cluster.this.cluster_resource_id}"
}
```

---

## ✅ Criterios de Aplicación

- El agente receptor genera o revisa código Terraform para AWS
- El agente receptor crea prompts para agentes de DevOps/Infra que usan Terraform
- El agente debe evaluar si un pipeline CI/CD con Terraform está correctamente diseñado
- El agente debe responder preguntas de arquitectura sobre cómo gestionar estado, módulos o secretos en IaC

## ❌ Anti-patrones — NUNCA en IaC ZNS

- ❌ **Estado local** (`terraform.tfstate` en el repo) — siempre S3 remoto con DynamoDB lock
- ❌ **Sin `required_version`** — cualquier versión de Terraform puede romper el código
- ❌ **`terraform apply` sin plan previo en producción** — SIEMPRE `plan` → revisión → `apply`
- ❌ **Credenciales AWS estáticas (`AWS_ACCESS_KEY_ID`) en CI** — usar OIDC con IAM roles
- ❌ **`count` para recursos heterogéneos** — usar `for_each` con map para identificación estable de recursos
- ❌ **Módulos sin `outputs.tf`** — los módulos son cajas negras sin outputs explícitos
- ❌ **`depends_on` excesivo** — síntoma de que el módulo tiene acoplamiento oculto
- ❌ **`ignore_changes = [all]`** — solo `ignore_changes = [desired_count]` en ECS u otros campos controlados externamente
- ❌ **`sensitive = false` en outputs con secrets** — todo output que contenga un valor sensible debe tener `sensitive = true`
- ❌ **`skip_final_snapshot = true` en producción** — siempre snapshot final antes de destruir RDS en prod
- ❌ **Variables sin `description`** — todo input debe tener descripción clara de qué representa y qué acepta
- ❌ **`terraform destroy` en prod sin MFA / aprobación manual** — usar `lifecycle { prevent_destroy = true }` en resources críticos

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Preguntas de entrevista para diseñar prompt de agente DevOps IaC

**Escenario**: El Prompt Engineer crea un agente "DevOps IaC Senior (Terraform + AWS)".

**Preguntas adicionales que esta skill habilita:**
```markdown
### IaC / Terraform — Preguntas adicionales:
- ¿Cuántos ambientes existen? (dev, staging, prod) → Estructura environments/
- ¿Cómo se gestiona el estado remoto? ¿Ya existe bucket S3 de estado?
- ¿Hay módulos reusables ya desarrollados? ¿Están versionados (git tags)?
- ¿El pipeline de CI ya autentica con AWS via OIDC o usa credenciales estáticas?
- ¿Existe aprobación manual en el gate de `apply` para producción?
- ¿Se usa Terragrunt para patrones DRY entre ambientes?
- ¿Hay un linter configurado? (tflint, checkov, trivy IaC scan)
- ¿Los recursos críticos (RDS, S3 de estado) tienen `prevent_destroy = true`?
```

### Ejemplo 2: Checklist de revisión de código Terraform AWS

**Cuando el agente revisa un PR de Terraform, debe verificar:**
```markdown
### Terraform Code Review Checklist:
- [ ] `required_version` y `required_providers` con versiones fijadas (no `>= x`)
- [ ] Backend configurado con S3 remoto + DynamoDB lock + encrypt=true
- [ ] Sin credenciales hardcodeadas (grep: `access_key`, `secret_key`, `password =`)
- [ ] Todos los buckets S3 con `block_public_access` en 4 flags
- [ ] Recursos RDS con `storage_encrypted = true` y `publicly_accessible = false`
- [ ] ECS tasks con `assign_public_ip = false`
- [ ] ALB con listener HTTP redirigiendo a HTTPS (no sirviendo contenido en 80)
- [ ] Outputs con datos sensibles marcados `sensitive = true`
- [ ] Tags obligatorios en todos los recursos (Project, Environment, ManagedBy, Owner)
- [ ] `prevent_destroy = true` en recursos críticos de producción (RDS, S3 state)
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
## SKILL ACTIVA: AWS IaC TERRAFORM → ver: 2-agents/zns-tools/skills/aws-iac-terraform-expert.skill.md

### Terraform AWS — Mandatorios en Todo Código IaC

**Estado y Backend:**
- Estado remoto S3 + DynamoDB lock + `encrypt = true` — NUNCA estado local
- Bucket de estado: `versioning ENABLED`, `block_public_access 4 flags`, SSE-KMS

**Estructura:**
- `modules/` para recursos reutilizables; `environments/{dev,staging,prod}/` por ambiente
- `versions.tf` con `required_version` y `required_providers` fijados con `~>`
- Todo módulo con `variables.tf` + `outputs.tf` + `README.md`

**Seguridad:**
- Credenciales AWS en CI via OIDC IAM Role — NUNCA `AWS_ACCESS_KEY_ID` estáticos
- Variables con validación explícita (`validation` block) para entornos y tipos de recurso
- Outputs sensibles marcados con `sensitive = true`
- `prevent_destroy = true` en RDS, S3 state bucket y KMS keys en producción

**CI/CD Gates:**
- PR → `terraform plan` automático como comentario bloqueante
- Merge a main → `terraform apply` con aprobación manual en producción
- `terraform validate` + `tflint` + `checkov` en el pipeline

**Checklist rápido de revisión de PR Terraform:**
- [ ] Estado remoto configurado y cifrado
- [ ] Sin secrets hardcodeados (grep: `password =`, `access_key =`)
- [ ] Tags obligatorios: Project, Environment, ManagedBy, Owner
- [ ] ALB: HTTP→HTTPS redirect, HTTPS con TLS 1.3
- [ ] RDS: `storage_encrypted`, `publicly_accessible = false`, `skip_final_snapshot` false en prod
- [ ] ECS: `assign_public_ip = false`, secrets via `valueFrom` (no env vars plaintext)
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---|---|
| Módulos AWS cubiertos con ejemplo | ≥ 4 (ECS, RDS, ALB, ElastiCache) |
| Anti-patrones documentados | ≥ 12 |
| Bloques HCL funcionales como referencia | ≥ 8 |
| Patrones CI/CD (GitHub Actions) | ≥ 1 pipeline completo |
| Seguridad (OIDC, no credenciales estáticas) | Cubierta con ejemplo |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Backend S3/DynamoDB, estructura modules/environments, módulos ECS/RDS/ALB, CI/CD con OIDC, anti-patrones
