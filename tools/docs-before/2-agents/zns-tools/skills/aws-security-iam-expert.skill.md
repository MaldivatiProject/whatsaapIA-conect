# 🔐 SKILL: AWS SECURITY & IAM EXPERT

**skill_id**: aws-security-iam-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: security / aws / iam / compliance  
**last_updated**: 2026-03-21  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-engineer-prompt-senior, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go, zns-devops, zns-architecture  
**dependencias**: aws-cloud-architecture-senior (recomendada)  
**referencia_stack**: AWS IAM, KMS, Secrets Manager, WAF v2, GuardDuty, Security Hub, CloudTrail, Config, SCPs (AWS Organizations)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento expert en seguridad AWS: diseño de políticas IAM con least privilege, gestión de secretos, cifrado con KMS, protección perimetral con WAF/Shield, detección de amenazas con GuardDuty, compliance con Security Hub y auditoría con CloudTrail. Aplicar cuando se diseñan prompts para agentes que realizan revisiones de seguridad, diseñan arquitecturas AWS, generan código Terraform con recursos IAM, o implementan controles de seguridad en workloads de producción.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Least Privilege — cada identidad tiene solo los permisos que necesita**
   - Nunca `"Action": "*"` ni `"Resource": "*"` en políticas de producción
   - Un rol por workload (ECS task ≠ ECS execution ≠ deploy pipeline ≠ developer)
   - Revisar políticas con `Access Analyzer` + `IAM Access Advisor` para detectar permisos no usados
   - Máximo 90 días sin usar un permiso → candidato a eliminación

2. **Zero Trust Network — nunca asumir que la red interna es segura**
   - Security Groups: ingress solo desde SG origen específico, nunca `0.0.0.0/0` en puertos de aplicación
   - VPC Endpoints para S3, Secrets Manager, ECR, SSM — el tráfico no sale a Internet
   - NACLs como capa adicional en subnets isolated (solo para DB/Cache)

3. **Separación execution role / task role en ECS Fargate**
   ```
   Execution Role (aws-ecs-task-execution mandatorio):
   - ecr:GetAuthorizationToken, ecr:BatchGetImage (pull imagen)
   - logs:CreateLogStream, logs:PutLogEvents (CloudWatch Logs)
   - secretsmanager:GetSecretValue (inyectar secrets en task)
   - ssm:GetParameters (inyectar parámetros SSM)

   Task Role (permisos de la aplicación en runtime):
   - Solo los servicios AWS que la app usa directamente
   - Scoped por resource ARN cuando es posible
   ```

4. **KMS — cifrado en todo nivel**
   ```
   CMK (Customer Managed Key) obligatorio en:
   - RDS Aurora → aws_kms_key.rds
   - ElastiCache → aws_kms_key.cache
   - S3 buckets con datos sensibles → SSE-KMS
   - Secrets Manager secrets → aws_kms_key.secrets
   - CloudWatch Logs grupos con datos sensibles
   - EBS volumes si se usan EC2

   AWS Managed Key (aws/service) solo aceptable en:
   - S3 buckets de logs (no contienen datos de negocio)
   - CloudWatch Logs de infraestructura general
   ```

5. **Rotación de secretos automatizada — nunca secretos estáticos permanentes**
   ```
   Secrets Manager rotation:
   - DB credentials: rotación cada 30 días (Lambda de rotación de RDS)
   - JWT signing keys: rotación cada 90 días con key overlap (N y N-1 válidas)
   - API keys de terceros: rotación manual con proceso documentado
   - IAM access keys: PROHIBIDOS en workloads → usar roles. Si existen, rotación < 90 días
   ```

---

### IAM — Patrones de Políticas

#### Rol de Tarea ECS (Task Role)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SecretsManagerRead",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/mitoga/*"
    },
    {
      "Sid": "S3AssetsBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::mtg-mitoga-prod-bucket-assets/*"
    },
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::mtg-mitoga-prod-bucket-assets"
    },
    {
      "Sid": "SQSSendReceive",
      "Effect": "Allow",
      "Action": ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:mtg-mitoga-prod-*"
    }
  ]
}
```

#### Terraform — IAM Role + Policy Pattern

```hcl
# Rol de tarea ECS (solo lo que la app necesita)
resource "aws_iam_role" "ecs_task" {
  name = "${local.prefix}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
      }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "ecs_task_app" {
  name   = "app-permissions"
  role   = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SecretsManagerRead"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/mitoga/*"
      }
    ]
  })
}

