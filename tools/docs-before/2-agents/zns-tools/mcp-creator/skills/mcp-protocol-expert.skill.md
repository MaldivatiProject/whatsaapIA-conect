# 🎯 SKILL: MCP PROTOCOL EXPERT — MODEL CONTEXT PROTOCOL SPECIFICATION

**skill_id**: mcp-protocol-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: ai-infrastructure / mcp  
**last_updated**: 2026-04-17  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-mcp-creator-senior, agentes de arquitectura AI, agentes DevOps  
**dependencias**: ninguna (skill fundacional)  
**referencia_stack**: MCP Protocol 2025-03-26 / JSON-RPC 2.0 / SSE / stdio / TypeScript / Python

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con conocimiento profundo del **Model Context Protocol (MCP)** — el estándar abierto creado por Anthropic para la comunicación bidireccional entre aplicaciones de IA (hosts/clients) y servidores de contexto (MCP Servers). Cubre la especificación completa del protocolo, sus primitivas (Tools, Resources, Prompts), mecanismos de transporte (stdio, SSE, Streamable HTTP), ciclo de vida de conexión, negociación de capabilities, y patrones de diseño para servidores production-ready.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Arquitectura Client-Server con Host intermedio** — El Host (IDE, chat app) crea uno o más MCP Clients, cada Client mantiene una conexión 1:1 con un MCP Server. Los Servers exponen capabilities (tools, resources, prompts) que los Clients consumen.

2. **JSON-RPC 2.0 como protocolo de mensajes** — Toda comunicación MCP usa JSON-RPC 2.0: requests (con `id`), responses (con `result` o `error`), y notifications (sin `id`). No se inventan formatos custom.

3. **Tres primitivas fundamentales**:
   - **Tools**: Funciones invocables por el modelo (LLM → Server). Equivale a "function calling". El modelo decide cuándo invocarlas.
   - **Resources**: Datos expuestos por el servidor que el cliente puede leer (URIs). Equivale a archivos, DB schemas, API docs. El client decide cuándo leerlos.
   - **Prompts**: Templates de prompts predefinidos que el servidor expone. El usuario elige cuál usar.

4. **Negociación de Capabilities** — Durante `initialize`, client y server intercambian sus capabilities soportadas. Solo se usan features que ambos lados declaran soportar.

5. **Transportes oficiales**:
   - **stdio**: stdin/stdout. Ideal para servidores locales lanzados como subprocesos. Sin overhead de red.
   - **Streamable HTTP**: POST para requests client→server, GET con SSE para server→client streaming. Es el transporte recomendado para servidores remotos/Docker.
   - **SSE (legacy)**: Server-Sent Events. Deprecado en favor de Streamable HTTP pero aún soportado.

6. **Ciclo de vida**: `initialize` → `initialized` notification → operación normal → `shutdown`.

---

### Especificación de Tools (Herramientas)

```typescript
// Definición de un Tool en MCP
interface Tool {
  name: string;              // Identificador único, snake_case
  description: string;       // Descripción clara para el LLM
  inputSchema: {             // JSON Schema del input
    type: "object";
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
  annotations?: {
    title?: string;           // Nombre legible para UI
    readOnlyHint?: boolean;   // true = no modifica estado
    destructiveHint?: boolean; // true = operación destructiva
    idempotentHint?: boolean; // true = safe to retry
    openWorldHint?: boolean;  // true = interactúa con sistemas externos
  };
}

// Respuesta de un Tool
interface CallToolResult {
  content: (TextContent | ImageContent | EmbeddedResource)[];
  isError?: boolean;  // true si hubo error de negocio
}
```

**Reglas para Tools de calidad**:
- ✅ Nombres descriptivos en `snake_case`: `get_user_by_email`, `create_invoice`
- ✅ Descriptions orientadas al LLM: explica CUÁNDO usar, QUÉ hace, QUÉ retorna
- ✅ Input schema estricto con `required` explícito y tipos exactos
- ✅ Annotations correctas: marca `readOnlyHint: true` en queries, `destructiveHint: true` en deletes
- ❌ Nunca tools con side effects ocultos
- ❌ Nunca tools que aceptan `any` o schemas vacíos

---

### Especificación de Resources (Recursos)

```typescript
interface Resource {
  uri: string;          // URI única: "file:///path" o "custom://domain/resource"
  name: string;         // Nombre legible
  description?: string; // Para qué sirve este recurso
  mimeType?: string;    // "application/json", "text/markdown", etc.
}

// Lista de recursos: method "resources/list"
// Leer recurso: method "resources/read" → { uri: string }
// Suscripción: method "resources/subscribe" → notificación "notifications/resources/updated"
```

**URI Schemes recomendados**:
- `file://` — archivos del filesystem
- `project://` — archivos relativos al proyecto auditado
- `db://` — schemas, tablas, queries de base de datos
- `api://` — endpoints, specs OpenAPI
- `config://` — archivos de configuración

---

### Especificación de Prompts

