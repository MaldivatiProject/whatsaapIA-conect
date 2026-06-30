# 🧹 SKILL: CLEAN CODE + SOLID + UNIT TEST DESIGN — EXPERT

**skill_id**: clean-code-solid-testing-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: calidad / ingeniería de software  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior  
**dependencias**: ninguna (skill autónoma)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento profundo y los patrones canónicos para producir código que sea: (1) **legible y mantenible** (Clean Code), (2) **correctamente desacoplado y extensible** (SOLID), y (3) **verificado mediante tests unitarios bien diseñados** (Unit Test Design). Las tres dimensiones son inseparables: Clean Code hace el código testeable, SOLID hace la arquitectura extensible, y los tests unitarios protegen el comportamiento de negocio.

---

## 🧠 PARTE 1 — SOLID PRINCIPLES

### 1️⃣ SRP — Single Responsibility Principle

> **"Una clase debe tener una, y solo una, razón para cambiar."** — Robert C. Martin

Una clase con múltiples responsabilidades cambia por múltiples razones: negocio, infraestructura, presentación. El test de SRP es: *¿si cambio X, también debo cambiar esta clase?* Si hay más de una causa, viola SRP.

**Señal de violación**: clase con más de 200 líneas, métodos que tocan BD Y envían emails Y loggean.

**Kotlin — violación vs corrección:**
```kotlin
// ❌ VIOLA SRP — una clase hace demasiado
class UsuarioService(private val db: UserRepository, private val smtp: MailSender) {
    fun registrar(email: String, password: String) {
        val hash = BCrypt.hashpw(password, BCrypt.gensalt(12))   // ← responsabilidad: hashing
        db.save(Usuario(email, hash))                            // ← persistencia
        smtp.send(email, "Bienvenido")                           // ← notificación
        log.info("Registrado: $email")                           // ← logging
    }
}

// ✅ CORRECTO — cada clase tiene una sola razón para cambiar
class RegistrarUsuarioService(            // orquestación
    private val usuarioRepository: UsuarioRepository,
    private val passwordHashService: PasswordHashService,
    private val notificacionService: NotificacionService
) {
    fun execute(command: RegistrarUsuarioCommand): RegistrarUsuarioResult {
        val hash = passwordHashService.hash(command.password)   // delegado
        val usuario = Usuario.registrar(command.email, hash, command.nombre)
        usuarioRepository.save(usuario)
        notificacionService.notificarRegistro(usuario)           // delegado
        return RegistrarUsuarioResult.Exito(usuario.id)
    }
}
// PasswordHashService: solo hashing
// NotificacionService: solo envío de emails
// UsuarioRepository: solo persistencia
```

**Java 21 equivalente:**
```java
// ✅ SOLID SRP — mismo principio, Records y sealed classes de Java 21
record RegistrarUsuarioCommand(Email email, Password password, NombreCompleto nombre) {}

@Service
class RegistrarUsuarioService {
    private final UsuarioRepository usuarioRepository;
    private final PasswordHashService passwordHashService;
    private final NotificacionService notificacionService;
    // un constructor, constructor injection (Spring)
    
    public RegistrarUsuarioResult execute(RegistrarUsuarioCommand command) {
        var hash = passwordHashService.hash(command.password());
        var usuario = Usuario.registrar(command.email(), hash, command.nombre());
        usuarioRepository.save(usuario);
        notificacionService.notificarRegistro(usuario);
        return new RegistrarUsuarioResult.Exito(usuario.getId());
    }
}
```

**C#/.NET equivalente:**
```csharp
// ✅ SOLID SRP — C# con record y sealed
public sealed record RegistrarUsuarioCommand(Email Email, Password Password, NombreCompleto Nombre);

public class RegistrarUsuarioHandler : ICommandHandler<RegistrarUsuarioCommand, RegistrarUsuarioResult>
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IPasswordHashService _passwordHashService;
    private readonly INotificacionService _notificacionService;
    
    public async Task<RegistrarUsuarioResult> Handle(RegistrarUsuarioCommand command, CancellationToken ct)
    {
        var hash = _passwordHashService.Hash(command.Password);
        var usuario = Usuario.Registrar(command.Email, hash, command.Nombre);
        await _usuarioRepository.SaveAsync(usuario, ct);
        await _notificacionService.NotificarRegistroAsync(usuario, ct);
        return new RegistrarUsuarioResult.Exito(usuario.Id);
    }
}
```

