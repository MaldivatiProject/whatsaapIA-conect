# ☁️ SKILL: AWS CLOUD ARCHITECTURE SENIOR

**skill_id**: aws-cloud-architecture-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: cloud / aws / architecture  
**last_updated**: 2026-03-21  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-engineer-prompt-senior, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go, zns-architecture, zns-devops  
**dependencias**: ninguna (skill autónoma)  
**referencia_stack**: AWS (ECS Fargate, ALB, RDS Aurora, ElastiCache, S3, CloudFront, SQS/SNS, Route53, CloudWatch, ECR)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento arquitectónico de AWS necesario para diseñar prompts precisos para agentes de arquitectura, DevOps y backend que operan sobre infraestructura AWS. Cubre los servicios core, los patrones de alta disponibilidad, la nomenclatura estándar y los anti-patrones más comunes en arquitecturas de producción. Aplicar cuando se diseñan prompts para agentes que deben tomar decisiones de diseño, generar Terraform, revisar arquitecturas o implementar servicios sobre AWS.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Well-Architected Framework — 6 pilares no negociables**
   - **Excelencia Operacional**: Observabilidad con CloudWatch Metrics/Logs/Alarms + X-Ray. Runbooks en Confluence/Wiki. Deployments automáticos sin hands-on.
   - **Seguridad**: Least privilege IAM, sin credenciales hardcodeadas, cifrado at-rest y in-transit, VPC con subnets privadas para workloads.
   - **Confiabilidad**: Multi-AZ obligatorio en producción para DB y ECS. Health checks configurados. Auto Scaling por métricas CPU/Memory.
   - **Eficiencia de Rendimiento**: Right-sizing de instancias. ElastiCache para hot data. CloudFront para activos estáticos. RDS read replicas para lectura intensiva.
   - **Optimización de Costos**: Savings Plans o Reserved Instances para workloads estables. Spot para batch/CI. S3 lifecycle policies. CloudWatch alarms en Cost Anomaly Detection.
   - **Sostenibilidad**: Graviton3 (ARM64) donde la workload lo permite — hasta 40% de reducción en consumo energético vs x86.

2. **Arquitectura por capas (3-tier mínimo en producción)**
   ```
   Internet → Route53 → CloudFront → ALB (público) → ECS Fargate (privado) → RDS Aurora / ElastiCache (aislado)
   ```
   - Ningún recurso de cómputo o datos tiene IP pública directa.
   - El ALB es el único punto de entrada HTTP/HTTPS.
   - Las tareas Fargate no tienen `assignPublicIp: ENABLED`.

3. **Nomenclatura estándar ZNS para recursos AWS**
   ```
   {proyecto}-{ambiente}-{recurso}[-{sufijo}]
   ejemplos:
     mtg-mitoga-prod-cluster     ← ECS Cluster
     mtg-mitoga-prod-alb         ← Application Load Balancer
     mtg-mitoga-prod-db          ← RDS Cluster
     mtg-mitoga-prod-cache       ← ElastiCache
     mtg-mitoga-prod-bucket-assets ← S3 Bucket
   ```
   Tags obligatorios en TODOS los recursos:
   ```hcl
   tags = {
     Project     = "mitoga"
     Environment = "prod"     # dev | staging | prod
     ManagedBy   = "terraform"
     Owner       = "platform-team"
   }
   ```

4. **VPC Design — Subnets obligatorias**
   ```
   VPC CIDR: 10.0.0.0/16
   ├── public   10.0.1.0/24, 10.0.2.0/24   (AZ-a, AZ-b) ← ALB, NAT Gateway
   ├── private  10.0.11.0/24, 10.0.12.0/24 (AZ-a, AZ-b) ← ECS Tasks
   └── isolated 10.0.21.0/24, 10.0.22.0/24 (AZ-a, AZ-b) ← RDS, ElastiCache
   ```
   - Subnets `isolated` NO tienen route al Internet Gateway ni al NAT. Solo conexión vía VPC Endpoint (S3, Secrets Manager, SSM) o desde subnets `private`.

---

### Servicios Core y Sus Patrones

#### Cómputo: ECS Fargate (stack ZNS preferido)

