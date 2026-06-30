# 🎯 SKILL: KOTLIN EXPERT — Lenguaje, Idioms y Coroutines

**skill_id**: kotlin-lang-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / lenguaje  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

**dependencias**: ninguna (skill autónoma)

---

## 📌 Propósito de la Skill

Esta skill dota al agente de dominio experto en el **lenguaje Kotlin**, sus características idiomáticas, el sistema de tipos nulo-seguro, las Coroutines, los conceptos de programación funcional y las mejores prácticas de escritura de código Kotlin de nivel senior/experto aplicado a backends con Spring Boot.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Sistema de Tipos y Null Safety

Kotlin elimina la mayoría de los `NullPointerException` en tiempo de compilación. **Nunca usar `!!` (not-null assertion) en código de producción** salvo que sea absolutamente imposible de otra forma.

```kotlin
// ❌ PROHIBIDO en producción
val email = usuario.email!!.lowercase()

// ✅ Manejo explícito con ?. y ?: (Elvis)
val email = usuario.email?.lowercase() ?: throw EmailAusenteException()

// ✅ let para transformaciones seguras
val longitud = nombre?.let { it.trim().length } ?: 0

// ✅ also, apply, run, let, with — scoping functions
val usuario = Usuario(
    email = Email("test@example.com"),
    nombre = NombreCompleto("Juan", "Pérez")
).also { log.info("Usuario creado: ${it.email}") }
```

**Regla de oro del null safety:**
| Operador | Cuándo usar |
|----------|-------------|
| `?.` | Acceso seguro a nullable |
| `?:` (Elvis) | Valor por defecto o lanzar excepción |
| `let { }` | Transformar nullable de forma segura |
| `takeIf { }` | Convertir en null si no cumple condición |
| `requireNotNull()` | Validar contratos de entrada (lanza `IllegalArgumentException`) |
| `checkNotNull()` | Validar invariantes de estado (lanza `IllegalStateException`) |

---

### 2️⃣ Data Classes, Sealed Classes y Value Classes

#### Data Classes (Value Objects del dominio)

```kotlin
// ✅ Data class: equals, hashCode, toString, copy generados automáticamente
data class Email(val value: String) {
    init {
        require(value.isNotBlank()) { "Email no puede estar en blanco" }
        require(EMAIL_REGEX.matches(value)) { "Formato de email inválido: $value" }
    }

    val normalized: String get() = value.lowercase().trim()

    companion object {
        private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\$")
    }
}

// ✅ copy() para modificación inmutable
val emailCorregido = emailOriginal.copy(value = "nuevo@example.com")
```

#### Value Classes (JVM inline — coste cero en runtime)

```kotlin
// ✅ @JvmInline value class: wrapper sin overhead en JVM
@JvmInline
value class UsuarioId(val value: UUID) {
    companion object {
        fun generate() = UsuarioId(UUID.randomUUID())
        fun from(str: String) = UsuarioId(UUID.fromString(str))
    }
}

@JvmInline
value class Monto(val value: BigDecimal) {
    init { require(value >= BigDecimal.ZERO) { "Monto no puede ser negativo" } }
    operator fun plus(otro: Monto) = Monto(value + otro.value)
    operator fun times(factor: BigDecimal) = Monto(value * factor)
}
```

#### Sealed Classes / Sealed Interfaces (modelar resultados y estados)

```kotlin
// ✅ Sealed class para modelar resultado de casos de uso (sin excepciones)
sealed class RegistrarUsuarioResult {
    data class Exito(val usuarioId: UsuarioId) : RegistrarUsuarioResult()
    data class EmailDuplicado(val email: Email) : RegistrarUsuarioResult()
    data class DatosInvalidos(val errores: List<String>) : RegistrarUsuarioResult()
}

// Consumo con when (exhaustivo — sin else necesario)
when (val resultado = useCase.execute(command)) {
    is RegistrarUsuarioResult.Exito -> ResponseEntity.created(...).build()
    is RegistrarUsuarioResult.EmailDuplicado -> ResponseEntity.conflict().build()
    is RegistrarUsuarioResult.DatosInvalidos -> ResponseEntity.badRequest().body(resultado.errores)
}

// ✅ Sealed interface para Domain Events tipados
sealed interface DomainEvent {
    val occurredOn: Instant
}

data class UsuarioRegistrado(
    val usuarioId: UsuarioId,
    val email: Email,
    override val occurredOn: Instant = Instant.now()
) : DomainEvent

data class ReservaConfirmada(
    val reservaId: ReservaId,
    val tutorId: TutorId,
    override val occurredOn: Instant = Instant.now()
) : DomainEvent
```

---

### 3️⃣ Extension Functions y DSLs

