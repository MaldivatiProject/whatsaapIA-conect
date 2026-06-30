# 🖥️ SKILL: DEPLOYMENT DIAGRAM UX EXPERT

**skill_id**: deployment-diagram-ux-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: architecture / diagramming / deployment / ux  
**last_updated**: 2026-04-17  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tools/draw-senior/prompt-draw-c4-deployment-senior.md`
- `2-agents/zns-tecnical-team/4.zns-architecture/2.definition_of_architecture/prompt-arquitectura-soluciones.md`
- `2-agents/zns-tecnical-team/5.zns-devOps/` (cualquier agente DevOps)
**dependencias**: `c4-model-diagram-expert.skill.md` (para diagramas de despliegue C4)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con las capacidades necesarias para generar **diagramas de despliegue de altísima claridad visual y UX**. Cubre la arquitectura de infraestructura cloud (AWS, Azure, GCP), la agrupación semántica por zonas de red, las convenciones visuales para ambientes (prod/staging/dev), la iconografía oficial de cloud providers en PlantUML y los principios de diseño cognitivo aplicados a diagramas técnicos. El resultado son diagramas que cualquier ingeniero puede leer y entender en menos de 3 minutos, sin necesidad de explicación verbal.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Principios de UX Aplicados a Diagramas Técnicos

#### 1.1 Los 5 Principios de Claridad Visual ZNS

```
PRINCIPIO 1: JERARQUÍA VISUAL ANTES QUE DETALLE
→ El ojo debe saber dónde mirar primero: Internet → Load Balancer → Cómputo → Datos
→ Flujo de izquierda-a-derecha (occidente lee LTR) o top-down para jerarquías

PRINCIPIO 2: AGRUPACIÓN COGNITIVA (Gestalt: Law of Proximity)
→ Lo que pertenece junto, debe estar junto visualmente
→ Usar boundaries/nodos para: zonas de red, regiones cloud, availability zones, ambientes

PRINCIPIO 3: CARGA COGNITIVA MÍNIMA (≤ 7 ± 2 elementos por zona)
→ La memoria de trabajo humana procesa máx. 9 elementos a la vez
→ Dividir en diagramas separados si hay más de 15 nodos totales

PRINCIPIO 4: REDUNDANCIA INFORMATIVA CALCULADA
→ El color Y la forma Y el texto deben reforzarse mutuamente (no depender solo del color)
→ Accesibilidad: daltonismo afecta ~8% de hombres; usar íconos + color, no solo color

PRINCIPIO 5: CONSISTENCIA SISTÉMICA
→ El mismo tipo de componente siempre se ve igual en todos los diagramas del proyecto
→ Una leyenda única, compartida por todos los diagramas de la misma arquitectura
```

#### 1.2 Flujo Visual Óptimo para Infraestructura

```
ZONA PÚBLICA (Internet-facing)
    ↓
CDN / WAF / Route53
    ↓
ZONA DMZ (Load Balancers / API Gateway)
    ↓
ZONA PRIVADA (Compute: ECS, Lambdas, Kubernetes)
    ↓
ZONA AISLADA (Databases, Caches, Message Brokers)
    ↓
ZONA EXTERNA (Servicios de terceros, SaaS, APIs externas)
```

---

### 2️⃣ Template C4 Deployment con PlantUML (Estándar ZNS)

```plantuml
@startuml C4_Deployment_[Sistema]_[Ambiente]
!include <C4/C4_Deployment>
!define AWSPuml https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/v19.0/dist
!include AWSPuml/AWSCommon.puml
!include AWSPuml/Compute/ECS.puml
!include AWSPuml/Compute/Lambda.puml
!include AWSPuml/Database/RDS.puml
!include AWSPuml/Database/ElastiCache.puml
!include AWSPuml/NetworkingContentDelivery/CloudFront.puml
!include AWSPuml/NetworkingContentDelivery/ElasticLoadBalancing.puml
!include AWSPuml/ApplicationIntegration/SQS.puml
!include AWSPuml/ManagementGovernance/CloudWatch.puml

LAYOUT_WITH_LEGEND()
LAYOUT_LEFT_RIGHT()

