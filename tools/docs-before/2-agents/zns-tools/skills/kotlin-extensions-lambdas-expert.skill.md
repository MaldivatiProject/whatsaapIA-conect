# 🎯 SKILL: KOTLIN EXTENSIONS & LAMBDAS — Avanzado

**skill_id**: kotlin-extensions-lambdas-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / lenguaje  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-dotnet-core-senior.md`

**dependencias**: `kotlin-lang-expert` (complementa, no reemplaza)

---

## 📌 Propósito de la Skill

Esta skill amplía al agente con dominio **Expert** en el sistema de extensiones, lambdas avanzadas, funciones de orden superior con modificadores de compilación, DSLs con receptor, y programación funcional idiomática Kotlin. Cubre las características que distinguen a un desarrollador Kotlin Senior de uno Expert: `inline`, `reified`, `crossinline`, `noinline`, type aliases funcionales, extension properties, receiver lambdas para DSLs internos tipados y SAM conversions. Aplica cuando se diseña código Kotlin reutilizable, expresivo y con cero overhead de abstracción.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Extension Functions — Nivel Expert

#### Extension Functions en Objetos Compañeros

Permite añadir "factory methods" externas a clases existentes sin modificarlas ni heredar.

```kotlin
// ✅ Extension sobre companion object — factory externo sin modificar la clase original
fun UsuarioId.Companion.fromJwt(subject: String): UsuarioId =
    runCatching { UsuarioId(UUID.fromString(subject)) }
        .getOrElse { throw TokenInvalidoException("Subject JWT no es un UUID válido: $subject") }

fun Email.Companion.fromUntrusted(valor: String): Result<Email> =
    runCatching { Email(valor.trim().lowercase()) }

// Uso
val id = UsuarioId.fromJwt(authentication.name)
val email = Email.fromUntrusted(request.email).getOrThrow()
```

#### Extension Properties

Las extension properties no almacenan estado adicional (no tienen backing field) — solo definen un getter/setter calculado sobre el tipo extendido.

```kotlin
// ✅ Extension property — getter calculado, cero almacenamiento extra
val Email.dominio: String get() = value.substringAfter('@')
val Email.esPersonal: Boolean get() = dominio in setOf("gmail.com", "hotmail.com", "yahoo.com")
val Monto.esCero: Boolean get() = value.compareTo(BigDecimal.ZERO) == 0
val Monto.esPositivo: Boolean get() = value > BigDecimal.ZERO
val UsuarioId.stringValue: String get() = value.toString()

// Extension property sobre tipo nullable
val String?.esBlancoONulo: Boolean get() = this == null || this.isBlank()

// Uso legible
if (comando.email.esPersonal) log.warn("Email personal detectado: ${comando.email.dominio}")
if (!monto.esCero) publicarEvento(PagoRegistrado(monto))
```

#### Extensiones Genéricas con Constraints

```kotlin
// ✅ Extension genérica restringida a un contrato del dominio
fun <T : AggregateRoot<*>> T.clearAndReturn(): T {
    clearDomainEvents()
    return this
}

// ✅ Extension para colecciones de Value Objects con constraint
fun <ID, T : AggregateRoot<ID>> List<T>.ids(): List<ID> = map { it.id }

fun <T : DomainEvent> List<T>.afterTimestamp(ts: Instant): List<T> =
    filter { it.occurredOn.isAfter(ts) }

