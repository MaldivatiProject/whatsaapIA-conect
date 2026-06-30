# 🔐 SKILL: BOLA PREVENTION — BROKEN OBJECT LEVEL AUTHORIZATION

**skill_id**: security-bola-prevention-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: security  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-aspnet-core-senior, prompt-dev-backend-go  
**dependencias**: ninguna (skill autónoma de seguridad)  
**referencia_owasp**: OWASP API Security Top 10 — API1:2023 Broken Object Level Authorization

---

## 📌 Propósito de la Skill

BOLA (Broken Object Level Authorization), también conocido como IDOR (Insecure Direct Object Reference) para APIs, es la **vulnerabilidad #1 del OWASP API Security Top 10 (API1:2023)**. Ocurre cuando un endpoint acepta un ID de objeto en la petición y únicamente valida que el usuario esté autenticado, sin verificar que tenga **autorización sobre ese objeto específico**. Esta skill equipa al agente para detectar, prevenir y testear sistemáticamente BOLA en toda implementación de API REST.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

1. **Nunca confíes en el ID del cliente** — El token de autenticación es la única fuente de verdad de la identidad del solicitante. Cualquier ID de propietario/usuario en el request body o query param es un dato no confiable.

2. **El check de autorización vive en la Application Layer** — La verificación de propiedad/acceso sobre un recurso es parte de la lógica de negocio. No debe delegarse al controlador HTTP, ni a un filtro global, ni al repositorio de forma implícita.

3. **Ownership-Aware Queries > Load-Then-Check** — La estrategia más segura y eficiente es filtrar en la consulta: `findByIdAndOwnerId(resourceId, callerId)`. Si el registro no existe O no pertenece al usuario, el resultado es el mismo: recurso no encontrado. Esto evita race conditions y es inatacable.

4. **UUID v4 obligatorio para IDs públicos** — Los IDs secuenciales (1, 2, 3…) habilitan ataques de enumeración incluso antes de explotar BOLA. Todo ID expuesto en la API debe ser un UUID v4 no predecible.

5. **Responder 403, no 404, cuando hay acceso no autorizado a un recurso existente** — Devolver 404 para ocultar la existencia del recurso es una práctica defensiva válida (security through obscurity) pero solo si se aplica de forma consistente. Si el sistema ya expone otros indicadores que revelan la existencia del objeto, prefiere 403 para auditing claro. Nunca devolver 200 con datos vacíos.

6. **El check debe ejecutarse en TODOS los canales de entrada** — BOLA no es un problema solo de HTTP. Si un Aggregate se puede modificar vía Kafka Consumer, Scheduler o cualquier otro Adapter, el Application Service siempre debe validar la autorización antes de ejecutar.

---

### Técnicas y Patrones

#### PATRÓN 1: Ownership-Aware Repository (más seguro)

Filtrar la propiedad directamente en la query elimina la posibilidad de un race condition entre `load` y `check`.

**Kotlin + Spring Data:**
```kotlin
// domain/repository/PedidoRepository.kt  ← Port (solo Kotlin puro)
interface PedidoRepository {
    fun findByIdAndPropietario(id: PedidoId, propietario: UsuarioId): Pedido?
    fun findAllByPropietario(propietario: UsuarioId, pagina: Int, tamaño: Int): List<Pedido>
}

// infrastructure/adapter/out/persistence/PedidoJpaRepository.kt
interface PedidoJpaRepository : JpaRepository<PedidoJpaEntity, UUID> {
    // Spring Data genera el WHERE automáticamente — CERO SQL nativo
    fun findByIdAndPropietarioId(id: UUID, propietarioId: UUID): PedidoJpaEntity?
    fun findAllByPropietarioId(propietarioId: UUID, pageable: Pageable): Page<PedidoJpaEntity>
}
```

