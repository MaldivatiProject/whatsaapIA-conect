# 📚 Catálogo de Skills ZNS — Agente Skill Engineer Senior

**metodo**: ZNS v2.2  
**version**: 1.7.0  
**last_updated**: 2026-03-21  
**mantenido_por**: Skill Engineer Senior ZNS  

---

## ¿Qué es una Skill ZNS?

Una **Skill** es un módulo de conocimiento especializado, reutilizable y versionado que puede ser consumido por cualquier agente ZNS para elevar su nivel de calidad en un dominio específico. Las skills se dividen en dos grandes categorías:

- **Skills de Prompting (LLM)**: Técnicas para mejorar el razonamiento, estructura y outputs de los agentes
- **Skills de Dominio**: Conocimiento técnico profundo en áreas como UX, Backend, Frontend, QA, etc.

---

## 📦 Cómo consumir una Skill

En el archivo `.md` del agente receptor, agregar:

```markdown
## SKILL ACTIVA: [NOMBRE] → ver: 2-agents/zns-tools/skills/[archivo].skill.md
[Resumen ejecutivo de la skill adaptado al contexto del agente]
```

---

## 🗂️ Catálogo de Skills Disponibles

### Categoría: UX / Experiencia de Usuario

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `ux-senior-dinamico-expert` | Expert | Motion design, microinteracciones, 7 estados de UI, Design Tokens, UX Writing, Accesibilidad dinámica | Todos los agentes frontend | [ux-senior-dinamico.skill.md](ux-senior-dinamico.skill.md) |

---

### Categoría: Prompting / Técnicas LLM

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `prompting-anti-hallucination-senior` | Senior | 7 técnicas senior para reducir alucinaciones: Assumption Tagging, Verification Gate, Paraphrase Confirmation, Contradiction Detection, Negative Space, Chunking Progresivo, Confidence Scoring | Agentes de elicitación, análisis y generación de artefactos | [anti-hallucination-prompting.skill.md](anti-hallucination-prompting.skill.md) |
| `requirement-elicitation-senior` | Senior | Marco 5W1H, Gherkin Given-When-Then, INVEST, Scope Boundary, NFR categorizado, Mapa de Actores — transforma ideas brutas en HUs completas | Agentes de análisis de negocio, Product Owner, Business Analyst | [requirement-elicitation-senior.skill.md](requirement-elicitation-senior.skill.md) |

**Skills planificadas:**

| skill_id | Nivel | Descripción breve | Estado |
|----------|-------|-------------------|--------|
| `chain-of-thought-senior` | Senior | Descomposición razonada paso a paso | 🔜 Planificada |
| `few-shot-learning-senior` | Senior | Calibración de comportamiento por ejemplos | 🔜 Planificada |
| `rag-integration-expert` | Expert | Instrucciones para consumo de contexto externo | 🔜 Planificada |
| `output-structuring-senior` | Senior | Formatos de salida predecibles (JSON, Markdown, tablas) | 🔜 Planificada |
| `constraint-injection-senior` | Senior | Restricciones para reducir alucinaciones | 🔜 Planificada |

---

### Categoría: API Documentation / Developer Experience

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|----------|
| `api-docs-expert` | Expert | API README canónico (Quick Start < 5 min, catálogo de errores); CHANGELOG semántico con clasificación breaking/non-breaking; prose quality OpenAPI (description, @ExampleObject realistas, @Schema por campo); DX docs (auth-guide, error-catalog, migration guides); Docs-as-Code con Spectral lint + openapi-diff en CI | prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior | [api-docs-expert.skill.md](api-docs-expert.skill.md) |

---

### Categoría: Backend — Performance / SLA

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|----------|
| `performance-mandatory-100ms-expert` | Expert | SLA p95 ≤ 100 ms mandatorio; tabla de umbrales por tipo de operación; eliminación de N+1 con JOIN FETCH + SQLStatementCountValidator; índices obligatorios verificados en tests; paginación máx. 50 items; readOnly=true en lecturas; HikariCP sizing; k6 en CI como gate bloqueante; JMH/BenchmarkDotNet; alertas Prometheus ZNS_P95_SLA_Violated | prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior | [performance-mandatory-100ms-expert.skill.md](performance-mandatory-100ms-expert.skill.md) |