title Deployment: [Nombre Sistema] — Ambiente [PROD|STAGING|DEV]\nVersión: 1.0 | Fecha: [YYYY-MM-DD] | AWS Region: [us-east-1]

' ─── USUARIOS / ACTORES ──────────────────────────────────
Deployment_Node(internet, "Internet", "Usuarios y sistemas externos") {
  Person(user_web,    "Usuario Web",    "Browser HTTPS")
  Person(user_mobile, "Usuario Móvil",  "App iOS/Android")
}

' ─── ZONA CDN / DNS ──────────────────────────────────────
Deployment_Node(aws_global, "AWS Global Edge", "CloudFront + Route53") {
  Deployment_Node(dns,  "Route53",    "DNS / Health Check") {
    InfrastructureNode(route53, "Route53",   "DNS routing, failover\nLatency-based routing")
  }
  Deployment_Node(cdn, "CloudFront", "CDN / WAF") {
    InfrastructureNode(cf, "CloudFront Distribution", "CDN para assets estáticos\nWAF rules, HTTPS forzado\nCached: /static/*, /assets/*")
  }
}

' ─── REGIÓN AWS PRINCIPAL ────────────────────────────────
Deployment_Node(aws_region, "AWS Region: us-east-1", "Región principal") {

  ' VPC
  Deployment_Node(vpc, "VPC: 10.0.0.0/16", "Red privada virtual") {

    ' ─── SUBNETS PÚBLICAS ──────────────────────────────
    Deployment_Node(subnet_pub, "Subnets Públicas (AZ-a, AZ-b)\n10.0.1.0/24, 10.0.2.0/24", "Internet-facing") {
      InfrastructureNode(alb, "Application Load Balancer", "HTTPS 443 → HTTP 8080\nHealth check: /actuator/health\nSSL: ACM Certificate")
      InfrastructureNode(nat, "NAT Gateway",               "Salida a Internet\npara subnets privadas")
    }

    ' ─── SUBNETS PRIVADAS (CÓMPUTO) ───────────────────
    Deployment_Node(subnet_priv, "Subnets Privadas (AZ-a, AZ-b)\n10.0.11.0/24, 10.0.12.0/24", "Compute tier") {

      Deployment_Node(ecs_cluster, "ECS Cluster: [sistema]-prod-cluster", "AWS Fargate — sin servidores") {
        Deployment_Node(svc_identity, "ECS Service: identity-svc", "Fargate 1 vCPU / 2 GB\nDesired: 2 | Min: 2 | Max: 5") {
          ContainerInstance(identity_task, "Identity Service", "Kotlin + Spring Boot 3.3\nPuerto 8080 | JVM 21 Corretto")
        }
        Deployment_Node(svc_core, "ECS Service: core-svc", "Fargate 2 vCPU / 4 GB\nDesired: 2 | Min: 2 | Max: 10") {
          ContainerInstance(core_task, "Core Business Service", "Kotlin + Spring Boot 3.3\nPuerto 8080 | JVM 21 Corretto")
        }
        Deployment_Node(svc_notif, "ECS Service: notif-svc", "Fargate 0.5 vCPU / 1 GB\nDesired: 1 | Min: 1 | Max: 3") {
          ContainerInstance(notif_task, "Notification Service", "Go 1.23\nPuerto 8080")
        }
      }
    }

    ' ─── SUBNETS AISLADAS (DATOS) ──────────────────────
    Deployment_Node(subnet_iso, "Subnets Aisladas (AZ-a, AZ-b)\n10.0.21.0/24, 10.0.22.0/24", "Data tier — sin acceso Internet") {

      Deployment_Node(rds_cluster, "RDS Aurora Cluster", "PostgreSQL 16.2 compatible\nMulti-AZ activo") {
        InfrastructureNode(rds_writer, "Aurora Writer",   "db.r7g.large — Escrituras\n200 GB SSD gp3 | Backup 7 días")
        InfrastructureNode(rds_reader, "Aurora Reader",   "db.r7g.large — Lecturas\nRéplica en AZ-b")
      }

      Deployment_Node(elasticache_cluster, "ElastiCache Redis Cluster", "Redis 7.2 | cluster.t4g.medium") {
        InfrastructureNode(redis, "Redis Primary", "Sesiones, tokens JWT\nTTL configurable por key")
      }

      Deployment_Node(sqs_node, "Amazon SQS", "Message Broker gestionado") {
        InfrastructureNode(sqs, "SQS Queues", "orders-events.fifo\nnotifications-events\nDLQ configurado por queue")
      }
    }
  }

  ' ─── MONITOREO ─────────────────────────────────────
  Deployment_Node(observability, "Observabilidad", "CloudWatch + X-Ray") {
    InfrastructureNode(cloudwatch, "CloudWatch",  "Métricas, Logs, Alarms\nDashboard [sistema]-prod")
    InfrastructureNode(xray,       "AWS X-Ray",   "Distributed tracing\nService Map")
  }
}