**Java + Spring Data:**
```java
// infrastructure adapter
public interface PedidoJpaRepository extends JpaRepository<PedidoJpaEntity, UUID> {
    Optional<PedidoJpaEntity> findByIdAndPropietarioId(UUID id, UUID propietarioId);
    Page<PedidoJpaEntity> findAllByPropietarioId(UUID propietarioId, Pageable pageable);
}
```

**.NET Core + EF Core:**
```csharp
// Infrastructure/Persistence/PedidoRepository.cs
public async Task<Pedido?> FindByIdAndOwnerAsync(PedidoId id, UsuarioId ownerId)
    => await _context.Pedidos
        .Where(p => p.Id == id.Value && p.PropietarioId == ownerId.Value)
        .Select(p => p.ToDomain())
        .FirstOrDefaultAsync();
```

---

#### PATRÓN 2: Command con Identidad del Solicitante (obligatorio)

Todo Command que acceda a un recurso específico **debe incluir el ID del solicitante** como campo no mutable, extraído del contexto de seguridad.

**Kotlin:**
```kotlin
// application/command/ActualizarPedidoCommand.kt
data class ActualizarPedidoCommand(
    val pedidoId: PedidoId,
    val solicitadoPor: UsuarioId,  // ← SIEMPRE presente, nunca opcional
    val nuevoEstado: EstadoPedido
)

// infrastructure/adapter/in/rest/PedidoController.kt
@PostMapping("/actualizar")
fun actualizar(
    @Valid @RequestBody request: ActualizarPedidoRequest,
    authentication: Authentication  // ← Spring Security inyecta, NUNCA viene del cliente
): ResponseEntity<PedidoResponse> {
    val solicitanteId = UsuarioId.from(authentication.name) // extrae del JWT
    val result = actualizarPedidoUseCase.execute(
        ActualizarPedidoCommand(
            pedidoId = PedidoId.from(request.pedidoId),
            solicitadoPor = solicitanteId,  // ← del token, nunca del body
            nuevoEstado = EstadoPedido.from(request.estado)
        )
    )
    return when (result) {
        is ActualizarPedidoResult.Exito      -> ResponseEntity.ok(PedidoResponse.from(result.pedido))
        is ActualizarPedidoResult.NoAutorizado -> ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        is ActualizarPedidoResult.NoEncontrado -> ResponseEntity.notFound().build()
    }
}
```

**Java:**
```java
// Controller
@PostMapping("/actualizar")
public ResponseEntity<PedidoResponse> actualizar(
        @Valid @RequestBody ActualizarPedidoRequest request,
        Authentication authentication) {

    var solicitanteId = UsuarioId.from(authentication.getName()); // del JWT
    var command = new ActualizarPedidoCommand(
        PedidoId.from(request.pedidoId()),
        solicitanteId,                // nunca del body
        EstadoPedido.from(request.estado())
    );
    return switch (actualizarPedidoUseCase.execute(command)) {
        case ActualizarPedidoResult.Exito r       -> ResponseEntity.ok(PedidoResponse.from(r.pedido()));
        case ActualizarPedidoResult.NoAutorizado r -> ResponseEntity.status(403).build();
        case ActualizarPedidoResult.NoEncontrado r -> ResponseEntity.notFound().build();
    };
}
```

**.NET Core:**
```csharp
// Controller
[HttpPost("actualizar")]
public async Task<IActionResult> Actualizar(
    [FromBody] ActualizarPedidoRequest request)
{
    var solicitanteId = UsuarioId.From(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var command = new ActualizarPedidoCommand(
        PedidoId: PedidoId.From(request.PedidoId),
        SolicitadoPor: solicitanteId,   // del claim, nunca del body
        NuevoEstado: EstadoPedido.From(request.Estado)
    );
    return await _mediator.Send(command) switch
    {
        ActualizarPedidoResult.Exito r       => Ok(PedidoResponse.From(r.Pedido)),
        ActualizarPedidoResult.NoAutorizado  => Forbid(),
        ActualizarPedidoResult.NoEncontrado  => NotFound()
    };
}
```

