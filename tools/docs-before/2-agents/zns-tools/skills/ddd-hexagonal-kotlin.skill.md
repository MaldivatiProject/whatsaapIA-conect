# 🎯 SKILL: DDD + ARQUITECTURA HEXAGONAL EN KOTLIN

**skill_id**: ddd-hexagonal-kotlin  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / arquitectura  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

**dependencias**: `kotlin-lang-expert` (data classes, sealed classes, value classes)

---

## 📌 Propósito de la Skill

Esta skill provee dominio experto en **Domain-Driven Design (DDD)** y **Arquitectura Hexagonal (Ports & Adapters)** aplicados con Kotlin + Spring Boot. Cubre desde el diseño estratégico (Bounded Contexts, Context Mapping) hasta los patrones tácticos (Aggregates, Value Objects, Domain Events, Repositories) con código Kotlin idiomático, aprovechando data classes, sealed interfaces, value classes y extension functions.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Arquitectura Hexagonal — Estructura de Paquetes

```
src/main/kotlin/com/zenapses/<contexto>/
├── domain/
│   ├── model/
│   │   ├── Usuario.kt              ← Aggregate Root
│   │   ├── UsuarioId.kt            ← Value Class (@JvmInline)
│   │   ├── Email.kt                ← Value Object (data class)
│   │   ├── Password.kt             ← Value Object
│   │   ├── NombreCompleto.kt       ← Value Object
│   │   ├── EstadoUsuario.kt        ← Enum
│   │   └── RolUsuario.kt           ← Enum
│   ├── event/
│   │   ├── DomainEvent.kt          ← Sealed Interface base
│   │   ├── UsuarioRegistrado.kt
│   │   └── UsuarioSuspendido.kt
│   ├── repository/
│   │   └── UsuarioRepository.kt    ← Port (interface)
│   ├── service/
│   │   └── PasswordHashService.kt  ← Domain Service (interface)
│   └── exception/
│       ├── EmailDuplicadoException.kt
│       └── UsuarioNoEncontradoException.kt
├── application/
│   ├── port/
│   │   ├── in/
│   │   │   └── RegistrarUsuarioUseCase.kt   ← Input Port
│   │   └── out/
│   │       └── EnviarEmailPort.kt           ← Output Port
│   ├── service/
│   │   └── RegistrarUsuarioService.kt       ← Use Case impl
│   └── command/
│       └── RegistrarUsuarioCommand.kt
└── infrastructure/
    ├── adapter/
    │   ├── in/
    │   │   └── rest/
    │   │       ├── UsuarioController.kt     ← Driving Adapter
    │   │       ├── RegistrarUsuarioRequest.kt
    │   │       └── UsuarioResponse.kt
    │   └── out/
    │       ├── persistence/
    │       │   ├── UsuarioPersistenceAdapter.kt   ← Driven Adapter
    │       │   ├── UsuarioJpaEntity.kt
    │       │   ├── UsuarioJpaRepository.kt
    │       │   └── UsuarioMapper.kt               ← Extension functions
    │       └── email/
    │           └── SendGridEmailAdapter.kt
    └── config/
        ├── SecurityConfig.kt
        └── BeanConfig.kt
```

**Reglas de Dependencia (INVIOLABLES):**
```
domain/       ← NO depende de NADA (ni Spring, ni JPA, ni infra)
application/  ← depende SOLO de domain/
infrastructure/ ← depende de domain/ y application/
```

---

### 2️⃣ Aggregate Root en Kotlin

