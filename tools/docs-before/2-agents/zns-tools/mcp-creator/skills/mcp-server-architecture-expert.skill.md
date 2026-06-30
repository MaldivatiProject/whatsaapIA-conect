# 🏗️ SKILL: MCP SERVER ARCHITECTURE EXPERT — ARQUITECTURA SENIOR PARA SERVIDORES MCP

**skill_id**: mcp-server-architecture-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: architecture / mcp / backend  
**last_updated**: 2026-04-17  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-mcp-creator-senior, agentes de arquitectura backend  
**dependencias**: mcp-protocol-expert, docker-mcp-deployment-expert  
**referencia_stack**: Node.js/TypeScript + @modelcontextprotocol/sdk | Python + mcp-sdk | Go + mcp-go | Clean Architecture

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con los **patrones de arquitectura senior** para construir MCP Servers mantenibles, testeables y escalables. Cubre la estructura de carpetas canónica, separación de responsabilidades (transporte ↔ dominio ↔ tools), manejo de errores, logging estructurado, testing, configuración, y patrones de extensibilidad para agregar tools/resources sin romper el código existente.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Separación transporte-dominio** — La lógica de negocio (análisis de código, parseo, búsqueda) NUNCA vive en los handlers de tools. Los tools son adaptadores finos que delegan a servicios de dominio.

2. **Plugin architecture para Tools** — Cada tool es un módulo independiente con su propio archivo. Registrar tools debe ser declarativo (auto-discovery o registro explícito), no un switch/case monolítico.

3. **Dependency Injection** — Los servicios (FileSystemService, ParserService, CacheService) se inyectan en los tools, no se instancian internamente. Facilita testing y reemplazo.

4. **Error handling con categorías MCP** — Errores tipados según el protocolo: `InvalidParams`, `MethodNotFound`, `InternalError`. Nunca stack traces al cliente.

5. **Logging estructurado** — JSON structured logging con niveles (debug, info, warn, error), correlación por `sessionId`, y nunca logs de contenido sensible.

6. **Configuración tipada y validada** — Toda la configuración (ENV vars) se valida al startup. Si falta algo crítico, el servidor NO arranca (fail-fast).

7. **Graceful shutdown** — Cerrar sesiones activas, flush de cache, cerrar file watchers antes de terminar el proceso.

---

### Estructura de Carpetas Canónica — TypeScript

```
mcp-server/
├── src/
│   ├── index.ts                    # Entry point: carga config, inicia servidor
│   ├── server.ts                   # Configuración del MCP Server (capabilities, transport)
│   ├── config/
│   │   ├── index.ts                # Carga y valida ENV vars
│   │   └── config.schema.ts        # Schema de validación (zod/joi)
│   ├── tools/                      # Cada tool en su archivo
│   │   ├── index.ts                # Auto-registro de todos los tools
│   │   ├── get-project-structure.tool.ts
│   │   ├── get-dependencies.tool.ts
│   │   ├── search-code.tool.ts
│   │   ├── get-function-source.tool.ts
│   │   ├── get-quality-report.tool.ts
│   │   └── detect-architecture.tool.ts
│   ├── resources/                  # Cada resource en su archivo
│   │   ├── index.ts                # Auto-registro de resources
│   │   ├── project-structure.resource.ts
│   │   ├── project-readme.resource.ts
│   │   └── project-dependencies.resource.ts
│   ├── prompts/                    # Prompts MCP predefinidos
│   │   ├── index.ts
│   │   ├── audit-full-project.prompt.ts
│   │   └── explain-module.prompt.ts
│   ├── services/                   # Lógica de dominio (NO MCP-specific)
│   │   ├── file-system.service.ts  # Operaciones de filesystem
│   │   ├── parser.service.ts       # Parseo de código fuente
│   │   ├── dependency.service.ts   # Análisis de dependencias
│   │   ├── architecture.service.ts # Detección de arquitectura
│   │   ├── security.service.ts     # Detección de secretos
│   │   ├── cache.service.ts        # Cache inteligente con invalidación
│   │   └── search.service.ts       # Motor de búsqueda en código
│   ├── utils/
│   │   ├── logger.ts               # Logger estructurado
│   │   ├── sanitizer.ts            # Filtrado de secretos en outputs
│   │   └── path.ts                 # Utilidades de paths seguros
│   └── types/
│       ├── project.types.ts        # Tipos del dominio
│       └── mcp.types.ts            # Tipos extendidos MCP
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── tools/
│   ├── integration/
│   │   └── server.integration.test.ts
│   └── fixtures/                   # Proyectos mock para testing
│       ├── typescript-project/
│       ├── go-project/
│       └── kotlin-project/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

### Estructura de Carpetas Canónica — Python

```
mcp-server/
├── src/
│   ├── __init__.py
│   ├── server.py                   # Entry point + MCP Server setup
│   ├── config.py                   # Configuración tipada (pydantic)
│   ├── tools/
│   │   ├── __init__.py             # Auto-registro
│   │   ├── project_structure.py
│   │   ├── dependencies.py
│   │   ├── search_code.py
│   │   ├── function_source.py
│   │   └── quality_report.py
│   ├── resources/
│   │   ├── __init__.py
│   │   ├── project_structure.py
│   │   └── project_readme.py
│   ├── prompts/
│   │   ├── __init__.py
│   │   └── audit_project.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_system.py
│   │   ├── parser.py
│   │   ├── dependency_analyzer.py
│   │   ├── architecture_detector.py
│   │   ├── security_scanner.py
│   │   ├── cache.py
│   │   └── search.py
│   ├── utils/
│   │   ├── logger.py
│   │   ├── sanitizer.py
│   │   └── paths.py
│   └── types/
│       └── models.py               # Pydantic models
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

