# 🔍 SKILL: SOURCE CODE AUDITOR MCP EXPERT — AUDITORÍA DE CÓDIGO FUENTE PARA EXPOSICIÓN IA

**skill_id**: source-code-auditor-mcp-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: ai-infrastructure / code-analysis / mcp  
**last_updated**: 2026-04-17  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-mcp-creator-senior, agentes de arquitectura, agentes QA  
**dependencias**: mcp-protocol-expert  
**referencia_stack**: AST Parsing / Tree-sitter / Language Server Protocol / Static Analysis / Multi-language support

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con la capacidad de **auditar proyectos de código fuente** y transformar su estructura, lógica y metadata en **Tools y Resources MCP** consumibles por modelos de IA. El objetivo es que un MCP Server pueda exponer el conocimiento completo de un proyecto (estructura, dependencias, APIs, patrones, configuración, tests) de forma navegable, semántica y accionable para asistentes de IA.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Auditoría no-invasiva** — El auditor NUNCA modifica el código del proyecto. Solo lectura. Montaje read-only.

2. **Análisis multi-capa** — Auditar en 5 capas progresivas:
   - **Capa 1 — Estructura**: Árbol de directorios, convenciones, archivos clave
   - **Capa 2 — Dependencias**: package.json, go.mod, build.gradle, requirements.txt, pom.xml
   - **Capa 3 — Código**: Clases, funciones, interfaces, tipos, exports
   - **Capa 4 — Patrones**: Arquitectura detectada (MVC, hexagonal, CQRS), patrones de diseño
   - **Capa 5 — Calidad**: Tests, cobertura, linting, seguridad, documentación

3. **Detección de lenguaje automática** — Identificar el stack tecnológico por:
   - Archivos de configuración: `package.json` (Node), `go.mod` (Go), `build.gradle.kts` (Kotlin), `pom.xml` (Java), `requirements.txt` / `pyproject.toml` (Python), `Cargo.toml` (Rust)
   - Extensiones dominantes: `.ts`, `.go`, `.kt`, `.java`, `.py`, `.rs`, `.cs`
   - Frameworks: detectar Spring Boot, Express, Gin, Ktor, FastAPI, Actix, .NET

4. **Granularidad adaptativa** — Tools gruesos para visión general, tools finos para detalle:
   - `get_project_overview` → visión de alto nivel
   - `get_module_structure` → estructura de un módulo
   - `get_function_source` → código de una función específica
   - `search_code` → búsqueda semántica/textual

5. **Cache inteligente** — Los resultados de análisis se cachean. Invalidación por file watcher o hash de mtime.

6. **Seguridad en la exposición** — NUNCA exponer:
   - Archivos `.env`, `.env.local`, secretos
   - Contenido de `node_modules`, `.git`, binarios
   - Tokens, API keys, passwords en cualquier archivo
   - Archivos listados en `.gitignore` (respetarlo)

---

### Capa 1: Análisis de Estructura

**Tool: `get_project_structure`**

```typescript
// Genera árbol del proyecto con metadata
interface ProjectStructure {
  rootPath: string;
  projectName: string;
  detectedLanguages: Language[];
  detectedFrameworks: Framework[];
  tree: DirectoryNode[];
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalLines: number;
    filesByExtension: Record<string, number>;
  };
}

interface DirectoryNode {
  name: string;
  type: "file" | "directory";
  path: string;           // Relativo a root
  extension?: string;
  size?: number;           // bytes
  language?: string;
  children?: DirectoryNode[];
}
```

**Archivos clave a identificar siempre**:
- `README.md` / `README` — Documentación principal
- `Dockerfile` / `docker-compose.yml` — Containerización
- `.github/workflows/` — CI/CD
- `Makefile` / `Taskfile.yml` — Comandos de build
- Archivos de configuración del framework
- Entry points: `main.go`, `index.ts`, `Application.kt`, `Program.cs`

---

### Capa 2: Análisis de Dependencias

**Tool: `get_project_dependencies`**

```typescript
interface DependencyReport {
  packageManager: string;    // npm, go modules, gradle, pip, cargo
  language: string;
  dependencies: Dependency[];
  devDependencies: Dependency[];
  scripts?: Record<string, string>;  // npm scripts, gradle tasks
}

interface Dependency {
  name: string;
  version: string;
  type: "production" | "development" | "test";
  category?: string;       // "web-framework", "database", "testing", "security"
}
```

**Detección por archivo**:

| Archivo                   | Package Manager | Lenguaje    |
|---------------------------|-----------------|-------------|
| `package.json`            | npm/yarn/pnpm   | JS/TS       |
| `go.mod`                  | go modules      | Go          |
| `build.gradle.kts`        | Gradle          | Kotlin/Java |
| `pom.xml`                 | Maven           | Java        |
| `requirements.txt`        | pip             | Python      |
| `pyproject.toml`          | poetry/pip      | Python      |
| `Cargo.toml`              | cargo           | Rust        |
| `*.csproj`                | NuGet           | C#/.NET     |
| `composer.json`           | Composer        | PHP         |

---

### Capa 3: Análisis de Código

**Tool: `get_module_exports`** — Lista clases, funciones, interfaces de un módulo

```typescript
interface ModuleExports {
  filePath: string;
  language: string;
  exports: CodeSymbol[];
}

interface CodeSymbol {
  name: string;
  kind: "class" | "function" | "interface" | "type" | "enum" | "constant" | "variable";
  exported: boolean;
  startLine: number;
  endLine: number;
  signature?: string;       // firma completa
  docComment?: string;       // JSDoc, GoDoc, KDoc
  decorators?: string[];     // @Controller, @Injectable
  parameters?: Parameter[];  // para funciones
  returnType?: string;
}
```

**Tool: `search_code`** — Búsqueda textual y por patrón

```typescript
interface SearchRequest {
  query: string;              // texto o regex
  isRegex?: boolean;
  filePattern?: string;       // glob: "**/*.ts", "src/**/*.go"
  maxResults?: number;
  includeContext?: boolean;   // líneas antes/después del match
  contextLines?: number;      // default: 3
}

interface SearchResult {
  filePath: string;
  line: number;
  column: number;
  matchText: string;
  context: string;            // líneas de contexto
}
```

**Tool: `get_function_source`** — Lee el código fuente de una función/clase específica

```typescript
interface FunctionSourceRequest {
  filePath: string;
  symbolName: string;         // nombre de la función/clase
}
// Retorna: código fuente completo con números de línea
```

---

### Capa 4: Análisis de Patrones Arquitectónicos

**Tool: `detect_architecture`** — Detecta el patrón arquitectónico del proyecto

```typescript
interface ArchitectureReport {
  detectedPattern: string;     // "hexagonal", "mvc", "clean-architecture", "cqrs", "monolith", "microservices"
  confidence: number;          // 0.0 - 1.0
  evidence: ArchitectureEvidence[];
  layers: Layer[];
  recommendations?: string[];
}

interface ArchitectureEvidence {
  indicator: string;           // "Carpeta domain/ sin imports de infraestructura"
  supports: string;            // "hexagonal"
  filePath?: string;
}

interface Layer {
  name: string;                // "domain", "application", "infrastructure", "presentation"
  directories: string[];
  fileCount: number;
  description: string;
}
```

**Indicadores de detección**:

| Patrón        | Indicadores clave                                                              |
|---------------|--------------------------------------------------------------------------------|
| Hexagonal     | `domain/`, `ports/`, `adapters/`, `application/` — domain sin imports de infra |
| MVC           | `controllers/`, `models/`, `views/` o `routes/`                                |
| Clean Arch    | `entities/`, `usecases/`, `interfaces/`, `frameworks/`                         |
| CQRS          | `commands/`, `queries/`, `handlers/` separados                                 |
| Layered       | `service/`, `repository/`, `controller/` sin separación domain/infra           |

---

### Capa 5: Análisis de Calidad

**Tool: `get_quality_report`**

```typescript
interface QualityReport {
  tests: {
    framework: string;         // jest, go test, junit, pytest
    testFiles: number;
    testCases: number;
    coverageFile?: string;     // ruta al coverage report si existe
  };
  documentation: {
    hasReadme: boolean;
    hasApiDocs: boolean;       // swagger, openapi
    docCommentCoverage: number; // % de exports con JSDoc/KDoc/GoDoc
  };
  security: {
    hasEnvExample: boolean;
    envFilesExposed: boolean;  // .env commiteado = ⚠️
    hardcodedSecrets: SecurityFinding[];
  };
  codeSmells: {
    filesOver500Lines: string[];
    functionsOver50Lines: string[];
    deepNesting: string[];      // archivos con > 4 niveles de anidación
  };
}

interface SecurityFinding {
  filePath: string;
  line: number;
  type: "api_key" | "password" | "token" | "connection_string" | "private_key";
  severity: "critical" | "high" | "medium";
  snippet: string;            // contexto sanitizado (valor ofuscado)
}
```

**Patrones de detección de secretos** (regex):

```
# API Keys
(api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]

# AWS
AKIA[0-9A-Z]{16}

# Passwords en config
(password|passwd|pwd|secret)\s*[:=]\s*['"][^'"]{8,}['"]

# Connection strings
(mongodb|postgres|mysql|redis):\/\/[^@]+@[^/]+

# JWT secrets
(jwt[_-]?secret|token[_-]?secret)\s*[:=]\s*['"][^'"]+['"]

# Private keys
-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----
```