# Rol de ejecución de ECS (pull imagen + logs)
resource "aws_iam_role" "ecs_execution" {
  name = "${local.prefix}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
```

---

### Security Groups — Diseño Restrictivo

```hcl
# SG del ALB — solo HTTPS desde Internet
resource "aws_security_group" "alb" {
  name   = "${local.prefix}-alb-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS desde Internet"
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP para redirect a HTTPS"
  }
  egress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description = "Forward al ECS task"
  }
}

# SG de ECS — solo desde ALB
resource "aws_security_group" "ecs_tasks" {
  name   = "${local.prefix}-ecs-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Solo tráfico desde ALB"
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]  # tráfico de salida para Secrets Manager/ECR vía NAT
  }
}

# SG de RDS — solo desde ECS tasks
resource "aws_security_group" "rds" {
  name   = "${local.prefix}-rds-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "PostgreSQL solo desde ECS tasks"
  }
  # SIN egress rules — la DB no inicia conexiones
}
```

---

### WAF v2 — Protección de ALB

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "${local.prefix}-waf"
  scope = "REGIONAL"

  default_action { allow {} }

  # Regla 1: Bloquear IPs conocidas maliciosas (AWS Managed)
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  # Regla 2: OWASP Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Regla 3: Rate Limiting — 1000 req/5min por IP
  rule {
    name     = "RateLimitPerIP"
    priority = 3
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitPerIP"
      sampled_requests_enabled   = true
    }
  }
}
```

---

### Detección de Amenazas: GuardDuty + Security Hub

```hcl
# GuardDuty — detección de amenazas en tiempo real
resource "aws_guardduty_detector" "main" {
  enable = true
  datasources {
    s3_logs         { enable = true }
    kubernetes      { audit_logs { enable = true } }
    malware_protection {
      scan_ec2_instance_with_findings { ebs_volumes { enable = true } }
    }
  }
}

# Security Hub — vista unificada de hallazgos de seguridad
resource "aws_securityhub_account" "main" {}

resource "aws_securityhub_standards_subscription" "aws_foundational" {
  # AWS Foundational Security Best Practices
  standards_arn = "arn:aws:securityhub:${var.aws_region}::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}
```

---

### CloudTrail — Auditoría de Toda Actividad API

```hcl
resource "aws_cloudtrail" "main" {
  name                          = "${local.prefix}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true  # IAM, STS, otros globales
  is_multi_region_trail         = true  # OBLIGATORIO para cobertura completa
  enable_log_file_validation    = true  # detecta tampering de logs
  kms_key_id                    = aws_kms_key.cloudtrail.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::mtg-mitoga-prod-bucket-assets/"]  # datos sensibles
    }
  }
}
```

---

## ✅ Criterios de Aplicación

- El agente revisa arquitecturas, código Terraform o PRs con recursos IAM, Security Groups o KMS
- El agente diseña prompts para agentes de seguridad, arquitectura o DevOps en AWS
- El agente debe responder preguntas de threat modeling o compliance (SOC2, PCI, HIPAA) en AWS
- El agente genera políticas IAM como parte de módulos Terraform

## ❌ Anti-patrones — NUNCA en seguridad AWS

- ❌ **`"Action": "*"` o `"Resource": "*"`** en políticas de producción — siempre scoped
- ❌ **IAM Users con access keys para workloads** — usar IAM Roles en todos los servicios AWS
- ❌ **Credenciales en código o environment variables** — Secrets Manager o SSM SecureString
- ❌ **Security Group con `0.0.0.0/0` en puertos de app/DB** — solo ALB puede recibir tráfico externo
- ❌ **RDS `publicly_accessible = true`** — jamás en producción
- ❌ **S3 `block_public_access` desactivado** — todos los flags en `true` siempre
- ❌ **GuardDuty desactivado** — costo bajo, valor altísimo en detección
- ❌ **CloudTrail desactivado o sin multi-region** — sin auditoría no hay forensics
- ❌ **KMS con `deletion_window_in_days < 7`** — mínimo 7, recomendado 30 en producción
- ❌ **Sin rotación de secretos** — todos los secrets en Secrets Manager con rotación automática configurada
- ❌ **WAF desactivado en endpoints públicos** — mínimo AWS Managed Rules + Rate Limiting

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Preguntas de seguridad AWS para diseñar un prompt de agente