// Uso
val ids = usuarios.ids<UsuarioId, Usuario>()
val eventosRecientes = usuario.domainEvents.afterTimestamp(Instant.now().minusSeconds(60))
```

---

### 2️⃣ `inline` Functions — Cero Overhead en Lambdas

#### ¿Por qué `inline`?

Cuando se pasa una lambda a una función, Kotlin normalmente crea un objeto `Function` en el heap (Boxing). `inline` copia el bytecode de la función y la lambda en el sitio de llamada → **cero allocations, cero virtual dispatch overhead**.

#### Cuándo usar `inline`

| Criterio | ¿Usar `inline`? |
|----------|----------------|
| La función acepta una lambda y es pequeña/frecuente | ✅ Sí |
| Se usa `reified` para instropección de tipos generics | ✅ Obligatorio |
| Se necesita non-local return dentro de la lambda | ✅ Sí |
| La función es grande (>5 líneas lógicas) | ❌ No — infla el bytecode |
| La función es pública en una librería de uso masivo | ⚠️ Con cuidado |

```kotlin
// ✅ inline con medición de rendimiento (patrón transversal)
inline fun <T> medirTiempo(nombre: String, bloque: () -> T): T {
    val inicio = System.currentTimeMillis()
    return try {
        bloque()
    } finally {
        val duracion = System.currentTimeMillis() - inicio
        log.info("[$nombre] ejecutado en ${duracion}ms")
    }
}

// Uso — sin allocations en runtime
val resultado = medirTiempo("RegistrarUsuario") {
    usuarioRepository.save(usuario)
}

// ✅ inline para validación genérica en Application Services
inline fun require(condicion: Boolean, lazyMensaje: () -> String) {
    if (!condicion) throw ValidacionException(lazyMensaje())
}

// ✅ inline para retry con back-off (infraestructura)
inline fun <T> conReintentos(
    maxIntentos: Int = 3,
    delayMs: Long = 100,
    bloque: () -> T
): T {
    var ultimaExcepcion: Exception? = null
    repeat(maxIntentos) { intento ->
        return try { bloque() }
        catch (e: Exception) {
            ultimaExcepcion = e
            Thread.sleep(delayMs * (intento + 1))
        }
    }
    throw ultimaExcepcion!!
}
```

#### `inline` con Non-Local Return

`inline` permite que la lambda use `return` para retornar de la función externa (non-local return) — imposible sin `inline`.

```kotlin
// ✅ Non-local return — solo posible con inline
inline fun List<Usuario>.primeroActivo(accion: (Usuario) -> Unit) {
    for (u in this) {
        if (u.estado == EstadoUsuario.ACTIVO) {
            accion(u)
            return  // ← sale de la función llamante, no de la lambda
        }
    }
}

fun procesarPrimerActivo(usuarios: List<Usuario>) {
    usuarios.primeroActivo { usuario ->
        enviarNotificacion(usuario)
        return  // ← non-local: sale de procesarPrimerActivo(), no de la lambda
    }
    // Solo llega aquí si no hay activos
    log.warn("No hay usuarios activos")
}
```

---

### 3️⃣ `reified` Type Parameters

`reified` solo está disponible en funciones `inline`. Permite acceder al tipo genérico `T` en tiempo de ejecución mediante reflexión, sin necesidad de pasar `Class<T>` como parámetro explicito (type erasure de JVM superado).

```kotlin
// ❌ Sin reified — obliga a pasar KClass explícita
fun <T : Any> deserializar(json: String, tipo: KClass<T>): T =
    objectMapper.readValue(json, tipo.java)
val usuario = deserializar(json, Usuario::class)

// ✅ Con reified — fluido, type-safe, sin argumentos extra
inline fun <reified T : Any> deserializar(json: String): T =
    objectMapper.readValue(json, T::class.java)
val usuario: Usuario = deserializar(json)

// ✅ reified para Application Event Publisher tipado
inline fun <reified T : DomainEvent> ApplicationEventPublisher.publicar(evento: T) =
    publishEvent(evento)

// ✅ reified para repositorios genéricos en tests
inline fun <reified T : Any> MockK<T>() = mockk<T>()

// ✅ reified para logging con clase correcta sin ::class.java repetitivo
inline fun <reified T : Any> loggerPara(): Logger =
    LoggerFactory.getLogger(T::class.java)

class UsuarioService {
    private val log = loggerPara<UsuarioService>()
}

