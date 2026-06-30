# 🧪 SKILL: BDD DESDE ESPECIFICACIÓN — SENIOR

**skill_id**: bdd-spec-scenarios-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: qa / testing / especificación  
**last_updated**: 2026-03-19  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-spec-driven-master-agent, prompt-dev-kotlin-springboot-senior, zns-quality/prompt-peer-review-senior  
**dependencias**: spec-driven-development-expert (fundacional), openapi-contract-first-expert (recomendado)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con la metodología y las herramientas para **derivar escenarios BDD ejecutables directamente desde especificaciones formales** (OpenAPI, AsyncAPI, Protobuf, JSON Schema). El objetivo es cerrar la brecha entre "la spec dice X" y "los tests prueban X": cada operación de la spec produce escenarios Gherkin verificables, y cada escenario se puede rastrear al contrato que lo origina. Aplica en proyectos spec-driven para garantizar que la implementación no solo compila, sino que se comporta exactamente como el contrato promete.

---

## 🧠 Conocimiento Núcleo

### Principios de BDD desde Spec

1. **Spec → Feature 1:N**: Cada operación OpenAPI genera ≥ 1 Feature file Gherkin. Las operaciones complejas pueden generar múltiples scenarios.
2. **Los escenarios validan el contrato, no la implementación**: El test no sabe de objetos Java/Kotlin. Solo habla HTTP (request → status code → response body shape).
3. **Happy paths + Edge cases desde los `examples` de la spec**: Si la spec tiene `examples`, cada ejemplo produce un scenario concreto.
4. **Error codes como escenarios de primer nivel**: Un `401`, `422`, `409` en la spec es un scenario BDD, no un "caso borde ignorable".
5. **Schemathesis como BDD property-based**: Cuando los escenarios manuales no son suficientes, Schemathesis genera cientos de casos a partir de los schemas automáticamente.
6. **Contract tests ≠ Integration tests ≠ E2E tests**: Contract tests validan que la API respeta su contrato. Integration tests validan lógica de negocio. E2E tests validan flujos de usuario completos.

---

### Pirámide de Testing Spec-Driven

```
                    ┌───────────────┐
                    │   E2E Tests   │  < 5% — Flujos completos de usuario
                    │   (Cypress,   │    (login → dashboard → acción)
                    │   Playwright) │
                  ┌─┴───────────────┴─┐
                  │  Integration Tests │  20% — Lógica de negocio + DB
                  │  (Testcontainers, │    (use-cases, repositorios)
                  │   Spring Boot IT) │
               ┌──┴───────────────────┴──┐
               │   Contract Tests (BDD)   │  30% — API vs Spec  ← ESTA SKILL
               │   Schemathesis + Pact    │    (¿La implementación cumple el contrato?)
            ┌──┴──────────────────────────┴──┐
            │        Unit Tests               │  45% — Dominio puro
            │  (MockK, JUnit 5, Object Mother)│    (aggregates, value objects, services)
            └────────────────────────────────┘
```

---

### Mapeo OpenAPI → Gherkin (Regla de Derivación)

| Elemento OpenAPI | Elemento Gherkin |
|------------------|-----------------|
| `path` + `method` | `Feature: [summary]` |
| `operationId` | Tag `@operationId` en el Feature |
| Response `200` con `example` | `Scenario: operación exitosa` |
| Response `4xx` definido | `Scenario: error [código] cuando [condición]` |
| `requestBody.required: true` | `Scenario: error 400/422 cuando body está vacío` |
| `security` con `BearerAuth` | `Scenario: error 401 cuando sin token` |
| `parameters` requeridos | `Scenario: error 400/422 cuando parámetro requerido ausente` |
| `examples` nombrados | Un `Scenario` por cada `example` |

---

### Estructura de Feature File Derivado de OpenAPI

```gherkin
# features/<dominio>/<operationId-kebab>.feature
# Spec origen: api-spec/<servicio>/openapi.yml#/paths/<path>/<method>
# operationId: <operationId>

@<dominio> @<operationId> @spec-driven
Feature: <METHOD> <path> — <summary de la spec>

  Como <actor del sistema>,
  quiero <acción concreta>,
  para <objetivo de negocio>.

  Background:
    Given la API está disponible en "http://localhost:8080"
    And el Content-Type de las requests es "application/json"

  # ─── HAPPY PATH ────────────────────────────────────────────────
  @happy-path @P0
  Scenario: [descripción del happy path]
    Given [precondición]
    When envío <METHOD> a "<path>" con body:
      """json
      { ... }
      """
    Then el status code de la respuesta es <2xx>
    And [validaciones de response]

  # ─── ERROR PATH 4xx ────────────────────────────────────────────
  @error-path @P1
  Scenario: Error <código> cuando <condición de error de la spec>
    When envío <METHOD> a "<path>" con [payload inválido]
    Then el status code de la respuesta es <código>
    And el Content-Type de la respuesta es "application/problem+json"
    And el body contiene campo "correlationId" en formato UUID

  # ─── CONTRACT VALIDATION ───────────────────────────────────────
  @contract @P0
  Scenario: Campos sensibles no aparecen en la respuesta
    [Validación de campos writeOnly]
```

