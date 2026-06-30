# Plantilla de Documentación de Módulo/Servicio

## [Nombre del Módulo/Servicio]

### Información General

**Versión:** 1.0
**Responsable:** [Nombre del Tech Lead]
**Última Actualización:** [Fecha]

---

### 1. Responsabilidad

**Descripción:**
[Descripción clara y concisa de la responsabilidad única del módulo. Máximo 2-3 frases.]

**Bounded Context (DDD):**
[Si aplica, describir el contexto delimitado en términos de Domain-Driven Design]

---

### 2. API/Interfaz Pública

#### 2.1 Endpoints REST (si aplica)

| Endpoint | Método | Descripción | Autenticación |
|----------|--------|-------------|---------------|
| `/api/v1/resource` | GET | Obtener listado de recursos | JWT Required |
| `/api/v1/resource/:id` | GET | Obtener recurso por ID | JWT Required |
| `/api/v1/resource` | POST | Crear nuevo recurso | JWT Required |
| `/api/v1/resource/:id` | PUT | Actualizar recurso | JWT Required |
| `/api/v1/resource/:id` | DELETE | Eliminar recurso | JWT Required |

[Ver especificación completa en `api-spec.yaml`]

#### 2.2 Eventos que Emite

| Evento | Trigger | Payload | Consumidores |
|--------|---------|---------|--------------|
| `resource.created` | Creación de recurso | `{ id, timestamp, data }` | NotificationService, AnalyticsService |
| `resource.updated` | Actualización de recurso | `{ id, timestamp, changes }` | AuditService |
| `resource.deleted` | Eliminación de recurso | `{ id, timestamp }` | AuditService |

#### 2.3 Eventos que Consume

| Evento | Origen | Acción |
|--------|--------|--------|
| `user.registered` | AuthService | Crear perfil inicial del recurso |
| `payment.completed` | PaymentService | Activar recurso premium |

---

### 3. Modelo de Datos

#### 3.1 Entidades Principales

**Entidad: Resource**

```typescript
interface Resource {
  id: string;              // UUID
  userId: string;          // Foreign key to User
  name: string;            // max 200 chars
  description: string;     // max 2000 chars
  status: ResourceStatus;  // enum: ACTIVE, INACTIVE, ARCHIVED
  metadata: JSON;          // Flexible metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;        // Soft delete
}

enum ResourceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}
```

#### 3.2 Relaciones

```
User (1) ----< (N) Resource
Resource (1) ----< (N) ResourceAttachment
Category (1) ----< (N) Resource
```

#### 3.3 Volumen Estimado

| Entidad | Volumen Inicial | Crecimiento Mensual | Volumen 1 Año |
|---------|----------------|---------------------|---------------|
| Resource | 10,000 | 5,000 | 70,000 |
| ResourceAttachment | 20,000 | 10,000 | 140,000 |

#### 3.4 Índices de Base de Datos

```sql
-- Índices recomendados para PostgreSQL

CREATE INDEX idx_resource_user_id ON resources(user_id);
CREATE INDEX idx_resource_status ON resources(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_resource_created_at ON resources(created_at DESC);
CREATE INDEX idx_resource_name_search ON resources USING gin(to_tsvector('english', name));
```

---

### 4. Dependencias

#### 4.1 Dependencias de Otros Módulos/Servicios

| Servicio | Tipo | Uso | Fallback |
|----------|------|-----|----------|
| AuthService | Síncrono (REST) | Validación de tokens | Cache de tokens válidos (15 min) |
| NotificationService | Asíncrono (Queue) | Envío de notificaciones | Queue con retry (3 intentos) |
| StorageService | Síncrono (REST) | Upload de archivos | Error 503, reintento manual |

#### 4.2 APIs Externas

| API | Proveedor | Propósito | Rate Limit |
|-----|-----------|-----------|------------|
| Google Maps API | Google | Geocoding | 100 req/sec |
| SendGrid API | SendGrid | Email transaccional | 10,000 req/día |

#### 4.3 Recursos Compartidos

| Recurso | Tipo | Uso |
|---------|------|-----|
| PostgreSQL DB | Database | Persistencia principal |
| Redis Cluster | Cache | Session cache, query cache |
| S3 Bucket | Object Storage | Archivos adjuntos |

---

### 5. Tecnologías Específicas

#### 5.1 Stack Tecnológico