---

### Categoría: API Design / Spec-Driven Development

> Skills gestionadas por el agente AION — residen en `2-agents/zns-tools/aion/`

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `spec-driven-development-expert` | Expert | Ciclo canónico SDD: Spec → Contract Tests → Implementation → Conformance → Evolution. OpenAPI/AsyncAPI/Protobuf/GraphQL SDL. Spectral, Schemathesis, Prism, openapi-diff, Pact | Spec-Driven Master Agent AION, prompt-dev-kotlin-springboot-senior | [aion/spec-driven-development-expert.skill.md](../aion/spec-driven-development-expert.skill.md) |
| `openapi-contract-first-expert` | Expert | Anatomía completa OpenAPI 3.1.0: `additionalProperties:false`, ProblemDetail RFC 7807, Spectral ruleset, codegen `interfaceOnly=true`, Prism mock server, versionado semántico de contratos | Spec-Driven Master Agent AION, prompt-dev-kotlin-springboot-senior | [aion/openapi-contract-first-expert.skill.md](../aion/openapi-contract-first-expert.skill.md) |

---

### Categoría: QA / BDD / Contract Testing

> Skills gestionadas por el agente AION — residen en `2-agents/zns-tools/aion/`

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `bdd-spec-scenarios-senior` | Senior | Derivación de escenarios Gherkin desde specs OpenAPI/AsyncAPI. Mapeo operationId→Feature file, pirámide de testing spec-driven, Schemathesis property-based, Pact CDC, Step Defs agnósticos | Spec-Driven Master Agent AION, prompt-dev-kotlin-springboot-senior, zns-quality | [aion/bdd-spec-scenarios-senior.skill.md](../aion/bdd-spec-scenarios-senior.skill.md) |

---

### Categoría: Backend — Kotlin + Spring Boot

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `kotlin-lang-expert` | Expert | Null safety estricto, data/sealed/value classes, coroutines, Flow, extension functions, DSLs, anti-patrones Kotlin | Agente Kotlin Backend Senior | [kotlin-lang-expert.skill.md](kotlin-lang-expert.skill.md) |
| `ddd-hexagonal-kotlin` | Expert | Aggregates, Value Objects, Domain Events, Ports & Adapters, estructura de paquetes, Context Mapping, ArchUnit — dominio 100% desacoplado de frameworks | Agente Kotlin Backend Senior | [ddd-hexagonal-kotlin.skill.md](ddd-hexagonal-kotlin.skill.md) |
| `security-owasp-kotlin` | Expert | OWASP Top 10, Spring Security Kotlin DSL, JWT/JWE, BCrypt cost=12, RBAC con @PreAuthorize, Rate Limiting Redis, Vault, prevención SSRF, auditoría | Agente Kotlin Backend Senior | [security-owasp-kotlin.skill.md](security-owasp-kotlin.skill.md) |
| `tdd-testing-kotlin` | Expert | Pirámide de tests, dominio pure Kotlin (CERO Spring), MockK, Object Mother, Testcontainers, WireMock, ArchUnit, cobertura ≥ 85% | Agente Kotlin Backend Senior | [tdd-testing-kotlin.skill.md](tdd-testing-kotlin.skill.md) |
| `cqrs-kotlin-senior` | Senior | Command/Query Bus tipado con `sealed interface`, Outbox Pattern, Projections, integración Kafka, anti-patrones CQRS en Kotlin | Agentes Kotlin, Java y .NET Backend Senior | [cqrs-kotlin-senior.skill.md](cqrs-kotlin-senior.skill.md) |

---

### Categoría: Backend — Seguridad / Criptografía

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `argon2id-expert` | Expert | Hashing de passwords con **Argon2id** (PHC winner 2015, NIST SP 800-63B): parámetros ZNS `m=65536,t=3,p=1`; implementación Kotlin (`Argon2PasswordEncoder`), Java, Go (`argon2.IDKey`), .NET (`Konscious.Argon2id`); reglas para Flyway (NUNCA `crypt()` pgcrypto, seed con hash pre-computado `$argon2id$v=19$...`); corrección BCrypt→Argon2id en COMMENTs SQL; p95 ≤ 300ms; tests de formato, verificación y latencia | prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-backend-go, prompt_dev_senior_flyway | [argon2id-expert.skill.md](argon2id-expert.skill.md) |

