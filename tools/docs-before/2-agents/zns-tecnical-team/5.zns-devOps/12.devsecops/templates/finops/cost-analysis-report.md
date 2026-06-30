# 💰 FinOps Cost Analysis Report Template

---

**Proyecto**: [NOMBRE_PROYECTO]  
**Período**: [YYYY-MM] a [YYYY-MM]  
**Fecha del reporte**: [YYYY-MM-DD]  
**Analista**: [NOMBRE]  
**Cloud Provider(s)**: AWS / Azure / GCP  

---

## 📊 Executive Summary

### KPIs del Período
| Métrica | Valor Actual | Mes Anterior | Δ% | Target | Status |
|---------|--------------|--------------|-----|--------|--------|
| **Total Spend** | $XX,XXX | $XX,XXX | +/-X% | $XX,XXX | 🟢/🟡/🔴 |
| **Waste Ratio** | X.X% | X.X% | +/-X% | <5% | 🟢/🟡/🔴 |
| **RI/SP Coverage** | XX% | XX% | +/-X% | >70% | 🟢/🟡/🔴 |
| **Tagging Compliance** | XX% | XX% | +/-X% | 100% | 🟢/🟡/🔴 |
| **Cost per Transaction** | $X.XXX | $X.XXX | +/-X% | Trending ↓ | 🟢/🟡/🔴 |

### Resumen Ejecutivo
[2-3 párrafos resumiendo la situación de costos, tendencias principales, logros y áreas de preocupación]

### Quick Wins Identificados
| Acción | Ahorro Mensual Estimado | Esfuerzo | ROI |
|--------|------------------------|----------|-----|
| [Acción 1] | $X,XXX | Bajo | Inmediato |
| [Acción 2] | $X,XXX | Medio | 1 mes |
| [Acción 3] | $X,XXX | Alto | 3 meses |
| **Total Potencial** | **$X,XXX** | - | - |

---

## 1️⃣ Cost Overview

### 1.1 Spend by Service (Top 10)
| # | Servicio | Costo Mensual | % del Total | MoM Δ | Tendencia |
|---|----------|---------------|-------------|-------|-----------|
| 1 | EC2/Compute | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 2 | RDS/Database | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 3 | S3/Storage | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 4 | Data Transfer | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 5 | EKS/AKS/GKE | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 6 | Lambda/Functions | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 7 | ElastiCache/Redis | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 8 | CloudFront/CDN | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 9 | Secrets Manager | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| 10 | CloudWatch/Monitor | $X,XXX | XX% | +/-X% | ↑/↓/→ |
| - | **Otros** | $X,XXX | XX% | - | - |
| - | **TOTAL** | **$XX,XXX** | **100%** | **+/-X%** | - |

### 1.2 Spend by Environment
| Ambiente | Costo Mensual | % del Total | Budget | Variance |
|----------|---------------|-------------|--------|----------|
| Production | $X,XXX | XX% | $X,XXX | +/-X% |
| Staging | $X,XXX | XX% | $X,XXX | +/-X% |
| Development | $X,XXX | XX% | $X,XXX | +/-X% |
| Sandbox/Test | $X,XXX | XX% | $X,XXX | +/-X% |
| Shared/Infra | $X,XXX | XX% | $X,XXX | +/-X% |
| **TOTAL** | **$XX,XXX** | **100%** | **$XX,XXX** | **+/-X%** |

### 1.3 Spend by Team/Project
| Team/Project | Costo Mensual | % del Total | Budget | Status |
|--------------|---------------|-------------|--------|--------|
| Team A - Project X | $X,XXX | XX% | $X,XXX | 🟢/🟡/🔴 |
| Team B - Project Y | $X,XXX | XX% | $X,XXX | 🟢/🟡/🔴 |
| Team C - Project Z | $X,XXX | XX% | $X,XXX | 🟢/🟡/🔴 |
| Platform/SRE | $X,XXX | XX% | $X,XXX | 🟢/🟡/🔴 |
| **Sin asignar** | $X,XXX | XX% | N/A | 🔴 |

### 1.4 Spend Trend (últimos 6 meses)
```
Month     | Spend    | Δ%    | Notes
----------|----------|-------|------------------
[M-5]     | $XX,XXX  | -     | Baseline
[M-4]     | $XX,XXX  | +X%   | [Evento]
[M-3]     | $XX,XXX  | +X%   | [Evento]
[M-2]     | $XX,XXX  | +X%   | [Evento]
[M-1]     | $XX,XXX  | +X%   | [Evento]
[Current] | $XX,XXX  | +X%   | [Evento]
```

---

## 2️⃣ Unit Economics

