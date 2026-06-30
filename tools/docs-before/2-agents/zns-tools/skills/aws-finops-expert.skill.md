# 💰 SKILL: AWS FINOPS EXPERT — OPTIMIZACIÓN DE COSTOS CLOUD

**skill_id**: aws-finops-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: finops / cloud / aws / cost-optimization  
**last_updated**: 2026-03-21  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-engineer-prompt-senior, zns-devops, zns-architecture, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go  
**dependencias**: aws-cloud-architecture-senior (recomendada), aws-iac-terraform-expert (recomendada)  
**referencia_stack**: AWS Cost Explorer, AWS Budgets, Cost and Usage Report (CUR), Compute Optimizer, Savings Plans, Reserved Instances, Spot, Graviton3, S3 Intelligent-Tiering, CloudWatch Cost Anomaly Detection, FinOps Foundation Framework

---

## 📌 Propósito de la Skill

> **"El costo no controlado es deuda técnica financiera — aparece tarde, duele fuerte."**

Esta skill equipa al agente con el conocimiento expert en FinOps (Financial Operations) para AWS: análisis de facturación, estrategias de optimización por servicio, right-sizing, compromisos de uso (Savings Plans / Reserved Instances), patrones de Spot, governance de costos y alertas proactivas. Aplicar cuando se diseñan prompts para agentes de arquitectura, DevOps o cuando se evalúa cualquier decisión de infraestructura AWS que tenga impacto económico relevante.

---

## 🧠 Conocimiento Núcleo

### Los 3 Pilares de FinOps en AWS

```
1. INFORMAR   → Visibilidad total del gasto: Cost Explorer, CUR, etiquetado
2. OPTIMIZAR  → Acciones concretas: right-sizing, Savings Plans, Spot, lifecycle
3. OPERAR     → Cultura: presupuestos, alertas, revisión periódica, accountability
```

### Principios Fundamentales

1. **Sin etiquetado no hay FinOps** — toda decisión de costo es ciega sin tags correctos
   ```
   Tags obligatorios en TODOS los recursos:
   - Project      = "mitoga"
   - Environment  = "prod" | "staging" | "dev"
   - Service      = "api-gateway" | "auth" | "notifications"
   - Owner        = "platform-team" | "product-team"
   - CostCenter   = "CC-001" | "CC-002"   ← crucial para showback/chargeback
   - ManagedBy    = "terraform"

   Sin estos tags → recurso no visible en reportes → gasto fantasma
   ```

2. **Rightsizing antes de comprometerse** — nunca comprar Reserved Instances sin datos reales
   ```
   Proceso mandatorio:
   1. Ejecutar workload al menos 2-4 semanas en On-Demand para obtener baseline
   2. Revisar AWS Compute Optimizer (CPU/Memory actual vs provisionado)
   3. Reducir overprovisioning (si CPU < 20% promedio → bajar tier)
   4. Solo ENTONCES evaluar Savings Plans o RIs
   ```

3. **Gravedad del costo por ambiente** — dev/staging NO necesita configuración de producción
   ```
   Regla de oro ZNS:
   - prod:    RDS Multi-AZ + ElastiCache Multi-AZ + ECS min 2 tasks
   - staging: RDS Single-AZ (sin reader) + ElastiCache single node + ECS min 1 task
   - dev:     RDS smallest tier + sin ElastiCache (mock o Redis local) + ECS Fargate Spot
   
   Ahorro típico: 60-70% en ambientes no productivos vs clonar prod directamente
   ```

4. **Graviton siempre como opción por defecto** — hasta 40% más barato, mayor eficiencia
   ```
   Graviton3 (ARM64) — aplicar en:
   - ECS Fargate tasks: runtime_platform { cpu_architecture = "ARM64" }
   - RDS Aurora: db.t4g.* (Graviton2), db.r8g.* (Graviton3)
   - ElastiCache: cache.t4g.*, cache.r7g.*

   Excepción: workloads que requieren bibliotecas nativas x86 sin compilación ARM
   Validar con: AWS Graviton Fast Start program + Compute Optimizer recommendations
   ```