---

### Resources MCP a Exponer

| Resource URI                    | Descripción                                          | MimeType           |
|---------------------------------|------------------------------------------------------|--------------------|
| `project://structure`           | Árbol completo del proyecto con metadata              | application/json   |
| `project://readme`              | Contenido del README.md                               | text/markdown      |
| `project://dependencies`        | Reporte de dependencias del proyecto                  | application/json   |
| `project://architecture`        | Análisis de arquitectura detectada                    | application/json   |
| `project://quality`             | Reporte de calidad (tests, docs, security)            | application/json   |
| `project://api-spec`            | OpenAPI/Swagger spec si existe                        | application/json   |
| `project://config/{name}`       | Archivos de configuración (sanitizados)               | application/json   |
| `project://file/{path}`         | Contenido de un archivo específico                    | text/plain         |

---

### Prompts MCP a Exponer

| Prompt Name                     | Descripción                                          | Arguments          |
|---------------------------------|------------------------------------------------------|--------------------|
| `audit-full-project`            | Auditoría completa del proyecto en todas las capas    | ninguno            |
| `explain-module`                | Explica qué hace un módulo/directorio específico      | `modulePath`       |
| `find-security-issues`          | Busca problemas de seguridad en el proyecto           | ninguno            |
| `suggest-improvements`          | Sugiere mejoras de arquitectura y código              | `focus` (opcional) |
| `review-function`               | Review detallado de una función específica            | `filePath`, `name` |

---

## ✅ Criterios de Aplicación

- Cuando se construye un MCP Server que audita código de un proyecto
- Cuando se definen Tools de lectura/análisis de código fuente
- Cuando se exponen Resources de un proyecto para consumo IA
- Cuando se detectan patrones arquitectónicos automáticamente
- Cuando se genera un reporte de calidad del proyecto

## ❌ Anti-patrones

- **Modificar el proyecto auditado**: El auditor es READ-ONLY. Siempre.
- **Exponer `.env` o secretos**: Filtrar SIEMPRE contenido sensible
- **Ignorar `.gitignore`**: Si el proyecto ignora archivos, el auditor también
- **Analizar `node_modules`/`vendor`**: Solo analizar código del proyecto, no dependencias
- **Tools sin granularidad**: Un solo tool `analyze_everything` es inútil para el LLM
- **Cache sin invalidación**: Análisis cacheado que no se invalida cuando el código cambia
- **Paths absolutos del host**: Exponer paths como `/home/user/project` en vez de paths relativos
- **Sin límite de output**: Tools que devuelven archivos de 10K líneas sin paginación

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Flujo completo de auditoría

```
1. LLM invoca: get_project_structure → obtiene árbol y stack detectado
2. LLM invoca: get_project_dependencies → entiende librerías del proyecto
3. LLM invoca: detect_architecture → identifica patrón hexagonal
4. LLM invoca: get_module_exports("src/domain/") → lista entidades del dominio
5. LLM invoca: get_function_source("src/domain/user/UserService.kt", "createUser") → lee lógica
6. LLM invoca: get_quality_report → verifica tests y seguridad
```

### Ejemplo 2: Búsqueda inteligente

```
User: "¿Dónde se validan los tokens JWT en este proyecto?"

LLM → search_code({ query: "jwt|token|verify|validate", filePattern: "**/*.{ts,kt,go,java}" })
LLM → get_function_source(resultado.filePath, "validateToken")
LLM → explica al usuario la lógica de validación
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: Source Code Auditor MCP Expert → ver: 2-agents/zns-tools/mcp-creator/skills/source-code-auditor-mcp-expert.skill.md

- Auditoría multi-capa: estructura → dependencias → código → arquitectura → calidad
- Detección automática de lenguaje, framework y patrón arquitectónico
- Tools granulares: overview → module → function → search
- Resources con URI scheme project:// para navegación semántica
- Seguridad: nunca exponer .env, secretos, node_modules, .git
- Anti-patrones: tools monolíticos, paths absolutos, sin cache, sin paginación
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica                              | Valor esperado                    |
|--------------------------------------|-----------------------------------|
| Lenguajes detectados automáticamente | ≥ 8 (TS, Go, Kt, Java, Py, Rust, C#, PHP) |
| Capas de análisis cubiertas          | 5/5                               |
| Tools con paginación                 | 100% de tools que devuelven listas |
| Secretos filtrados                   | 100% — zero leaks                 |
| Cache hit rate                       | > 80% en análisis repetidos       |
| Paths relativos en outputs           | 100%                              |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Auditoría de código fuente multi-capa para MCP Servers