### 2.1 Cost per Business Metric
| Métrica de Negocio | Valor | Costo Asociado | Costo Unitario | Tendencia |
|--------------------|-------|----------------|----------------|-----------|
| Transacciones/mes | X,XXX,XXX | $X,XXX | $X.XXXX | ↓ (bueno) |
| Usuarios activos/mes | XXX,XXX | $X,XXX | $X.XX | ↓ (bueno) |
| GB almacenados | X,XXX TB | $X,XXX | $X.XX/TB | → (estable) |
| API calls/mes | XXX M | $X,XXX | $X.XXX/1K | ↑ (revisar) |
| Requests/seg (peak) | X,XXX | $X,XXX | $X.XX/RPS | → (estable) |

### 2.2 Cost Efficiency Ratios
| Ratio | Valor Actual | Benchmark | Status |
|-------|--------------|-----------|--------|
| Costo/Revenue | X.X% | <10% | 🟢/🟡/🔴 |
| Costo/Usuario activo | $X.XX | <$X.XX | 🟢/🟡/🔴 |
| Costo/Transacción | $X.XXX | <$X.XXX | 🟢/🟡/🔴 |
| Infra cost/Engineer | $X,XXX | <$X,XXX | 🟢/🟡/🔴 |

---

## 3️⃣ Waste Analysis

### 3.1 Idle & Underutilized Resources
| Tipo | Cantidad | Utilización Promedio | Costo Mensual | Acción Recomendada |
|------|----------|---------------------|---------------|-------------------|
| EC2 Idle (<5% CPU) | X | X% | $X,XXX | Terminar |
| EC2 Underutilized (<20%) | X | X% | $X,XXX | Resize |
| EBS Unattached | X volumes | 0% | $XXX | Eliminar |
| EIP Unassociated | X | 0% | $XX | Liberar |
| RDS Underutilized | X | X% | $X,XXX | Resize/Consolidar |
| Load Balancer sin targets | X | 0% | $XXX | Eliminar |
| **TOTAL WASTE** | - | - | **$X,XXX** | - |

### 3.2 Old Snapshots & Backups
| Tipo | Cantidad | Antigüedad | Costo Mensual | Acción |
|------|----------|------------|---------------|--------|
| EBS Snapshots >90 días | X | X días avg | $XXX | Revisar política |
| AMIs obsoletas | X | X días avg | $XXX | Deregister |
| RDS Snapshots manuales | X | X días avg | $XXX | Eliminar |
| S3 versiones antiguas | X GB | >30 días | $XXX | Lifecycle policy |

### 3.3 Waste Ratio Trend
```
Month     | Total Spend | Waste    | Ratio | Target
----------|-------------|----------|-------|--------
[M-2]     | $XX,XXX     | $X,XXX   | X.X%  | <5%
[M-1]     | $XX,XXX     | $X,XXX   | X.X%  | <5%
[Current] | $XX,XXX     | $X,XXX   | X.X%  | <5%
```

---

## 4️⃣ Commitment Coverage

### 4.1 Reserved Instances / Savings Plans
| Tipo | Coverage | On-Demand Spend | Covered Spend | Savings | Utilization |
|------|----------|-----------------|---------------|---------|-------------|
| Compute RIs | XX% | $X,XXX | $X,XXX | $X,XXX (XX%) | XX% |
| RDS RIs | XX% | $X,XXX | $X,XXX | $X,XXX (XX%) | XX% |
| ElastiCache RIs | XX% | $X,XXX | $X,XXX | $X,XXX (XX%) | XX% |
| Savings Plans | XX% | $X,XXX | $X,XXX | $X,XXX (XX%) | XX% |

### 4.2 RI/SP Recommendations
| Servicio | Instance Type | Cantidad | Término | Upfront | Ahorro Mensual | ROI |
|----------|---------------|----------|---------|---------|----------------|-----|
| EC2 | m6i.xlarge | X | 1 año | $X,XXX | $XXX | X meses |
| RDS | db.r6g.large | X | 1 año | $X,XXX | $XXX | X meses |
| Total | - | - | - | $X,XXX | $X,XXX | - |

### 4.3 Spot/Preemptible Usage
| Servicio | On-Demand Hours | Spot Hours | Spot % | Savings |
|----------|-----------------|------------|--------|---------|
| EKS Nodes | X,XXX | X,XXX | XX% | $X,XXX |
| Batch Jobs | X,XXX | X,XXX | XX% | $XXX |
| CI/CD Runners | X,XXX | X,XXX | XX% | $XXX |

---

## 5️⃣ Tagging & Governance

### 5.1 Tagging Compliance
| Tag Requerido | Compliance | Recursos sin tag | Costo sin tag |
|---------------|------------|------------------|---------------|
| team | XX% | X recursos | $X,XXX |
| project | XX% | X recursos | $X,XXX |
| environment | XX% | X recursos | $X,XXX |
| cost-center | XX% | X recursos | $X,XXX |
| owner | XX% | X recursos | $X,XXX |
| **Promedio** | **XX%** | **X recursos** | **$X,XXX** |