// ✅ reified para filtrar listas por tipo en Domain Events
inline fun <reified T : DomainEvent> List<DomainEvent>.ofType(): List<T> =
    filterIsInstance<T>()

// Uso
val pagosRegistrados = aggregate.domainEvents.ofType<PagoRegistrado>()
```

---

### 4️⃣ `crossinline` y `noinline`

#### `noinline` — Excluir una lambda del inlining

Cuando se tiene múltiples lambdas en una `inline fun`, se puede excluir una del inlining (p.ej. para almacenarla como objeto o pasarla a otra función non-inline).

```kotlin
// ✅ noinline — cuando necesitas almacenar la lambda o pasarla a otro lugar
inline fun ejecutarConFallback(
    bloque: () -> Unit,
    noinline fallback: () -> Unit   // ← se almacena como objeto Function, no se inlinea
) {
    try {
        bloque()
    } catch (e: Exception) {
        manejadorGlobal.registrar(fallback)  // necesita el objeto Function para almacenarlo
        fallback()
    }
}
```

#### `crossinline` — Permitir inlining pero prohibir non-local return

Cuando la lambda se llama dentro de un contexto que no soporta non-local return (p.ej. dentro de un lambda anidado o en otro contexto de ejecución).

```kotlin
// ✅ crossinline — inlineable pero sin non-local return
inline fun ejecutarAsync(crossinline bloque: () -> Unit) {
    Thread {
        bloque()  // crossinline: inlineable pero el caller no puede hacer non-local return
    }.start()
}

// ✅ Uso práctico con coroutines
inline fun <T> Flow<T>.transformarConMetrica(
    nombre: String,
    crossinline transformacion: suspend (T) -> T
): Flow<T> = this.map { valor ->
    medirTiempo(nombre) { transformacion(valor) }
}
```

---

### 5️⃣ Receiver Lambdas — DSLs Internos Tipados

Un **lambda con receptor** (`T.() -> R`) es una lambda donde `this` refiere al objeto receptor `T`. Es el mecanismo fundamental para construir DSLs internos expresivos y type-safe.

#### Estructura y sintaxis

```kotlin
// Forma de tipo:  T.() -> R
// T es el receiver, dentro de la lambda "this" es de tipo T

// ✅ Función de construcción con receiver lambda
fun <T> buildList(capacidad: Int = 10, bloque: MutableList<T>.() -> Unit): List<T> =
    ArrayList<T>(capacidad).also(bloque)

// ✅ apply, with, run usan receiver lambdas internamente
// apply: receptor = this, retorna this
val pedido = Pedido().apply {
    estado = EstadoPedido.PENDIENTE
    monto = Monto(BigDecimal("150.00"))
}
// with: receptor = this (retorna resultado del bloque)
val resumen = with(pedido) {
    "Pedido ${id.stringValue}: $estado por ${monto.value}"
}
```

#### DSL de Validación para Application Services

```kotlin
// ✅ DSL para reglas de negocio expresivas sin excepciones caóticas
class ValidadorNegocio {
    private val errores = mutableListOf<String>()

    fun requerir(condicion: Boolean, mensaje: () -> String) {
        if (!condicion) errores.add(mensaje())
    }

    fun requerirNoBlanco(valor: String, campo: String) =
        requerir(valor.isNotBlank()) { "$campo no puede estar en blanco" }

    fun build(): List<String> = errores.toList()
}

inline fun validar(bloque: ValidadorNegocio.() -> Unit): List<String> =
    ValidadorNegocio().apply(bloque).build()

// Uso en Application Service
val errores = validar {
    requerirNoBlanco(command.nombre, "nombre")
    requerir(command.monto.esPositivo) { "El monto debe ser positivo" }
    requerir(command.fechaInicio.isAfter(Instant.now())) { "La fecha debe ser futura" }
}
if (errores.isNotEmpty()) return CrearReservaResult.DatosInvalidos(errores)
```

#### DSL de Configuración de Queries (Query Builder tipado)

```kotlin
// ✅ DSL para construir filtros de búsqueda en Application Layer
data class FiltroUsuario(
    val rol: RolUsuario? = null,
    val estado: EstadoUsuario? = null,
    val emailDominio: String? = null,
    val pagina: Int = 0,
    val tamaño: Int = 20
)