---

### 2️⃣ OCP — Open/Closed Principle

> **"El software debe estar abierto a extensión y cerrado a modificación."** — Bertrand Meyer / Robert C. Martin

Extender comportamiento añadiendo nuevas clases/implementaciones, NO modificando código existente. El patrón principal: **Strategy + polimorfismo**.

**Señal de violación**: `when (tipo)` / `if (tipo == "X")` en el núcleo de la aplicación que crece con cada nuevo caso.

**Kotlin — violación vs corrección:**
```kotlin
// ❌ VIOLA OCP — cada nuevo tipo de descuento requiere modificar esta función
fun calcularDescuento(pedido: Pedido, tipo: String): Monto = when (tipo) {
    "ESTUDIANTE"  -> pedido.monto * BigDecimal("0.10")
    "PROFESOR"    -> pedido.monto * BigDecimal("0.20")
    "CORPORATIVO" -> pedido.monto * BigDecimal("0.30")
    // añadir "PREMIUM" require modificar aquí ❌
    else          -> Monto.CERO
}

// ✅ CORRECTO OCP — Strategy con fun interface (Kotlin idiomático)
fun interface PoliticaDescuento {
    fun calcular(pedido: Pedido): Monto
}

val descuentoEstudiante  = PoliticaDescuento { it.monto * BigDecimal("0.10") }
val descuentoProfesor    = PoliticaDescuento { it.monto * BigDecimal("0.20") }
val descuentoCorporativo = PoliticaDescuento { it.monto * BigDecimal("0.30") }
// Añadir "PREMIUM": nueva instancia, CERO modificación al motor de descuentos ✅

class MotorDescuento {
    fun calcular(pedido: Pedido, politica: PoliticaDescuento): Monto = politica.calcular(pedido)
}
```

**Java 21:**
```java
// ✅ OCP con @FunctionalInterface + Strategy
@FunctionalInterface
public interface PoliticaDescuento {
    Monto calcular(Pedido pedido);
}

// Extensión: nueva clase sin tocar el motor
public class DescuentoPremium implements PoliticaDescuento {
    @Override public Monto calcular(Pedido pedido) {
        return pedido.getMonto().multiply(BigDecimal.valueOf(0.25));
    }
}
```

**C#/.NET:**
```csharp
// ✅ OCP con delegate / interface Strategy
public interface IPoliticaDescuento { Monto Calcular(Pedido pedido); }

// Nueva política sin tocar el motor
public class DescuentoPremium : IPoliticaDescuento {
    public Monto Calcular(Pedido pedido) => pedido.Monto * 0.25m;
}
```

---

### 3️⃣ LSP — Liskov Substitution Principle

> **"Los subtipos deben ser sustituibles por sus tipos base."** — Barbara Liskov

Si `B` hereda de `A`, cualquier código que use `A` debe funcionar sin sorpresas con `B`. Violación clásica: sobrescribir un método para lanzar `UnsupportedOperationException` o cambiar la postcondición.

**Señal de violación**: `is CheckType` antes de llamar a un método; subclase que lanza excepción en un método de la base.

```kotlin
// ❌ VIOLA LSP — ReadOnlyList hereda de MutableList pero lanza UnsupportedOperationException
class ReadOnlyList<T>(private val items: List<T>) : MutableList<T> by items.toMutableList() {
    override fun add(element: T): Boolean = throw UnsupportedOperationException("Solo lectura")
}

// ✅ CORRECTO — jerarquía honesta
interface ColeccionLectura<T> { fun obtener(i: Int): T; fun tamaño(): Int }
interface ColeccionMutable<T> : ColeccionLectura<T> { fun agregar(e: T) }

// Código que usa ColeccionLectura nunca recibe sorpresas — solo lectura garantizada
```

```kotlin
// ✅ Kotlin sealed class como alternativa a herencia frágil
sealed class ResultadoPago {
    data class Aprobado(val transaccionId: String) : ResultadoPago()
    data class Rechazado(val razon: String) : ResultadoPago()
    object Pendiente : ResultadoPago()
}
// when exhaustivo: el compilador detecta casos no manejados → LSP implícito
```

