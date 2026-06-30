# 🚨 Incident Runbook Template

---

**Runbook ID**: RB-[CATEGORY]-[NUMBER]  
**Nombre**: [NOMBRE DEL INCIDENTE]  
**Severidad**: P1 🔴 / P2 🟠 / P3 🟡 / P4 🟢  
**Owner Team**: [TEAM]  
**Última Actualización**: [YYYY-MM-DD]  
**Próxima Revisión**: [YYYY-MM-DD]  

---

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| **Servicios Afectados** | [Service1, Service2] |
| **Impacto en Usuarios** | [Total/Parcial/Ninguno] |
| **SLA Impactado** | [SLA específico] |
| **Tiempo de Resolución Estimado** | [X minutos/horas] |
| **Escalación Automática** | [Sí/No - Después de X min] |
| **On-Call Rotation** | [PagerDuty/Opsgenie schedule] |

---

## 🔔 Alerts que Disparan este Runbook

### Prometheus/Alertmanager
```yaml
# Alert 1
- alert: [AlertName1]
  expr: [prometheus_query]
  for: [duration]
  labels:
    severity: [critical/warning]
    runbook: "https://runbooks.company.com/RB-XXX-001"
  annotations:
    summary: "[Descripción breve]"

# Alert 2
- alert: [AlertName2]
  expr: [prometheus_query]
  for: [duration]
```

### CloudWatch/Azure Monitor
```
Alarm Name: [alarm-name]
Metric: [metric-name]
Threshold: [condition]
Period: [X minutes]
```

---

## 🔍 Síntomas Observables

### Para el Usuario
- [ ] [Síntoma visible para usuarios finales]
- [ ] [Error específico que ven]
- [ ] [Degradación de performance]

### Para el Sistema
- [ ] [Métrica fuera de rango]
- [ ] [Log pattern específico]
- [ ] [Error en dashboard]

### Impacto del Negocio
- [ ] [Transacciones afectadas]
- [ ] [Usuarios impactados]
- [ ] [Revenue en riesgo]

---

## 📊 Diagnóstico

### Paso 1: Verificar Estado del Servicio
```bash
# Kubernetes - Estado de pods
kubectl get pods -n [namespace] -l app=[service-name] -o wide

# Estado de deployments
kubectl get deployments -n [namespace]

# Eventos recientes
kubectl get events -n [namespace] --sort-by='.lastTimestamp' | tail -20
```

**Resultado Esperado**: Todos los pods en estado `Running`, Ready X/X

### Paso 2: Revisar Logs
```bash
# Últimos 100 logs con errores
kubectl logs -n [namespace] -l app=[service-name] --tail=100 | grep -i error

# Logs de un pod específico
kubectl logs -n [namespace] [pod-name] --since=10m

# Si hay sidecars
kubectl logs -n [namespace] [pod-name] -c [container-name]
```

**Buscar Patterns**:
- `OutOfMemoryError` → Ver sección OOM
- `Connection refused` → Ver sección Conectividad
- `Timeout` → Ver sección Latencia

### Paso 3: Verificar Métricas
```promql
# CPU Usage
rate(container_cpu_usage_seconds_total{namespace="[namespace]", pod=~"[service].*"}[5m])

# Memory Usage
container_memory_usage_bytes{namespace="[namespace]", pod=~"[service].*"}

# Request Rate
rate(http_requests_total{service="[service]"}[5m])

# Error Rate
rate(http_requests_total{service="[service]", status=~"5.."}[5m]) 
/ rate(http_requests_total{service="[service]"}[5m])

# Latency P99
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="[service]"}[5m]))
```

### Paso 4: Verificar Dependencias
```bash
# Estado de endpoints
kubectl get endpoints -n [namespace] [service-name]

# Conectividad a database
kubectl exec -n [namespace] [pod-name] -- nc -zv [db-host] [db-port]

# Conectividad a servicios externos
kubectl exec -n [namespace] [pod-name] -- curl -s -o /dev/null -w "%{http_code}" [url]
```

---

## 🔧 Resolución

### Escenario A: Pods en CrashLoopBackOff

**Diagnóstico Adicional**:
```bash
# Describir pod para ver eventos
kubectl describe pod -n [namespace] [pod-name]

# Logs del pod crasheado
kubectl logs -n [namespace] [pod-name] --previous
```

**Resolución**:
```bash
# 1. Si es problema de configuración
kubectl rollout undo deployment/[deployment-name] -n [namespace]

# 2. Si es problema de recursos
kubectl patch deployment [deployment-name] -n [namespace] --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]'

# 3. Restart forzado
kubectl rollout restart deployment/[deployment-name] -n [namespace]
```

### Escenario B: Alto Uso de CPU/Memory