```kotlin
// ✅ AggregateRoot base (sin dependencia de frameworks)
abstract class AggregateRoot<ID> {
    private val _domainEvents: MutableList<DomainEvent> = mutableListOf()
    val domainEvents: List<DomainEvent> get() = _domainEvents.toList()

    protected fun registerEvent(event: DomainEvent) {
        _domainEvents.add(event)
    }

    fun clearDomainEvents() = _domainEvents.clear()
}

// ✅ Aggregate Usuario — datos inmutables, lógica de negocio explícita
class Usuario private constructor(
    val id: UsuarioId,
    val email: Email,
    private val passwordHash: Password,
    val nombre: NombreCompleto,
    val rol: RolUsuario,
    var estado: EstadoUsuario,       // mutable solo el estado de negocio
    val creadoEn: Instant
) : AggregateRoot<UsuarioId>() {

    companion object {
        // Factory method con lógica de creación e invariantes
        fun registrar(
            email: Email,
            passwordHash: Password,
            nombre: NombreCompleto,
            rol: RolUsuario
        ): Usuario {
            val usuario = Usuario(
                id = UsuarioId.generate(),
                email = email,
                passwordHash = passwordHash,
                nombre = nombre,
                rol = rol,
                estado = EstadoUsuario.ACTIVO,
                creadoEn = Instant.now()
            )
            usuario.registerEvent(UsuarioRegistrado(usuario.id, email))
            return usuario
        }
    }

    // Métodos de negocio (NO setters)
    fun suspender(motivo: String) {
        check(estado != EstadoUsuario.SUSPENDIDO) {
            "El usuario ya está suspendido: $id"
        }
        estado = EstadoUsuario.SUSPENDIDO
        registerEvent(UsuarioSuspendido(id, motivo))
    }

    fun reactivar() {
        check(estado == EstadoUsuario.SUSPENDIDO) {
            "Solo se pueden reactivar usuarios suspendidos"
        }
        estado = EstadoUsuario.ACTIVO
        registerEvent(UsuarioReactivado(id))
    }

    fun verificarPassword(plainPassword: Password, hashService: PasswordHashService): Boolean =
        hashService.verify(plainPassword, passwordHash)
}
```

---

### 3️⃣ Value Objects con Kotlin

```kotlin
// ✅ Email — data class con validación en init
data class Email(val value: String) {
    init {
        require(value.isNotBlank()) { "Email no puede estar vacío" }
        require(EMAIL_REGEX.matches(value.trim())) {
            "Formato de email inválido: $value"
        }
    }
    val normalized: String get() = value.lowercase().trim()

    companion object {
        private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\$")
    }
}

// ✅ Monto — data class con operaciones de negocio
data class Monto(val valor: BigDecimal, val moneda: Moneda) {
    init {
        require(valor >= BigDecimal.ZERO) { "El monto no puede ser negativo: $valor" }
    }

    operator fun plus(otro: Monto): Monto {
        require(moneda == otro.moneda) { "Monedas incompatibles: $moneda != ${otro.moneda}" }
        return copy(valor = valor + otro.valor)
    }

    operator fun times(factor: BigDecimal): Monto = copy(valor = valor * factor)

    fun aplicarDescuento(porcentaje: Int): Monto {
        require(porcentaje in 0..100) { "Porcentaje inválido: $porcentaje" }
        return copy(valor = valor * (BigDecimal.ONE - porcentaje.toBigDecimal() / BigDecimal(100)))
    }

    companion object {
        fun cero(moneda: Moneda) = Monto(BigDecimal.ZERO, moneda)
    }
}

// ✅ @JvmInline value class para IDs (coste cero en JVM)
@JvmInline
value class UsuarioId(val value: UUID) {
    companion object {
        fun generate() = UsuarioId(UUID.randomUUID())
        fun from(str: String) = UsuarioId(UUID.fromString(str))
    }
    override fun toString() = value.toString()
}

// ✅ NombreCompleto — Value Object compuesto
data class NombreCompleto(val nombre: String, val apellido: String) {
    init {
        require(nombre.isNotBlank()) { "Nombre no puede estar vacío" }
        require(apellido.isNotBlank()) { "Apellido no puede estar vacío" }
        require(nombre.length <= 100) { "Nombre demasiado largo" }
        require(apellido.length <= 100) { "Apellido demasiado largo" }
    }
    val completo: String get() = "$nombre $apellido"
}
```

---

### 4️⃣ Domain Events con Sealed Interface