---

### 4️⃣ ISP — Interface Segregation Principle

> **"Los clientes no deben ser forzados a depender de interfaces que no usan."** — Robert C. Martin

Interfaces grandes que combinan operaciones para distintos clientes obligan a implementar métodos vacíos o lanzar excepciones. Mejor: interfaces pequeñas y cohesivas.

**Señal de violación**: interfaz con 10+ métodos, implementaciones que devuelven `null` o `throw UnsupportedOperationException`.

```kotlin
// ❌ ISP violado — una interfaz gigante que mezcla responsabilidades
interface UsuarioServicio {
    fun registrar(command: RegistrarUsuarioCommand): UsuarioId
    fun autenticar(email: Email, password: Password): TokenPair
    fun buscarPorId(id: UsuarioId): Usuario?
    fun listarTodos(pagina: Int): List<Usuario>
    fun suspender(id: UsuarioId, motivo: String)
    fun exportarCsv(): ByteArray    // ← ¿por qué está aquí?
    fun enviarEmailBienvenida(id: UsuarioId)  // ← mezcla notificación con dominio
}

// ✅ ISP correcto — interfaces segregadas por uso
interface RegistrarUsuarioPort {
    fun execute(command: RegistrarUsuarioCommand): RegistrarUsuarioResult
}
interface AutenticarUsuarioPort {
    fun execute(command: AutenticarCommand): AutenticacionResult
}
interface ConsultarUsuarioPort {
    fun porId(id: UsuarioId): Usuario?
    fun listar(pagina: Int, tamano: Int): Page<Usuario>
}
// Cada Application Service implementa solo su Port. Cero dependencias innecesarias.
```

**Java 21 (mismo patrón con interfaces):**
```java
public interface RegistrarUsuarioUseCase {
    RegistrarUsuarioResult execute(RegistrarUsuarioCommand command);
}
public interface ConsultarUsuarioUseCase {
    Optional<Usuario> porId(UsuarioId id);
    Page<Usuario> listar(int pagina, int tamano);
}
```

---

### 5️⃣ DIP — Dependency Inversion Principle

> **"Los módulos de alto nivel no deben depender de módulos de bajo nivel. Ambos deben depender de abstracciones."** — Robert C. Martin

El Application Layer define las abstracciones (Ports). Infrastructure las implementa. DIP es la base de la Arquitectura Hexagonal.

```kotlin
// ❌ VIOLA DIP — Application Service depende directamente de la implementación JPA
class RegistrarUsuarioService {
    private val repo = UsuarioJpaRepository()    // ← depende de JPA concreto
    private val smtp = SmtpMailSender()          // ← depende de SMTP concreto
    // Para testear necesito una BD real y un servidor SMTP real ❌
}

// ✅ DIP CORRECTO — depende de abstracciones (Ports)
class RegistrarUsuarioService(
    private val usuarioRepository: UsuarioRepository,      // ← interfaz (Port)
    private val notificacionService: NotificacionService   // ← interfaz (Port)
) {
    // Para testear: MockK/Mockito provee implementaciones fake ✅
    // Para producción: Spring inyecta UsuarioJpaAdapter y SmtpNotificacionAdapter ✅
}
```

**El flujo DIP en Hexagonal:**
```
Application Layer          Infrastructure Layer
 ┌─────────────────┐         ┌──────────────────────┐
 │ RegistrarUsuario│ ──uses──►│ UsuarioRepository    │ (interface — domain)
 │ Service         │         └──────────────────────┘
 └─────────────────┘                    ▲
                                        │ implements
                             ┌──────────────────────┐
                             │ UsuarioJpaAdapter    │ (concrete — infra)
                             └──────────────────────┘
```

---

## 🧠 PARTE 2 — CLEAN CODE

### 1️⃣ Nombres Significativos (The Most Important)

> **"El nombre de una variable, función o clase debe revelar la intención."** — Robert C. Martin