---

### Categoría: Backend — Database Architecture / PostgreSQL / DDD

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `db-architecture-standards-expert` | Expert | **Dual Key Pattern** (`pkid_` BIGINT IDENTITY interno + `uuid_` UUID externo); 4 campos obligatorios (`pkid_`, `uuid_`, `creation_date`, `expiration_date`); Schema por Bounded Context (`{contexto}_schema`); índices obligatorios en UUID, FK columns y parciales `WHERE expiration_date IS NULL`; nomenclatura `pk_`, `uk_`, `fk_`, `ck_`, `idx_`; soft delete con `expiration_date` (NUNCA `deleted_at`/`is_deleted`); COMMENT obligatorio en tabla y columnas; mapping JPA/EF Core del Dual Key; template Flyway conforme; anti-patrones NUNCA (`SERIAL`, `BIGSERIAL`, `id UUID PK`) | prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt_dev_senior_flyway | [db-architecture-standards-expert.skill.md](db-architecture-standards-expert.skill.md) |

---

### Categoría: Backend — Go

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `ddd-hexagonal-go` | Expert | Arquitectura Hexagonal + DDD idiomático en Go: reglas de dependencia con depguard, aggregate root con constructor validador, value objects inmutables, domain events, output ports como interfaces, wiring en composition root | prompt-dev-backend-go | [ddd-hexagonal-go.skill.md](ddd-hexagonal-go.skill.md) |
| `tdd-testing-go` | Expert | Pirámide de testing hexagonal en Go: table-driven tests, testify, gomock/mockgen por puertos, testcontainers-go (PostgreSQL/Redis/NATS), httptest para handlers Gin, fuzzing, benchmarks, coverage gate ≥ 85% con `-race` en CI | prompt-dev-backend-go | [tdd-testing-go.skill.md](tdd-testing-go.skill.md) |
| `cqrs-go-senior` | Senior | CQRS en Go en tres niveles (liviano / completo / Event Sourcing): Command Bus + Query Bus tipados con generics Go 1.18+, read models desacoplados, proyecciones, política de consistencia eventual documentada en ADR, anti-patrones CQRS en Go | prompt-dev-backend-go | [cqrs-go-senior.skill.md](cqrs-go-senior.skill.md) |
| `observability-go-expert` | Expert | Observabilidad production-grade en Go: zerolog (JSON estructurado, Correlation ID, logging seguro sin PII), OpenTelemetry SDK + otelgin, Prometheus histograma de latencia + alerta p95 ≤ 100ms, pprof en puerto interno, health checks liveness/readiness | prompt-dev-backend-go | [observability-go-expert.skill.md](observability-go-expert.skill.md) |

---

### Categoría: Backend — Próximas skills planificadas

| skill_id | Nivel | Descripción breve | Estado |
|----------|-------|-------------------|--------|
| `clean-architecture-expert` | Expert | Capas, puertos, adaptadores, reglas de dependencia (Java/Spring) | 🔜 Planificada |
| `kotlin-coroutines-expert` | Expert | Coroutines avanzadas: channels, actors, flow operators, back-pressure | 🔜 Planificada |
| `kafka-event-driven-kotlin` | Expert | Event Sourcing avanzado, Kafka Streams, sagas con compensación | 🔜 Planificada |
| `ddd-patterns-senior` | Senior | Aggregates, Value Objects, Domain Events | 🔜 Planificada |
| `api-design-rest-senior` | Senior | Diseño RESTful, versionado, OpenAPI, HATEOAS | 🔜 Planificada |
| `security-owasp-expert` | Expert | OWASP Top 10, threat modeling, auth/authz patterns | 🔜 Planificada |

---

### Categoría: Frontend

> _Próximas skills planificadas_