**Diagnóstico Adicional**:
```bash
# Top pods por CPU
kubectl top pods -n [namespace] --sort-by=cpu

# Top pods por memoria
kubectl top pods -n [namespace] --sort-by=memory
```

**Resolución**:
```bash
# 1. Escalar horizontalmente (temporal)
kubectl scale deployment/[deployment-name] -n [namespace] --replicas=[X]

# 2. Si hay memory leak - rolling restart
kubectl rollout restart deployment/[deployment-name] -n [namespace]

# 3. Verificar HPA
kubectl get hpa -n [namespace]
```

### Escenario C: Problemas de Conectividad

**Diagnóstico Adicional**:
```bash
# Test de DNS
kubectl exec -n [namespace] [pod-name] -- nslookup [service-name]

# Test de conectividad
kubectl exec -n [namespace] [pod-name] -- curl -v [url]

# Verificar Network Policies
kubectl get networkpolicies -n [namespace]
```

**Resolución**:
```bash
# 1. Restart CoreDNS si es problema de DNS
kubectl rollout restart deployment/coredns -n kube-system

# 2. Verificar service
kubectl get svc -n [namespace] [service-name] -o yaml

# 3. Verificar endpoints
kubectl get endpoints -n [namespace] [service-name]
```

### Escenario D: Database Issues

**Diagnóstico Adicional**:
```sql
-- Conexiones activas
SELECT count(*) FROM pg_stat_activity;

-- Queries lentas
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC;

-- Locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Resolución**:
```bash
# 1. Matar queries lentas
# Identificar PID y ejecutar: SELECT pg_terminate_backend([PID]);

# 2. Failover (si RDS Multi-AZ)
aws rds reboot-db-instance --db-instance-identifier [instance-id] --force-failover
```

---

## ✅ Verificación de Resolución

### Checklist Post-Resolución
- [ ] Pods en estado Running y Ready
- [ ] No errores en logs (últimos 5 minutos)
- [ ] Métricas normalizadas (CPU, Memory, Latency)
- [ ] Error rate < umbral (< 0.1%)
- [ ] Usuarios pueden completar transacciones
- [ ] Alert resuelto (verify en Alertmanager)

### Comandos de Verificación
```bash
# Health check del servicio
curl -s https://[service-url]/health | jq

# Smoke test
./scripts/smoke-test.sh [environment]

# Verificar que alert está resolved
kubectl exec -n monitoring prometheus-0 -- promtool query instant 'ALERTS{alertname="[AlertName]"}'
```

---

## 📝 Post-Incident

### Inmediatamente Después
- [ ] Actualizar status page
- [ ] Notificar stakeholders (Slack/Email)
- [ ] Documentar timeline en incident ticket

### Dentro de 24-48 horas
- [ ] Crear ticket de postmortem
- [ ] Recopilar métricas y logs del incidente
- [ ] Identificar action items preventivos

### Template de Notificación
```
🔴 INCIDENT RESOLVED

Service: [Service Name]
Duration: [Start Time] - [End Time] ([Total Duration])
Impact: [Brief description of impact]
Root Cause: [Brief description]
Resolution: [What was done to resolve]

Postmortem: [Link to postmortem ticket]
```

---

## 🔄 Escalation Matrix

| Nivel | Tiempo | Contacto | Método |
|-------|--------|----------|--------|
| L1 | 0 min | On-call Engineer | PagerDuty auto |
| L2 | 15 min | Team Lead | PagerDuty escalation |
| L3 | 30 min | Engineering Manager | Phone + Slack |
| L4 | 60 min | VP Engineering / CTO | Phone |

### Contactos de Emergencia
| Rol | Nombre | Phone | Slack |
|-----|--------|-------|-------|
| On-Call Primary | [Rotation] | [PagerDuty] | @oncall-primary |
| Team Lead | [Name] | +X XXX XXX XXXX | @[slack] |
| DBA On-Call | [Rotation] | [PagerDuty] | @dba-oncall |

---

## 📚 Referencias

### Documentación Relacionada
- [Link a arquitectura del servicio]
- [Link a ADRs relevantes]
- [Link a otros runbooks relacionados]

### Dashboards
- [Grafana Dashboard - Service Overview]
- [Grafana Dashboard - Database]
- [CloudWatch/Azure Dashboard]

### Postmortems Anteriores
- [Link a postmortem de incidente similar]

---

## 📝 Changelog

| Fecha | Versión | Autor | Cambios |
|-------|---------|-------|---------|
| [Fecha] | 1.0 | [Nombre] | Versión inicial |
| [Fecha] | 1.1 | [Nombre] | Agregado escenario X |

---

**Última ejecución exitosa**: [YYYY-MM-DD]  
**Tasa de éxito**: X% (basado en últimos X incidentes)