```kotlin
// ✅ Extension functions para lógica de dominio sin contaminar la clase base
fun String.toEmail(): Email = Email(this)
fun String.toUsuarioId(): UsuarioId = UsuarioId(UUID.fromString(this))
fun BigDecimal.toMonto(): Monto = Monto(this)

// ✅ Extension functions en capas de infraestructura (mapping)
fun UsuarioJpaEntity.toDomain(): Usuario = Usuario(
    id = UsuarioId(this.id),
    email = Email(this.email),
    nombre = NombreCompleto(this.nombre, this.apellido),
    rol = RolUsuario.valueOf(this.rol),
    estado = EstadoUsuario.valueOf(this.estado),
    creadoEn = this.creadoEn
)

fun Usuario.toJpaEntity(): UsuarioJpaEntity = UsuarioJpaEntity(
    id = this.id.value,
    email = this.email.value,
    nombre = this.nombre.nombre,
    apellido = this.nombre.apellido,
    rol = this.rol.name,
    estado = this.estado.name,
    creadoEn = this.creadoEn
)

// ✅ DSL Builder legible (alternativa idiomática a Builder pattern de Java)
fun usuario(block: UsuarioBuilder.() -> Unit): Usuario = UsuarioBuilder().apply(block).build()

class UsuarioBuilder {
    var email: String = ""
    var nombre: String = ""
    var apellido: String = ""
    var rol: RolUsuario = RolUsuario.ESTUDIANTE

    fun build(): Usuario = Usuario(
        id = UsuarioId.generate(),
        email = Email(email),
        nombre = NombreCompleto(nombre, apellido),
        rol = rol,
        estado = EstadoUsuario.ACTIVO
    )
}

// Uso del DSL
val usuario = usuario {
    email = "test@example.com"
    nombre = "Juan"
    apellido = "Pérez"
    rol = RolUsuario.TUTOR
}
```

---

### 4️⃣ Coroutines — Programación Asíncrona

#### Conceptos fundamentales

```kotlin
// ✅ suspend fun — función suspendible (no bloquea el hilo)
suspend fun buscarUsuario(id: UsuarioId): Usuario? = withContext(Dispatchers.IO) {
    usuarioRepository.findById(id.value)?.toDomain()
}

// ✅ Dispatchers correctos
// Dispatchers.IO → operaciones de I/O (BD, red, disco)
// Dispatchers.Default → CPU intensivo (cálculos, parsing)
// Dispatchers.Main → UI (no aplica en backend Spring Boot)

// ✅ coroutineScope para lanzar coroutines paralelas
suspend fun obtenerDashboard(usuarioId: UsuarioId): DashboardResponse = coroutineScope {
    val reservasDeferred = async { reservaService.buscarPorUsuario(usuarioId) }
    val notificacionesDeferred = async { notificacionService.buscarNoLeidas(usuarioId) }
    val perfilDeferred = async { usuarioService.obtenerPerfil(usuarioId) }

    DashboardResponse(
        reservas = reservasDeferred.await(),
        notificaciones = notificacionesDeferred.await(),
        perfil = perfilDeferred.await()
    )
}

// ✅ Flow para streams reactivos (alternativa a Reactor/RxJava)
fun buscarUsuariosActivos(): Flow<Usuario> = flow {
    usuarioRepository.findAllByEstado(EstadoUsuario.ACTIVO).forEach { entity ->
        emit(entity.toDomain())
    }
}

// ✅ StateFlow y SharedFlow para eventos en memoria
class EventBus {
    private val _events = MutableSharedFlow<DomainEvent>()
    val events: SharedFlow<DomainEvent> = _events.asSharedFlow()

    suspend fun publish(event: DomainEvent) = _events.emit(event)
}
```

#### Coroutines con Spring Boot

```kotlin
// ✅ Spring WebFlux + Coroutines (reactivo con sintaxis imperativa)
@RestController
@RequestMapping("/api/v1/usuarios")
class UsuarioController(private val useCase: RegistrarUsuarioUseCase) {

    @PostMapping("/registrar")
    suspend fun registrar(@Valid @RequestBody request: RegistrarUsuarioRequest): ResponseEntity<UsuarioResponse> {
        return when (val result = useCase.execute(request.toCommand())) {
            is RegistrarUsuarioResult.Exito -> ResponseEntity
                .status(HttpStatus.CREATED)
                .body(UsuarioResponse(result.usuarioId.value.toString()))
            is RegistrarUsuarioResult.EmailDuplicado -> ResponseEntity
                .status(HttpStatus.CONFLICT)
                .build()
            is RegistrarUsuarioResult.DatosInvalidos -> ResponseEntity
                .badRequest()
                .body(UsuarioResponse(errores = result.errores))
        }
    }
}

// ✅ Repository reactivo con coroutines
interface UsuarioCoroutineRepository : CoroutineCrudRepository<UsuarioJpaEntity, UUID> {
    suspend fun findByEmail(email: String): UsuarioJpaEntity?
    fun findAllByEstado(estado: String): Flow<UsuarioJpaEntity>
}
```

---

### 5️⃣ Programación Funcional en Kotlin

