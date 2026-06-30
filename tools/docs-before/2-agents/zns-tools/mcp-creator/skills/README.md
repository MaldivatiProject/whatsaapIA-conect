# 📚 Catálogo de Skills — MCP Creator Senior

**metodo**: ZNS v2.2  
**version**: 1.0.0  
**last_updated**: 2026-04-17  
**mantenido_por**: Skill Engineer Senior ZNS  
**agente_destino**: prompt-mcp-creator-senior

---

## ¿Qué contiene este catálogo?

Skills especializadas para el agente **MCP Creator Senior**, organizadas por dominio. Cada skill es un módulo de conocimiento Expert que el agente consume para generar MCP Servers production-ready.

---

## 📦 Cómo consumir una Skill

En el archivo `.md` del agente receptor, agregar:

```markdown
### SKILL ACTIVA: [NOMBRE] → ver: 2-agents/zns-tools/mcp-creator/skills/[archivo].skill.md
[Resumen ejecutivo de la skill adaptado al contexto del agente]
```

---

## 🗂️ Catálogo de Skills

### Categoría: MCP Protocol

| skill_id                       | Nivel  | Descripción breve                                                            | Archivo                                          |
|--------------------------------|--------|------------------------------------------------------------------------------|--------------------------------------------------|
| `mcp-protocol-expert`          | Expert | Especificación completa MCP 2025-03-26: Tools, Resources, Prompts, Transports, Lifecycle | [mcp-protocol-expert.skill.md](mcp-protocol-expert.skill.md) |

### Categoría: Arquitectura de Servidores

| skill_id                              | Nivel  | Descripción breve                                                            | Archivo                                          |
|---------------------------------------|--------|------------------------------------------------------------------------------|--------------------------------------------------|
| `mcp-server-architecture-expert`      | Expert | Clean Architecture para MCP Servers: estructura canónica, plugin pattern, DI, error handling, testing | [mcp-server-architecture-expert.skill.md](mcp-server-architecture-expert.skill.md) |

### Categoría: Docker & Deployment

| skill_id                           | Nivel  | Descripción breve                                                            | Archivo                                          |
|------------------------------------|--------|------------------------------------------------------------------------------|--------------------------------------------------|
| `docker-mcp-deployment-expert`     | Expert | Dockerización production-ready: multi-stage, non-root, health checks, Compose, configuración de clientes MCP | [docker-mcp-deployment-expert.skill.md](docker-mcp-deployment-expert.skill.md) |

### Categoría: Auditoría de Código

| skill_id                              | Nivel  | Descripción breve                                                            | Archivo                                          |
|---------------------------------------|--------|------------------------------------------------------------------------------|--------------------------------------------------|
| `source-code-auditor-mcp-expert`      | Expert | Auditoría multi-capa de código fuente (estructura, deps, código, arquitectura, calidad) para exposición IA via MCP | [source-code-auditor-mcp-expert.skill.md](source-code-auditor-mcp-expert.skill.md) |

---

## 🗺️ Mapa de Dependencias

```
mcp-protocol-expert (fundacional)
  ├── mcp-server-architecture-expert (depende de protocol)
  ├── docker-mcp-deployment-expert (depende de protocol)
  └── source-code-auditor-mcp-expert (depende de protocol)
```

---

## 🔄 Changelog

- v1.0.0: Catálogo inicial con 4 skills Expert para MCP Creator Senior
