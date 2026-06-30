# 🐳 SKILL: DOCKER MCP DEPLOYMENT EXPERT — CONTENEDORIZACIÓN PRODUCTION-READY PARA MCP SERVERS

**skill_id**: docker-mcp-deployment-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: devops / docker / mcp  
**last_updated**: 2026-04-17  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-mcp-creator-senior, agentes DevOps, agentes de infraestructura  
**dependencias**: mcp-protocol-expert (para entender el transporte)  
**referencia_stack**: Docker 27+ / Docker Compose 2.x / Multi-stage builds / Alpine/Distroless / Health checks / Streamable HTTP

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento completo para **contenedorizar MCP Servers de forma production-ready**: Dockerfiles multi-stage, imágenes mínimas y seguras, Docker Compose para desarrollo y orquestación, configuración de volúmenes para proyectos auditados, health checks, gestión de secretos, networking, y patrones de despliegue tanto para servidores MCP locales como remotos.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Multi-stage build obligatorio** — Etapa de build (dependencias + compilación) separada de etapa de runtime. La imagen final NUNCA contiene código fuente del MCP server, herramientas de build ni paquetes de desarrollo.

2. **Imagen base mínima** — Runtime sobre `alpine`, `slim` o `distroless`. Nunca `ubuntu:latest` ni imágenes genéricas pesadas. Para Node.js: `node:22-alpine`. Para Python: `python:3.12-slim`. Para Go: `scratch` o `distroless`.

3. **Usuario non-root obligatorio** — El contenedor ejecuta como usuario sin privilegios. Nunca `USER root` en producción.

4. **Configuración por variables de entorno** — Todo configurable: puerto, log level, paths de proyecto, timeouts. Nunca hardcodeado. Patrón 12-factor.

5. **Health check integrado** — El Dockerfile incluye `HEALTHCHECK` que valida que el servidor MCP responde. Endpoint `/health` separado del endpoint MCP `/mcp`.

6. **Volúmenes para proyectos auditados** — El código fuente del proyecto a auditar se monta como volumen read-only (`ro`). El MCP server NUNCA modifica el código del proyecto.

7. **Imágenes etiquetadas por SHA** — Tag con SHA del commit de build. `latest` solo en desarrollo. Nunca `latest` en producción.

8. **`.dockerignore` obligatorio** — Excluir `.git`, `node_modules`, `__pycache__`, `.env`, archivos de test, documentación.

---

### Dockerfile Multi-stage — Node.js/TypeScript MCP Server

```dockerfile
# ═══════════════════════════════════════════════════════════════
# Etapa 1: Dependencias y Build
# ═══════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder

WORKDIR /build

# Copiar solo archivos de dependencias primero (cache de capas)
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts

# Copiar código fuente y compilar
COPY src/ ./src/
RUN npm run build && \
    npm prune --production

# ═══════════════════════════════════════════════════════════════
# Etapa 2: Runtime mínimo
# ═══════════════════════════════════════════════════════════════
FROM node:22-alpine AS runtime

# Metadata
LABEL maintainer="ZNS MCP Creator" \
      description="MCP Server for source code auditing" \
      mcp.transport="streamable-http" \
      mcp.version="2025-03-26"

# Seguridad: usuario non-root
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

WORKDIR /app

# Copiar solo artefactos necesarios
COPY --from=builder --chown=mcp:mcp /build/dist/ ./dist/
COPY --from=builder --chown=mcp:mcp /build/node_modules/ ./node_modules/
COPY --from=builder --chown=mcp:mcp /build/package.json ./

# Directorio para proyecto auditado (se monta como volumen)
RUN mkdir -p /project && chown mcp:mcp /project

# Variables de entorno configurables
ENV NODE_ENV=production \
    MCP_PORT=3000 \
    MCP_HOST=0.0.0.0 \
    MCP_LOG_LEVEL=info \
    PROJECT_ROOT=/project \
    MCP_SESSION_TTL_MS=3600000

# Exponer puerto
EXPOSE ${MCP_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${MCP_PORT}/health || exit 1

# Ejecutar como non-root
USER mcp

# Entrypoint
CMD ["node", "dist/index.js"]
```

---

### Dockerfile Multi-stage — Python MCP Server

```dockerfile
# ═══════════════════════════════════════════════════════════════
# Etapa 1: Build
# ═══════════════════════════════════════════════════════════════
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

COPY src/ ./src/

# ═══════════════════════════════════════════════════════════════
# Etapa 2: Runtime
# ═══════════════════════════════════════════════════════════════
FROM python:3.12-slim AS runtime

LABEL maintainer="ZNS MCP Creator" \
      description="MCP Server for source code auditing" \
      mcp.transport="streamable-http"

RUN groupadd -r mcp && useradd -r -g mcp -d /app -s /sbin/nologin mcp

WORKDIR /app

COPY --from=builder --chown=mcp:mcp /install /usr/local
COPY --from=builder --chown=mcp:mcp /build/src/ ./src/

RUN mkdir -p /project && chown mcp:mcp /project

ENV MCP_PORT=3000 \
    MCP_HOST=0.0.0.0 \
    MCP_LOG_LEVEL=info \
    PROJECT_ROOT=/project \
    PYTHONUNBUFFERED=1

EXPOSE ${MCP_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${MCP_PORT}/health')" || exit 1

USER mcp

CMD ["python", "-m", "src.server"]
```

---

### Docker Compose — Desarrollo y Despliegue