class FiltroUsuarioBuilder {
    private var rol: RolUsuario? = null
    private var estado: EstadoUsuario? = null
    private var emailDominio: String? = null
    private var pagina: Int = 0
    private var tamaño: Int = 20

    fun rol(rol: RolUsuario) = apply { this.rol = rol }
    fun estado(estado: EstadoUsuario) = apply { this.estado = estado }
    fun emailDominio(dominio: String) = apply { emailDominio = dominio }
    fun paginado(pagina: Int, tamaño: Int = 20) = apply { this.pagina = pagina; this.tamaño = tamaño }

    fun build() = FiltroUsuario(rol, estado, emailDominio, pagina, tamaño)
}

fun filtroUsuario(bloque: FiltroUsuarioBuilder.() -> Unit): FiltroUsuario =
    FiltroUsuarioBuilder().apply(bloque).build()

// Uso — legible, type-safe, extensible
val filtro = filtroUsuario {
    rol(RolUsuario.TUTOR)
    estado(EstadoUsuario.ACTIVO)
    emailDominio("zenapses.com")
    paginado(pagina = 0, tamaño = 50)
}
```

#### DSL de Tests con Receiver Lambda (Given-When-Then)

```kotlin
// ✅ DSL para escribir tests expresivos en domain layer
class PedidoTestBuilder {
    private var propietario: UsuarioId = UsuarioId.generate()
    private var monto: Monto = Monto(BigDecimal("100.00"))
    private var estado: EstadoPedido = EstadoPedido.PENDIENTE

    fun propietario(id: UsuarioId) = apply { propietario = id }
    fun monto(valor: BigDecimal) = apply { monto = Monto(valor) }
    fun estado(estado: EstadoPedido) = apply { this.estado = estado }
    fun build() = Pedido.reconstituir(PedidoId.generate(), propietario, monto, estado)
}

fun pedido(bloque: PedidoTestBuilder.() -> Unit = {}): Pedido =
    PedidoTestBuilder().apply(bloque).build()

// Test — DSL limpio
@Test
fun `confirmar pedido pendiente debe cambiar estado y registrar evento`() {
    val pedido = pedido {
        propietario(UsuarioId.generate())
        monto(BigDecimal("200.00"))
        estado(EstadoPedido.PENDIENTE)
    }
    pedido.confirmar()
    assertThat(pedido.estado).isEqualTo(EstadoPedido.CONFIRMADO)
    assertThat(pedido.domainEvents).hasSize(1)
    assertThat(pedido.domainEvents.first()).isInstanceOf(PedidoConfirmado::class.java)
}
```

---

### 6️⃣ Function Types, Type Aliases y Function References

#### Type Aliases para Function Types

Los type aliases documentan la intención y evitan repetir firmas complejas.

```kotlin
// ✅ typealias para function types — documenta intención
typealias Validador<T> = (T) -> Boolean
typealias Transformador<T, R> = (T) -> R
typealias HandlerEvento<T> = suspend (T) -> Unit
typealias ReglaDeNegocio = (Pedido) -> String?  // null = pasa, String = mensaje de error

// Uso idiomático
class PedidoValidator {
    private val reglas: MutableList<ReglaDeNegocio> = mutableListOf()

    fun agregar(regla: ReglaDeNegocio) = apply { reglas.add(regla) }

    fun validar(pedido: Pedido): List<String> =
        reglas.mapNotNull { regla -> regla(pedido) }
}