---

#### PATRÓN 3: BOLA Check en Application Service

Cuando el Patrón 1 no es aplicable (repositorios legacy, queries complejas), el check se hace en el Application Service, **nunca en el Controller**.

**Kotlin:**
```kotlin
// application/service/ObtenerPedidoService.kt
@Service
class ObtenerPedidoService(
    private val pedidoRepository: PedidoRepository
) : ObtenerPedidoUseCase {

    override fun execute(command: ObtenerPedidoCommand): ObtenerPedidoResult {
        val pedido = pedidoRepository.findById(command.pedidoId)
            ?: return ObtenerPedidoResult.NoEncontrado

        // ✅ BOLA CHECK — en Application Layer, no en Controller
        if (!pedido.perteneceA(command.solicitadoPor) && !command.solicitadoPor.esAdmin()) {
            // ⚠️ Retorna NoAutorizado, que el controller mapea a 403
            // NO retornar NoEncontrado aquí si el sistema ya revela la existencia del objeto
            return ObtenerPedidoResult.NoAutorizado
        }

        return ObtenerPedidoResult.Encontrado(pedido)
    }
}

// domain/model/Pedido.kt
fun perteneceA(usuario: UsuarioId): Boolean = this.propietarioId == usuario
```

---

#### PATRÓN 4: Tests de BOLA (obligatorios en TDD)

Los tests de BOLA verifican el **cruce de fronteras entre usuarios**. Sin estos tests, no hay garantía.

**Kotlin + MockK:**
```kotlin
class ObtenerPedidoServiceTest {

    private val pedidoRepository = mockk<PedidoRepository>()
    private val service = ObtenerPedidoService(pedidoRepository)

    @Test
    fun `BOLA - usuario B no puede acceder al pedido de usuario A`() {
        val usuarioA = UsuarioId.generate()
        val usuarioB = UsuarioId.generate()
        val pedidoDeA = Pedido.crear(propietario = usuarioA, /* ... */)

        every { pedidoRepository.findById(pedidoDeA.id) } returns pedidoDeA

        val command = ObtenerPedidoCommand(
            pedidoId = pedidoDeA.id,
            solicitadoPor = usuarioB  // ← B intenta acceder al recurso de A
        )

        val result = service.execute(command)

        assertThat(result).isInstanceOf(ObtenerPedidoResult.NoAutorizado::class.java)
    }

    @Test
    fun `BOLA - usuario propietario accede a su propio pedido`() {
        val propietario = UsuarioId.generate()
        val pedido = Pedido.crear(propietario = propietario, /* ... */)

        every { pedidoRepository.findById(pedido.id) } returns pedido

        val result = service.execute(ObtenerPedidoCommand(pedido.id, propietario))

        assertThat(result).isInstanceOf(ObtenerPedidoResult.Encontrado::class.java)
    }
}
```

**Java:**
```java
@Test
void bola_usuarioBNoPuedeAccederAlPedidoDeA() {
    var usuarioA = UsuarioId.generate();
    var usuarioB = UsuarioId.generate();
    var pedidoDeA = Pedido.crear(usuarioA, /* ... */);

    when(pedidoRepository.findById(pedidoDeA.id())).thenReturn(Optional.of(pedidoDeA));

    var command = new ObtenerPedidoCommand(pedidoDeA.id(), usuarioB);
    var result = service.execute(command);

    assertThat(result).isInstanceOf(ObtenerPedidoResult.NoAutorizado.class);
}
```

**.NET Core:**
```csharp
[Fact]
public void Bola_UsuarioBNoPuedeAccederAlPedidoDeA()
{
    var usuarioA = UsuarioId.Generate();
    var usuarioB = UsuarioId.Generate();
    var pedidoDeA = Pedido.Crear(usuarioA, /* ... */);

    _pedidoRepositoryMock.Setup(r => r.FindById(pedidoDeA.Id)).Returns(pedidoDeA);

    var command = new ObtenerPedidoCommand(pedidoDeA.Id, SolicitadoPor: usuarioB);
    var result = _service.Execute(command);

    result.Should().BeOfType<ObtenerPedidoResult.NoAutorizado>();
}
```

