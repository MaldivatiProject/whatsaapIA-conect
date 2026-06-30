# 🎯 SKILL: SPEC-DRIVEN DEVELOPMENT — EXPERT

**skill_id**: spec-driven-development-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: arquitectura / metodología / api-design  
**last_updated**: 2026-03-19  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-spec-driven-master-agent, prompt-dev-kotlin-springboot-senior, prompt-dev-frontend-angular-senior, prompt-dev-aspnet-core-senior  
**dependencias**: ninguna (skill fundacional)

---

## 📌 Propósito de la Skill

Spec-Driven Development (SDD) establece la **especificación formal como única fuente de verdad** para todo artefacto de software: código, tests, documentación y contratos entre servicios. Esta skill equipa al agente con el marco conceptual, los flujos de trabajo y las herramientas para liderar proyectos donde ninguna línea de código se escribe antes de que la spec correspondiente esté escrita, validada y aprobada. Aplica cuando hay múltiples consumers de una API, cuando se necesita desarrollo paralelo (frontend mockea con Prism mientras el backend implementa), o cuando hay SLAs de estabilidad de contrato.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Spec-First, Code-Second**: La especificación es el diseño. El código es su implementación. Nunca al revés.
2. **Single Source of Truth**: Un solo archivo de spec por límite de contexto (API HTTP, evento async, mensaje gRPC). No hay "specs en Word", "specs en la cabeza del dev", ni "specs implícitas en el código".
3. **Spec Immutability in CI**: La spec aprobada no cambia sin review formal explícito. Cada cambio de spec es un PR con justificación.
4. **Contract ≠ Implementation**: La spec describe el contrato observable externamente. Los detalles de implementación son privados.
5. **Conformance is Automated**: La validación spec↔implementación se ejecuta en el pipeline CI, nunca manualmente ni en base a fe.
6. **Breaking Change Detection is Mandatory**: Cualquier cambio backward-incompatible en una spec pública bloquea el pipeline hasta aprobación explícita.

---

### Tipos de Especificación Reconocidos

| Tipo | Estándar | Herramienta Lint/Validación | Caso de Uso |
|------|----------|-----------------------------|-------------|
| REST API | OpenAPI 3.1.0 | Spectral + openapi-diff | HTTP APIs síncronos |
| Event-Driven | AsyncAPI 3.0 | AsyncAPI CLI + `asyncapi validate` | Mensajería Kafka / RabbitMQ |
| RPC | Protobuf IDL (proto3) | `buf lint` + `buf breaking` | gRPC / microservicios internos |
| Graph API | GraphQL SDL | `graphql-inspector diff` | APIs flexibles cliente-servidor |
| Data Schema | JSON Schema Draft 2020-12 | `ajv`, `jsonschema` | Payloads, DTOs, contratos de eventos |
| Database | SQL DDL + Flyway migrations | Flyway validate + `pg_prove` | Esquemas relacionales versionados |

---

### Flujo Canónico Spec-Driven (5 Fases)

```
FASE 1 — SPEC DESIGN
 ├── Redactar borrador de especificación en `api-spec/<servicio>/`
 ├── Lint / validar sintaxis: Spectral, buf lint, graphql-inspector
 ├── Review formal (par técnico + arquitecto + PO si afecta contrato público)
 └── Merge a rama principal → spec pasa a ser INMUTABLE hasta nuevo PR

FASE 2 — CONTRACT TESTING (tests fallarán hasta implementar)
 ├── Derivar escenarios BDD de la spec (Schemathesis auto o Gherkin manual)
 ├── Generar tests de contrato (Pact / Schemathesis / Dredd)
 └── Ejecutar en CI — los tests DEBEN fallar aquí, esto es correcto

FASE 3 — IMPLEMENTATION
 ├── Generar stubs/interfaces desde la spec (openapi-generator --interface-only)
 ├── Implementar lógica de negocio sobre los stubs generados
 ├── Prohibido: escribir código antes de FASE 1 completa
 └── Mock servers desde spec (Prism), NUNCA desde código de producción

FASE 4 — CONFORMANCE VALIDATION
 ├── Contract tests deben pasar 100%
 ├── OpenAPI diff check: ningún breaking change sin aprobación
 └── Publicar spec actualizada (Backstage / Confluence / Swagger Hub)

FASE 5 — EVOLUTION
 ├── Todo cambio de contrato: PR de spec PRIMERO, PR de código DESPUÉS
 ├── Versionar con Semantic Versioning (MAJOR.MINOR.PATCH)
 └── Deprecation headers + Sunset headers para breaking changes públicos
```

---