// Construir el validador con function references
val validador = PedidoValidator()
    .agregar { pedido -> if (pedido.monto.esCero) "El monto no puede ser cero" else null }
    .agregar { pedido -> if (pedido.propietarioId == pedido.receptorId) "Propietario y receptor no pueden ser el mismo" else null }
```

#### Function References (`::`)

Evitan lambdas verbosas cuando la función ya tiene la firma correcta.

```kotlin
// ✅ Function reference — más conciso que lambda equivalente
val dominiosValidos = emails
    .map(Email::dominio)            // ✅ en vez de .map { it.dominio }
    .filter(String::isNotBlank)     // ✅ en vez de .filter { it.isNotBlank() }
    .distinct()

// ✅ Constructor reference
val ids = rawIds
    .map(UUID::fromString)          // ✅ en vez de .map { UUID.fromString(it) }
    .map(::UsuarioId)               // ✅ constructor reference sin lambda

// ✅ Method reference en colecciones de dominio
val eventosPublicados = domainEvents
    .filter(DomainEvent::esPublicable)
    .forEach(eventPublisher::publish)  // ✅ suspending method ref

// ✅ Bound reference (referencia a método de instancia específica)
val usuarioRepository: UsuarioRepository = ...
val findById: (UsuarioId) -> Usuario? = usuarioRepository::findById
```

#### Funciones de Orden Superior en Dominio

```kotlin
// ✅ Función de orden superior para políticas de dominio intercambiables
interface PoliticaDescuento {
    fun calcular(pedido: Pedido): Monto
}

// Alternativa idiomática Kotlin: function type en lugar de interfaz funcional
typealias PoliticaDescuento = (Pedido) -> Monto

// Políticas expresadas como extension functions o lambdas
val sinDescuento: PoliticaDescuento = { _ -> Monto(BigDecimal.ZERO) }
val descuentoFijo10Pct: PoliticaDescuento = { pedido -> pedido.monto * BigDecimal("0.10") }
fun descuentoPorVolumen(umbral: Monto): PoliticaDescuento = { pedido ->
    if (pedido.monto > umbral) pedido.monto * BigDecimal("0.15")
    else Monto(BigDecimal.ZERO)
}

// Application Service con política inyectada (Strategy pattern idiomatic Kotlin)
class ProcesarPedidoService(
    private val pedidoRepository: PedidoRepository,
    private val politicaDescuento: PoliticaDescuento   // DI via function type
) : ProcesarPedidoUseCase {
    override fun execute(command: ProcesarPedidoCommand): ProcesarPedidoResult {
        val pedido = pedidoRepository.findById(command.pedidoId)
            ?: return ProcesarPedidoResult.NoEncontrado
        val descuento = politicaDescuento(pedido)
        pedido.aplicarDescuento(descuento)
        pedidoRepository.save(pedido)
        return ProcesarPedidoResult.Exito(pedido.id)
    }
}
```

---

### 7️⃣ Scope Functions — Guía Definitiva de Cuándo Usar Cada Una

| Función | Receptor en bloque | Valor retornado | Cuándo usar |
|---------|-------------------|-----------------|-------------|
| `let` | `it` | Resultado del bloque | Transformar un nullable; encadenar operaciones; introducir scope para variable temporal |
| `run` | `this` | Resultado del bloque | Cálculo sobre un objeto; combinar inicialización y cálculo |
| `with` | `this` | Resultado del bloque | Operar sobre un objeto sin retornarlo (tipo "with X, do Y") |
| `apply` | `this` | El receptor (`this`) | Configurar/inicializar un objeto (builder style); siempre retorna el objeto |
| `also` | `it` | El receptor (`this`) | Efectos secundarios (logging, auditoría) sin modificar el flujo |

```kotlin
// ✅ let — transformar nullable en forma segura
val emailNormalizado = usuario.email
    ?.let { Email(it.value.lowercase()) }
    ?: throw EmailAusenteException()