---

### Herramientas de Visibilidad FinOps

#### Cost Explorer — Análisis de gasto

```
Vistas clave a configurar en Cost Explorer:

1. FILTRO: por tag Service + Environment
   → detectar qué microservicio/ambiente gasta más

2. FILTRO: por Linked Account + Service
   → útil si se usan múltiples cuentas AWS (org multi-account)

3. GRÁFICO: Daily cost + forecast
   → detectar spikes y proyección mensual

4. GROUPING: Usage Type
   → distinguir DataTransfer-Out (costoso) vs EC2-BoxUsage vs RDS-Multi-AZ

Report guardado recomendado: "Daily by Service + Environment" — revisión semanal
```

#### AWS Cost and Usage Report (CUR) + Athena

```sql
-- Query CUR en Athena para detectar top 10 recursos más costosos
SELECT
  line_item_resource_id,
  product_servicename,
  resource_tags_user_service,
  resource_tags_user_environment,
  ROUND(SUM(line_item_unblended_cost), 2) AS total_cost_usd
FROM "aws_cost_report"."mitoga_cur"
WHERE
  year = '2026'
  AND month = '03'
  AND line_item_line_item_type IN ('Usage', 'Fee')
GROUP BY 1, 2, 3, 4
ORDER BY total_cost_usd DESC
LIMIT 10;

-- Query para detectar data transfer entre AZs (costo oculto frecuente)
SELECT
  line_item_resource_id,
  line_item_usage_type,
  ROUND(SUM(line_item_unblended_cost), 2) AS cost_usd
FROM "aws_cost_report"."mitoga_cur"
WHERE line_item_usage_type LIKE '%DataTransfer-Regional%'
GROUP BY 1, 2
ORDER BY cost_usd DESC;
```

#### AWS Budgets — Alertas Proactivas

```hcl
# Terraform: Budget con alertas en 80% y 100% del límite mensual
resource "aws_budgets_budget" "monthly" {
  name         = "${local.prefix}-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_usd   # ej: "500" USD/mes
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Project$mitoga"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"  # alerta predictiva
    subscriber_email_addresses = [var.finops_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.finops_alert_email]
  }
}

# Cost Anomaly Detection — detecta spikes inesperados con ML
resource "aws_ce_anomaly_monitor" "service" {
  name         = "${local.prefix}-anomaly-monitor"
  monitor_type = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "main" {
  name      = "${local.prefix}-anomaly-subscription"
  frequency = "DAILY"
  monitor_arn_list = [aws_ce_anomaly_monitor.service.arn]
  subscriber {
    address = var.finops_alert_email
    type    = "EMAIL"
  }
  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["20"]  # alerta si el spike > $20 vs baseline
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}
```

---

### Estrategias de Optimización por Servicio

#### ECS Fargate — Estrategias de costo

```
1. FARGATE SPOT para workloads tolerantes a interrupciones:
   - Dev/Staging: 100% Fargate Spot (70% de descuento vs On-Demand)
   - Prod background jobs: Fargate Spot con capacidad provider strategy
   - Prod API: On-Demand (no se puede interrumpir tráfico de usuario)

   Terraform:
   capacity_provider_strategy {
     capacity_provider = "FARGATE_SPOT"
     weight = 1
     base   = 0
   }
   capacity_provider_strategy {
     capacity_provider = "FARGATE"
     weight = 0
     base   = 1  # siempre 1 tarea On-Demand como fallback
   }

2. RIGHT-SIZING de CPU/Memory:
   - Revisar CloudWatch ECS ContainerInsights métricas
   - Si CpuUtilized < 20% del provisionado → reducir a siguiente tier
   - Memory: no reducir si hay Java/JVM → JVM reserva heap agresivamente
   - Herramienta: AWS Compute Optimizer → recomendaciones automatizadas

3. SCHEDULE SCALING en dev/staging:
   - Apagar ECS tasks en staging fuera de horario laboral (20:00 - 08:00 + fines de semana)
   - Ahorro: 70% del costo de ECS staging
   - EventBridge Scheduler + ScalableTarget con desired_count = 0
```