```yaml
# docker-compose.yml
version: "3.9"

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: mcp-code-auditor
    ports:
      - "${MCP_PORT:-3000}:3000"
    volumes:
      # Proyecto a auditar: READ-ONLY obligatorio
      - ${PROJECT_PATH:-./../target-project}:/project:ro
      # Caché de análisis (persistente entre reinicios)
      - mcp-cache:/app/cache
    environment:
      - MCP_PORT=3000
      - MCP_HOST=0.0.0.0
      - MCP_LOG_LEVEL=${MCP_LOG_LEVEL:-info}
      - PROJECT_ROOT=/project
      - MCP_SESSION_TTL_MS=3600000
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    # Seguridad adicional
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:size=100M
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
        reservations:
          memory: 128M
          cpus: "0.25"

volumes:
  mcp-cache:
    driver: local
```

---

### Docker Compose — Multi-MCP con red compartida

```yaml
# docker-compose.multi.yml — Múltiples MCP Servers
version: "3.9"

services:
  mcp-backend-auditor:
    build:
      context: ./mcp-backend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    volumes:
      - ${BACKEND_PROJECT_PATH}:/project:ro
    networks:
      - mcp-network
    environment:
      - MCP_SERVER_NAME=backend-auditor
      - PROJECT_ROOT=/project

  mcp-frontend-auditor:
    build:
      context: ./mcp-frontend
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    volumes:
      - ${FRONTEND_PROJECT_PATH}:/project:ro
    networks:
      - mcp-network
    environment:
      - MCP_SERVER_NAME=frontend-auditor
      - PROJECT_ROOT=/project

  mcp-infra-auditor:
    build:
      context: ./mcp-infra
      dockerfile: Dockerfile
    ports:
      - "3003:3000"
    volumes:
      - ${INFRA_PROJECT_PATH}:/project:ro
    networks:
      - mcp-network
    environment:
      - MCP_SERVER_NAME=infra-auditor
      - PROJECT_ROOT=/project

networks:
  mcp-network:
    driver: bridge
```

---

### `.dockerignore` obligatorio

```
.git
.gitignore
node_modules
__pycache__
*.pyc
.env
.env.*
*.md
!README.md
tests/
test/
__tests__
.vscode/
.idea/
coverage/
.nyc_output/
dist/
build/
*.log
docker-compose*.yml
Dockerfile*
.dockerignore
```

---

### Configuración para Clientes MCP (VS Code, Claude Desktop)

```json
// VS Code settings.json — MCP Server en Docker
{
  "mcpServers": {
    "code-auditor": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Accept": "application/json, text/event-stream"
      }
    }
  }
}
```

```json
// Claude Desktop — claude_desktop_config.json
{
  "mcpServers": {
    "code-auditor": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/path/to/project:/project:ro",
        "-p", "3000:3000",
        "mcp-code-auditor:latest"
      ]
    }
  }
}
```

---

## ✅ Criterios de Aplicación

- Cuando se contenedoriza un MCP Server para distribución
- Cuando se configura Docker Compose para desarrollo o multi-MCP
- Cuando se monta un proyecto como volumen para auditoría
- Cuando se configura un cliente MCP para conectar con servidor Docker
- Cuando se optimiza el tamaño y seguridad de la imagen

## ❌ Anti-patrones

- **Imagen monolítica**: Usar una sola etapa con JDK/SDK + código fuente en la imagen final
- **Root user**: Ejecutar el contenedor como root
- **Volúmenes read-write para proyecto auditado**: El MCP server no debe poder modificar el proyecto
- **Hardcodear paths**: Paths fijos como `/home/user/project` en vez de variables de entorno
- **Sin health check**: Docker no puede determinar si el servidor MCP está healthy
- **`latest` en producción**: Imágenes sin versionado semántico ni SHA
- **Secretos en build args**: Pasar tokens o passwords como `ARG` en el Dockerfile
- **Sin `.dockerignore`**: Copiar `.git`, `node_modules`, `.env` a la imagen
- **Sin límites de recursos**: Contenedores sin memory/CPU limits pueden tumbar el host

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Build y ejecución rápida

```bash
# Build
docker build -t mcp-code-auditor:1.0.0 .

# Run con proyecto montado
docker run --rm -d \
  --name mcp-auditor \
  -p 3000:3000 \
  -v /path/to/my-project:/project:ro \
  -e MCP_LOG_LEVEL=debug \
  mcp-code-auditor:1.0.0

# Verificar health
curl http://localhost:3000/health

# Verificar MCP initialize
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### Ejemplo 2: Docker Compose para desarrollo

```bash
# Levantar con proyecto local
PROJECT_PATH=../mi-proyecto-backend docker compose up -d

# Ver logs
docker compose logs -f mcp-server

# Rebuild tras cambios
docker compose build --no-cache && docker compose up -d
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: Docker MCP Deployment Expert → ver: 2-agents/zns-tools/mcp-creator/skills/docker-mcp-deployment-expert.skill.md

- Dockerfile multi-stage obligatorio (builder + runtime)
- Imágenes Alpine/slim/distroless, usuario non-root, HEALTHCHECK integrado
- Docker Compose con volúmenes read-only para proyecto auditado
- Configuración 12-factor por variables de entorno
- Patrones de conexión para VS Code, Claude Desktop y clientes HTTP
- Anti-patrones: root user, sin .dockerignore, sin health check, latest en prod
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica                              | Valor esperado                    |
|--------------------------------------|-----------------------------------|
| Imagen final < 150MB (Node.js)       | Obligatorio                       |
| Imagen final < 100MB (Python slim)   | Obligatorio                       |
| Imagen final < 20MB (Go distroless)  | Obligatorio                       |
| USER non-root                        | 100% de Dockerfiles               |
| HEALTHCHECK presente                 | 100% de Dockerfiles               |
| Volumen proyecto: read-only          | 100%                              |
| .dockerignore presente               | 100% de proyectos                 |
| Secretos en imagen                   | 0 (cero)                          |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Patrones Docker production-ready para MCP Servers