' ─── SISTEMAS EXTERNOS ───────────────────────────────────
Deployment_Node(external, "Servicios Externos (SaaS)", "Fuera de nuestro control") {
  InfrastructureNode(sendgrid, "SendGrid",  "Email transaccional\nTLS 1.3 / API Key")
  InfrastructureNode(stripe,   "Stripe",    "Pagos online\nTLS 1.3 / API Key")
}

' ─── RELACIONES DE RED ───────────────────────────────────
Rel(user_web,    cf,           "HTTPS 443",         "TLS 1.3")
Rel(user_mobile, alb,          "HTTPS 443",         "TLS 1.3 directo")
Rel(cf,          alb,          "HTTP 80 (interno)", "VPC privado")
Rel(alb,         identity_task,"HTTP 8080",         "Target Group")
Rel(alb,         core_task,    "HTTP 8080",         "Target Group")
Rel(identity_task, redis,      "TCP 6379",          "TLS ElastiCache")
Rel(identity_task, rds_writer, "TCP 5432",          "SSL PostgreSQL")
Rel(core_task,   rds_writer,   "TCP 5432 (W)",      "SSL PostgreSQL")
Rel(core_task,   rds_reader,   "TCP 5432 (R)",      "SSL PostgreSQL")
Rel(core_task,   sqs,          "HTTPS / SQS SDK",   "Publica eventos")
Rel(notif_task,  sqs,          "HTTPS / SQS SDK",   "Consume eventos")
Rel(notif_task,  sendgrid,     "HTTPS 443",         "API Key — TLS")
Rel(core_task,   stripe,       "HTTPS 443",         "API Key — TLS")

@enduml
```

---

### 3️⃣ Convenciones de Naming para Nodos de Deployment

```
Formato: {proyecto}-{ambiente}-{tipo}-{sufijo}

Ejemplos:
  mitoga-prod-cluster        → ECS Cluster producción
  mitoga-prod-db-writer      → RDS Writer
  mitoga-prod-db-reader      → RDS Reader  
  mitoga-prod-cache          → ElastiCache
  mitoga-prod-alb            → Application Load Balancer
  mitoga-prod-sqs-events     → Cola SQS de eventos
  mitoga-staging-cluster     → ECS Cluster staging

Ambientes ZNS:
  prod     → Producción (borde ROJO en diagrama)
  staging  → Pre-producción (borde NARANJA)
  dev      → Desarrollo (borde VERDE)
  dr       → Disaster Recovery (borde PÚRPURA)
```

---

### 4️⃣ Diferenciación Visual por Ambiente

Añadir al inicio del diagrama para marcar visualmente el ambiente:

```plantuml
' ─── MARCADOR DE AMBIENTE (obligatorio) ──────────────────
' Para PRODUCCIÓN
skinparam NoteBorderColor #E74C3C
skinparam NoteBackgroundColor #FDEDEC
note as prod_note
  🔴 AMBIENTE: PRODUCCIÓN
  AWS Region: us-east-1
  Última actualización: [YYYY-MM-DD]
end note

' Para STAGING
' skinparam NoteBackgroundColor #FEF9E7
' note ... 🟠 AMBIENTE: STAGING