```kotlin
// ✅ Funciones de orden superior y lambdas
fun <T, R> List<T>.mapNotNullIndexed(transform: (index: Int, T) -> R?): List<R> =
    mapIndexedNotNull { index, item -> transform(index, item) }

// ✅ Función pura (determinista, sin efectos secundarios)
fun calcularDescuento(monto: Monto, porcentaje: Int): Monto {
    require(porcentaje in 0..100) { "Porcentaje debe estar entre 0 y 100" }
    return Monto(monto.value * (1 - porcentaje.toBigDecimal() / BigDecimal(100)))
}

// ✅ Result<T> de la stdlib para manejo funcional de errores
fun parsearEmail(valor: String): Result<Email> = runCatching { Email(valor) }

val email = parsearEmail("invalido")
    .getOrElse { throw EmailInvalidoException(it.message) }

// ✅ Encadenamiento funcional
val totalDescuentos = reservas
    .filter { it.estado == EstadoReserva.COMPLETADA }
    .map { calcularDescuento(it.monto, it.descuentoAplicado) }
    .fold(Monto(BigDecimal.ZERO)) { acc, monto -> acc + monto }
```

---

### 6️⃣ Convenciones de Código Kotlin (Idioms)

| Práctica | ❌ Java-style | ✅ Kotlin-idiomático |
|----------|--------------|---------------------|
| Getters/Setters | `getEmail()`, `setEmail()` | Propiedades directas `email` |
| Null check | `if (x != null) x.foo()` | `x?.foo()` |
| Ternario | `if/else` como expresión | `if (cond) a else b` (es expresión) |
| Singleton | `static` + synchronized | `object` |
| Companion methods | Métodos estáticos en clase separada | `companion object` |
| Builder | Clase `Builder` anidada | Named params + default values |
| String format | `String.format()` | String templates `"Hola $nombre"` |
| Colecciones | `Collections.unmodifiableList()` | `listOf()`, `mapOf()` |
| Casting | `(String) objeto` | `objeto as String` o `objeto as? String` |
| Instanceof | `x instanceof Foo` | `x is Foo` o smart cast |

```kotlin
// ✅ Named parameters + default values (eliminan el Builder pattern de Java)
data class CrearReservaCommand(
    val estudianteId: UsuarioId,
    val tutorId: TutorId,
    val fechaHora: LocalDateTime,
    val duracionMinutos: Int = 60,  // valor por defecto
    val notas: String? = null       // opcional
)

// Uso legible sin Builder
val command = CrearReservaCommand(
    estudianteId = UsuarioId.from("aa1b..."),
    tutorId = TutorId.from("bb2c..."),
    fechaHora = LocalDateTime.of(2026, 5, 1, 10, 0),
    duracionMinutos = 90
)

// ✅ when como expresión (más potente que switch)
val descripcion = when (reserva.estado) {
    EstadoReserva.PENDIENTE -> "Esperando confirmación del tutor"
    EstadoReserva.CONFIRMADA -> "Reserva confirmada para ${reserva.fechaHora}"
    EstadoReserva.CANCELADA -> "Reserva cancelada: ${reserva.motivoCancelacion}"
    EstadoReserva.COMPLETADA -> "Sesión completada exitosamente"
}

// ✅ Destructuring de data classes
val (nombre, apellido) = nombreCompleto
val (id, email, rol) = usuario
```

---

### 7️⃣ Anti-Patrones Kotlin a Evitar

```kotlin
// ❌ NO usar !! (not-null assertion) — garantiza NPE runtime
val len = str!!.length  // Usa: str?.length ?: 0

// ❌ NO usar lateinit var en dominio — solo para DI de Spring
lateinit var email: Email  // Usa: val con inicializador

// ❌ NO usar mutable var en Value Objects
data class Precio(var valor: BigDecimal)  // Usa: val

// ❌ NO mezclar Java Optional con Kotlin nullables
fun buscar(): Optional<Usuario>  // Usa: fun buscar(): Usuario?

// ❌ NO usar 'Any' sin justificación — pierde type safety
fun procesar(data: Any)  // Usa genéricos: fun <T : DomainEntity> procesar(data: T)

// ❌ NO usar companion object para estado mutable (es singleton global)
companion object {
    var contador = 0  // THREAD UNSAFE — usa AtomicInteger o evita estado mutable
}

// ❌ NO ignorar coroutine exceptions
launch {
    // Si falla aquí, se pierde silenciosamente
    usuarioService.actualizar(usuario)
}
// ✅ Usa try-catch o CoroutineExceptionHandler:
launch(CoroutineExceptionHandler { _, ex -> log.error("Error en coroutine", ex) }) {
    usuarioService.actualizar(usuario)
}
```

---

## 🔗 Referencias

- Kotlin Language Reference: https://kotlinlang.org/docs/reference/
- Effective Kotlin — Marcin Moskała
- Kotlin Coroutines in Practice — Roman Elizarov
- Spring Boot + Kotlin: https://spring.io/guides/tutorials/spring-boot-kotlin/