```kotlin
// ❌ Nombres crípticos
fun proc(d: List<Any>, f: Boolean): Map<String, Any> { ... }
val x = 86400
val l = mutableListOf<Usuario>()

// ✅ Nombres que revelan intención
fun filtrarUsuariosActivos(usuarios: List<Usuario>, incluirAdmin: Boolean): Map<String, Usuario> { ... }
val SEGUNDOS_EN_UN_DIA = 86400
val usuariosActivos = mutableListOf<Usuario>()

// ✅ Kotlin: nombres que describen el negocio
data class RegistrarUsuarioCommand(val email: Email, val password: Password, val nombre: NombreCompleto)
fun Usuario.estaActivo() = estado == EstadoUsuario.ACTIVO     // extension property expresiva
fun calcularFechaVencimientoToken(emitidoEn: Instant, duracion: Duration) = emitidoEn + duracion
```

**Reglas de naming por tipo:**

| Elemento | Convención Kotlin | Convención Java | Convención C# |
|---|---|---|---|
| Clase/Interfaz | `PascalCase`, sustantivo | `PascalCase`, sustantivo | `PascalCase`, sustantivo |
| Función/Método | `camelCase`, verbo | `camelCase`, verbo | `PascalCase`, verbo |
| Variable | `camelCase`, sustantivo descriptivo | `camelCase`, sustantivo | `camelCase`, sustantivo |
| Constante | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` | `PascalCase` |
| Booleano | `esActivo`, `tienePermiso`, `puedeEditar` | `isActivo`, `hasPermiso` | `IsActivo`, `HasPermiso` |
| Test | `` `debe hacer X cuando Y` `` (backtick) | `shouldDoXWhenY` | `Should_DoX_When_Y` |

---

### 2️⃣ Funciones Pequeñas con Una Sola Tarea

```kotlin
// ❌ Función que hace demasiado (20+ líneas, múltiples niveles de abstracción)
fun procesarRegistroUsuario(request: RegistrarRequest): ResponseEntity<*> {
    if (request.email.isBlank()) return ResponseEntity.badRequest().body("Email vacío")
    val existing = repo.findByEmail(request.email)
    if (existing != null) return ResponseEntity.status(409).body("Email duplicado")
    val hash = BCrypt.hashpw(request.password, BCrypt.gensalt(12))
    val user = Usuario(UUID.randomUUID(), request.email, hash, Instant.now())
    repo.save(user)
    smtp.send(request.email, "Bienvenido a Zenapses", "Tu cuenta fue creada")
    log.info("Usuario registrado: ${request.email}")
    return ResponseEntity.status(201).body(mapOf("id" to user.id))
}

// ✅ Funciones pequeñas con un nivel de abstracción
fun procesarRegistroUsuario(command: RegistrarUsuarioCommand): RegistrarUsuarioResult {
    validarNoExisteEmail(command.email)
    val usuario = crearUsuario(command)
    persistirUsuario(usuario)
    notificarRegistro(usuario)
    return RegistrarUsuarioResult.Exito(usuario.id)
}
// Cada función delegada hace UNA cosa clara
```

**Reglas de Clean Functions:**
- ≤ 20 líneas por función (idealmente ≤ 10)
- Un nivel de abstracción por función (no mezclar lógica de negocio con strings hardcodeados de SQL)
- ≤ 3 parámetros (si necesitas más → usar un `data class` / `record`)
- Sin efectos secundarios ocultos (función `validar` que modifica estado → confunde)
- **Sin Flag Arguments**: `fun procesar(esAdmin: Boolean)` → dos funciones: `procesarAdmin()` y `procesarUsuario()`

---

### 3️⃣ Comentarios: Solo Cuando el Código No Puede Explicarse

> **"El código debe ser su propia documentación."**

```kotlin
// ❌ Comentario que repite el código
// Guarda el usuario en el repositorio
usuarioRepository.save(usuario)

// ❌ Comentario "por si acaso"
// TODO: hay que arreglar esto algún día
if (x != null) { /* por ahora ignoramos */ }

// ✅ Comentario que explica el POR QUÉ (no el QUÉ)
// BCrypt con cost=12: balance entre seguridad y timing de respuesta (~300ms en hardware promedio)
// Valores < 10 son inseguros; valores > 14 degradan la UX en login
val hash = passwordHashService.hash(password, cost = 12)