' Para DEV  
' skinparam NoteBackgroundColor #EAFAF1
' note ... 🟢 AMBIENTE: DESARROLLO
```

---

### 5️⃣ Reglas para Etiquetas de Conexiones de Red

Las conexiones en diagramas de deployment deben incluir SIEMPRE:

```
Formato: "PROTOCOLO PUERTO | CIFRADO | DIRECCIÓN"

Ejemplos buenos:
  "TCP 5432 | SSL/TLS | RW"        → Conexión DB escritura/lectura
  "TCP 5432 (Read Only) | SSL"     → Réplica de lectura
  "TCP 6379 | TLS ElastiCache"     → Redis con TLS
  "HTTPS 443 | TLS 1.3"            → API externa
  "HTTP 8080 | interno VPC"        → Comunicación interna (no internet-facing)
  "AMQP | SQS SDK | async"         → Cola de mensajes asíncrona
  "gRPC 50051 | mTLS"              → Comunicación gRPC entre servicios

Ejemplos MALOS (nunca usar):
  "calls"          → No dice nada
  "TCP"            → Sin puerto ni cifrado
  "HTTP"           → Sin puerto ni si es interno/externo
```

---

### 6️⃣ Checklist UX para Diagramas de Deployment

```markdown
## ✅ Checklist UX — Deployment Diagram [sistema]-[ambiente]

### Claridad Visual:
- [ ] Título con: nombre del sistema, ambiente, versión y fecha
- [ ] Nota de ambiente presente (🔴 PROD / 🟠 STAGING / 🟢 DEV)
- [ ] LAYOUT_WITH_LEGEND() aplicado
- [ ] Flujo visual sigue: Internet → Edge → Load Balancer → Compute → Data
- [ ] Máximo 15 nodos en el diagrama (sin contar los de borde/externo)

### Agrupación Cognitiva:
- [ ] Subnets agrupadas por tipo (públicas / privadas / aisladas)
- [ ] CIDR de cada subnet visible en el nodo padre
- [ ] Servicios de cómputo dentro del ECS Cluster / nodo Kubernetes
- [ ] Bases de datos dentro del nodo de cluster RDS/Aurora

### Etiquetas de Conexión:
- [ ] 100% de conexiones tienen: protocolo + puerto + cifrado
- [ ] Conexiones externas (internet) muestran TLS versión
- [ ] Conexiones internas muestran si son "interno VPC" (no internet-facing)

### Elementos Técnicos Presentes:
- [ ] Specs de capacidad en cada nodo de cómputo (CPU, RAM, replicas)
- [ ] Motor y versión de DB visible (ej: "PostgreSQL 16.2")
- [ ] Multi-AZ indicado explícitamente donde aplique
- [ ] Health checks y configuración Auto Scaling documentados en descripción del nodo