#### RDS Aurora — Estrategias de costo

```
1. AURORA SERVERLESS v2 para dev/staging:
   - Escala desde 0.5 ACUs (≈ 1GB RAM) hasta límite configurable
   - Se apaga automáticamente después de inactividad (si se habilita)
   - Ideal para dev: paga por segundo de uso real
   - ACU mínimo = 0.5, máximo = 8 para dev/staging

   Terraform:
   serverlessv2_scaling_configuration {
     min_capacity = 0.5
     max_capacity = 8
   }

2. RESERVED INSTANCES para producción:
   - 1 año → 38% de descuento vs On-Demand
   - 3 años → 58% de descuento
   - Aplicar SOLO después de 4+ semanas de baseline con rightsizing confirmado
   - Calcular con AWS Cost Explorer → Reservations → Purchase Recommendations

3. STORAGE AUTO SCALING:
   - Habilitar siempre: no pagar por storage no usado desde el día 1
   - max_allocated_storage = capacidad máxima razonable (ej: 200 GB)
   - aurora-postgresql escala storage automáticamente sin interrupciones
```

#### S3 — Estrategias de costo

```
1. S3 INTELLIGENT-TIERING para objetos con acceso impredecible:
   - AWS mueve objetos automáticamente entre tiers (Frequent, Infrequent, Archive)
   - Costo de monitoreo: $0.0025 por 1000 objetos/mes
   - Solo aplica a objetos > 128 KB y > 30 días de existencia
   - Ahorro potencial: hasta 68% vs S3 Standard para datos fríos

2. LIFECYCLE POLICIES — mandatorias en todo bucket:
   lifecycle_rule {
     id      = "transition-to-ia"
     enabled = true
     transition {
       days          = 90
       storage_class = "STANDARD_IA"    # 45% más barato que Standard
     }
     transition {
       days          = 365
       storage_class = "GLACIER_IR"     # 68% más barato que Standard
     }
     expiration {
       days = 2555  # 7 años → compliance + limpieza
     }
     noncurrent_version_expiration {
       noncurrent_days = 30  # versiones antiguas → no acumular storage
     }
   }

3. DATA TRANSFER — el costo oculto más frecuente:
   - Transfer OUT a Internet: $0.09/GB (después del primer GB free)
   - Transfer entre AZs en la misma región: $0.01/GB por dirección
   - MITIGACIÓN: CloudFront delante de S3 → reduce transferencia directa desde S3
   - MITIGACIÓN: co-localizar ECS y RDS en mismas AZs cuando es posible
   - VPC Endpoints para S3 → elimina NAT Gateway costs para acceso S3
```

#### Data Transfer — El Costo Invisible

```
Regla: "El dato que viaja entre servicios en distintas AZs cuesta dinero"

Costo aproximado data transfer:
- Misma AZ: GRATIS
- Entre AZs (misma región): $0.01/GB por dirección = $0.02/GB round-trip
- A Internet (egress): $0.09/GB (primeros 10TB/mes)
- CloudFront → Internet: $0.0085/GB (6x más barato que ALB directo)
- VPC Endpoint (S3/DynamoDB): GRATIS (reemplaza NAT Gateway cost para esos servicios)

Optimizaciones:
1. App y DB en misma AZ cuando para uso de lectura intensiva
2. ElastiCache en misma AZ que la mayoría de tasks ECS → App-to-Cache gratis
3. S3 via VPC Endpoint → elimina costo de NAT Gateway para acceso S3
4. CloudFront para assets estáticos → reduce ALB + Data Transfer cost
5. NAT Gateway: $0.045/hora + $0.045/GB → considerar NAT Instance (t4g.nano) en dev
```

---

### Savings Plans vs Reserved Instances