### Patrón: Tool Registration (TypeScript)

```typescript
// src/tools/get-project-structure.tool.ts
import { z } from "zod";
import { ToolDefinition } from "../types/mcp.types.js";
import { FileSystemService } from "../services/file-system.service.js";

const inputSchema = z.object({
  depth: z.number().optional().default(5).describe("Profundidad máxima del árbol"),
  includeHidden: z.boolean().optional().default(false).describe("Incluir archivos ocultos"),
});

export const getProjectStructureTool: ToolDefinition = {
  name: "get_project_structure",
  description:
    "Obtiene el árbol de directorios del proyecto auditado con metadata " +
    "(lenguaje, tamaño, tipo). Usa esta herramienta primero para entender " +
    "la estructura general del proyecto antes de profundizar en módulos específicos.",
  inputSchema: {
    type: "object",
    properties: {
      depth: { type: "number", description: "Profundidad máxima del árbol (default: 5)" },
      includeHidden: { type: "boolean", description: "Incluir archivos ocultos (default: false)" },
    },
  },
  annotations: {
    title: "Estructura del proyecto",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },

  async handler(params: unknown, services: { fs: FileSystemService }) {
    const input = inputSchema.parse(params);
    const tree = await services.fs.getProjectTree(input.depth, input.includeHidden);
    return {
      content: [{ type: "text", text: JSON.stringify(tree, null, 2) }],
    };
  },
};
```

```typescript
// src/tools/index.ts — Auto-registro
import { getProjectStructureTool } from "./get-project-structure.tool.js";
import { getDependenciesTool } from "./get-dependencies.tool.js";
import { searchCodeTool } from "./search-code.tool.js";
import { getFunctionSourceTool } from "./get-function-source.tool.js";
import { getQualityReportTool } from "./get-quality-report.tool.js";
import { detectArchitectureTool } from "./detect-architecture.tool.js";

export const allTools = [
  getProjectStructureTool,
  getDependenciesTool,
  searchCodeTool,
  getFunctionSourceTool,
  getQualityReportTool,
  detectArchitectureTool,
];
```

```typescript
// src/server.ts — Registro en el MCP Server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { allTools } from "./tools/index.js";
import { allResources } from "./resources/index.js";
import { config } from "./config/index.js";
import { createServices } from "./services/index.js";

export function createMcpServer() {
  const server = new McpServer({
    name: config.serverName,
    version: config.serverVersion,
  });

  const services = createServices(config);

  // Registrar tools
  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (params) => tool.handler(params, services)
    );
  }

  // Registrar resources
  for (const resource of allResources) {
    server.resource(
      resource.name,
      resource.uri,
      resource.metadata,
      async (uri) => resource.handler(uri, services)
    );
  }

  return server;
}
```