// ✅ let — scope temporal para variable intermedia
val resumen = command.usuarioId
    .let { usuarioRepository.findById(it) ?: throw UsuarioNoEncontradoException(it) }
    .let { usuario -> "${usuario.nombre.completo} <${usuario.email.value}>" }

// ✅ apply — configurar un objeto (retorna el objeto mismo)
val entity = UsuarioJpaEntity().apply {
    id = usuario.id.value
    email = usuario.email.value
    nombre = usuario.nombre.nombre
    apellido = usuario.nombre.apellido
    creadoEn = usuario.creadoEn
}

// ✅ also — logging/auditoría sin romper el flujo
val usuarioGuardado = usuarioRepository.save(usuario)
    .also { log.info("Usuario guardado: ${it.id.stringValue}") }
    .also { auditoria.registrar(UsuarioCreado(it.id, Instant.now())) }

// ✅ run — calcular resultado sobre objeto
val respuesta = pedido.run {
    mapOf(
        "id" to id.stringValue,
        "estado" to estado.name,
        "monto" to monto.value.toPlainString()
    )
}

// ✅ with — operar sobre objeto no nullable (cuando ya se tiene la referencia)
val validado = with(command) {
    require(monto.esPositivo) { "Monto debe ser positivo" }
    require(fechaInicio.isAfter(Instant.now())) { "Fecha debe ser futura" }
    this  // retorna el command si pasa las validaciones
}
```

---

### 8️⃣ SAM Conversions (Functional Interfaces Kotlin)

```kotlin
// ✅ fun interface — SAM Kotlin (equivalente a @FunctionalInterface de Java)
fun interface Notificador {
    fun notificar(mensaje: String)
}

// Uso — lambda directamente donde se espera la interfaz
val notificadorConsola = Notificador { mensaje -> println("[NOTIF] $mensaje") }
val notificadorLog: Notificador = Notificador { log.info(it) }

// ✅ fun interface para políticas de dominio intercambiables y testeable
fun interface ReglaAcceso {
    fun permitir(usuario: Usuario, recurso: Recurso): Boolean
}

val accesoPublico = ReglaAcceso { _, _ -> true }
val accesoSoloAdmin = ReglaAcceso { usuario, _ -> usuario.rol == RolUsuario.ADMIN }
val accesoSoloPropietario = ReglaAcceso { usuario, recurso -> recurso.propietarioId == usuario.id }

// Composición de reglas
infix fun ReglaAcceso.o(otra: ReglaAcceso) = ReglaAcceso { u, r -> this.permitir(u, r) || otra.permitir(u, r) }
infix fun ReglaAcceso.y(otra: ReglaAcceso) = ReglaAcceso { u, r -> this.permitir(u, r) && otra.permitir(u, r) }

val reglaFinal = accesoSoloPropietario o accesoSoloAdmin

// ✅ SAM conversions con interfaces de Java (Spring)
val eventListener: ApplicationListener<ContextRefreshedEvent> =
    ApplicationListener { event -> log.info("Contexto listo: ${event.timestamp}") }
```

---

## ✅ Criterios de Aplicación

- Diseñar funciones reutilizables que aceptan lambdas (usar `inline` si son pequeñas y frecuentes).
- Necesitar instropección de tipo genérico en runtime sin `Class<T>` explícita (usar `reified`).
- Construir DSLs internos para configuración, validación, tests o query building.
- Definir políticas de dominio intercambiables (usar function types + `typealias`).
- Simplificar mapeos entre capas (extension functions + extension properties).
- Escribir tests de dominio legibles con builders DSL.

## ❌ Anti-patrones

- ❌ **`inline` en funciones grandes**: infla bytecode — solo para funciones ≤ ~5 líneas lógicas.
- ❌ **Extension functions en el núcleo del dominio con dependencias de infra**: una extension function en `domain/` solo puede depender de tipos del dominio.
- ❌ **Anidar `inline` calls sin `crossinline`** cuando la lambda interna se ejecuta en otro contexto (coroutines, hilos).
- ❌ **Usar `with` sobre nullable** — causa SmartCast impossibility. Usa `let` para nullables.
- ❌ **typealias como sustituto de Value Objects**: `typealias UsuarioId = UUID` no aporta type safety — usa `@JvmInline value class`.
- ❌ **Extension functions en `Any`**: contamina el autocompletado de todo el proyecto.
- ❌ **Receiver lambdas sin `@DslMarker`** en DSLs anidados multilevel — permite acceder al receptor del scope padre, generando bugs silenciosos.

```kotlin
// ✅ @DslMarker para DSLs multinivel — previene acceso accidental al scope padre
@DslMarker
annotation class ZnsDsl