### Accesibilidad y Portabilidad:
- [ ] Iconos de cloud provider presentes (no solo cajas genéricas)
- [ ] El diagrama es comprensible en blanco y negro (no depende solo del color)
- [ ] Legible al 100% en pantalla Full HD (1920×1080) sin zoom
```

---

### 7️⃣ Anti-patrones de Deployment Diagrams — NUNCA Hacer

| Anti-patrón | Impacto | Solución |
|-------------|---------|----------|
| **IPs/puertos hardcoded de producción real** | Riesgo de seguridad | Usar rangos genéricos (10.0.x.x) |
| **Credenciales o ARNs reales en el diagrama** | Exposición crítica | Solo tipos de servicio, nunca valores reales |
| **Nodos sin specs técnicas** | No se sabe qué tamaño tiene el nodo | Siempre incluir vCPU/RAM/replicas |
| **Sin diferenciación de ambiente** | Confusión prod vs dev | Nota de ambiente obligatoria + borde de color |
| **Todas las subnets en un mismo nodo** | Oculta la topología de red | Separar público/privado/aislado siempre |
| **Conexiones sin cifrado especificado** | Asume TLS pero no lo documenta | Siempre anotar "TLS 1.3" o "SSL" en la relación |
| **Un solo diagrama para todos los ambientes** | Mezcla configs y confunde al equipo | Un diagrama por ambiente (prod, staging, dev) |
| **Cajas genéricas sin iconos cloud** | Pierde información de qué servicio es | Usar `aws-icons-for-plantuml` siempre |

---

## ✅ Criterios de Aplicación

- Al generar cualquier diagrama de infraestructura cloud o on-premise
- Al documentar topología de red y zonas de seguridad
- Al revisar diagramas de despliegue existentes
- Al crear documentación de disaster recovery o multi-region

## ❌ Cuándo NO Usar Esta Skill

- Para diagramas de flujo de datos de negocio (usar C4 L2 con flujos)
- Para diagramas de secuencia de llamadas HTTP (usar PlantUML sequence)
- Para arquitecturas de referencia teóricas sin implementación real

---

## 📊 Métricas de Calidad

| Métrica | Umbral ZNS |
|---------|------------|
| Nodos sin specs técnicas | 0% |
| Conexiones sin protocolo/cifrado | 0% |
| Diagramas sin nota de ambiente | 0% |
| Tiempo comprensión por SRE/DevOps | ≤ 3 minutos |
| Diagramas legibles sin zoom en 1080p | 100% |
| Subnets diferenciadas por tipo | 100% (si hay más de 1 subnet) |

---

## 📝 Ejemplo: Diagrama de Deployment Minimal (microservicio único)

```plantuml
@startuml C4_Deploy_IdentityService_PROD
!include <C4/C4_Deployment>
LAYOUT_WITH_LEGEND()
LAYOUT_LEFT_RIGHT()

title Deployment: Identity Service — PRODUCCIÓN\nVersión: 1.0 | Fecha: 2026-04-17

note as env
  🔴 AMBIENTE: PRODUCCIÓN
  Region: us-east-1 | Multi-AZ
end note

Person(user, "Usuario", "Solicita autenticación")

Deployment_Node(aws, "AWS") {
  Deployment_Node(vpc, "VPC 10.0.0.0/16") {
    Deployment_Node(pub, "Subnet Pública 10.0.1.0/24") {
      InfrastructureNode(alb, "ALB", "HTTPS 443 → HTTP 8080")
    }
    Deployment_Node(priv, "Subnet Privada 10.0.11.0/24") {
      ContainerInstance(svc, "Identity Service", "Kotlin + Spring Boot\nFargate 1vCPU/2GB | x2")
    }
    Deployment_Node(iso, "Subnet Aislada 10.0.21.0/24") {
      InfrastructureNode(db, "Aurora PostgreSQL 16\nMulti-AZ | db.r7g.large", "Identidades y tokens")
      InfrastructureNode(cache, "Redis 7.2\ncluster.t4g.medium", "Sesiones activas")
    }
  }
}

Rel(user, alb,  "HTTPS 443", "TLS 1.3")
Rel(alb,  svc,  "HTTP 8080",  "interno VPC")
Rel(svc,  db,   "TCP 5432",   "SSL PostgreSQL")
Rel(svc,  cache,"TCP 6379",   "TLS ElastiCache")

@enduml
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agregar:

```markdown
### SKILL ACTIVA: DEPLOYMENT DIAGRAM UX EXPERT → ver: 2-agents/zns-tools/draw-senior/skills/deployment-diagram-ux-expert.skill.md

**Reglas no negociables:**
- Todo diagrama de deployment debe incluir nota de ambiente (🔴 PROD / 🟠 STAGING / 🟢 DEV)
- Subnets SIEMPRE separadas: públicas / privadas / aisladas con CIDR visible
- 100% de nodos de cómputo con specs: vCPU, RAM, instancias deseadas
- 100% de conexiones con: protocolo + puerto + cifrado
- Iconos AWS/Azure/GCP obligatorios (usar aws-icons-for-plantuml)
- Flujo visual: Internet → Edge → Load Balancer → Compute → Data (izq. a der.)
- NUNCA incluir IPs reales, ARNs o credenciales en el diagrama
- Máx. 15 nodos por diagrama; crear uno por ambiente (prod/staging/dev)
```

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Deployment Diagram UX Expert con template AWS completo, convenciones ZNS, checklist UX y anti-patrones