```hcl
# Patrones obligatorios en Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${local.prefix}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"      # obligatorio en Fargate
  cpu                      = 512           # 0.5 vCPU — ajustar por SLA
  memory                   = 1024          # 1 GB
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn  # permisos de la app

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8080, protocol = "tcp" }]
    environment = []           # CERO secrets como env vars
    secrets = [                # secretos via Secrets Manager / SSM
      { name = "DB_PASSWORD", valueFrom = aws_secretsmanager_secret.db.arn }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.prefix}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "app"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}
```

**Auto Scaling ECS — regla mínima:**
```hcl
# Scale out: CPU > 70% por 2 períodos de 60s
# Scale in: CPU < 30% por 5 períodos de 60s
# Min: 1 tarea | Max: 10 tareas (ajustar según carga)
```

#### Networking: ALB + Target Groups

```
ALB Listener Rules:
  HTTPS:443 → Default → TG-app (puerto 8080)
  HTTP:80   → Redirect → HTTPS:443 (301 permanente — NUNCA servir HTTP)

Target Group:
  Protocol: HTTP (TLS termina en ALB)
  Health Check: GET /actuator/health — threshold healthy=2, unhealthy=3
  Stickiness: DISABLED (stateless apps con JWT/cookies)
  Deregistration delay: 30s (matching graceful shutdown de la app)
```

#### Datos: RDS Aurora PostgreSQL

```
Configuración producción:
  Engine:    aurora-postgresql 15.x
  Class:     db.t4g.medium (Graviton) mínimo — db.r7g para prod real
  Multi-AZ:  ENABLED (writer + reader en distintas AZs)
  Backup:    Retention 7 días, backup window 02:00-03:00 UTC
  Encryption: kms_key_id = aws_kms_key.rds.arn (NUNCA default AWS key)
  Subnet:    isolated subnets ÚNICAMENTE
  SG:        Solo acepta tráfico del SG de ECS tasks (puerto 5432)
  Parameter Group: max_connections = LEAST({DBInstanceClassMemory/9531392}, 5000)
```

#### Cache: ElastiCache Redis

```
Configuración producción:
  Engine:       Redis 7.x
  Node type:    cache.t4g.small (Graviton) para workloads < 1k req/s
  Cluster mode: DISABLED para apps con un shard; ENABLED solo si > 50GB
  Multi-AZ:     ENABLED con auto-failover
  Encryption:   at-rest (KMS) + in-transit (TLS — requireTLS=yes)
  Auth:         AUTH token obligatorio (secreto en Secrets Manager)
  Subnet:       isolated subnets ÚNICAMENTE
  Backup:       Snapshot diario, retention 3 días mínimo
```

#### Almacenamiento: S3

```
Configuración mandatoria (todo bucket):
  versioning:         ENABLED
  server_side_encryption: AES256 o aws:kms
  block_public_access: TODOS los cuatro flags en true
  lifecycle_rules:
    - Mover a S3-IA después de 90 días
    - Mover a Glacier después de 365 días
    - Expirar versiones no-current después de 30 días
  access_logging:     ENABLED → bucket separado de logs
```

#### Mensajería: SQS + SNS

```
SQS patrones:
  - Standard Queue para procesamiento at-least-once
  - FIFO Queue (.fifo) cuando el orden importa (pagos, comandos)
  - DLQ obligatoria (maxReceiveCount: 3) — nunca perder mensajes
  - retention: 14 días (máximo)
  - visibility_timeout: 6x el tiempo de procesamiento esperado
  - Encryption: SqsManagedSseEnabled o KMS

SNS → SQS Fan-out:
  1 SNS Topic → N SQS Queues (no conectar Lambda directamente a SNS en prod)
  Filter policy por mensaje attribute para routing condicional
```

#### Observabilidad: CloudWatch

```
Alarms obligatorias (mínimo):
  1. ECS CPU Utilization > 85% (5 min) → SNS alert
  2. ECS Memory Utilization > 80% (5 min) → SNS alert
  3. ALB HTTP 5xx rate > 1% (5 min) → SNS alert + runbook link
  4. ALB TargetResponseTime p99 > 2s → SNS alert
  5. RDS CPU > 80% (10 min) → SNS alert
  6. RDS FreeStorageSpace < 10GB → SNS alert
  7. ElastiCache CacheHitRate < 80% → Investigación de queries

Log Insights queries críticas:
  # Errores últimas 24h
  fields @timestamp, @message
  | filter @message like /ERROR|Exception/
  | sort @timestamp desc
  | limit 100
```