---

### Patrón: Configuración Tipada y Validada

```typescript
// src/config/index.ts
import { z } from "zod";

const configSchema = z.object({
  serverName: z.string().default("mcp-code-auditor"),
  serverVersion: z.string().default("1.0.0"),
  port: z.coerce.number().min(1).max(65535).default(3000),
  host: z.string().default("0.0.0.0"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  projectRoot: z.string().min(1, "PROJECT_ROOT es obligatorio"),
  sessionTtlMs: z.coerce.number().default(3_600_000),
  cache: z.object({
    enabled: z.coerce.boolean().default(true),
    ttlMs: z.coerce.number().default(300_000),
    maxEntries: z.coerce.number().default(1000),
  }).default({}),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  serverName: process.env.MCP_SERVER_NAME,
  serverVersion: process.env.MCP_SERVER_VERSION,
  port: process.env.MCP_PORT,
  host: process.env.MCP_HOST,
  logLevel: process.env.MCP_LOG_LEVEL,
  projectRoot: process.env.PROJECT_ROOT,
  sessionTtlMs: process.env.MCP_SESSION_TTL_MS,
  cache: {
    enabled: process.env.MCP_CACHE_ENABLED,
    ttlMs: process.env.MCP_CACHE_TTL_MS,
    maxEntries: process.env.MCP_CACHE_MAX_ENTRIES,
  },
});
```

---

### Patrón: Error Handling MCP

```typescript
// src/utils/errors.ts
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

export function toolNotFoundError(toolName: string): McpError {
  return new McpError(ErrorCode.MethodNotFound, `Tool '${toolName}' not found`);
}

export function invalidParamsError(message: string): McpError {
  return new McpError(ErrorCode.InvalidParams, message);
}

export function internalError(message: string): McpError {
  // Nunca exponer stack traces al cliente
  return new McpError(ErrorCode.InternalError, `Internal error: ${message}`);
}

// En los tools:
async handler(params: unknown, services: Services) {
  try {
    const input = inputSchema.parse(params);
    // ...lógica
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw invalidParamsError(err.errors.map(e => e.message).join(", "));
    }
    logger.error("Tool execution failed", { tool: this.name, error: err });
    throw internalError("Failed to execute tool");
  }
}
```

---

### Patrón: Logging Estructurado

```typescript
// src/utils/logger.ts
import { config } from "../config/index.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private level: number;

  constructor(level: LogLevel) {
    this.level = LEVELS[level];
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LEVELS[level] < this.level) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    // MCP usa stderr para logs (stdout reservado para stdio transport)
    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  debug(msg: string, meta?: Record<string, unknown>) { this.log("debug", msg, meta); }
  info(msg: string, meta?: Record<string, unknown>) { this.log("info", msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>) { this.log("warn", msg, meta); }
  error(msg: string, meta?: Record<string, unknown>) { this.log("error", msg, meta); }
}

export const logger = new Logger(config.logLevel);
```

---

### Patrón: Health Check Endpoint

```typescript
// src/index.ts — Entry point con health check separado
import express from "express";
import { createMcpServer } from "./server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";

const app = express();

// Health check — NO es MCP, es HTTP plano
app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: config.serverVersion, uptime: process.uptime() });
});

// MCP endpoint
app.post("/mcp", async (req, res) => {
  // ... handler de Streamable HTTP transport
});

app.get("/mcp", async (req, res) => {
  // ... SSE stream para server-initiated messages
});

app.delete("/mcp", async (req, res) => {
  // ... cerrar sesión
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  // Cerrar sesiones, flush cache, etc.
  process.exit(0);
});

app.listen(config.port, config.host, () => {
  logger.info(`MCP Server listening`, { host: config.host, port: config.port });
});
```

---

### Patrón: Testing de Tools