```
SAVINGS PLANS (recomendado para la mayoría):
  Compute Savings Plans:
    - Descuento hasta 66% vs On-Demand
    - Aplica automáticamente a Fargate, Lambda, EC2 (cualquier familia, región, OS)
    - Compromiso: $/hora durante 1 o 3 años
    - Más flexible → preferido sobre RIs para ECS Fargate

  EC2 Instance Savings Plans:
    - Descuento hasta 72% vs On-Demand
    - Scoped a familia de instancia + región (menos flexible)
    - Mejor opción si el fleet de EC2 es estable en familia/región

RESERVED INSTANCES (para RDS y ElastiCache):
  - Fargate NO tiene RIs → usar Compute Savings Plans
  - RDS: 1 año = 38%, 3 años = 58%
  - ElastiCache: 1 año = 31%, 3 años = 55%
  - Proceso: comprar SOLO después de rightsizing confirmado, NUNCA al inicio

REGLA DE DECISIÓN:
  semana 1-4:   On-Demand puro → recopilar baseline
  semana 5-8:   Compute Optimizer + rightsizing
  semana 9+:    Comprar Savings Plans (Compute) para ECS + Fargate
  mes 3+:       Comprar RIs para RDS + ElastiCache con datos reales
```

---

### Dashboard FinOps — Revisión Semanal (30 min)

```markdown
## Checklist revisión FinOps semanal:

### 1. Costo actual vs presupuesto (5 min)
- [ ] Cost Explorer → filtro este mes → vs mes anterior → vs forecast
- [ ] Budget actual vs límite configurado
- [ ] Alguna anomalía detectada por Cost Anomaly Detection?

### 2. Top spenders (5 min)
- [ ] Cost Explorer → Group by: Service → este mes
- [ ] ¿Hay algún servicio que creció > 20% vs semana anterior?
- [ ] ¿Hay recursos sin tag (cost allocation sin proyecto)?

### 3. Data Transfer (5 min)
- [ ] Revisar "DataTransfer-Out-Bytes" en Cost Explorer
- [ ] ¿Aumentó el tráfico de salida? ¿Por qué?
- [ ] ¿Hay transferencia regional inesperada (entre AZs)?

### 4. Compute Optimizer (5 min)
- [ ] Hay nuevas recomendaciones de rightsizing?
- [ ] ECS tasks con CPU/Memory sobredimensionados (< 20% utilización)?
- [ ] RDS con clase de instancia mayor a lo necesario?

### 5. Recursos huérfanos (10 min)
- [ ] EBS snapshots sin asociar > 30 días
- [ ] Elastic IPs no asociadas ($3.65/mes cada una)
- [ ] Load Balancers sin tráfico en los últimos 7 días
- [ ] NAT Gateways en ambientes que no están en uso
- [ ] ECR → imágenes no usadas en los últimos 90 días (lifecycle policy)
```

---

### Recursos Huérfanos — Los más Comunes y Costosos

```
1. Elastic IP no asociada: $3.65/mes → revisar semanalmente
2. ALB sin targets activos: ~$16/mes → eliminar si no hay tráfico
3. NAT Gateway sin actividad: ~$32/mes (solo el costo de hora)
4. EBS Snapshot olvidados: $0.05/GB/mes, crecen indefinidamente
5. ECR imágenes sin política de lifecycle: S3 storage crece sin control
6. Ambientes dev/staging ON 24/7 cuando solo se usan 40h/semana

Terraform para evitar snapshots huérfanos:
resource "aws_dlm_lifecycle_policy" "ebs" {
  description        = "EBS snapshot retention policy"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"
  policy_details {
    resource_types = ["VOLUME"]
    schedule {
      name = "daily-snapshots"
      create_rule { interval = 24; interval_unit = "HOURS"; times = ["03:00"] }
      retain_rule { count = 7 }  # solo últimos 7 snapshots
      copy_tags = true
    }
  }
}
```

---

## ✅ Criterios de Aplicación