---

### Estándares de Referencia

| Referencia | Aplicación |
|------------|------------|
| **OWASP API Security Top 10 — API1:2023** | Definición canónica de BOLA con ejemplos y vectores de ataque |
| **OWASP ASVS v4 — §4 Access Control** | Verificación formal: ASVS 4.1.1, 4.1.2, 4.1.3 (object-level authorization) |
| **CWE-639: Authorization Bypass Through User-Controlled Key** | Taxonomía estándar del defecto |
| **OWASP Top 10 Web — A01:2021 Broken Access Control** | Superset que incluye BOLA para APIs web |

---

## ✅ Criterios de Aplicación (cuándo aplicar esta skill)

- Cualquier endpoint que recibe un ID de recurso (UUID, número, slug) en request body, path o query params.
- Operaciones CRUD sobre recursos que pertenecen a un usuario/tenant específico.
- APIs multi-tenant donde los datos de diferentes organizaciones conviven en la misma base de datos.
- Endpoints de descarga de archivos, exportación de reportes, o visualización de documentos.
- Cualquier flujo donde el usuario puede acceder a datos propios: órdenes, facturas, tickets, perfiles.

## ❌ Anti-patrones (errores a evitar)

- ❌ **Load-then-check en Controller**: `if (recurso.ownerId != userId) return 403` — el check pertenece al Application Service.
- ❌ **userId en request body**: `{ "userId": "abc123", "pedidoId": "xyz" }` — el `userId` siempre proviene del JWT, nunca del cliente.
- ❌ **IDs secuenciales en APIs públicas**: `GET /pedidos/1001` — usar UUID v4.
- ❌ **Un solo test de autorización por módulo**: cada operación (read, update, delete) necesita su propio test BOLA.
- ❌ **BOLA solo en HTTP**: si el mismo Application Service es invocado por un Kafka Consumer, el check debe ejecutarse igual.
- ❌ **Retornar 200 con lista vacía** en vez de 403/404 cuando el recurso existe pero el usuario no tiene acceso.
- ❌ **@PreAuthorize con solo verificación de rol** sin verificar ownership del objeto específico:
  ```kotlin
  // ❌ INSUFICIENTE — verifica rol pero no ownership del pedido
  @PreAuthorize("hasRole('USER')")
  fun obtenerPedido(id: UUID): Pedido
  
  // ✅ CORRECTO — la verificación de ownership va en el Application Service
  fun obtenerPedido(id: UUID, authentication: Authentication): ResponseEntity<*>
  ```
- ❌ **Confiar en `@PathVariable` sin contexto de autenticación**:
  ```kotlin
  // ❌ BOLA — cualquier usuario autenticado accede al recurso de cualquier otro
  @PostMapping("/pedido/detalle")
  fun detalle(@RequestBody req: DetallePedidoRequest): PedidoResponse =
      pedidoService.buscarPorId(PedidoId.from(req.pedidoId)) // sin verificar propietario
  ```

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Escenario BOLA básico — consulta de recurso propio

**Contexto**: Un usuario solicita ver el detalle de una factura.

**Vector de ataque**: El usuario `u1` cambia el `facturaId` en el request por un ID que corresponde a `u2`.

**Entrada**:
```json
POST /api/v1/facturas/detalle
Authorization: Bearer <token-u1>
{ "facturaId": "550e8400-e29b-41d4-a716-446655440000" }  ← ID de factura de u2
```