```typescript
interface Prompt {
  name: string;
  description?: string;
  arguments?: PromptArgument[];  // Argumentos dinámicos
}

interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

// method "prompts/get" → { name: string, arguments?: Record<string, string> }
// Retorna: GetPromptResult { description?: string, messages: PromptMessage[] }
```

---

### Transporte Streamable HTTP (Docker/Remote)

```
POST /mcp          → JSON-RPC request/notification (client → server)
                   → Response: JSON-RPC response o SSE stream
GET  /mcp          → SSE stream para server-initiated messages
DELETE /mcp        → Terminar sesión (si sessionless=false)

Headers obligatorios:
  Content-Type: application/json
  Accept: application/json, text/event-stream
  Mcp-Session-Id: <uuid>  (tras initialize)
```

**Configuración para Docker**:
- El servidor DEBE escuchar en `0.0.0.0` (no `localhost`)
- El puerto debe ser configurable vía ENV (`MCP_PORT=3000`)
- Health check en `GET /health` separado del endpoint MCP
- CORS configurado si el client es browser-based

---

### Ciclo de Vida de Conexión

```
Client                          Server
  |                                |
  |--- initialize ---------------→|  (capabilities, protocolVersion)
  |←-- initialize response -------|  (capabilities, protocolVersion, serverInfo)
  |--- initialized notification -→|  (client confirma)
  |                                |
  |--- tools/list ---------------→|  (descubrir herramientas)
  |←-- tools/list response -------|
  |--- resources/list -----------→|  (descubrir recursos)
  |←-- resources/list response ---|
  |                                |
  |--- tools/call ---------------→|  (invocar herramienta)
  |←-- tools/call response -------|
  |                                |
  |--- shutdown -----------------→|  (o cierre de transporte)
```

---

## ✅ Criterios de Aplicación

- Cuando se diseña o implementa un MCP Server desde cero
- Cuando se audita un proyecto para convertir su API en herramientas MCP
- Cuando se configura el transporte de un MCP Server (stdio vs HTTP)
- Cuando se define el schema de tools, resources o prompts

## ❌ Anti-patrones

- **Tool God Object**: Un tool que hace demasiadas cosas. Cada tool = una responsabilidad.
- **Schema-less tools**: Tools sin inputSchema definido. El LLM no sabrá qué enviar.
- **Descriptions para humanos**: Las descriptions deben ser para el LLM, no para documentación de usuario.
- **Ignorar annotations**: No marcar `destructiveHint` en un DELETE es peligroso.
- **Sesiones sin timeout**: En Streamable HTTP, toda sesión DEBE tener TTL configurable.
- **Exponer secretos como Resources**: Nunca exponer `.env`, credentials o tokens como recursos MCP.

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Tool de lectura de código fuente

```json
{
  "name": "read_source_file",
  "description": "Lee el contenido de un archivo fuente del proyecto auditado. Usa esta herramienta cuando necesites inspeccionar el código de un módulo, clase o configuración específica. Retorna el contenido completo del archivo con números de línea.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "filePath": {
        "type": "string",
        "description": "Ruta relativa al archivo desde la raíz del proyecto. Ejemplo: 'src/main/kotlin/com/example/UserService.kt'"
      },
      "startLine": {
        "type": "integer",
        "description": "Línea inicial (1-based). Si se omite, lee desde el inicio."
      },
      "endLine": {
        "type": "integer",
        "description": "Línea final (1-based). Si se omite, lee hasta el final."
      }
    },
    "required": ["filePath"]
  },
  "annotations": {
    "title": "Leer archivo fuente",
    "readOnlyHint": true,
    "destructiveHint": false,
    "idempotentHint": true
  }
}
```

### Ejemplo 2: Resource de estructura del proyecto

```json
{
  "uri": "project://structure",
  "name": "Estructura del proyecto",
  "description": "Árbol de directorios del proyecto auditado con metadata de cada archivo (tamaño, lenguaje, última modificación)",
  "mimeType": "application/json"
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: MCP Protocol Expert → ver: 2-agents/zns-tools/mcp-creator/skills/mcp-protocol-expert.skill.md

- Dominio completo del Model Context Protocol (spec 2025-03-26)
- Diseño de Tools con JSON Schema estricto y annotations correctas
- Diseño de Resources con URI schemes semánticos
- Transporte Streamable HTTP para despliegue Docker remoto
- Ciclo de vida: initialize → operate → shutdown
- Anti-patrones: Tool God Object, schema-less tools, sesiones sin TTL
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica                              | Valor esperado                          |
|--------------------------------------|-----------------------------------------|
| Tools con inputSchema completo       | 100%                                    |
| Tools con annotations correctas      | 100%                                    |
| Resources con URI scheme semántico   | 100%                                    |
| Descripción orientada a LLM         | Todas las descriptions > 20 palabras    |
| Cobertura de primitivas MCP          | Tools + Resources + Prompts             |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Especificación MCP completa con patrones senior