```markdown
### Seguridad AWS — Preguntas críticas adicionales:
- ¿GuardDuty y Security Hub están habilitados en la cuenta/organización?
- ¿Existe CloudTrail multi-region con validación de integridad activo?
- ¿Hay WAF asociado al ALB? ¿Qué managed rule groups están activos?
- ¿Los secrets están en Secrets Manager con rotación? ¿O en SSM Parameter Store?
- ¿Hay CMKs (Customer Managed KMS Keys) para RDS, ElastiCache y S3 sensibles?
- ¿Los ECS tasks usan roles separados (execution vs task role)?
- ¿Los Security Groups de RDS/ElastiCache solo aceptan desde SG de ECS?
- ¿Hay AWS Config rules para detectar desviaciones de la configuración esperada?
- ¿Hay proceso de revisión de IAM Access Advisor periódico?
```

### Ejemplo 2: Sección seguridad en rol de agente

```markdown
### 4️⃣ AWS Security (Controles Mandatorios)
- **IAM**: Least privilege estricto — un rol por servicio, policies scoped por ARN, nunca wildcards
- **Cifrado**: KMS CMK obligatorio para RDS, ElastiCache, S3 PII, logs sensibles
- **Secrets**: Secrets Manager con rotación automática (30 días DB, 90 días JWT keys)
- **Red**: Security Groups con referencias SG-a-SG (no CIDRs), VPC Endpoints para AWS APIs
- **WAF**: AWS Managed Rules (IP Reputation + CRS) + Rate Limiting en todos los ALBs públicos
- **Detección**: GuardDuty + Security Hub habilitados con alertas SNS → oncall
- **Auditoría**: CloudTrail multi-region con validación de integridad + bucket con MFA Delete
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
## SKILL ACTIVA: AWS SECURITY & IAM → ver: 2-agents/zns-tools/skills/aws-security-iam-expert.skill.md

### IAM — Mandatorios
- **Separation of concerns**: ECS execution role (pull imagen + logs) ≠ ECS task role (permisos de la app)
- **Least privilege**: `Action` y `Resource` siempre scoped — NUNCA `"*"` en producción
- **Sin IAM Users para workloads**: solo Roles con AssumeRole (ECS tasks, Lambda, pipelines CI via OIDC)
- **Condición `aws:SourceAccount`** en trust policies de ECS para prevenir confused deputy

### Secretos y Cifrado
- **Secrets Manager** para DB credentials, JWT keys, API keys — rotación automática configurada
- **KMS CMK** para RDS, ElastiCache, S3 con PII, CloudTrail logs
- **NUNCA** secrets como `environment` vars plaintext en Task Definition — usar `secrets[].valueFrom` con ARN

### Perímetro y Detección
- **Security Groups**: SG-to-SG references (no CIDR), RDS/Cache solo acepta desde ECS SG
- **WAF v2**: IP Reputation + AWS CRS (OWASP) + Rate Limit en todo ALB público
- **GuardDuty + Security Hub**: habilitados con alertas SNS en hallazgos HIGH/CRITICAL
- **CloudTrail**: multi-region, validación de integridad, retención 365 días minimum

### Checklist de Revisión de Seguridad AWS
- [ ] IAM roles separados (execution vs task) por servicio
- [ ] Policies con `Resource` scoped (no `"*"`)
- [ ] Secrets en Secrets Manager con rotación habilitada
- [ ] KMS CMK en RDS, ElastiCache, S3 PII
- [ ] Security Groups: RDS/Cache solo desde ECS SG (no CIDRs públicos)
- [ ] WAF asociado al ALB con IP Reputation + CRS + Rate Limit
- [ ] GuardDuty y Security Hub habilitados
- [ ] CloudTrail multi-region activo
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---|---|
| Controles OWASP Top 10 cubiertos | ≥ 8/10 |
| Servicios de seguridad AWS documentados | ≥ 7 (IAM, KMS, Secrets Manager, WAF, GuardDuty, Security Hub, CloudTrail) |
| Anti-patrones documentados | ≥ 11 |
| Políticas IAM con ejemplo JSON/HCL | ≥ 3 |
| Preguntas de revisión de seguridad | ≥ 9 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — IAM Least Privilege, KMS CMK, Secrets Manager rotation, Security Groups SG-to-SG, WAF v2 managed rules, GuardDuty, Security Hub, CloudTrail