```kotlin
// ✅ Contrato base — sealed interface permite exhaustividad en when
sealed interface DomainEvent {
    val occurredOn: Instant
    val eventId: UUID get() = UUID.randomUUID()
}

// Eventos del agregado Usuario
data class UsuarioRegistrado(
    val usuarioId: UsuarioId,
    val email: Email,
    override val occurredOn: Instant = Instant.now()
) : DomainEvent

data class UsuarioSuspendido(
    val usuarioId: UsuarioId,
    val motivo: String,
    override val occurredOn: Instant = Instant.now()
) : DomainEvent

data class UsuarioReactivado(
    val usuarioId: UsuarioId,
    override val occurredOn: Instant = Instant.now()
) : DomainEvent

// ✅ Publicación mediante Spring ApplicationEventPublisher
@Component
class SpringDomainEventPublisher(
    private val applicationEventPublisher: ApplicationEventPublisher
) : DomainEventPublisher {
    override fun publish(event: DomainEvent) = applicationEventPublisher.publishEvent(event)
    override fun publishAll(events: List<DomainEvent>) = events.forEach(::publish)
}

// ✅ Event Handler en Application Layer
@Component
class UsuarioEventHandler(private val emailPort: EnviarEmailPort) {

    @EventListener
    @Async
    fun on(event: UsuarioRegistrado) {
        emailPort.enviarBienvenida(event.email, event.usuarioId)
    }

    @EventListener
    @Async
    fun on(event: UsuarioSuspendido) {
        emailPort.enviarNotificacionSuspension(event.usuarioId, event.motivo)
    }
}
```

---

### 5️⃣ Puertos y Use Cases

```kotlin
// ✅ Input Port (interfaz en application/port/in/)
interface RegistrarUsuarioUseCase {
    fun execute(command: RegistrarUsuarioCommand): RegistrarUsuarioResult
}

// ✅ Command (objeto inmutable, sin lógica)
data class RegistrarUsuarioCommand(
    val email: Email,
    val password: Password,
    val nombre: NombreCompleto,
    val rol: RolUsuario
)

// ✅ Resultado tipado con sealed class
sealed class RegistrarUsuarioResult {
    data class Exito(val usuarioId: UsuarioId) : RegistrarUsuarioResult()
    data class EmailDuplicado(val email: Email) : RegistrarUsuarioResult()
}

// ✅ Use Case Implementation (Application Service)
@Service
class RegistrarUsuarioService(
    private val usuarioRepository: UsuarioRepository,
    private val passwordHashService: PasswordHashService,
    private val eventPublisher: DomainEventPublisher
) : RegistrarUsuarioUseCase {

    @Transactional
    override fun execute(command: RegistrarUsuarioCommand): RegistrarUsuarioResult {
        // 1. Guardia de negocio
        if (usuarioRepository.existsByEmail(command.email)) {
            return RegistrarUsuarioResult.EmailDuplicado(command.email)
        }

        // 2. Hash del password (Domain Service)
        val hashedPassword = passwordHashService.hash(command.password)

        // 3. Crear Aggregate (lógica en el dominio)
        val usuario = Usuario.registrar(
            email = command.email,
            passwordHash = hashedPassword,
            nombre = command.nombre,
            rol = command.rol
        )

        // 4. Persistir
        usuarioRepository.save(usuario)

        // 5. Publicar Domain Events
        eventPublisher.publishAll(usuario.domainEvents)
        usuario.clearDomainEvents()

        return RegistrarUsuarioResult.Exito(usuario.id)
    }
}
```

---

### 6️⃣ Repository Port y Persistence Adapter

```kotlin
// ✅ Puerto (interface en domain/repository/) — SIN imports de JPA/Spring
interface UsuarioRepository {
    fun findById(id: UsuarioId): Usuario?
    fun findByEmail(email: Email): Usuario?
    fun save(usuario: Usuario)
    fun delete(id: UsuarioId)
    fun existsByEmail(email: Email): Boolean
}

// ✅ Adaptador de Persistencia (infrastructure/adapter/out/persistence/)
@Component
class UsuarioPersistenceAdapter(
    private val jpaRepository: UsuarioJpaRepository
) : UsuarioRepository {

    override fun findById(id: UsuarioId): Usuario? =
        jpaRepository.findById(id.value).orElse(null)?.toDomain()

    override fun findByEmail(email: Email): Usuario? =
        jpaRepository.findByEmail(email.normalized)?.toDomain()

    override fun save(usuario: Usuario) {
        jpaRepository.save(usuario.toJpaEntity())
    }

    override fun delete(id: UsuarioId) =
        jpaRepository.deleteById(id.value)

    override fun existsByEmail(email: Email): Boolean =
        jpaRepository.existsByEmail(email.normalized)
}

// ✅ Mapping mediante extension functions (no Mapper class)
fun UsuarioJpaEntity.toDomain() = Usuario.reconstituir(
    id = UsuarioId(this.id),
    email = Email(this.email),
    passwordHash = Password(this.passwordHash),
    nombre = NombreCompleto(this.nombre, this.apellido),
    rol = RolUsuario.valueOf(this.rol),
    estado = EstadoUsuario.valueOf(this.estado),
    creadoEn = this.creadoEn
)

fun Usuario.toJpaEntity() = UsuarioJpaEntity(
    id = this.id.value,
    email = this.email.normalized,
    passwordHash = this.passwordHash.value,
    nombre = this.nombre.nombre,
    apellido = this.nombre.apellido,
    rol = this.rol.name,
    estado = this.estado.name,
    creadoEn = this.creadoEn
)
```