### Herramientas Críticas por Propósito

| Herramienta | Propósito | Stack |
|-------------|-----------|-------|
| **Spectral** | Linting OpenAPI/AsyncAPI con reglas de estilo custom | Agnóstico |
| **openapi-generator** | Codegen: interfaces controller, DTOs, clients | Java/Kotlin/Go/TS/Python |
| **springdoc-openapi** | Generar OpenAPI desde anotaciones Spring (solo para docs, NO como spec) | Kotlin/Java Spring |
| **Schemathesis** | Property-based + fuzzing testing desde spec OpenAPI | CLI Python → cualquier API |
| **Pact** | Consumer-Driven Contract Testing (CDC) | Kotlin/Java/JS/Go |
| **openapi-diff** | Detección de breaking changes entre versiones de spec | CI/CD agnóstico |
| **Prism** (Stoplight) | Mock server levantado desde spec OpenAPI/AsyncAPI | Dev-time + CI |
| **buf** | Lint, breaking change detection y codegen para Protobuf IDL | gRPC |
| **graphql-inspector** | Diff, validación y cobertura para GraphQL SDL | GraphQL |
| **AsyncAPI CLI** | Validación, lint y generación de código desde AsyncAPI | Event-Driven |

---

### Estrategia de Versionado de Specs

```yaml
# Semantic Versioning aplicado a especificaciones:
# MAJOR: Breaking change — campo eliminado, tipo cambiado, endpoint removido, autenticación distinta
# MINOR: Adición backward-compatible — nuevo endpoint opcional, nuevo campo opcional
# PATCH: Corrección de documentación, ejemplos o descripciones sin cambio de contrato

# En OpenAPI 3.1:
info:
  title: ZNS Auth Service API
  version: "2.1.0"   # ← versión de la spec (puede diferir de la versión del servicio)

# En URL de API: versión MAJOR del contrato público
# /api/v1/auth/login  → contrato v1.x.x
# /api/v2/auth/login  → solo cuando hay MAJOR breaking change
```

---

### Conformance Testing en CI — Plantilla GitHub Actions

```yaml
# .github/workflows/spec-conformance.yml
name: Spec Conformance Gate
on: [pull_request]

jobs:
  lint-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint OpenAPI spec con Spectral
        run: npx @stoplight/spectral-cli lint api-spec/openapi.yml --ruleset .spectral.yml

  breaking-change-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Detectar breaking changes
        run: |
          npx openapi-diff api-spec/openapi-prev.yml api-spec/openapi.yml \
            --fail-on-incompatible

  contract-tests:
    needs: [lint-spec]
    runs-on: ubuntu-latest
    services:
      api:
        image: ${{ env.API_IMAGE }}
        ports: ["8080:8080"]
    steps:
      - name: Ejecutar Schemathesis contract tests
        run: |
          schemathesis run api-spec/openapi.yml \
            --url http://localhost:8080 \
            --checks all \
            --stateful=links \
            --hypothesis-max-examples=100
```

---

### Estructura de Repositorio Recomendada

```
api-spec/
├── auth-service/
│   ├── openapi.yml           ← spec inmutable actual
│   ├── openapi-prev.yml      ← snapshot de la versión anterior (para openapi-diff)
│   ├── .spectral.yml         ← reglas de lint propias del servicio
│   └── examples/             ← archivos JSON/YAML de ejemplos referenciados
├── notifications-service/
│   └── asyncapi.yml          ← spec AsyncAPI para eventos Kafka
└── user-service/
    └── openapi.yml
```

---

## ✅ Criterios de Aplicación

- El sistema tiene múltiples consumers de una API (frontend, mobile, servicios externos)
- Se necesita desarrollo paralelo (frontend/QA mockean con Prism mientras el backend implementa)
- Existe SLA de estabilidad de contrato hacia clientes externos o equipos separados
- El equipo quiere documentación siempre sincronizada con el comportamiento real
- Se trabaja en microservicios con equipos independientes por servicio

## ❌ Anti-patrones Críticos

