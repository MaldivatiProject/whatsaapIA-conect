# 🎯 SKILL: TDD + TESTING PYRAMID EN KOTLIN + SPRING BOOT

**skill_id**: tdd-testing-kotlin  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / calidad  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

**dependencias**: `kotlin-lang-expert`, `ddd-hexagonal-kotlin`

---

## 📌 Principio Rector — Dominio Desacoplado

> **El dominio NO depende de frameworks.**  
> Los tests del dominio deben ser **pure Kotlin** — sin `@SpringBootTest`, sin `@ExtendWith(SpringExtension)`, sin `@Autowired`, sin JPA. Solo clases Kotlin instanciadas directamente.  
> Si un test de dominio necesita Spring para arrancar, la arquitectura está rota.

```
TESTS POR CAPA
──────────────────────────────────────────────────────────────
Domain Tests       → Pure Kotlin: new/constructor, CERO mocks de infra
Application Tests  → Mockito/MockK: mockear Ports (interfaces), CERO Spring
Infrastructure     → @DataJpaTest, Testcontainers, WireMock
E2E / Controller   → @SpringBootTest con WebTestClient
Architecture Tests → ArchUnit: verificar reglas de dependencia
──────────────────────────────────────────────────────────────
```

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Ciclo TDD — Red-Green-Refactor

```
🔴 RED     → Escribir test que falla (define el comportamiento esperado)
🟢 GREEN   → Código MÍNIMO para pasar el test (no el mejor, solo el que funciona)
🔵 REFACTOR → Limpiar código sin cambiar comportamiento (SOLID, nombres, patterns)
🔁 REPEAT  → Para cada criterio de aceptación del Given-When-Then
```

**Outside-In TDD (Escuela de Londres):**
```
1. Acceptance Test (E2E) → falla
   └─ Controller Test (mockear Application Service) → falla
      └─ Use Case Test (mockear Ports) → falla
         └─ Repository Integration Test (Testcontainers)
            └─ Domain Test (pure Kotlin, sin mocks)
```

---

### 2️⃣ Pirámide de Tests — Distribución Ideal

```
                   ▲
                  /│\
                 / │ \
                / E2E \          ≈ 10%  — @SpringBootTest, lento, caro
               /_______\
              /         \
             / Integration\      ≈ 20%  — @DataJpaTest, Testcontainers, WireMock
            /_____________\
           /               \
          /   Unit Tests    \    ≈ 70%  — Pure Kotlin / MockK — rápido, barato
         /___________________\

COBERTURA OBJETIVO POR CAPA:
  domain/        → >= 95% (core del negocio)
  application/   → >= 90% (orquestación)
  infrastructure → >= 80% (adapters)
  GLOBAL         → >= 85%
  Mutation Score → >= 75% (PIT Mutation Testing)
```

---

### 3️⃣ Domain Tests — Pure Kotlin (CERO Framework)

El dominio es Kotlin puro. Sus tests son Kotlin puro. **No hay excusa para importar Spring aquí.**

```kotlin
// ✅ Test del Aggregate — CERO Spring, CERO mocks
class UsuarioTest {

    @Test
    fun `debe crear usuario con datos validos y emitir evento UsuarioRegistrado`() {
        // Given
        val email = Email("juan@zenapses.com")
        val password = Password("R@wPlain123!")
        val nombre = NombreCompleto("Juan", "Pérez")

        // When
        val usuario = Usuario.registrar(email, Password("hashed_bcrypt"), nombre, RolUsuario.ESTUDIANTE)

        // Then
        assertThat(usuario.id).isNotNull()
        assertThat(usuario.email).isEqualTo(email)
        assertThat(usuario.estado).isEqualTo(EstadoUsuario.ACTIVO)

        val eventos = usuario.domainEvents
        assertThat(eventos).hasSize(1)
        assertThat(eventos.first()).isInstanceOf(UsuarioRegistrado::class.java)
        assertThat((eventos.first() as UsuarioRegistrado).email).isEqualTo(email)
    }

    @Test
    fun `debe suspender usuario activo y emitir evento UsuarioSuspendido`() {
        val usuario = UsuarioMother.activo()

        usuario.suspender("Violación de términos")

        assertThat(usuario.estado).isEqualTo(EstadoUsuario.SUSPENDIDO)
        assertThat(usuario.domainEvents).anyMatch { it is UsuarioSuspendido }
    }

    @Test
    fun `no debe suspender usuario ya suspendido`() {
        val usuario = UsuarioMother.suspendido()

        val exception = assertThrows<IllegalStateException> {
            usuario.suspender("Otro motivo")
        }

        assertThat(exception.message).contains("ya está suspendido")
    }
}
```