---

### Step Definitions — Patrón Kotlin + RestAssured

```kotlin
// features/steps/ApiContractSteps.kt
// Patrón: BDD Steps genéricos que validan contratos OpenAPI — reutilizables por todos los features

@CucumberContextConfiguration
@SpringBootTest(webEnvironment = RANDOM_PORT)
class ApiContractSteps(
    @LocalServerPort private val port: Int
) {
    private lateinit var response: ValidatableResponse

    @Given("la API está disponible en {string}")
    fun apiDisponible(baseUrl: String) {
        RestAssured.baseURI = "http://localhost"
        RestAssured.port = port
    }

    @When("envío POST a {string} con body:")
    fun envioPOSTConBody(path: String, body: String) {
        response = given()
            .contentType(ContentType.JSON)
            .body(body)
        .`when`()
            .post(path)
        .then()
    }

    @Then("el status code de la respuesta es {int}")
    fun statusCodeEs(expectedStatus: Int) {
        response.statusCode(expectedStatus)
    }

    @Then("el Content-Type de la respuesta es {string}")
    fun contentTypeEs(expectedContentType: String) {
        response.contentType(expectedContentType)
    }

    @Then("el body contiene campo {string} en formato UUID")
    fun campoCumpleFormatoUUID(campo: String) {
        response.body(campo, matchesRegex(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
        ))
    }

    @Then("el body de la respuesta NO contiene el campo {string}")
    fun bodyNoContieneCampo(campo: String) {
        response.body("$campo", nullValue())
    }
}
```

---

### Schemathesis — BDD Property-Based desde OpenAPI

```bash
# Ejecutar property-based testing desde la spec — genera cientos de casos automáticamente
schemathesis run api-spec/<servicio>/openapi.yml \
  --url http://localhost:8080 \
  --checks all \                    # status_code, response_schema, content_type, headers
  --stateful=links \                # sigue links de navegación en la spec
  --hypothesis-max-examples=200 \  # casos generados por operación
  --hypothesis-deriving=positive \  # solo happy-path primero
  --junit-xml=reports/schemathesis.xml

# Para CI estricto: también ejecutar casos negativos
schemathesis run api-spec/<servicio>/openapi.yml \
  --url http://localhost:8080 \
  --checks not_a_server_error \     # solo falla si hay 500 inesperado
  --hypothesis-deriving=negative    # envía datos inválidos y espera 4xx, no 5xx
```

---

### Pact — Consumer-Driven Contract Testing

```kotlin
// En el consumer (frontend Angular o servicio cliente):
@ExtendWith(PactConsumerTestExt::class)
@PactTestFor(providerName = "auth-service", port = "8080")
class AuthServicePactTest {

    @Pact(consumer = "zenapses-frontend")
    fun loginExitosoContract(builder: PactDslWithProvider): RequestResponsePact {
        return builder
            .given("usuario dev@zenapses.com existe")
            .uponReceiving("POST /api/v1/auth/login con credenciales válidas")
                .method("POST")
                .path("/api/v1/auth/login")
                .headers(mapOf("Content-Type" to "application/json"))
                .body("""{"email":"dev@zenapses.com","password":"Secure123!"}""")
            .willRespondWith()
                .status(200)
                .matchHeader("Set-Cookie", ".*HttpOnly.*")
            .toPact()
    }

    @Test
    @PactTestFor(pactMethod = "loginExitosoContract")
    fun `debe retornar 200 con cookie HttpOnly al autenticar exitosamente`(
        mockServer: MockServer
    ) {
        val response = RestAssured.given()
            .baseUri(mockServer.getUrl())
            .contentType(ContentType.JSON)
            .body("""{"email":"dev@zenapses.com","password":"Secure123!"}""")
            .post("/api/v1/auth/login")

        assertThat(response.statusCode).isEqualTo(200)
        assertThat(response.header("Set-Cookie")).contains("HttpOnly")
    }
}
```

---

### Tags BDD Estándar

| Tag | Propósito |
|-----|-----------|
| `@P0` | Blockers — falla = no deployment |
| `@P1` | Críticos — falla = debe resolverse antes del release |
| `@P2` | Importantes — falla = debe resolverse en el sprint |
| `@happy-path` | Flujo exitoso principal |
| `@error-path` | Flujos de error esperados según spec |
| `@contract` | Validaciones de contrato puro (security, no-leakage) |
| `@spec-driven` | Derivado directamente de la spec (trazabilidad) |
| `@smoke` | Subset mínimo de tests para verificar disponibilidad |

---

### Organización de Feature Files