| skill_id | Nivel | Descripción breve | Estado |
|----------|-------|-------------------|--------|
| `performance-web-vitals-senior` | Senior | Core Web Vitals, bundle optimization, lazy loading | 🔜 Planificada |
| `accessibility-wcag22-expert` | Expert | WCAG 2.2 AA/AAA, ARIA patterns avanzados | 🔜 Planificada |
| `microfrontend-patterns-expert` | Expert | Module Federation, comunicación cross-app, deployment | 🔜 Planificada |

---

### Categoría: QA / Testing

> _Próximas skills planificadas_

| skill_id | Nivel | Descripción breve | Estado |
|----------|-------|-------------------|--------|
| `testing-pyramid-senior` | Senior | Pirámide de testing, TDD/BDD, estrategias por capa | 🔜 Planificada |
| `e2e-playwright-senior` | Senior | Playwright, Page Object Model, CI integration | 🔜 Planificada |

---

### Categoría: DevOps / Infraestructura

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `cicd-expert` | Senior | Pipelines GitHub Actions production-grade para JVM y .NET: Docker multi-stage, GHCR, quality gates (ArchUnit, Jacoco, Trivy), OIDC para AWS, GitOps ArgoCD | prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior | [cicd-expert.skill.md](cicd-expert.skill.md) |

---

### Categoría: AWS — Cloud Architecture / IaC / Security / FinOps

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `aws-cloud-architecture-senior` | Senior | Well-Architected 6 pilares; VPC 3-tier (public/private/isolated); ECS Fargate, ALB, RDS Aurora Multi-AZ, ElastiCache, S3, SQS/SNS, CloudWatch; patrones 3-tier, event-driven, SPA+API; nomenclatura y tags ZNS; anti-patrones de arquitectura AWS | prompt-engineer-prompt-senior, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go, zns-architecture, zns-devops | [aws-cloud-architecture-senior.skill.md](aws-cloud-architecture-senior.skill.md) |
| `aws-iac-terraform-expert` | Expert | Estado remoto S3+DynamoDB; estructura modules/environments; versiones fijadas; variables con `validation`; módulos ECS/RDS Aurora/ALB/ElastiCache con HCL canónico; CI/CD con OIDC (sin credenciales estáticas); gates `plan`→`apply`; `prevent_destroy`; anti-patrones IaC | prompt-engineer-prompt-senior, zns-devops, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go | [aws-iac-terraform-expert.skill.md](aws-iac-terraform-expert.skill.md) |
| `aws-security-iam-expert` | Expert | IAM Least Privilege (execution role ≠ task role); KMS CMK para RDS/ElastiCache/S3 PII; Secrets Manager con rotación automática; Security Groups SG-to-SG; WAF v2 managed rules + Rate Limit; GuardDuty + Security Hub; CloudTrail multi-region; anti-patrones de seguridad AWS | prompt-engineer-prompt-senior, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go, zns-devops, zns-architecture | [aws-security-iam-expert.skill.md](aws-security-iam-expert.skill.md) |
| `aws-finops-expert` ⭐ **ALTA PRIORIDAD** | Expert | Etiquetado completo (5 tags obligatorios); AWS Budgets alertas 80%+100%; Cost Anomaly Detection; Compute Optimizer + rightsizing; Graviton ARM64 (ahorro 20-40%); Fargate Spot dev/staging (70% descuento); Aurora Serverless v2; Scheduled Scaling (ahorro 60%); S3 lifecycle policies; Data Transfer optimization; VPC Endpoints; Savings Plans post-baseline; recursos huérfanos; checklist FinOps semanal; tabla costos por ambiente | prompt-engineer-prompt-senior, zns-devops, zns-architecture, prompt-dev-kotlin-springboot-senior, prompt-dev-backend-go | [aws-finops-expert.skill.md](aws-finops-expert.skill.md) |

---

## 🔄 Workflow para crear una nueva Skill

1. Invocar el agente: `2-agents/zns-tools/prompt-skill-engineer-senior.md`
2. Modo: `CREAR_SKILL` o `CICLO_COMPLETO`
3. El agente genera el `.skill.md` en esta carpeta
4. El agente actualiza este `README.md` con la nueva fila en el catálogo
5. (Si aplica) El agente inyecta la skill en el agente objetivo

---