---

### 7️⃣ Architecture Tests con ArchUnit

```kotlin
// ✅ Verificar reglas de Arquitectura Hexagonal (falla en CI si se violan)
@AnalyzeClasses(packages = ["com.zenapses"])
class HexagonalArchitectureTest {

    @ArchTest
    val domainNoDepende_deInfraestructura: ArchRule =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure..")

    @ArchTest
    val domainNoDepende_deApplication: ArchRule =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("..application..")

    @ArchTest
    val domainNoDepende_deSpring: ArchRule =
        noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("org.springframework..")

    @ArchTest
    val repositoriosDomain_sonInterfaces: ArchRule =
        classes()
            .that().resideInAPackage("..domain.repository..")
            .and().haveSimpleNameEndingWith("Repository")
            .should().beInterfaces()

    @ArchTest
    val useCases_implementanPuertos: ArchRule =
        classes()
            .that().resideInAPackage("..application.service..")
            .and().haveSimpleNameEndingWith("Service")
            .should().implement(JavaClass.Predicates.resideInAPackage("..application.port.in.."))
}
```

---

### 8️⃣ Context Mapping y Bounded Contexts

**Principios del Diseño Estratégico:**

| Patrón | Descripción | Ejemplo ZNS |
|--------|-------------|-------------|
| **Shared Kernel** | Modelo compartido entre BCs (mínimo) | `UserId` compartido entre Auth y Reservas |
| **Anti-Corruption Layer (ACL)** | Traducción entre BCs externos | Adaptar respuesta de Stripe a dominio de Pagos |
| **Open Host Service** | BC expone protocolo bien definido | API REST pública del BC de Catálogos |
| **Conformist** | Adoptar el modelo de un BC upstream sin traducir | Integración interna entre BCs del mismo equipo |

```kotlin
// ✅ ACL — Adaptador Anti-corrupción para integrar con servicio externo de pagos
@Component
class StripeAntiCorruptionLayer(private val stripeClient: StripeClient) : PaymentGateway {

    // Traduce el modelo externo (Stripe) al modelo de dominio (Pagos BC)
    override fun procesarPago(orden: OrdenPago): ResultadoPago {
        return try {
            val cargo = stripeClient.charges().create(
                ChargeCreateParams.builder()
                    .setAmount(orden.monto.valor.multiply(BigDecimal(100)).toLong())
                    .setCurrency(orden.monto.moneda.code.lowercase())
                    .setSource(orden.metodoPago.token)
                    .build()
            )
            ResultadoPago.Exitoso(PagoId(cargo.id), Instant.now())
        } catch (e: CardException) {
            ResultadoPago.Rechazado(e.code ?: "UNKNOWN", e.message ?: "Pago rechazado")
        } catch (e: StripeException) {
            ResultadoPago.Error("STRIPE_ERROR", e.message ?: "Error de pasarela")
        }
    }
}

// ResultadoPago — sealed class del dominio (NO del mundo externo)
sealed class ResultadoPago {
    data class Exitoso(val pagoId: PagoId, val procesadoEn: Instant) : ResultadoPago()
    data class Rechazado(val codigoError: String, val mensaje: String) : ResultadoPago()
    data class Error(val codigoError: String, val mensaje: String) : ResultadoPago()
}
```

---

## 🔗 Referencias

- Domain-Driven Design (Blue Book) — Eric Evans
- Implementing DDD (Red Book) — Vaughn Vernon
- Architecture Patterns with Python — Harry Percival, Bob Gregory
- ArchUnit: https://www.archunit.org/