// ✅ Comentario de intención de negocio no obvia
// El token de refresh se emite con 7 días de TTL pero se invalida en BD al primer uso
// (Refresh Token Rotation: ver ADR-SEC-001)
val refreshToken = tokenService.emitirRefreshToken(usuario.id, Duration.ofDays(7))
```

---

### 4️⃣ Clases SOLID y Cohesivas

```kotlin
// Checklist para una clase bien diseñada:
// ✅ ≤ 200 líneas (señal de alerta, no límite absoluto)
// ✅ ≤ 10 métodos públicos
// ✅ Todos los métodos usan la mayoría de los campos de la clase (alta cohesión)
// ✅ Constructor injection (sin @Autowired en campos — testeable)
// ✅ `class` final por defecto en Kotlin (no necesita `final`)
// ✅ `val` en lugar de `var` cuando sea posible (inmutabilidad)

// ❌ Baja cohesión — la clase tiene campos que solo usos algunos métodos
class UsuarioServicioGdios(
    private val repo: UsuarioRepository,
    private val smtp: SmtpSender,          // ← solo lo usa notificar()
    private val csvExporter: CsvExporter,  // ← solo lo usa exportar()
    private val auditLog: AuditLogger      // ← solo lo usa auditar()
) { /* 500 líneas */ }

// ✅ Alta cohesión — todos los campos son usados por todos/mayoría de métodos
class RegistrarUsuarioService(
    private val usuarioRepository: UsuarioRepository,
    private val passwordHashService: PasswordHashService
) {
    fun execute(command: RegistrarUsuarioCommand): RegistrarUsuarioResult { /* usa repo y hashService */ }
    fun verificarDisponibilidadEmail(email: Email): Boolean { /* usa repo */ }
}
```

---

### 5️⃣ Code Smells — Catálogo y Recetas de Refactoring

| Smell | Síntoma | Refactoring |
|---|---|---|
| **Long Method** | Función > 20 líneas | Extract Method |
| **Large Class** | Clase > 200 líneas | Extract Class, Move Method |
| **Long Parameter List** | Función con > 3 params | Introduce Parameter Object (`data class`/`record`) |
| **Duplicate Code** | Bloques idénticos en 2+ lugares | Extract Method, Extract Class |
| **Feature Envy** | Función que usa más métodos de otra clase que de la propia | Move Method |
| **Data Clumps** | Grupos de variables que siempre van juntas | Extract Class / Value Object |
| **Primitive Obsession** | `String email`, `String telefono`, `Long usuarioId` expuestos directamente | Replace Primitive with Value Object |
| **Switch/When Statements** | `when (tipo) { ... }` que crece | Replace Conditional with Polymorphism / Strategy |
| **Lazy Class** | Clase con < 3 métodos que no justifica su existencia | Inline Class |
| **God Class** | Clase que lo hace todo | Extract Class, Apply SRP |
| **Shotgun Surgery** | Un cambio requiere editar N clases | Move Method, Combine Functions into Class |
| **Inappropriate Intimacy** | Clase A accede a campos privados de B | Move Method, Extract Class |

**Primitive Obsession — el más común en backends Kotlin/Java:**
```kotlin
// ❌ Primitive Obsession
fun buscarPedido(pedidoId: UUID, usuarioId: UUID): Pedido? { ... }
fun crearFactura(monto: Double, moneda: String, email: String): Factura { ... }

// ✅ Value Objects — tipado semántico, validaciones en constructor
fun buscarPedido(pedidoId: PedidoId, propietarioId: UsuarioId): Pedido? { ... }
fun crearFactura(monto: Monto, destinatario: Email): Factura { ... }
```

---

## 🧠 PARTE 3 — UNIT TEST DESIGN

### 1️⃣ Principios FIRST

| Principio | Definición | Cómo verificarlo |
|---|---|---|
| **F**ast | Un test unitario < 100ms. Suite completa < 30 segundos | Ningún `Thread.sleep()`, ninguna BD real |
| **I**ndependent | Los tests no dependen entre sí. Orden de ejecución no importa | Sin estado compartido entre tests; `@BeforeEach` reinicia el estado |
| **R**epeatable | Mismo resultado en cualquier entorno (local, CI, cualquier hora) | Sin `Instant.now()` hardcodeado; sin dependencia de red |
| **S**elf-validating | Pasa o falla sin revisión manual | Assertions explícitas; no `println` |
| **T**imely | Tests escritos ANTES del código (TDD) o muy cerca | Red-Green-Refactor |

---

### 2️⃣ Naming: ``should [result] when [context]``

```kotlin
// ✅ Kotlin — backtick + Given-When-Then en nombre
class RegistrarUsuarioServiceTest {