@ZnsDsl class PedidoScope { fun linea(bloque: LineaScope.() -> Unit) { ... } }
@ZnsDsl class LineaScope { var cantidad: Int = 1 }

fun pedido(bloque: PedidoScope.() -> Unit) = PedidoScope().apply(bloque)

// Sin @DslMarker, en el bloque de LineaScope se podría llamar a métodos de PedidoScope — bug silencioso
```

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Mapper de infraestructura con extension properties + function references

```kotlin
// infrastructure/adapter/out/persistence/UsuarioMapper.kt
// ✅ Extension functions para mapping bidireccional — sin clase Mapper, sin overhead
fun UsuarioJpaEntity.toDomain(): Usuario = Usuario.reconstituir(
    id = UsuarioId(id),
    email = Email(email),
    nombre = NombreCompleto(nombre, apellido),
    rol = RolUsuario.valueOf(rol),
    estado = EstadoUsuario.valueOf(estado),
    creadoEn = creadoEn
)

fun Usuario.toJpaEntity(): UsuarioJpaEntity = UsuarioJpaEntity(
    id = id.value,
    email = email.value,
    nombre = nombre.nombre,
    apellido = nombre.apellido,
    rol = rol.name,
    estado = estado.name,
    creadoEn = creadoEn
)

// ✅ Extension property sobre JpaEntity para acceso fluido
val UsuarioJpaEntity.emailDominio: String get() = email.substringAfter('@')

// ✅ Uso con function references en repositorio
class UsuarioPersistenceAdapter(
    private val jpaRepository: UsuarioJpaRepository
) : UsuarioRepository {
    override fun findAllActivos(): List<Usuario> =
        jpaRepository.findAllByEstado("ACTIVO")
            .map(UsuarioJpaEntity::toDomain)  // ← function reference, no lambda
}
```

### Ejemplo 2: DSL tipado para construir respuestas de API paginadas

```kotlin
// ✅ DSL con @DslMarker para respuestas paginadas tipadas
@DslMarker annotation class RespuestaDsl

@RespuestaDsl
class PaginadoBuilder<T>(private val contenido: List<T>) {
    var pagina: Int = 0
    var tamaño: Int = 20
    var total: Long = contenido.size.toLong()

    fun build() = RespuestaPaginada(
        contenido = contenido,
        pagina = pagina,
        tamaño = tamaño,
        total = total,
        totalPaginas = ceil(total.toDouble() / tamaño).toInt()
    )
}

inline fun <reified T> paginado(
    contenido: List<T>,
    bloque: PaginadoBuilder<T>.() -> Unit = {}
): RespuestaPaginada<T> = PaginadoBuilder(contenido).apply(bloque).build()