| Componente | Tecnología | Versión | Justificación |
|------------|-----------|---------|---------------|
| Runtime | Node.js | 20 LTS | Performance, ecosistema |
| Framework | NestJS | 10.x | Arquitectura modular, DI |
| ORM | Prisma | 5.x | Type-safe, migraciones |
| Validation | Zod | 3.x | Type inference |
| Testing | Jest + Supertest | Latest | Unit + Integration tests |

#### 5.2 Librerías Críticas

```json
{
  "dependencies": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "zod": "^3.22.0",
    "bull": "^4.11.0",
    "ioredis": "^5.3.0"
  }
}
```

---

### 6. Arquitectura Interna

#### 6.1 Estructura de Carpetas

```
src/
├── resources/
│   ├── dto/
│   │   ├── create-resource.dto.ts
│   │   ├── update-resource.dto.ts
│   │   └── resource-response.dto.ts
│   ├── entities/
│   │   └── resource.entity.ts
│   ├── repositories/
│   │   └── resource.repository.ts
│   ├── services/
│   │   └── resource.service.ts
│   ├── controllers/
│   │   └── resource.controller.ts
│   ├── events/
│   │   ├── resource-created.event.ts
│   │   └── resource-updated.event.ts
│   ├── listeners/
│   │   └── user-registered.listener.ts
│   └── resource.module.ts
```

#### 6.2 Patrón Arquitectónico

**Clean Architecture / Hexagonal Architecture**

```
┌─────────────────────────────────────┐
│         Controllers (API)           │  ← Presentation Layer
├─────────────────────────────────────┤
│         Services (Logic)            │  ← Business Logic Layer
├─────────────────────────────────────┤
│    Repositories (Data Access)       │  ← Data Access Layer
├─────────────────────────────────────┤
│      Database / External APIs       │  ← Infrastructure
└─────────────────────────────────────┘
```

#### 6.3 Flujo de Datos

**Ejemplo: Crear Resource**

```
1. Client → POST /api/v1/resource
2. Controller → Validación de DTO (Zod)
3. Controller → Service.createResource()
4. Service → AuthService.validateUser() (dependency)
5. Service → Repository.create()
6. Repository → Prisma → PostgreSQL
7. Service → EventEmitter.emit('resource.created')
8. EventListener → NotificationService (async)
9. Service → Controller → Response 201 Created
```

---

### 7. Escalabilidad

#### 7.1 Estrategia de Escalado

**Tipo:** Horizontal Scaling (Stateless)

**Configuración:**
- Mínimo: 2 instancias (redundancia)
- Máximo: 10 instancias
- Métrica de escalado: CPU > 70% o Request Rate > 1000 req/min

#### 7.2 Puntos de Contención Identificados

| Punto de Contención | Impacto | Mitigación |
|---------------------|---------|------------|
| Database queries complejas | Alto | Índices optimizados, query caching |
| Upload de archivos grandes | Medio | Presigned URLs (direct to S3) |
| Llamadas a APIs externas | Medio | Circuit breaker, timeout 5s |

#### 7.3 Estrategia de Caching

**Cache Layers:**

1. **Application Cache (Redis)**
   - TTL: 5 minutos
   - Cached data: Resource listings, popular queries
   - Invalidation: On resource update/delete

2. **Database Query Cache**
   - Prisma query cache
   - TTL: 1 minuto

3. **CDN Cache (CloudFront)**
   - Static assets (images, files)
   - TTL: 24 horas

**Cache Keys:**
```
resource:list:user:{userId}:page:{page}
resource:detail:{resourceId}
resource:stats:{userId}
```

---

### 8. Seguridad

#### 8.1 Autenticación

**Método:** JWT Bearer Token

**Validación:**
- Token debe ser válido (signature verification)
- Token no expirado (exp claim)
- Usuario debe estar activo

```typescript
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourceController {
  // All endpoints require JWT authentication
}
```

#### 8.2 Autorización

**Modelo:** RBAC (Role-Based Access Control)

| Rol | Permisos |
|-----|----------|
| USER | CREATE, READ (own), UPDATE (own), DELETE (own) |
| ADMIN | CREATE, READ (all), UPDATE (all), DELETE (all) |
| MODERATOR | READ (all), UPDATE (all) |

```typescript
@UseGuards(RolesGuard)
@Roles('ADMIN', 'MODERATOR')
@Get('all')
async findAll() {
  // Only admins and moderators can access
}
```

#### 8.3 Validación de Input

**Librería:** Zod

```typescript
const CreateResourceSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional()
});

type CreateResourceDto = z.infer<typeof CreateResourceSchema>;
```