    @Test
    fun `debe retornar Exito cuando el email no existe en el sistema`() { ... }

    @Test
    fun `debe retornar EmailDuplicado cuando el email ya fue registrado`() { ... }

    @Test
    fun `debe hashear el password antes de persistir el usuario`() { ... }

    @Test
    fun `no debe persistir el usuario si el hashing falla`() { ... }
}
```

```java
// Java — shouldDoWhenContext
class RegistrarUsuarioServiceTest {
    @Test void shouldReturnExitoWhenEmailDoesNotExist() { ... }
    @Test void shouldReturnEmailDuplicadoWhenEmailAlreadyRegistered() { ... }
    @Test void shouldHashPasswordBeforePersisting() { ... }
}
```

```csharp
// C# — Should_Result_When_Context (o con [DisplayName])
public class RegistrarUsuarioHandlerTests {
    [Fact]
    [DisplayName("Debe retornar Exito cuando el email no existe")]
    public async Task Should_ReturnExito_When_EmailDoesNotExist() { ... }
}
```

---

### 3️⃣ Patrón AAA — Arrange, Act, Assert

```kotlin
// ✅ AAA explícito (3 secciones con línea en blanco)
@Test
fun `debe calcular descuento del 10 pct para pedido de estudiante`() {
    // Arrange
    val pedido = Pedido(monto = Monto(BigDecimal("100.00"), Moneda.USD))
    val politica = descuentoEstudiante

    // Act
    val descuento = politica.calcular(pedido)

    // Assert
    assertThat(descuento.valor).isEqualByComparingTo(BigDecimal("10.00"))
}
```

**Reglas AAA:**
- **Arrange**: solo setup. Sin lógica condicional. Sin assertions.
- **Act**: una sola invocación al método bajo prueba (SUT). Si necesitas dos llamadas → dos tests.
- **Assert**: verificar uno o dos resultados relacionados. Múltiples `assertThat` sobre el mismo objeto está bien; verificar comportamientos completamente distintos → dividir en 2 tests.

---

### 4️⃣ Test Doubles — Cuándo Usar Cada Uno

| Double | Definición | Cuándo usarlo | Kotlin (MockK) | Java (Mockito) | C# (Moq/NSubstitute) |
|---|---|---|---|---|---|
| **Dummy** | Objeto pasado pero nunca usado | Parámetros requeridos que no afectan el test | `mockk()` sin configurar | `mock(X.class)` sin `when` | `Substitute.For<T>()` sin setup |
| **Stub** | Devuelve valores predefinidos | Simular respuesta de una dependencia (port) | `every { repo.findById(any()) } returns null` | `when(repo.findById(any())).thenReturn(null)` | `_repo.FindById(Arg.Any<Id>()).Returns(null)` |
| **Mock** | Verifica que fue llamado (comportamiento) | Verificar que se publicó un evento, se guardó, se envió email | `verify { repo.save(any()) }` | `verify(repo).save(any())` | `_repo.Received(1).Save(Arg.Any<T>())` |
| **Spy** | Objeto real con algunos métodos sobreescritos | Cuando la implementación real es deseable excepto un método secundario | `spyk(objetoReal)` | `spy(objetoReal)` | Raro en C#; usar partial mock |
| **Fake** | Implementación alternativa simple (en memoria) | Repositorios en memoria para tests de dominio/application sin BD | `InMemoryUsuarioRepository()` class manually | `InMemoryUsuarioRepository()` | `InMemoryUsuarioRepository()` |

**Regla de oro**: En tests de dominio, preferir **Fake** (implementación en memoria) sobre Mock. Los tests del dominio deben ser tan simples que no necesiten mocking.

```kotlin
// ✅ Fake Repository — Kotlin idiomático para tests
class InMemoryUsuarioRepository : UsuarioRepository {
    private val store = mutableMapOf<UsuarioId, Usuario>()