```kotlin
// ✅ Test de Value Objects — validaciones de negocio
class EmailTest {

    @ParameterizedTest
    @ValueSource(strings = ["usuario@ejemplo.com", "a+b@sub.dominio.co", "x@y.io"])
    fun `debe aceptar emails validos`(valor: String) {
        assertThatCode { Email(valor) }.doesNotThrowAnyException()
    }

    @ParameterizedTest
    @ValueSource(strings = ["", " ", "sin-arroba", "@sin-usuario.com", "a@b"])
    fun `debe rechazar emails invalidos`(valor: String) {
        assertThatThrownBy { Email(valor) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `debe normalizar email a minusculas`() {
        val email = Email("USUARIO@EJEMPLO.COM")
        assertThat(email.normalized).isEqualTo("usuario@ejemplo.com")
    }
}

class MontoTest {

    @Test
    fun `debe sumar montos de la misma moneda`() {
        val a = Monto(BigDecimal("10.00"), Moneda.USD)
        val b = Monto(BigDecimal("5.50"), Moneda.USD)

        val resultado = a + b

        assertThat(resultado.valor).isEqualByComparingTo(BigDecimal("15.50"))
    }

    @Test
    fun `no debe sumar montos de monedas diferentes`() {
        val usd = Monto(BigDecimal("10.00"), Moneda.USD)
        val cop = Monto(BigDecimal("10.00"), Moneda.COP)

        assertThatThrownBy { usd + cop }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessageContaining("Monedas incompatibles")
    }

    @Test
    fun `no debe permitir monto negativo`() {
        assertThatThrownBy { Monto(BigDecimal("-1"), Moneda.USD) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }
}
```

---

### 4️⃣ Object Mother + Test Data Builder (Kotlin idiomático)

```kotlin
// ✅ Object Mother — fábrica de entidades de dominio para tests
// SIN Spring, SIN JPA — solo Kotlin
object UsuarioMother {

    fun activo(
        email: Email = Email("test@zenapses.com"),
        nombre: NombreCompleto = NombreCompleto("Test", "User"),
        rol: RolUsuario = RolUsuario.ESTUDIANTE
    ) = Usuario.registrar(
        email = email,
        passwordHash = Password("\$2a\$12\$hashedBcryptValue"),
        nombre = nombre,
        rol = rol
    ).also { it.clearDomainEvents() }  // Limpiamos eventos para tests aislados

    fun suspendido() = activo().apply { suspender("Motivo de test") }

    fun conEmail(email: Email) = activo(email = email)

    fun admin() = activo(rol = RolUsuario.ADMIN)
}

// ✅ DSL Builder para Commands (legibilidad máxima en tests)
fun registrarUsuarioCommand(block: RegistrarUsuarioCommandBuilder.() -> Unit = {}) =
    RegistrarUsuarioCommandBuilder().apply(block).build()

class RegistrarUsuarioCommandBuilder {
    var email: Email = Email("nuevo@zenapses.com")
    var password: Password = Password("Plain@Pass123!")
    var nombre: NombreCompleto = NombreCompleto("Nuevo", "Usuario")
    var rol: RolUsuario = RolUsuario.ESTUDIANTE

    fun build() = RegistrarUsuarioCommand(email, password, nombre, rol)
}

// Uso en tests:
val command = registrarUsuarioCommand {
    email = Email("custom@zenapses.com")
    rol = RolUsuario.TUTOR
}
```

---

### 5️⃣ Application Layer Tests — Mockear Ports (NO implementaciones)

El use case solo conoce **interfaces (Ports)** → se mockean las interfaces, no las implementaciones de infra.