---

### Patrones de Arquitectura Más Usados en ZNS

#### Patrón 1: API Gateway Pattern (ECS + ALB)
```
CloudFront → ALB → ECS (API Gateway Service) → ECS (Microservices)
                                              → RDS Aurora
                                              → ElastiCache Redis
```
Cuándo usarlo: Aplicaciones con API pública, SSO/JWT, múltiples microservicios internos.

#### Patrón 2: Event-Driven con SQS/SNS
```
ECS App → SNS Topic → SQS Queue 1 (Notificaciones)
                    → SQS Queue 2 (Auditoría)
                    → SQS Queue 3 (Analytics)
         ← ECS Consumer ← SQS Queue con DLQ
```
Cuándo usarlo: Procesamiento asíncrono, desacoplamiento de servicios, tolerancia a fallos.

#### Patrón 3: Static + Dynamic (CloudFront + ALB)
```
Route53 → CloudFront → Origin 1: S3 (/*.js, /*.css, /assets/*)
                     → Origin 2: ALB (/api/*, /auth/*)
```
Cuándo usarlo: Frontend SPA (Next.js/Vue) + Backend API en la misma URL.

---

## ✅ Criterios de Aplicación

- Cuando el agente receptor diseña, revisa o genera arquitectura para workloads en AWS
- Cuando el agente receptor genera código Terraform, CDK o CloudFormation
- Cuando el agente receptor implementa servicios backend que consumen servicios AWS (S3, SQS, Secrets Manager)
- Cuando se diseña un prompt para un agente de DevOps/Infra/Arquitectura en contexto AWS

## ❌ Anti-patrones — NUNCA en arquitecturas ZNS AWS

- ❌ **EC2 con SSH directo** — usar ECS Fargate + ECS Exec a través de SSM Session Manager
- ❌ **Recursos en subnets públicas sin SG restrictivo** — ALB es el único recurso con IP pública
- ❌ **RDS MultiAZ disabled en producción** — una sola AZ es inaceptable para datos de negocio
- ❌ **Secrets en variables de entorno plaintext** — siempre Secrets Manager o SSM Parameter Store (SecureString)
- ❌ **S3 con acceso público habilitado** — bloquear los 4 flags de `block_public_access` siempre
- ❌ **HTTP en producción** — ALB listener en 80 solo para redirect to HTTPS 443
- ❌ **Una sola AZ** — toda carga productiva requiere mínimo 2 AZs (multi-AZ)
- ❌ **Auto Scaling desactivado** — todas las tareas ECS deben tener al menos una política de scaling
- ❌ **Logs sin retention policy** — CloudWatch Log Groups sin retention → costo exponencial
- ❌ **IAM Role con `*:*` en producción** — least privilege siempre, sin excepciones
- ❌ **Default VPC en producción** — siempre VPC dedicada con diseño de subnets explícito

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Preguntas de entrevista para diseñar prompt de agente de arquitectura AWS

**Escenario**: El Prompt Engineer debe crear un agente "AWS Solutions Architect Senior".

**Con esta skill active, las preguntas críticas adicionales son:**
```markdown
## Preguntas AWS adicionales para el agente:

### Servicios y Stack
- ¿Qué servicios AWS core usa el proyecto? (ECS/Lambda/EC2, RDS/Aurora/DynamoDB, etc.)
- ¿Hay workloads de contenedores? → ECS Fargate o EKS
- ¿Hay procesamiento asíncrono? → SQS/SNS/EventBridge/Kinesis

### Alta Disponibilidad
- ¿Cuál es el RTO y RPO del sistema? (ej: RTO < 30min, RPO < 5min)
- ¿Multi-region o multi-AZ? ¿Cuántas AZs?
- ¿Hay requerimientos de DR (Disaster Recovery)?

### Seguridad y Compliance
- ¿Qué datos sensibles se manejan? (PII, PCI, PHI, HIPAA...)
- ¿Hay requerimientos de cifrado específicos (KMS CMK vs AWS-managed)?
- ¿Se necesita AWS WAF, Shield Advanced, GuardDuty?

### Costos y Escalabilidad
- ¿Hay patrones de tráfico predecibles? → Scheduled scaling
- ¿Hay workloads batch/background? → Spot instances / Fargate Spot
- ¿Cuál es el presupuesto mensual aproximado de infra AWS?

### Observabilidad
- ¿Los equipos ya usan CloudWatch o hay un stack externo (Datadog, New Relic)?
- ¿Se necesita X-Ray distributed tracing?
- ¿Hay alerting por PagerDuty, OpsGenie u otro?
```