**Implementación segura (Kotlin)**:
```kotlin
// Application Service
override fun execute(command: ObtenerFacturaCommand): ObtenerFacturaResult {
    // Patrón 1: Ownership-Aware Query (la más segura)
    val factura = facturaRepository.findByIdAndPropietario(
        id = command.facturaId,
        propietario = command.solicitadoPor  // del JWT, no del body
    ) ?: return ObtenerFacturaResult.NoEncontrado  // 404 — no existe O no es del usuario

    return ObtenerFacturaResult.Encontrada(factura)
}
```

**Salida**: `404 Not Found` — la factura existe, pero como no pertenece a `u1`, el query retorna null. El atacante no puede inferir si el recurso existe.

---

### Ejemplo 2: Escenario BOLA en API multi-tenant

**Contexto**: Una empresa SaaS donde cada organización (tenant) tiene sus propios proyectos.

**Implementación segura (Java)**:
```java
// domain/model/Proyecto.java
public record Proyecto(ProyectoId id, TenantId tenantId, String nombre) {
    public boolean pertenece(TenantId tenant) {
        return this.tenantId.equals(tenant);
    }
}

// application/service/ActualizarProyectoService.java
@Override
public ActualizarProyectoResult execute(ActualizarProyectoCommand command) {
    var proyecto = proyectoRepository.findById(command.proyectoId())
        .orElse(null);
    if (proyecto == null) return ActualizarProyectoResult.noEncontrado();

    // BOLA CHECK multi-tenant — tenantId extraído del JWT
    if (!proyecto.pertenece(command.tenantId())) {
        return ActualizarProyectoResult.noAutorizado();
    }

    // ... lógica de actualización
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente línea en la sección `SKILLS ACTIVAS`:

```markdown
SKILL ACTIVA: bola-prevention-senior → ver: 2-agents/zns-tools/skills/bola-prevention-senior.skill.md
```

Y en la tabla de resumen de skills aplicadas:

```markdown
| `bola-prevention-senior` | BOLA/IDOR: ID del solicitante siempre del JWT nunca del body; ownership-aware queries; BOLA check en Application Service; tests de cruce de usuario obligatorios; UUID v4 para IDs públicos |
```

Y añade la siguiente sección en el agente, preferiblemente dentro del bloque de seguridad:

```markdown
### 🛡️ BOLA — BROKEN OBJECT LEVEL AUTHORIZATION (API1:2023 OWASP API Security)

**Regla absoluta:** El ID del solicitante (`solicitadoPor`) SIEMPRE se extrae del JWT/token de seguridad, NUNCA del request body ni de query params del cliente.

**Checklist obligatorio por endpoint que recibe un ID de recurso:**
- [ ] ¿El Command incluye `solicitadoPor: UsuarioId/TenantId` extraído del contexto de seguridad?
- [ ] ¿El repositorio usa `findByIdAndOwner(id, ownerId)` O el Application Service hace el check de ownership?
- [ ] ¿El resultado al no tener acceso es `NoAutorizado` → HTTP 403 (o 404 consistente)?  
- [ ] ¿El ID del recurso es UUID v4 (no secuencial)?
- [ ] ¿Existe un test que verifica que usuario B NO puede acceder al recurso de usuario A?
- [ ] ¿El check se aplica también en canales no-HTTP (Kafka consumers, schedulers)?
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Tests BOLA por recurso sensible | ≥ 2 (acceso propio ✅ + acceso cruzado ❌) |
| IDs públicos sequential | 0 — todos UUID v4 |
| Commands sin campo `solicitadoPor` para recursos con ownership | 0 |
| Application Services con load-then-check en controlador | 0 |
| Vulnerabilidades BOLA en OWASP Dependency/SAST scan | 0 Critical |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — BOLA Prevention Senior (API1:2023 OWASP API Security Top 10)  
  Cobertura: Kotlin+SpringBoot, Java+SpringBoot, .NET Core/C#  
  Patrones: Ownership-Aware Query, Command con solicitadoPor, BOLA Check en AppService, Tests TDD cross-user