```kotlin
// ✅ Test del Use Case — MockK (alternativa idiomática en Kotlin a Mockito)
// CERO Spring, CERO @DataJpaTest — solo el use case y sus mocks de Port
@DisplayName("RegistrarUsuarioService — Use Case Tests")
class RegistrarUsuarioServiceTest {

    // Mocks de los Ports (interfaces del dominio)
    private val usuarioRepository = mockk<UsuarioRepository>()
    private val passwordHashService = mockk<PasswordHashService>()
    private val eventPublisher = mockk<DomainEventPublisher>(relaxed = true)

    // Sistema bajo prueba: instanciado directamente (SIN Spring DI)
    private val useCase = RegistrarUsuarioService(
        usuarioRepository = usuarioRepository,
        passwordHashService = passwordHashService,
        eventPublisher = eventPublisher
    )

    @Test
    fun `debe registrar usuario y retornar Exito`() {
        // Given
        val command = registrarUsuarioCommand()
        val hashedPassword = Password("\$2a\$12\$hashed...")

        every { usuarioRepository.existsByEmail(command.email) } returns false
        every { passwordHashService.hash(command.password) } returns hashedPassword
        every { usuarioRepository.save(any()) } just Runs

        // When
        val resultado = useCase.execute(command)

        // Then
        assertThat(resultado).isInstanceOf(RegistrarUsuarioResult.Exito::class.java)
        verify(exactly = 1) { usuarioRepository.save(any()) }
        verify(exactly = 1) { eventPublisher.publishAll(any()) }
    }

    @Test
    fun `debe retornar EmailDuplicado si el email ya existe`() {
        val command = registrarUsuarioCommand()

        every { usuarioRepository.existsByEmail(command.email) } returns true

        val resultado = useCase.execute(command)

        assertThat(resultado).isInstanceOf(RegistrarUsuarioResult.EmailDuplicado::class.java)
        assertThat((resultado as RegistrarUsuarioResult.EmailDuplicado).email)
            .isEqualTo(command.email)

        verify(exactly = 0) { usuarioRepository.save(any()) }
        verify(exactly = 0) { eventPublisher.publishAll(any()) }
    }
}
```

---

### 6️⃣ Infrastructure Tests — Testcontainers + @DataJpaTest

```kotlin
// ✅ Test del Persistence Adapter — Spring + PostgreSQL real
// El dominio NO está acoplado a esto: el adapter implementa el Port
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("UsuarioPersistenceAdapter — Integration Tests")
class UsuarioPersistenceAdapterIT {

    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine").apply {
            withDatabaseName("zenapses_test")
            withUsername("test")
            withPassword("test")
        }

        @DynamicPropertySource
        @JvmStatic
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @Autowired private lateinit var jpaRepository: UsuarioJpaRepository

    private lateinit var adapter: UsuarioPersistenceAdapter

    @BeforeEach
    fun setUp() {
        adapter = UsuarioPersistenceAdapter(jpaRepository)
    }

    @Test
    fun `debe guardar y recuperar usuario por id`() {
        val usuario = UsuarioMother.activo()

        adapter.save(usuario)
        val recuperado = adapter.findById(usuario.id)

        assertThat(recuperado).isNotNull
        assertThat(recuperado!!.email).isEqualTo(usuario.email)
        assertThat(recuperado.estado).isEqualTo(EstadoUsuario.ACTIVO)
    }

    @Test
    fun `debe retornar null para id inexistente`() {
        val resultado = adapter.findById(UsuarioId.generate())
        assertThat(resultado).isNull()
    }

    @Test
    fun `existsByEmail debe retornar true si email registrado`() {
        val usuario = UsuarioMother.activo(email = Email("existente@zenapses.com"))
        adapter.save(usuario)

        assertThat(adapter.existsByEmail(Email("existente@zenapses.com"))).isTrue()
        assertThat(adapter.existsByEmail(Email("otro@zenapses.com"))).isFalse()
    }
}
```

---

### 7️⃣ WireMock — Tests de Adaptadores de Servicios Externos