```typescript
// tests/unit/tools/get-project-structure.test.ts
import { describe, it, expect, vi } from "vitest";
import { getProjectStructureTool } from "../../../src/tools/get-project-structure.tool.js";

describe("get_project_structure tool", () => {
  const mockFs = {
    getProjectTree: vi.fn().mockResolvedValue({
      name: "test-project",
      type: "directory",
      children: [
        { name: "src", type: "directory", children: [] },
        { name: "package.json", type: "file", extension: ".json" },
      ],
    }),
  };

  it("should return project tree with default depth", async () => {
    const result = await getProjectStructureTool.handler({}, { fs: mockFs });
    
    expect(mockFs.getProjectTree).toHaveBeenCalledWith(5, false);
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe("test-project");
  });

  it("should respect custom depth parameter", async () => {
    await getProjectStructureTool.handler({ depth: 2 }, { fs: mockFs });
    expect(mockFs.getProjectTree).toHaveBeenCalledWith(2, false);
  });
});
```

---

## ✅ Criterios de Aplicación

- Cuando se crea un MCP Server desde cero
- Cuando se define la estructura de carpetas del servidor
- Cuando se implementa el patrón de registro de tools
- Cuando se configura error handling, logging y health checks
- Cuando se diseña la estrategia de testing del servidor

## ❌ Anti-patrones

- **Lógica de negocio en tool handlers**: Los handlers deben ser delegadores, no procesadores
- **Switch/case monolítico para tools**: Cada tool en su archivo, registro declarativo
- **Console.log para logging**: Logging estructurado en stderr, nunca stdout (reservado para stdio)
- **Configuración hardcodeada**: Todo por ENV vars, validado al startup
- **Sin graceful shutdown**: Pérdida de sesiones y cache al matar el proceso
- **Tests que dependen del filesystem real**: Usar mocks/fixtures para tests unitarios
- **Catch-all genérico**: Errores tipados con ErrorCode del protocolo MCP
- **Instanciar servicios dentro de tools**: Dependency injection, nunca `new Service()` dentro del handler

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Agregar un nuevo Tool al servidor

```
1. Crear archivo: src/tools/my-new-tool.tool.ts
2. Definir: name, description, inputSchema, annotations, handler
3. El handler recibe (params, services) — delega a un servicio
4. Importar en src/tools/index.ts y agregar al array allTools
5. Crear test: tests/unit/tools/my-new-tool.test.ts
6. Ejecutar tests: npm test
7. El server registra el tool automáticamente al arrancar
```

### Ejemplo 2: Estructura de un servicio de dominio

```typescript
// src/services/parser.service.ts
export class ParserService {
  constructor(private readonly fsService: FileSystemService) {}

  async parseFile(filePath: string): Promise<ParsedFile> {
    const content = await this.fsService.readFile(filePath);
    const language = this.detectLanguage(filePath);
    // ... parseo según lenguaje
    return { filePath, language, symbols, imports, exports };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      ".ts": "typescript", ".js": "javascript", ".go": "go",
      ".kt": "kotlin", ".java": "java", ".py": "python",
      ".rs": "rust", ".cs": "csharp",
    };
    return langMap[ext] ?? "unknown";
  }
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: MCP Server Architecture Expert → ver: 2-agents/zns-tools/mcp-creator/skills/mcp-server-architecture-expert.skill.md

- Estructura de carpetas canónica: tools/, resources/, prompts/, services/, config/
- Plugin architecture: cada tool en su archivo, registro declarativo
- Separación transporte ↔ dominio: handlers delegan a services
- Configuración tipada con Zod/Pydantic, validada al startup (fail-fast)
- Error handling con ErrorCode MCP, logging estructurado en stderr
- Testing: unit tests para tools y services, fixtures para proyectos mock
- Graceful shutdown: cerrar sesiones, flush cache, cerrar watchers
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica                              | Valor esperado                    |
|--------------------------------------|-----------------------------------|
| Tools en archivos independientes     | 100%                              |
| Services con dependency injection    | 100%                              |
| Configuración validada al startup    | 100%                              |
| Cobertura de tests unitarios         | ≥ 80%                             |
| Errores tipados (no genéricos)       | 100%                              |
| Logs en stderr (no stdout)           | 100%                              |
| Health check separado                | Presente                          |
| Graceful shutdown implementado       | Presente                          |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Arquitectura senior para MCP Servers con patrones production-ready