### Categoría: MCP / AI Infrastructure

> Skills gestionadas por el agente MCP Creator — residen en `2-agents/zns-tools/mcp-creator/skills/`

| skill_id | Nivel | Descripción breve | Compatible con | Archivo |
|----------|-------|-------------------|----------------|---------|
| `mcp-protocol-expert` | Expert | Especificación completa MCP 2025-03-26: Tools, Resources, Prompts, Transportes (stdio, Streamable HTTP), ciclo de vida, annotations, JSON-RPC 2.0 | prompt-mcp-creator-senior | [mcp-creator/skills/mcp-protocol-expert.skill.md](../mcp-creator/skills/mcp-protocol-expert.skill.md) |
| `mcp-server-architecture-expert` | Expert | Clean Architecture para MCP Servers: estructura canónica tools/resources/services, plugin pattern, DI, error handling tipado, logging stderr, testing con fixtures | prompt-mcp-creator-senior | [mcp-creator/skills/mcp-server-architecture-expert.skill.md](../mcp-creator/skills/mcp-server-architecture-expert.skill.md) |
| `docker-mcp-deployment-expert` | Expert | Dockerización production-ready para MCP Servers: multi-stage, non-root, HEALTHCHECK, Docker Compose con volúmenes read-only, configuración 12-factor, clientes MCP | prompt-mcp-creator-senior | [mcp-creator/skills/docker-mcp-deployment-expert.skill.md](../mcp-creator/skills/docker-mcp-deployment-expert.skill.md) |
| `source-code-auditor-mcp-expert` | Expert | Auditoría multi-capa de código fuente (estructura, deps, código, arquitectura, calidad) para exposición IA vía MCP: detección automática de stack, security scanning, Resources project:// | prompt-mcp-creator-senior | [mcp-creator/skills/source-code-auditor-mcp-expert.skill.md](../mcp-creator/skills/source-code-auditor-mcp-expert.skill.md) |

---

## 📊 Estadísticas del Catálogo

| Métrica | Valor |
|---------|-------|
| Skills disponibles | 28 |
| Skills planificadas | 11 |
| Categorías cubiertas | 7 de 7 |
| Última skill añadida | `mcp-*` (4 skills MCP) — 2026-04-17 |

---

## 🔄 Changelog del Catálogo

- **v1.8.0** (2026-04-17): Categoría MCP / AI Infrastructure inaugurada — `mcp-protocol-expert`, `mcp-server-architecture-expert`, `docker-mcp-deployment-expert`, `source-code-auditor-mcp-expert`. Nuevo agente `prompt-mcp-creator-senior` creado en `2-agents/zns-tools/mcp-creator/`.
- **v1.7.0** (2026-03-21): Skills AWS — `aws-cloud-architecture-senior`, `aws-iac-terraform-expert`, `aws-security-iam-expert`, `aws-finops-expert` (⭐ ALTA PRIORIDAD) creadas e integradas en `prompt-engineer-prompt-senior`. Categoría AWS inaugurada. `cicd-expert` promovida a tabla de skills disponibles. Catálogo ahora cubre arquitectura, IaC, seguridad y FinOps AWS.
- **v1.6.0** → **v1.5.0** (2026-03-20): Skills Backend Go — `ddd-hexagonal-go`, `tdd-testing-go`, `cqrs-go-senior`, `observability-go-expert`
- **v1.4.0** (2026-03-19): Nuevas skills Spec-Driven — `spec-driven-development-expert`, `openapi-contract-first-expert`, `bdd-spec-scenarios-senior` — agente AION `prompt-spec-driven-master-agent` creado en `2-agents/zns-tools/aion/`
- **v1.3.0** (2026-03-18): Skills Backend Kotlin — `bola-prevention-senior`, `kotlin-extensions-lambdas-expert`, `cross-cutting-concerns-expert`, `httponly-cookie-auth-expert`, `cicd-expert`, `clean-code-solid-testing-expert`, `api-response-standardization-expert` integradas en agente Kotlin Backend Senior
- **v1.0.0** (2026-03-18): Catálogo inicial — Primera skill `ux-senior-dinamico-expert` creada e integrada en agente Angular Frontend Senior