```
features/
├── auth/
│   ├── login-usuario.feature          ← operationId: loginUsuario
│   ├── logout-usuario.feature         ← operationId: logoutUsuario
│   └── refresh-token.feature          ← operationId: refreshToken
├── users/
│   ├── crear-usuario.feature          ← operationId: crearUsuario
│   └── listar-usuarios.feature        ← operationId: listarUsuarios
└── shared/
    └── contract-validations.feature   ← Scenarios transversales: 401 global, 429 global
```

**Regla**: Nombre de feature = `[operationId en kebab-case].feature`

---

## ✅ Criterios de Aplicación

- Todo endpoint en la spec OpenAPI debe tener al menos 1 Feature file con su happy path
- Cada código HTTP de error definido en la spec debe tener su scenario BDD correspondiente
- Los campos marcados como `writeOnly: true` en la spec deben tener scenario que valide que no aparecen en responses

## ❌ Anti-patrones Críticos

- ❌ **Tests que conocen la implementación**: Un step no debe importar clases de Spring ni repositories. Solo habla HTTP.
- ❌ **Un mega-feature con 50 scenarios**: Agrupar por `operationId`, máximo 10-15 scenarios por feature.
- ❌ **Scenarios sin Background / sin contexto claro**: Si el scenario requiere que existan datos, el `Background` o el `Given` debe configurarlos explícitamente.
- ❌ **Ignorar los scenarios de error**: Los `4xx` en la spec son contratos tan importantes como el `2xx`. Un 422 mal formateado quiebra al consumer.
- ❌ **Schemathesis en modo permisivo**: Ejecutar Schemathesis sin `--checks all` deja brechas enormes.
- ❌ **Pact consumer tests sin publicar al Pact Broker**: El contrato existe solo en el repo del consumer — el provider nunca lo valida.

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Feature completo para login

```gherkin
# features/auth/login-usuario.feature
@auth @loginUsuario @spec-driven
Feature: POST /api/v1/auth/login — Autenticar usuario

  Background:
    Given la API está disponible en "http://localhost:8080"

  @happy-path @P0
  Scenario: Autenticación exitosa con credenciales válidas
    Given el usuario "dev@zenapses.com" existe con contraseña "Secure123!"
    When envío POST a "/api/v1/auth/login" con body:
      """json
      {"email": "dev@zenapses.com", "password": "Secure123!"}
      """
    Then el status code de la respuesta es 200
    And la respuesta contiene header "Set-Cookie" que contiene "HttpOnly"
    And el body de la respuesta está vacío

  @error-path @P1
  Scenario: Error 401 con contraseña incorrecta
    When envío POST a "/api/v1/auth/login" con body:
      """json
      {"email": "dev@zenapses.com", "password": "wrong"}
      """
    Then el status code de la respuesta es 401
    And el Content-Type de la respuesta es "application/problem+json"
    And el body contiene campo "correlationId" en formato UUID

  @contract @P0
  Scenario: La respuesta 2xx no expone el campo password
    Given el usuario "dev@zenapses.com" existe con contraseña "Secure123!"
    When envío POST a "/api/v1/auth/login" con credenciales válidas
    Then el body de la respuesta NO contiene el campo "password"
```

### Ejemplo 2: Scenario de seguridad transversal

```gherkin
@security @contract @P0
Scenario Outline: Endpoints protegidos retornan 401 sin token
  When envío <method> a "<path>" sin header Authorization ni cookie access_token
  Then el status code de la respuesta es 401
  And el Content-Type de la respuesta es "application/problem+json"

  Examples:
    | method | path                  |
    | GET    | /api/v1/users         |
    | POST   | /api/v1/users         |
    | GET    | /api/v1/users/abc-123 |
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: BDD DESDE ESPECIFICACIÓN → ver: 2-agents/zns-tools/aion/bdd-spec-scenarios-senior.skill.md

- Cada operación OpenAPI genera ≥ 1 Feature file: `features/<tag>/<operationId-kebab>.feature`
- Happy path + TODOS los códigos HTTP de error definidos en la spec = scenarios BDD
- Campos `writeOnly: true` de la spec tienen scenario que valida que no aparecen en responses
- Step Definitions hablan solo HTTP (RestAssured/Ktor Client) — ZERO conocimiento de la implementación
- Schemathesis en CI como property-based layer: `--checks all --hypothesis-max-examples=200`
- Tags estándar: `@P0` blocker / `@happy-path` / `@error-path` / `@contract` / `@spec-driven`
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor Esperado |
|---------|----------------|
| Feature files por operación OpenAPI | ≥ 1 por operación |
| Scenarios happy path | 100% de operaciones cubiertas |
| Scenarios de error (4xx definidos en spec) | 100% de códigos HTTP de error cubiertos |
| Step Definitions con imports de Spring / domain | 0 |
| Schemathesis pass rate en CI | 100% |
| Scenarios con tag de prioridad | 100% |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — BDD desde Especificación Senior (2026-03-19)