### Ejemplo 2: Sección de expertise AWS en un rol de agente

**Input**: Diseñar el "Contexto del Rol" para un agente "DevOps AWS Senior".

**Output con la skill aplicada:**
```markdown
### 3️⃣ AWS Cloud (Stack de Producción)
- **Cómputo**: ECS Fargate (task definitions, services, auto scaling por CPU/Memory/custom metrics)
- **Networking**: VPC 3-tier (public/private/isolated), ALB con reglas de routing y WAF, Route53 private zones
- **Datos**: RDS Aurora PostgreSQL Multi-AZ, ElastiCache Redis cluster con TLS + AUTH token
- **Mensajería**: SQS Standard/FIFO con DLQ, SNS fan-out, EventBridge para event routing
- **Almacenamiento**: S3 con versioning + lifecycle policies + server-side encryption (KMS)
- **Seguridad**: IAM roles por principio de mínimo privilegio, Secrets Manager, KMS CMK, VPC endpoints
- **Observabilidad**: CloudWatch alarms multi-dimensionales, Log Insights queries, CloudTrail, X-Ray
- **Contenedores**: ECR con image scanning (Trivy), Docker multi-stage, Fargate Spot para CI
- **Well-Architected**: 6 pilares como criterios de evaluación en cada decisión de diseño
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente sección en su archivo `.md`:

```markdown
## SKILL ACTIVA: AWS CLOUD ARCHITECTURE → ver: 2-agents/zns-tools/skills/aws-cloud-architecture-senior.skill.md

### Arquitectura AWS — Principios Mandatorios
- **Tier de subnets**: public (ALB/NAT) → private (ECS) → isolated (RDS/Cache) — NINGÚN compute/data con IP pública directa
- **Multi-AZ obligatorio en prod**: mínimo 2 AZs para ECS, RDS Multi-AZ, ElastiCache multi-AZ con failover
- **Zero secrets en env vars**: Secrets Manager o SSM SecureString — nunca plaintext en Task Definition
- **HTTP → HTTPS redirect**: ALB listener 80 solo para redirect 301 a 443. NUNCA content en HTTP
- **Tags obligatorios**: Project, Environment, ManagedBy, Owner en TODOS los recursos
- **Nomenclatura**: `{proyecto}-{ambiente}-{recurso}` (ej: `mtg-mitoga-prod-cluster`)
- **Logs con retention**: CloudWatch Log Groups siempre con retention_in_days (14-90 días según ambiente)
- **IAM least privilege**: un rol por servicio/tarea — NUNCA AdministratorAccess en workloads
- **Well-Architected como filtro**: toda decisión arquitectónica se evalúa contra los 6 pilares

### Checklist de Arquitectura AWS por Entregable
- [ ] VPC: 3 tiers de subnets documentados con CIDRs
- [ ] ECS: Task Definition con health check, log config, secrets por ref (no plaintext)
- [ ] RDS: Multi-AZ, KMS encryption, subnet isolated, SG restrictivo
- [ ] ALB: HTTPS listener, HTTP→HTTPS redirect, WAF si endpoint público
- [ ] S3: Versioning + encryption + block_public_access (4 flags)
- [ ] CloudWatch: Alarms para CPU, Memory, 5xx rate, latencia p99
- [ ] IAM: Roles separados (execution vs task), policies con least privilege
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---|---|
| Servicios AWS core cubiertos | ≥ 8 (ECS, ALB, RDS, ElastiCache, S3, SQS/SNS, CloudWatch, IAM) |
| Anti-patrones documentados | ≥ 10 |
| Ejemplos de código Terraform/HCL | ≥ 3 bloques funcionales |
| Cobertura Well-Architected | 6/6 pilares |
| Preguntas de entrevista AWS | ≥ 12 preguntas específicas |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — cobertura de ECS Fargate, ALB, RDS Aurora, ElastiCache, S3, SQS/SNS, CloudWatch, VPC 3-tier, Well-Architected Framework