// Uso en controller
@PostMapping("/buscar")
fun buscar(@Valid @RequestBody req: BuscarUsuariosRequest): ResponseEntity<RespuestaPaginada<UsuarioResponse>> {
    val usuarios = buscarUseCase.execute(req.toQuery())
    return ResponseEntity.ok(
        paginado(usuarios.map(UsuarioResponse::from)) {
            pagina = req.pagina
            tamaño = req.tamaño
            total = usuarios.total
        }
    )
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Añadir en la sección `SKILLS ACTIVAS`:

```markdown
SKILL ACTIVA: kotlin-extensions-lambdas-expert → ver: 2-agents/zns-tools/skills/kotlin-extensions-lambdas-expert.skill.md
```

Añadir fila en la tabla de resumen de skills:

```markdown
| `kotlin-extensions-lambdas-expert` | `inline`/`reified`/`crossinline`; extension properties; receiver lambdas para DSLs internos tipados; `@DslMarker`; type aliases funcionales; SAM Conversions con `fun interface`; scope functions (cuándo usar cada una); function references `::` |
```

Y agregar en la sección de seguridad/clean code del agente:

```markdown
### ⚡ EXTENSIONS & LAMBDAS AVANZADAS — REGLAS NO NEGOCIABLES

- **`inline`** en toda función que recibe lambda y es pequeña (≤ 5 líneas lógicas) o que usa `reified`.
- **`reified`** para evitar pasar `KClass<T>`/`Class<T>` explícitamente en funciones genéricas.
- **`crossinline`** cuando la lambda se ejecuta en un contexto diferente (Thread, coroutine, callback).
- **`@DslMarker`** obligatorio en DSLs con más de un nivel de anidamiento.
- **Extension functions en `domain/`** solo pueden depender de tipos del dominio — zero infra imports.
- **`typealias`** para documentar function types; nunca como sustituto de Value Objects.
- **`fun interface`** para políticas de dominio intercambiables (Strategy pattern idiomático Kotlin).
- **Scope functions**: `apply` para setup, `also` para side-effects, `let` para nullable chains, `run`/`with` para cálculos sobre objeto.
```

### Adaptación para Java (Spring Boot Senior)

Los conceptos mapean a:
| Kotlin | Java idiomático |
|--------|----------------|
| `inline fun` con lambda | Método pequeño con `@FunctionalInterface` + JIT inlining manual |
| `reified` | `Class<T>` explícita o `ParameterizedTypeReference<T>` |
| Extension functions | Métodos en util class estática o default methods en interface |
| Extension properties | Getters en utility class o `Records` |
| `fun interface` (SAM) | `@FunctionalInterface` de Java |
| `typealias` para function types | `@FunctionalInterface` nombrado |
| Scope functions | `Optional<T>` chains, `Objects.requireNonNull`, streams |
| Receiver lambda DSL | Builder pattern fluent con `Consumer<Builder>` |

### Adaptación para .NET Core / C\#

| Kotlin | C# idiomático |
|--------|--------------|
| `inline fun` con lambda | Métodos con `Func<T>`/`Action<T>` (JIT inline automático) |
| `reified` | `typeof(T)` disponible nativamente en C# generics |
| Extension functions | `static class` con `this T extensionParam` |
| Extension properties | Extension methods que actúan como getters |
| `fun interface` (SAM) | `delegate` o `Func<>/Action<>` directamente |
| `typealias` | `using TypeAlias = Func<...>` o `delegate` nombrado |
| `apply` | Object initializers `new T { Prop = val }` o Fluent API |
| `let` | Null-conditional `?.` + null coalescing `??` |
| Receiver lambda DSL | `Action<Builder>` pattern (p.ej. `IServiceCollection`) |

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Extension functions en `domain/` con imports de infra | 0 |
| Funciones `inline` con lambdas frecuentes sin `inline` | 0 |
| DSLs multinivel sin `@DslMarker` | 0 |
| `typealias` usados como sustituto de Value Objects | 0 |
| SAM interfaces sin `fun interface` cuando es posible | 0 |
| Lambdas `crossinline` en cambio de contexto (thread/coroutine) | 100% |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Extensions & Lambdas Expert  
  Cobertura: `inline`/`reified`/`crossinline`/`noinline`, extension properties, receiver lambda DSLs, `@DslMarker`, type aliases, SAM conversions, scope functions guía completa, function references, Strategy con function types, adaptaciones Java y .NET