```kotlin
// ✅ Test del adaptador Stripe — WireMock simula la API externa
// El dominio no sabe nada de Stripe; el adapter implementa el Port PaymentGateway
@WireMockTest(httpPort = 9090)
@DisplayName("StripePaymentAdapter — Integration Tests")
class StripePaymentAdapterIT {

    private lateinit var adapter: StripePaymentAdapter

    @BeforeEach
    fun setUp() {
        adapter = StripePaymentAdapter(baseUrl = "http://localhost:9090", apiKey = "sk_test_fake")
    }

    @Test
    fun `debe retornar ResultadoPago Exitoso ante respuesta 200 de Stripe`() {
        stubFor(
            post(urlEqualTo("/v1/charges"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""{"id":"ch_test123","status":"succeeded","amount":5000}"""))
        )

        val orden = OrdenPagMother.valida(monto = Monto(BigDecimal("50.00"), Moneda.USD))
        val resultado = adapter.procesarPago(orden)

        assertThat(resultado).isInstanceOf(ResultadoPago.Exitoso::class.java)
        assertThat((resultado as ResultadoPago.Exitoso).pagoId.value).isEqualTo("ch_test123")
    }

    @Test
    fun `debe retornar ResultadoPago Rechazado ante tarjeta declinada`() {
        stubFor(
            post(urlEqualTo("/v1/charges"))
                .willReturn(aResponse()
                    .withStatus(402)
                    .withBody("""{"error":{"code":"card_declined","message":"Tu tarjeta fue declinada."}}"""))
        )

        val resultado = adapter.procesarPago(OrdenPagMother.valida())

        assertThat(resultado).isInstanceOf(ResultadoPago.Rechazado::class.java)
        assertThat((resultado as ResultadoPago.Rechazado).codigoError).isEqualTo("card_declined")
    }
}
```

---

### 8️⃣ E2E Tests — Controller con @SpringBootTest

```kotlin
// ✅ Test E2E — único lugar donde Spring arranca completo
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@DisplayName("POST /api/v1/usuarios/registrar — E2E")
class RegistrarUsuarioE2ETest {

    @Autowired lateinit var webTestClient: WebTestClient

    companion object {
        @Container @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")
        
        @DynamicPropertySource @JvmStatic
        fun props(r: DynamicPropertyRegistry) {
            r.add("spring.datasource.url", postgres::getJdbcUrl)
            r.add("spring.datasource.username", postgres::getUsername)
            r.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @Test
    fun `POST registrar debe retornar 201 con id del nuevo usuario`() {
        webTestClient.post().uri("/api/v1/usuarios/registrar")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(
                """{
                    "email": "e2e@zenapses.com",
                    "password": "Pass@word123!",
                    "nombre": "E2E",
                    "apellido": "Test",
                    "rol": "ESTUDIANTE"
                }"""
            )
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.usuarioId").isNotEmpty
    }

    @Test
    fun `POST registrar debe retornar 409 si el email ya existe`() {
        val email = "duplicado@zenapses.com"
        registrarUsuario(email)  // primera vez

        webTestClient.post().uri("/api/v1/usuarios/registrar")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue("""{"email":"$email","password":"Pass@word123!","nombre":"X","apellido":"Y","rol":"ESTUDIANTE"}""")
            .exchange()
            .expectStatus().isEqualTo(HttpStatus.CONFLICT)
    }

    private fun registrarUsuario(email: String) {
        webTestClient.post().uri("/api/v1/usuarios/registrar")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue("""{"email":"$email","password":"Pass@word123!","nombre":"Init","apellido":"User","rol":"ESTUDIANTE"}""")
            .exchange()
            .expectStatus().isCreated
    }
}
```

---

### 9️⃣ Architecture Tests — ArchUnit en Kotlin