#### 8.4 Datos Sensibles

| Tipo de Dato | Clasificación | Tratamiento |
|--------------|---------------|-------------|
| User ID | PII | Logs ofuscados |
| Resource content | Confidencial | Encryption at rest (AES-256) |
| API keys | Secreto | Stored in Secrets Manager |

#### 8.5 Rate Limiting

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per 60 seconds
@Controller('resources')
export class ResourceController {}
```

---

### 9. Monitoreo y Observabilidad

#### 9.1 Métricas Clave

| Métrica | Descripción | Threshold | Alerta |
|---------|-------------|-----------|--------|
| `resource_creation_rate` | Recursos creados/minuto | - | Info |
| `resource_api_latency_p95` | Latencia p95 de API | > 300ms | Warning |
| `resource_api_errors` | Tasa de errores | > 1% | Critical |
| `resource_db_connection_pool` | Conexiones DB activas | > 80% | Warning |

#### 9.2 Logging

**Nivel de Logs:**
- INFO: Operaciones exitosas (create, update, delete)
- WARN: Rate limit alcanzado, timeouts recuperables
- ERROR: Errores de validación, fallos de DB
- FATAL: Crash de aplicación

**Formato:**
```json
{
  "timestamp": "2025-11-07T10:30:00Z",
  "level": "INFO",
  "service": "ResourceService",
  "correlationId": "abc-123-def",
  "userId": "user-123",
  "action": "CREATE_RESOURCE",
  "resourceId": "res-456",
  "duration": 125,
  "message": "Resource created successfully"
}
```

#### 9.3 Tracing

**Instrumentación:** OpenTelemetry

**Spans críticos:**
- HTTP request span
- Database query span
- External API call span
- Event emission span

#### 9.4 Health Checks

**Endpoint:** `GET /health`

**Checks:**
```json
{
  "status": "UP",
  "checks": {
    "database": "UP",
    "redis": "UP",
    "external_api": "UP"
  },
  "timestamp": "2025-11-07T10:30:00Z"
}
```

---

### 10. Testing

#### 10.1 Estrategia de Testing

| Tipo de Test | Cobertura Objetivo | Herramienta |
|--------------|-------------------|-------------|
| Unit Tests | 80% | Jest |
| Integration Tests | Critical paths | Jest + Supertest |
| E2E Tests | Happy paths | Playwright |
| Load Tests | - | k6 / Artillery |

#### 10.2 Casos de Test Críticos

1. **Creación de Resource**
   - ✅ Usuario autenticado puede crear resource
   - ✅ Validación de campos obligatorios
   - ✅ Evento `resource.created` es emitido
   - ❌ Usuario no autenticado recibe 401

2. **Actualización de Resource**
   - ✅ Owner puede actualizar su resource
   - ❌ Usuario no-owner no puede actualizar resource ajeno
   - ✅ Admin puede actualizar cualquier resource

3. **Performance**
   - ✅ Listar 100 resources < 200ms
   - ✅ Crear resource < 150ms
   - ✅ Soportar 500 req/sec sin degradación

---

### 11. Deployment

#### 11.1 Configuración de Deployment

**Docker Image:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/main.js"]
```

**Kubernetes Deployment:**
```yaml
replicas: 2
resources:
  requests:
    cpu: 200m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

#### 11.2 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | Secret para validación JWT | `stored-in-secrets-manager` |
| `LOG_LEVEL` | Nivel de logging | `info` |

#### 11.3 Readiness/Liveness Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

### 12. Roadmap y Mejoras Futuras

| Feature/Mejora | Prioridad | Estimación | Notas |
|----------------|-----------|------------|-------|
| GraphQL API | Media | 2 semanas | Para clientes móviles |
| Búsqueda full-text avanzada | Alta | 1 semana | Integrar Elasticsearch |
| Versionado de resources | Baja | 3 semanas | Audit trail completo |
| Multi-tenancy | Media | 4 semanas | Para SaaS offering |

---

### 13. Referencias y Documentación

- **API Documentation:** [Swagger URL]
- **Architecture Decision Records:** `docs/adr/`
- **Runbooks:** `docs/runbooks/resource-service.md`
- **Database Schema:** `prisma/schema.prisma`
- **Event Schemas:** `docs/events/resource-events.md`

---

**Última revisión:** [Fecha]
**Próxima revisión:** [Fecha + 3 meses]
**Responsable:** [Nombre del Tech Lead]