- ❌ **Code-First + Generate Spec**: Springdoc genera el YAML desde anotaciones → esto es documentación, NO es la spec. La spec real vive en `api-spec/` y el código se valida contra ella.
- ❌ **Spec Drift**: El código evoluciona, la spec no se actualiza → divergencia silenciosa detectada tarde. Usar Schemathesis en CI para detectar en cada PR.
- ❌ **Spec en prosa (PDF/Word/Confluence sin markdown)**: Specs no ejecutables no son specs. Si no puedes lintear la spec, no es una spec.
- ❌ **Breaking changes silenciosos**: Renombrar campos, cambiar tipos, eliminar endpoints sin versionado quiebra consumers en producción sin advertencia.
- ❌ **Specs sin ejemplos**: Una spec sin `examples` concretos es ambigua. Mínimo 1 ejemplo por operación request + response.
- ❌ **Mock servers desde implementación**: Usar el servidor de producción como referencia para tests → circular dependency. El mock debe levantarse desde la spec con Prism.
- ❌ **Spec como artefacto generado en build**: Si la spec se genera en el build (`./gradlew generateOpenApi`), no es la spec maestra, es artefacto de documentación.

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Spec OpenAPI mínima correcta para autenticación

```yaml
# api-spec/auth-service/openapi.yml
openapi: "3.1.0"
info:
  title: ZNS Auth Service API
  version: "1.0.0"
  description: Contratos de autenticación y autorización ZNS

paths:
  /api/v1/auth/login:
    post:
      operationId: loginUsuario
      summary: Autenticar usuario con email y contraseña
      tags: [Autenticación]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
            examples:
              credenciales_validas:
                value:
                  email: "usuario@zenapses.com"
                  password: "Secure123!"
      responses:
        '200':
          description: Autenticación exitosa — JWT en cookie HttpOnly
          headers:
            Set-Cookie:
              schema:
                type: string
                example: "access_token=eyJhbGc...; HttpOnly; Secure; SameSite=Strict; Path=/"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/ValidationError'

components:
  schemas:
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
          maxLength: 254
          example: "usuario@zenapses.com"
        password:
          type: string
          minLength: 8
          maxLength: 128
          writeOnly: true
  responses:
    Unauthorized:
      description: Credenciales inválidas
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
    ValidationError:
      description: Error de validación de campos
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
```

### Ejemplo 2: Generar stub de interface Kotlin desde spec

```bash
# Generar SOLO interfaces (no implementación) desde la spec
openapi-generator generate \
  -i api-spec/auth-service/openapi.yml \
  -g kotlin-spring \
  -o src/generated/ \
  --additional-properties=interfaceOnly=true,useBeanValidation=true,useCoroutines=true,reactive=true

# Resultado — el developer solo implementa la interface:
# interface AuthApi {
#     @PostMapping("/api/v1/auth/login")
#     suspend fun loginUsuario(
#         @Valid @RequestBody loginRequest: LoginRequest
#     ): ResponseEntity<Unit>
# }
```

### Ejemplo 3: AsyncAPI para un evento Kafka

```yaml
# api-spec/notifications-service/asyncapi.yml
asyncapi: "3.0.0"
info:
  title: ZNS Notifications Async API
  version: "1.0.0"

channels:
  usuario-registrado:
    address: "zenapses.users.registered"
    messages:
      UsuarioRegistradoEvent:
        $ref: '#/components/messages/UsuarioRegistradoEvent'

components:
  messages:
    UsuarioRegistradoEvent:
      name: UsuarioRegistradoEvent
      contentType: application/json
      payload:
        type: object
        required: [userId, email, timestamp]
        properties:
          userId:
            type: string
            format: uuid
          email:
            type: string
            format: email
          timestamp:
            type: string
            format: date-time
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente sección en su archivo `.md`:

```markdown
### SKILL ACTIVA: SPEC-DRIVEN DEVELOPMENT → ver: 2-agents/zns-tools/aion/spec-driven-development-expert.skill.md

- La especificación (OpenAPI/AsyncAPI/Protobuf/GraphQL SDL) es la ÚNICA fuente de verdad
- CERO código antes de spec aprobada en FASE 1 completa y mergeada
- Conformance testing automatizado en CI: Spectral lint + Schemathesis + openapi-diff
- Breaking changes detectados automáticamente con openapi-diff / buf breaking antes del merge
- Mock servers generados desde spec con Prism, NUNCA desde código ni desde servidor real
- Versionado semántico estricto: MAJOR.MINOR.PATCH en `info.version` de cada spec
- Separación explícita: `api-spec/<servicio>/` para specs | código generado en `src/generated/`
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor Esperado |
|---------|----------------|
| Spec coverage (endpoints documentados) | 100% de endpoints tienen spec |
| Spectral lint score | 0 errores críticos, 0 warnings |
| Contract test pass rate (Schemathesis) | 100% en pipeline CI |
| Spec drift detectado | 0 divergencias en producción |
| Breaking changes no detectados antes de prod | 0 |
| Ejemplos por operación OpenAPI | ≥ 1 por request body + ≥ 1 por response |
| Specs sin ejemplos ejecutables | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Spec-Driven Development Expert (2026-03-19)