- El agente toma decisiones de diseño de infraestructura AWS con impacto en costo
- El agente revisa código Terraform donde se configuran tipos de instancia, capacidades o arquitecturas multi-AZ
- El agente diseña prompts para agentes de arquitectura o DevOps que deben incluir dimensión de costo
- Se está eligiendo entre servicios AWS equivalentes (ej: ECS vs Lambda, RDS vs DynamoDB)
- Se diseña un ambiente nuevo (dev, staging, prod) y se quiere controlar el presupuesto

## ❌ Anti-patrones FinOps — Los más costosos

- ❌ **Clonar producción en staging/dev** — staging no necesita Multi-AZ ni réplicas de lectura
- ❌ **Sin lifecycle policies en S3** — el storage crece indefinidamente sin limpiar versiones y snapshots
- ❌ **Sin Cost Anomaly Detection** — los spikes se detectan con días de retraso en la factura mensual
- ❌ **Sin etiquetado de recursos** — sin tags no hay chargeback/showback ni análisis por servicio
- ❌ **Graviton ignorado** — x86 cuando ARM64 es compatible = 20-40% de costo extra innecesario
- ❌ **Comprar Savings Plans/RIs desde el día 1** — sin baseline = compromiso financiero sobredimensionado
- ❌ **NAT Gateway en dev 24/7** — NAT Instance (t4g.nano ~$3/mes) válida para dev vs $32+/mes NAT Gateway
- ❌ **ECS Fargate On-Demand para todos los ambientes** — Fargate Spot para dev/staging (70% descuento)
- ❌ **Elastic IPs no liberadas** — IPs no asociadas generan costo continuo desde 2024 ($3.65/IP/mes)
- ❌ **`desired_count` fijo en staging** — usar scheduled scaling para apagar fuera de horario laboral
- ❌ **Sin Budget alerts** — el equipo se entera del overspend a fin de mes en la factura
- ❌ **Data Transfer ignorado** — tráfico entre AZs y hacia Internet puede superar el costo de cómputo

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Dimensionamiento de ambientes con impacto FinOps

```markdown
## Dimensionamiento por Ambiente — Ejemplo Mi-Toga

| Recurso            | prod                   | staging              | dev                  | Ahorro staging/dev |
|-------------------|------------------------|----------------------|----------------------|--------------------|
| ECS CPU/Memory    | 1024/2048 On-Demand    | 512/1024 Spot        | 256/512 Spot         | ~80%               |
| RDS               | Aurora Multi-AZ r7g.lg | Aurora Serverless v2 | Aurora Serverless v2 | ~70%               |
| ElastiCache       | cache.r7g.lg Multi-AZ  | cache.t4g.micro      | mock local/suprimido | ~90%               |
| Schedule          | 24/7                   | L-V 08:00-20:00      | L-V 08:00-20:00      | staging: -58%      |
| NAT Gateway       | 2 (1 por AZ)           | 1                    | NAT Instance t4g.nano| ~85%               |
| Costo estimado/mes| $450-600               | ~$60-80              | ~$20-30              | -                  |
```

### Ejemplo 2: Preguntas FinOps para diseñar prompt de agente de arquitectura AWS