### 5.2 Untagged Resources Detail
| Recurso ID | Tipo | Región | Costo Mensual | Owner Probable |
|------------|------|--------|---------------|----------------|
| i-xxxx | EC2 | us-east-1 | $XXX | [Team?] |
| vol-xxxx | EBS | us-east-1 | $XX | [Team?] |

---

## 6️⃣ Anomaly Detection

### 6.1 Cost Anomalies Detectadas
| Fecha | Servicio | Costo Esperado | Costo Real | Δ | Causa Root |
|-------|----------|----------------|------------|---|------------|
| [Fecha] | [Service] | $X,XXX | $X,XXX | +XX% | [Causa] |
| [Fecha] | [Service] | $X,XXX | $X,XXX | +XX% | [Causa] |

### 6.2 Forecasting
| Período | Forecast | Budget | Variance | Status |
|---------|----------|--------|----------|--------|
| Este mes (remaining) | $X,XXX | $X,XXX | +/-X% | 🟢/🟡/🔴 |
| Próximo mes | $XX,XXX | $XX,XXX | +/-X% | 🟢/🟡/🔴 |
| Próximo trimestre | $XX,XXX | $XX,XXX | +/-X% | 🟢/🟡/🔴 |

---

## 7️⃣ Optimization Recommendations

### 7.1 Immediate Actions (0-7 días)
| # | Acción | Ahorro Mensual | Riesgo | Owner | Deadline |
|---|--------|----------------|--------|-------|----------|
| 1 | Terminar X instancias idle | $X,XXX | Bajo | [Team] | [Fecha] |
| 2 | Eliminar X EBS unattached | $XXX | Bajo | [Team] | [Fecha] |
| 3 | Liberar X EIPs | $XX | Bajo | [Team] | [Fecha] |

### 7.2 Short-Term Actions (7-30 días)
| # | Acción | Ahorro Mensual | Riesgo | Owner | Deadline |
|---|--------|----------------|--------|-------|----------|
| 1 | Right-size X instancias | $X,XXX | Medio | [Team] | [Fecha] |
| 2 | Implementar scheduling dev/staging | $X,XXX | Bajo | [Team] | [Fecha] |
| 3 | Comprar X RIs/Savings Plans | $X,XXX | Bajo | FinOps | [Fecha] |

### 7.3 Medium-Term Actions (30-90 días)
| # | Acción | Ahorro Mensual | Riesgo | Owner | Deadline |
|---|--------|----------------|--------|-------|----------|
| 1 | Migrar a Spot/ARM instances | $X,XXX | Medio | Platform | [Fecha] |
| 2 | Implementar S3 lifecycle policies | $XXX | Bajo | Platform | [Fecha] |
| 3 | Optimizar data transfer (CDN, endpoints) | $X,XXX | Medio | Platform | [Fecha] |

### 7.4 Savings Summary
| Timeframe | Acciones | Ahorro Mensual | Ahorro Anual |
|-----------|----------|----------------|--------------|
| Inmediato | X | $X,XXX | $XX,XXX |
| Corto plazo | X | $X,XXX | $XX,XXX |
| Mediano plazo | X | $X,XXX | $XX,XXX |
| **TOTAL** | **X** | **$X,XXX** | **$XX,XXX** |

---

## 8️⃣ Action Items & Next Steps

### Completed This Period
- [x] [Acción completada 1] → Ahorro: $XXX/mes
- [x] [Acción completada 2] → Ahorro: $XXX/mes

### In Progress
- [ ] [Acción en progreso 1] - Owner: [Team] - ETA: [Fecha]
- [ ] [Acción en progreso 2] - Owner: [Team] - ETA: [Fecha]

### Blocked/Needs Attention
- ⚠️ [Issue bloqueante] - Requiere: [Acción/Decisión]

### Next Review
- **Fecha**: [YYYY-MM-DD]
- **Foco**: [Área específica a revisar]

---

## 📎 Appendix

### A. Methodology
- Período de datos: [Inicio] - [Fin]
- Fuentes: AWS Cost Explorer / Azure Cost Management / GCP Billing
- Herramientas: [Kubecost, Infracost, CloudHealth, etc.]

### B. Glossary
- **Waste Ratio**: (Costo recursos idle/underutilized) / Total Spend
- **RI Coverage**: Costo cubierto por RIs / Total On-Demand eligible spend
- **Unit Economics**: Costo por unidad de valor de negocio

### C. Contact
- **FinOps Lead**: [Nombre] - [Email]
- **Platform Team**: [Distribution list]

---

**Próximo reporte**: [Fecha]  
**Frecuencia**: Mensual
