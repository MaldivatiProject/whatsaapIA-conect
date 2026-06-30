# 🖥️ MCP Creator — Agente Senior para Servidores MCP

**metodo**: ZNS v2.2  
**version**: 1.0.0  
**last_updated**: 2026-04-17

---

## ¿Qué es este agente?

**MCP Creator Senior** es un agente especializado en diseñar, implementar y desplegar **servidores Model Context Protocol (MCP)** production-ready en Docker. Su especialidad es auditar proyectos de código fuente y transformarlos en MCP Servers que exponen herramientas inteligentes para modelos de IA.

---

## 📁 Estructura del Directorio

```
mcp-creator/
├── README.md                                    ← Este archivo
├── prompt-mcp-creator-senior.md                 ← Prompt principal del agente
└── skills/                                      ← Skills especializadas
    ├── README.md                                ← Catálogo de skills
    ├── mcp-protocol-expert.skill.md             ← Protocolo MCP completo
    ├── mcp-server-architecture-expert.skill.md  ← Arquitectura senior de servidores
    ├── docker-mcp-deployment-expert.skill.md    ← Dockerización production-ready
    └── source-code-auditor-mcp-expert.skill.md  ← Auditoría de código fuente
```

---

## 🚀 Cómo Invocar al Agente

```
Hola, necesito que asumas el rol de MCP Creator Senior.

CONTEXTO: Tengo un proyecto [lenguaje/framework] que necesito exponer como MCP Server.

PROYECTO A AUDITAR: [ruta al proyecto]
STACK DEL MCP SERVER: TypeScript (recomendado) | Python | Go

INSTRUCCIONES:
Sigue el prompt maestro en: 2-agents/zns-tools/mcp-creator/prompt-mcp-creator-senior.md

¡Comencemos!
```

---

## 🛠️ Capacidades del Agente

| Capacidad                      | Descripción                                                    |
|--------------------------------|----------------------------------------------------------------|
| **Diseño de MCP Servers**      | Crea servidores MCP completos desde cero                       |
| **Auditoría de código fuente** | Analiza proyectos en 5 capas (estructura, deps, código, arq, calidad) |
| **Dockerización**              | Dockerfile multi-stage, Docker Compose, health checks          |
| **Multi-lenguaje**             | Soporta TypeScript, Python, Go como stack del servidor         |
| **Multi-proyecto**             | Audita proyectos en TS, Go, Kotlin, Java, Python, Rust, C#, PHP |
| **Seguridad**                  | Non-root, read-only volumes, detección de secretos             |
| **Configuración de clientes**  | Genera configs para VS Code, Claude Desktop, Cursor            |

---

## 📦 Skills Incluidas

| Skill                               | Nivel  | Propósito                                |
|--------------------------------------|--------|------------------------------------------|
| MCP Protocol Expert                  | Expert | Protocolo MCP spec 2025-03-26            |
| MCP Server Architecture Expert      | Expert | Arquitectura clean para servidores MCP   |
| Docker MCP Deployment Expert         | Expert | Contenedorización production-ready       |
| Source Code Auditor MCP Expert       | Expert | Auditoría multi-capa de código fuente    |

---

## 📊 Entregables del Agente

Cuando se ejecuta el flujo completo, el agente genera:

1. **Proyecto MCP Server completo** — Código fuente listo para build
2. **Dockerfile multi-stage** — Imagen production-ready
3. **docker-compose.yml** — Orquestación con volúmenes y health checks
4. **README.md** — Documentación con Quick Start
5. **Configuración de clientes** — VS Code y Claude Desktop
6. **Tests unitarios** — Cobertura de servicios y tools

---

*Generado por: Prompt Engineer Senior ZNS — v1.0.0 — 2026-04-17*