```markdown
### FinOps — Preguntas obligatorias al diseñar arquitectura:
- ¿Cuál es el presupuesto mensual de infraestructura AWS? (si no hay uno → crearlo)
- ¿Existe un Budget en AWS Budgets con alertas al 80% y 100%?
- ¿Todos los recursos tienen los tags obligatorios (Project, Environment, Service, Owner, CostCenter)?
- ¿Se usará Graviton (ARM64) para ECS, RDS y ElastiCache?
- ¿Los ambientes dev/staging tienen scheduled scaling (apagado fuera de horario)?
- ¿Se han configurado lifecycle policies en todos los buckets S3?
- ¿ECR tiene lifecycle policy para eliminar imágenes no utilizadas?
- ¿Hay Cost Anomaly Detection configurado para alertar spikes?
- ¿Cuándo se realizará el rightsizing antes de comprar Savings Plans o RIs?
- ¿Hay un CUR exportado a S3 para análisis con Athena?
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
## SKILL ACTIVA: AWS FINOPS EXPERT → ver: 2-agents/zns-tools/skills/aws-finops-expert.skill.md

### FinOps — Mandatorios en Toda Decisión de Infraestructura AWS

**Visibilidad (sin esto no hay FinOps):**
- Tags obligatorios en TODOS los recursos: `Project`, `Environment`, `Service`, `Owner`, `CostCenter`, `ManagedBy`
- AWS Budgets configurado con alertas FORECASTED al 80% y ACTUAL al 100% → SNS/email
- Cost Anomaly Detection habilitado (spike > $20 vs baseline → alerta diaria)

**Optimización por ambiente:**
- `prod`: On-Demand + Graviton + Compute Savings Plans (después de 4 semanas de baseline)
- `staging`: Fargate Spot + Aurora Serverless v2 + scheduled scaling (apagado 20:00-08:00 L-V)
- `dev`: Fargate Spot + Aurora Serverless v2 + NAT Instance (t4g.nano) + scheduled scaling

**Right-sizing obligatorio:**
- Revisar AWS Compute Optimizer antes de provisionar cualquier recurso "a ojo"
- CPU < 20% promedio → bajar a siguiente tier antes de comprar RIs
- Graviton (ARM64) como primera opción: ECS cpu_architecture=ARM64, db.t4g/r7g, cache.t4g/r7g

**S3 y Data Transfer:**
- Lifecycle policy en TODOS los buckets (STANDARD_IA → 90d, GLACIER → 365d, expire → 2555d)
- VPC Endpoint para S3 en todas las VPCs → elimina costo NAT Gateway para acceso S3
- CloudFront delante de S3/ALB → reduce data transfer a Internet (6x más barato)

**Recursos huérfanos — revisar semanalmente:**
- Elastic IPs no asociadas ($3.65/IP/mes — AWS cobra desde 2024)
- ALBs sin tráfico, NAT Gateways inactivos, EBS snapshots > 30 días sin reclamo
- ECR lifecycle policy: eliminar imágenes untagged > 1 día, tagged-no-usadas > 90 días

**Checklist FinOps por entregable de arquitectura:**
- [ ] Todos los recursos Terraform con bloque `tags = local.common_tags`
- [ ] AWS Budget declarado en Terraform con alertas 80% + 100%
- [ ] Cost Anomaly Monitor configurado
- [ ] ECS staging/dev usa Fargate Spot (capacity_provider_strategy)
- [ ] ECS staging/dev tiene scheduled scaling (desired_count=0 fuera de horario)
- [ ] RDS staging/dev usa Aurora Serverless v2 (no Multi-AZ)
- [ ] Todos los buckets S3 con lifecycle_rule
- [ ] VPC Endpoint para S3 declarado
- [ ] Graviton habilitado: `cpu_architecture = "ARM64"` en task def runtime_platform
- [ ] `prevent_destroy = true` en KMS keys y RDS en producción (evitar reconstrucción costosa)
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---|---|
| Servicios FinOps AWS cubiertos | ≥ 8 (Cost Explorer, Budgets, Anomaly Detection, Compute Optimizer, Savings Plans, Spot, CUR, Graviton) |
| Anti-patrones documentados | ≥ 12 |
| Estrategias de ahorro con porcentaje estimado | ≥ 5 con % concreto |
| Preguntas FinOps para entrevista de agente | ≥ 10 |
| Ejemplos Terraform (Budgets, Spot, lifecycle) | ≥ 3 bloques funcionales |
| Reducción de costo staging/dev documentada | ≥ 60% estimado con tabla |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — etiquetado, Cost Explorer, Budgets, Anomaly Detection, Graviton, Fargate Spot, Aurora Serverless v2, Savings Plans, S3 lifecycle, Data Transfer, recursos huérfanos, scheduled scaling, checklist semanal FinOps