    override fun findById(id: UsuarioId) = store[id]
    override fun findByEmail(email: Email) = store.values.firstOrNull { it.email == email }
    override fun save(usuario: Usuario) { store[usuario.id] = usuario }
    override fun delete(id: UsuarioId) { store.remove(id) }
    override fun existsByEmail(email: Email) = store.values.any { it.email == email }
}

// ✅ Test del Application Service con Fake (sin MockK ni Mockito)
class RegistrarUsuarioServiceTest {
    private val usuarioRepository = InMemoryUsuarioRepository()
    private val passwordHashService = FakePasswordHashService()          // hash = "hashed_${raw}"
    private val notificacionService = FakeNotificacionService()          // guarda en lista

    private val service = RegistrarUsuarioService(usuarioRepository, passwordHashService, notificacionService)

    @Test
    fun `debe registrar usuario y notificar cuando datos son validos`() {
        // Arrange
        val command = RegistrarUsuarioCommand(
            email = Email("nuevo@zenapses.com"),
            password = Password("S3cure!Pass"),
            nombre = NombreCompleto("Juan", "Pérez")
        )

        // Act
        val resultado = service.execute(command)

        // Assert
        assertThat(resultado).isInstanceOf(RegistrarUsuarioResult.Exito::class.java)
        val exito = resultado as RegistrarUsuarioResult.Exito
        assertThat(usuarioRepository.findById(exito.usuarioId)).isNotNull
        assertThat(notificacionService.notificacionesEnviadas).hasSize(1)
    }

    @Test
    fun `debe retornar EmailDuplicado cuando el email ya existe`() {
        // Arrange
        val email = Email("existente@zenapses.com")
        usuarioRepository.save(UsuarioMother.activoConEmail(email))
        val command = RegistrarUsuarioCommand(email, Password("P@ss!123"), NombreCompleto("X", "Y"))

        // Act
        val resultado = service.execute(command)

        // Assert
        assertThat(resultado).isInstanceOf(RegistrarUsuarioResult.EmailDuplicado::class.java)
        // Verificar que NO se persistió un segundo usuario
        assertThat(usuarioRepository.contarPorEmail(email)).isEqualTo(1)
    }
}
```

---

### 5️⃣ Object Mother — Datos de Test Expresivos

```kotlin
// ✅ Object Mother — Kotlin con parámetros por defecto (evita explosión de métodos)
object UsuarioMother {
    fun activo(
        id: UsuarioId = UsuarioId.generate(),
        email: Email = Email("usuario@zenapses.com"),
        nombre: NombreCompleto = NombreCompleto("Test", "User"),
        rol: RolUsuario = RolUsuario.ESTUDIANTE
    ) = Usuario.reconstituir(id, email, Password("hashed_secret"), nombre, rol, EstadoUsuario.ACTIVO, Instant.now())

    fun suspendido(email: Email = Email("suspendido@zenapses.com")) =
        activo(email = email).also { it.suspender("Motivo test") }

    fun admin() = activo(rol = RolUsuario.ADMIN, email = Email("admin@zenapses.com"))
}

// Uso expresivo en tests:
val usuario = UsuarioMother.activo()
val admin = UsuarioMother.admin()
val usuarioSuspendido = UsuarioMother.suspendido()
val usuarioConEmailEspecifico = UsuarioMother.activo(email = Email("juan@empresa.com"))
```

**Java 21 — Object Mother con Records:**
```java
public final class UsuarioMother {
    public static Usuario activo() {
        return Usuario.reconstituir(UsuarioId.generate(), Email.of("test@zenapses.com"),
            Password.hashed("secret"), NombreCompleto.of("Test", "User"),
            RolUsuario.ESTUDIANTE, EstadoUsuario.ACTIVO, Instant.now());
    }
    public static Usuario admin() {
        return Usuario.reconstituir(UsuarioId.generate(), Email.of("admin@zenapses.com"),
            Password.hashed("secret"), NombreCompleto.of("Admin", "User"),
            RolUsuario.ADMIN, EstadoUsuario.ACTIVO, Instant.now());
    }
}
```

**C#/.NET — Object Mother:**
```csharp
public static class UsuarioMother
{
    public static Usuario Activo(
        UsuarioId? id = null,
        Email? email = null,
        RolUsuario rol = RolUsuario.Estudiante)
    => Usuario.Reconstituir(
        id ?? UsuarioId.Generate(),
        email ?? Email.From("test@zenapses.com"),
        Password.Hashed("secret_hash"),
        NombreCompleto.From("Test", "User"),
        rol,
        EstadoUsuario.Activo,
        DateTimeOffset.UtcNow);