```kotlin
// ✅ Garantizan en CI que el dominio sea SIEMPRE desacoplado
@AnalyzeClasses(packages = ["com.zenapses"])
class HexagonalArchitectureTest {

    // I. El dominio NO depende de infra
    @ArchTest
    val domain_no_depende_de_infrastructure: ArchRule = noClasses()
        .that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAPackage("..infrastructure..")

    // II. El dominio NO depende de application
    @ArchTest
    val domain_no_depende_de_application: ArchRule = noClasses()
        .that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAPackage("..application..")

    // III. El dominio NO importa nada de Spring
    @ArchTest
    val domain_no_importa_spring: ArchRule = noClasses()
        .that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAPackage("org.springframework..")

    // IV. El dominio NO importa nada de JPA / Hibernate
    @ArchTest
    val domain_no_importa_jpa: ArchRule = noClasses()
        .that().resideInAPackage("..domain..")
        .should().dependOnClassesThat()
        .resideInAnyPackage("jakarta.persistence..", "org.hibernate..")

    // V. Los Repositories del dominio son interfaces (no implementaciones)
    @ArchTest
    val repositories_domain_son_interfaces: ArchRule = classes()
        .that().resideInAPackage("..domain.repository..")
        .and().haveSimpleNameEndingWith("Repository")
        .should().beInterfaces()

    // VI. Los Use Case implementations solo viven en application.service
    @ArchTest
    val usecases_en_application_service: ArchRule = classes()
        .that().implement(JavaClass.Predicates.resideInAPackage("..application.port.in.."))
        .should().resideInAPackage("..application.service..")

    // VII. Los controllers solo dependen de application, no del domain directamente
    @ArchTest
    val controllers_no_dependen_de_domain_directamente: ArchRule = noClasses()
        .that().resideInAPackage("..infrastructure.adapter.in.rest..")
        .should().dependOnClassesThat()
        .resideInAPackage("..domain.model..")
        .orShould().dependOnClassesThat()
        .resideInAPackage("..domain.repository..")
}
```

---

### 🔟 Configuración del Build — Gradle Kotlin DSL

```kotlin
// build.gradle.kts — testing config con Kotlin
dependencies {
    // JUnit 5 + AssertJ + MockK (idiomático Kotlin)
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.0")
    testImplementation("org.assertj:assertj-core:3.26.0")
    testImplementation("io.mockk:mockk:1.13.12")

    // Testcontainers
    testImplementation("org.testcontainers:junit-jupiter:1.20.0")
    testImplementation("org.testcontainers:postgresql:1.20.0")

    // WireMock
    testImplementation("org.wiremock:wiremock-standalone:3.9.1")
    testImplementation("com.marcinziolo.kotlin:kotlin-wiremock:2.1.1") // DSL Kotlin

    // ArchUnit
    testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")

    // Spring test slice
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        exclude(group = "org.mockito")  // Usar MockK
    }
}

tasks.test {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}

jacoco {
    toolVersion = "0.8.12"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit { minimum = "0.85".toBigDecimal() }
        }
        rule {
            element = "PACKAGE"
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.95".toBigDecimal()
            }
            includes = listOf("com.zenapses.*.domain.*")
        }
    }
}
```

---

### 📋 Checklist TDD — Antes de cada Commit

```markdown
## TDD Checklist (Obligatorio antes de merge)

### Dominio Desacoplado ← CRÍTICO
- [ ] Los tests en domain/ NO importan clases de Spring ni JPA
- [ ] Los tests en application/ NO arrancan el contexto de Spring (@SpringBootTest)
- [ ] Los Ports se mockean como interfaces (mockk<UsuarioRepository>())
- [ ] ArchUnit rules pasan sin violations en CI

### Cobertura
- [ ] domain/: cobertura de líneas >= 95%
- [ ] application/: cobertura de líneas >= 90%
- [ ] infrastructure/: cobertura de líneas >= 80%
- [ ] Global: cobertura >= 85%

### Calidad de Tests
- [ ] Cada test tiene un ÚNICO motivo de fallo
- [ ] Nombres de test describen el comportamiento (backtick Kotlin ``debe hacer X cuando Y``)
- [ ] Se usaron Object Mothers para construir datos de prueba (NO new directo con 10 parámetros)
- [ ] Tests de dominio sin mocks (solo instanciación directa)
- [ ] Testcontainers por cada Integration Test que toca la BD
- [ ] WireMock para cada Adapter que llama servicios externos HTTP

### CI Gates
- [ ] ./gradlew test → 0 failures
- [ ] ./gradlew jacocoTestCoverageVerification → PASSED
- [ ] ./gradlew test --tests "*ArchitectureTest" → 0 violations
```

---

## 🔗 Referencias

- Test-Driven Development by Example — Kent Beck
- Growing Object-Oriented Software Guided by Tests — Freeman & Pryce
- MockK: https://mockk.io/
- Testcontainers Kotlin: https://testcontainers.com/guides/testing-spring-boot-rest-api-using-testcontainers/
- ArchUnit: https://www.archunit.org/userguide/html/000_Index.html