    public static Usuario Admin() => Activo(rol: RolUsuario.Admin, email: Email.From("admin@zenapses.com"));
    public static Usuario Suspendido() { var u = Activo(); u.Suspender("Motivo test"); return u; }
}
```

---

## ⚠️ ANTI-PATTERNS — NUNCA HACER

| Anti-pattern | Consecuencia | Solución |
|---|---|---|
| Test que prueba los mocks, no el comportamiento | Test que siempre pasa aunque el código esté roto | Verificar el resultado (output), no la interacción interna |
| Nombres de test como `test1()`, `testRegistrar()` | Imposible saber qué comportamiento falla | Nombre descriptivo: `debe X cuando Y` |
| Test con múltiples Acts | Imposible saber cuál acción causó el fallo | Un Act por test |
| Comentarios que explican el QUÉ del código | El código debería ser su propia documentación | Refactorizar renombrando; comentar solo el POR QUÉ |
| Función con `Boolean` flag argument | `procesarPago(true)` — ¿qué significa `true`? | Dos funciones con nombres descriptivos |
| SOLID: usar herencia de implementación en lugar de composición | Acoplamiento frágil, Shotgun Surgery al cambiar la base | Prefer composition over inheritance |
| Primitive Obsession en IDs: `fun buscar(id: Long)` | Pasar `productoId` donde se espera `usuarioId` — error en compilación nunca, error en runtime siempre | `@JvmInline value class UsuarioId(val value: UUID)` |
| Test que llama `@SpringBootTest` para una clase de dominio | Test de dominio que tarda 30 segundos en arrancar | Domain tests son pure Kotlin; sin Spring |
| Mock de la clase bajo prueba (SUT) | No testeas el código real | Nunca mockear el SUT, solo sus dependencias |
| Clase con > 200 líneas sin refactorizar | Dificultad para leer, entender y extender | Extract Class, Extract Method, Move Method |

---

## ✅ CHECKLIST CLEAN CODE + SOLID + TESTS — REVISIÓN DE PR

Antes de considerar una implementación lista para PR:

**Clean Code:**
- [ ] ¿Los nombres de clases, funciones y variables revelan su intención sin comentarios adicionales?
- [ ] ¿Las funciones tienen ≤ 20 líneas y hacen una sola cosa?
- [ ] ¿Las funciones tienen ≤ 3 parámetros? Si tienen más, ¿se usó un Command/ParameterObject?
- [ ] ¿Se eliminaron comentarios que solo repiten el código?
- [ ] ¿El código no tiene Primitive Obsession? (IDs tipados, Value Objects para conceptos de dominio)

**SOLID:**
- [ ] ¿Cada clase tiene una única razón para cambiar (SRP)?
- [ ] ¿El código usa Strategy/polimorfismo en lugar de `when`/`switch` que crecen (OCP)?
- [ ] ¿Las subclases o implementaciones respetan los contratos de sus abstracciones (LSP)?
- [ ] ¿Las interfaces son pequeñas y cohesivas, sin métodos que los clientes no usen (ISP)?
- [ ] ¿Los módulos de alto nivel dependen de abstracciones (Ports), no de implementaciones (Adapters) (DIP)?

**Unit Tests:**
- [ ] ¿Los tests de dominio son pure Kotlin/Java/C# sin ningún framework de inyección?
- [ ] ¿Los nombres de tests siguen el patrón `should/debe X when/cuando Y`?
- [ ] ¿Cada test tiene exactamente un Act (una sola invocación del SUT)?
- [ ] ¿Los tests verifican comportamiento de negocio, no interacciones internas (no over-mocking)?
- [ ] ¿Existe un Object Mother o Test Data Builder para los estados reutilizables de dominio?
- [ ] ¿Los tests son FIRST: Fast, Independent, Repeatable, Self-Validating, Timely?
