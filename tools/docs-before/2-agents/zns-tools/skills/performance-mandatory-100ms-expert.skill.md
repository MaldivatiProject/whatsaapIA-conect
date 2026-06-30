# ⚡ SKILL: PERFORMANCE MANDATORIO < 100 ms — EXPERT

**skill_id**: performance-mandatory-100ms-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / performance / sla  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior  
**dependencias**: cross-cutting-concerns-expert (provee `@Timed` Micrometer y `@Cacheable` Redis), cicd-expert (pipeline donde corren los tests de performance)  
**referencia_stack**: Spring Boot 3.4.x / Kotlin 2.1.20 / Java 21 / .NET 8 / Micrometer / OpenTelemetry / k6 / JMH / BenchmarkDotNet / Testcontainers / PostgreSQL 16 / Redis 7

---

## 📌 Propósito de la Skill

Esta skill establece el **SLA no negociable de performance para todos los endpoints de la plataforma ZNS**: el p95 de latencia de cualquier endpoint en producción **no puede superar los 100 ms** bajo la carga de referencia. Incluye:

- **SLA y umbrales cuantificados** por tipo de operación
- **Patrones de optimización** obligatorios: N+1 detection, índices, cache de segundo nivel, paginación
- **Micro-benchmarks** con JMH (Kotlin/Java) y BenchmarkDotNet (.NET) para lógica crítica
- **Tests de carga en CI** con k6 como gate de calidad no negociable
- **Observabilidad de performance**: métricas Micrometer por use case, Slow Query Log, alertas Prometheus

> **Regla de oro**: si un endpoint no pasa el test de performance en CI, **el Pipeline falla**. No se hace merge sin performance verde.

---

## 🧠 PARTE 1 — SLA Y UMBRALES ZNS

### Tabla de SLAs por tipo de operación

| Tipo de operación | p50 objetivo | **p95 máximo (SLA)** | p99 máximo | Medición |
|-------------------|-------------|----------------------|-----------|---------|
| GET / consulta simple (cacheada) | ≤ 5 ms | **≤ 15 ms** | ≤ 30 ms | k6 + Micrometer |
| GET / consulta simple (BD, índice) | ≤ 20 ms | **≤ 50 ms** | ≤ 80 ms | k6 + Micrometer |
| POST / comando de negocio (sin I/O externo) | ≤ 30 ms | **≤ 80 ms** | ≤ 120 ms | k6 + Micrometer |
| POST / comando con BD + Redis | ≤ 40 ms | **≤ 100 ms** | ≤ 150 ms | k6 + Micrometer |
| POST con I/O externo (HTTP a 3ero) | ≤ 80 ms | **≤ 200 ms** | ≤ 400 ms | k6 + Micrometer |
| Auth — login (Argon2id + JWT) | ≤ 150 ms | **≤ 300 ms** | ≤ 500 ms | k6 + Micrometer |
| Endpoints admin / backoffice | ≤ 100 ms | **≤ 300 ms** | ≤ 500 ms | k6 + Micrometer |

> **Nota sobre Auth**: Argon2id con `mem=64MB/iter=3` consume ~150 ms de CPU intencionalmente (protección fuerza bruta). Es el **único endpoint** con SLA > 100 ms. Todos los demás deben cumplir p95 ≤ 100 ms.

### Carga de referencia para tests

| Parámetro | Valor |
|-----------|-------|
| VUs (Virtual Users) concurrentes | 50 |
| Duración del test de stress | 60 segundos |
| Ramp-up | 10 s |
| Ramp-down | 10 s |
| Steady state | 40 s |
| Umbral de error máximo | < 1% |

---

## 🧠 PARTE 2 — PATRONES DE OPTIMIZACIÓN OBLIGATORIOS

### 2.1 Eliminación de N+1 queries

El problema N+1 es la causa #1 de degradación de performance silenciosa. Todo agente ZNS debe detectarlo y eliminarlo antes de cada merge.

```kotlin
// ❌ N+1: 1 query para lista + N queries para cada ítem
fun listarPedidosConLineas(usuarioId: UsuarioId): List<PedidoConLineas> {
    val pedidos = pedidoRepository.findAllByUsuario(usuarioId)  // 1 query
    return pedidos.map { pedido ->
        PedidoConLineas(pedido, lineaRepository.findByPedido(pedido.id))  // N queries
    }
}

// ✅ CORRECTO — JOIN FETCH / EntityGraph para relaciones obligatorias
@Query("""
    SELECT p FROM PedidoJpaEntity p
    JOIN FETCH p.lineas
    WHERE p.propietarioId = :propietarioId
""")
fun findAllByPropietarioWithLineas(@Param("propietarioId") propietarioId: UUID): List<PedidoJpaEntity>

// ✅ CORRECTO — @EntityGraph para relaciones opcionales (evita cartesian product en múltiples relaciones)
@EntityGraph(attributePaths = ["lineas", "descuentos"])
fun findByIdAndPropietarioId(id: UUID, propietarioId: UUID): Optional<PedidoJpaEntity>
```

```csharp
// ❌ N+1 — EF Core LazyLoading por defecto
var pedidos = _context.Pedidos.Where(p => p.PropietarioId == userId).ToList();  // 1 query
var con_lineas = pedidos.Select(p => new { p, p.Lineas }).ToList();             // N queries (lazy)

// ✅ CORRECTO — Include explícito
var pedidos = await _context.Pedidos
    .Where(p => p.PropietarioId == userId)
    .Include(p => p.Lineas)
    .Include(p => p.Descuentos)
    .AsNoTracking()  // ← obligatorio en consultas de solo lectura
    .ToListAsync(ct);

// ✅ OBLIGATORIO: AsNoTracking() en todos los endpoints de consulta que no van a mutar
```

**Herramienta de detección en tests**:

```kotlin
// Kotlin/Java — Hypersistence Utils para contar queries en tests
@Test
fun `no debe generar N+1 al listar pedidos con lineas`() {
    val contador = SQLStatementCountValidator.reset()

    // Act
    sut.execute(ListarPedidosQuery(usuarioId = testUsuarioId, pagina = 0, tamaño = 20))

    // Assert — exactamente 1 query SELECT
    SQLStatementCountValidator.assertSelectCount(1)
}
```

```csharp
// .NET — ef-core-query-logger + xUnit para contar queries
[Fact]
public async Task No_debe_generar_N1_al_listar_pedidos()
{
    var queryCount = 0;
    _context.Database.Log = _ => queryCount++;  // o usar ILoggerFactory con filtro

    await _handler.Handle(new ListarPedidosQuery(UsuarioId: _testUsuarioId), CancellationToken.None);

    Assert.Equal(1, queryCount);  // exactamente 1 SELECT
}
```

---

### 2.2 Índices de BD — obligatorios y verificados por tests

Todo campo usado en `WHERE`, `ORDER BY` o `JOIN` en los repositorios **debe tener un índice** en la migración Flyway/EF Core.

```sql
-- ✅ Índices obligatorios — definidos en migración Flyway V{N}__add_performance_indexes.sql

-- Lookups más frecuentes: email (login) y estado + propietario (listados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email
    ON usuarios (email);

CREATE INDEX IF NOT EXISTS idx_pedidos_propietario_estado
    ON pedidos (propietario_id, estado)
    WHERE estado != 'CANCELADO';  -- partial index: excluye cancelados (85% del volumen)

-- Cobertura para query común: no necesita acceder a tabla principal (index-only scan)
CREATE INDEX IF NOT EXISTS idx_pedidos_listado_cobertura
    ON pedidos (propietario_id, estado, created_at DESC)
    INCLUDE (id, total, moneda);

-- UUID v4: usar gen_random_uuid() — no secuencial, pero con índice BRIN para INSERTs masivos
CREATE INDEX IF NOT EXISTS idx_pedidos_created_brin
    ON pedidos USING BRIN (created_at);
```

**Verificación automática en CI con ArchUnit (Spring)**:

```kotlin
// test — verifica que todo acceso por email tenga índice declarado (vía Flyway scripts)
@Test
fun `el campo email debe tener indice unico en la migracion flyway`() {
    val migraciones = File("src/main/resources/db/migration")
        .walkTopDown()
        .filter { it.name.endsWith(".sql") }
        .map { it.readText() }
        .joinToString("\n")

    assertThat(migraciones)
        .contains("CREATE UNIQUE INDEX")
        .contains("email")
}
```

---

### 2.3 Paginación — obligatoria en todos los listados

**Ningún endpoint puede retornar colecciones no paginadas** cuando el volumen de datos puede crecer.

```kotlin
// ✅ CORRECTO — paginación con Slice (no Page) para mejor performance en grandes volúmenes
interface PedidoJpaRepository : JpaRepository<PedidoJpaEntity, UUID> {

    // Slice<T>: no ejecuta COUNT(*) — mejor para scroll infinito
    fun findByPropietarioIdAndEstado(
        propietarioId: UUID,
        estado: EstadoPedido,
        pageable: Pageable
    ): Slice<PedidoJpaEntity>

    // Page<T>: incluye COUNT(*) — usar solo cuando se necesita total para UI de paginación
    @Query("""
        SELECT p FROM PedidoJpaEntity p WHERE p.propietarioId = :propietarioId
    """)
    fun findPageByPropietario(
        @Param("propietarioId") propietarioId: UUID,
        pageable: Pageable
    ): Page<PedidoJpaEntity>
}

// Application Service — tamaño máximo forzado
@Transactional(readOnly = true)
override fun execute(query: ListarPedidosQuery): PageResponse<PedidoResumen> {
    val tamañoSeguro = query.tamaño.coerceAtMost(MAX_PAGE_SIZE)  // máximo 50 items
    val pageable = PageRequest.of(query.pagina, tamañoSeguro, Sort.by("createdAt").descending())
    return pedidoRepository.findPageByPropietario(query.usuarioId.value, pageable)
        .map(PedidoJpaEntity::toDomainResumen)
        .toPageResponse()
}

companion object {
    const val MAX_PAGE_SIZE = 50  // nunca > 50 items por página
}
```

```csharp
// ✅ CORRECTO — paginación EF Core con Skip/Take + total condicional
public async Task<PageResponse<PedidoResumen>> Handle(ListarPedidosQuery query, CancellationToken ct)
{
    const int maxPageSize = 50;
    var pageSize = Math.Min(query.PageSize, maxPageSize);

    var baseQuery = _context.Pedidos
        .Where(p => p.PropietarioId == query.UsuarioId.Value)
        .AsNoTracking();

    var total = await baseQuery.CountAsync(ct);  // solo si la UI necesita total
    var items = await baseQuery
        .OrderByDescending(p => p.CreatedAt)
        .Skip(query.Page * pageSize)
        .Take(pageSize)
        .Select(p => p.ToResumen())
        .ToListAsync(ct);

    return new PageResponse<PedidoResumen>(items, total, query.Page, pageSize);
}
```

---

### 2.4 Cache estratégico con Redis — cuándo y cómo

| Dato | ¿Cachear? | TTL sugerido | Estrategia |
|------|-----------|-------------|----------|
| Perfil de usuario autenticado | ✅ Sí | 5 min | `@Cacheable` por `userId` |
| Catálogos (roles, países, tipos) | ✅ Sí | 1 hora | `@Cacheable` + `@CacheEvict` en admin |
| Detalle de recurso propio | ✅ Sí | 2 min | `@Cacheable` con `key=userId+resourceId` |
| Resultados de búsqueda paginada | ⚠️ Solo si < 100 ms no se alcanza con BD | 30 s | `@Cacheable` con key de todos los filtros |
| Datos con alta volatilidad (stocks, precios) | ❌ No | — | Siempre BD con índice |
| Datos con PII que no deben persistir en caché | ❌ No | — | Excluir explícitamente |

```kotlin
// ✅ Cache de catálogos — TTL 1 hora, invalidación en admin
@Service
class ObtenerRolesService(private val rolRepository: RolRepository) : ObtenerRolesUseCase {

    @Cacheable("catalogos:roles", unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    override fun execute(): List<Rol> = rolRepository.findAllActivos()
}

@Service
class AdministrarRolesService(private val rolRepository: RolRepository) : AdministrarRolesUseCase {

    // ⚡ Invalida cache de roles cuando cambian
    @CacheEvict(cacheNames = ["catalogos:roles"], allEntries = true)
    @Transactional
    override fun crearRol(command: CrearRolCommand): Rol { /* ... */ }
}
```

---

## 🧠 PARTE 6 — MIGRACIÓN BCrypt → Argon2id (CASO REAL: 569 ms EN LOGIN)

> **Contexto de campo**: Un servicio Kotlin + Spring Boot con `BCryptPasswordEncoder(12)` produce tiempos de login reales de ~569 ms, superando el SLA de producción. Esta sección documenta el diagnóstico, la causa raíz y la migración obligatoria.

### 6.1 Tabla de tiempos reales por algoritmo

| Algoritmo / Config | p50 real | ¿SLA 300 ms? | Recomendación ZNS |
|-------------------|---------|--------------|-------------------|
| `BCryptPasswordEncoder(8)` | 50–100 ms | ✅ | ⚠️ Insuficiente — work factor bajo |
| `BCryptPasswordEncoder(10)` | 100–300 ms | ✅ / ⚠️ | ⚠️ Límite — solo si migración Argon2id no es posible a corto plazo |
| `BCryptPasswordEncoder(12)` | 300–700 ms | ❌ **VIOLA SLA** | ❌ Reemplazar por Argon2id |
| `Argon2id` (mem=64 MB, iter=3) | 150–200 ms | ✅ | ✅ **Estándar ZNS** |

### 6.2 Diagnóstico rápido — dónde está el tiempo en login

Antes de migrar, medir con precisión cada fase del login:

```kotlin
// ✅ Diagnóstico con estructura de tiempos — Kotlin + Spring Boot
// Insertar TEMPORALMENTE en LoginUseCase.execute() para medir
@Timed("zns.auth.login.phases")
fun execute(command: LoginCommand): LoginResult {
    val t0 = System.currentTimeMillis()

    val usuario = usuarioRepository.findByEmail(command.email)
    val tDb = System.currentTimeMillis()

    if (usuario == null) return LoginResult.CredencialesInvalidas

    val hashValido = passwordHashService.verificar(command.password, usuario.passwordHash)
    val tHash = System.currentTimeMillis()

    if (!hashValido) return LoginResult.CredencialesInvalidas

    val token = jwtService.generarToken(usuario)
    val tJwt = System.currentTimeMillis()

    log.info(
        "Login timing [DB={}ms] [Hash={}ms] [JWT={}ms] [TOTAL={}ms] [userId={}]",
        tDb - t0, tHash - tDb, tJwt - tHash, tJwt - t0,
        usuario.id.value  // ← nunca loggear el email (PII)
    )

    return LoginResult.Exitoso(token)
}
// Resultado típico con BCrypt cost=12:
// [DB=5ms] [Hash=542ms] [JWT=12ms] [TOTAL=559ms]
//                  ↑ aquí está el problema
```

### 6.3 Migración BCrypt → Argon2id (sin romper usuarios existentes)

La migración debe ser **transparente para usuarios activos**: sus contraseñas están hasheadas con BCrypt y no se pueden rehashear sin saber la contraseña en texto plano.

**Estrategia: migración lazy "on next login"**

```kotlin
// domain/service/PasswordHashService.kt (Port)
interface PasswordHashService {
    fun hashear(passwordPlano: String): String
    fun verificar(passwordPlano: String, hash: String): Boolean
    fun necesitaRehash(hash: String): Boolean  // ← nueva capacidad
}

// infrastructure/service/Argon2idPasswordHashService.kt (Adapter — NUEVO estándar)
@Service
@Primary
class Argon2idPasswordHashService : PasswordHashService {

    private val argon2 = Argon2PasswordEncoder(
        /*saltLength=*/    16,
        /*hashLength=*/    32,
        /*parallelism=*/   1,
        /*memory=*/        65536,  // 64 MB
        /*iterations=*/    3
    )

    override fun hashear(passwordPlano: String): String = argon2.encode(passwordPlano)

    override fun verificar(passwordPlano: String, hash: String): Boolean {
        // ¿Es formato Argon2id? → usar Argon2
        if (hash.startsWith("\$argon2id")) {
            return argon2.matches(passwordPlano, hash)
        }
        // ¿Es formato BCrypt? → usar BCrypt para verificar, luego migrar
        return BCryptPasswordEncoder().matches(passwordPlano, hash)
    }

    // true si el hash es BCrypt (necesita migrar a Argon2id)
    override fun necesitaRehash(hash: String): Boolean = !hash.startsWith("\$argon2id")
}

// application/service/LoginService.kt — migración lazy al hacer login
@Service
class LoginService(
    private val usuarioRepository: UsuarioRepository,
    private val passwordHashService: PasswordHashService
) : LoginUseCase {

    @Transactional
    override fun execute(command: LoginCommand): LoginResult {
        val usuario = usuarioRepository.findByEmail(command.email)
            ?: return LoginResult.CredencialesInvalidas

        val credencialesValidas = passwordHashService.verificar(command.password, usuario.passwordHash)
        if (!credencialesValidas) return LoginResult.CredencialesInvalidas

        // ✅ Migración lazy: si el hash es BCrypt, rehashear en Argon2id en este login
        if (passwordHashService.necesitaRehash(usuario.passwordHash)) {
            val nuevoHash = passwordHashService.hashear(command.password)
            usuarioRepository.save(usuario.actualizarPasswordHash(nuevoHash))
            log.info("Hash migrado BCrypt→Argon2id [userId={}]", usuario.id.value)
        }

        return LoginResult.Exitoso(jwtService.generarToken(usuario))
    }
}
```

**Test obligatorio para la migración**:

```kotlin
@Test
fun `debe migrar hash BCrypt a Argon2id en el primer login exitoso`() {
    // Given — usuario con hash BCrypt en BD
    val hashBCrypt = BCryptPasswordEncoder(12).encode("MiPassword-123!")
    val usuario = UsuarioMother.activo(passwordHash = hashBCrypt)
    every { usuarioRepository.findByEmail(any()) } returns usuario
    val usuarioCapturado = slot<Usuario>()
    every { usuarioRepository.save(capture(usuarioCapturado)) } answers { usuarioCapturado.captured }

    // When
    sut.execute(LoginCommand(email = usuario.email, password = "MiPassword-123!"))

    // Then — el hash guardado es Argon2id
    assertThat(usuarioCapturado.captured.passwordHash).startsWith("\$argon2id")
    verify(exactly = 1) { usuarioRepository.save(any()) }
}

@Test
fun `el login con hash ya migrado a Argon2id NO debe triggear rehash`() {
    val hashArgon2 = Argon2PasswordEncoder(16, 32, 1, 65536, 3).encode("MiPassword-123!")
    val usuario = UsuarioMother.activo(passwordHash = hashArgon2)
    every { usuarioRepository.findByEmail(any()) } returns usuario

    sut.execute(LoginCommand(email = usuario.email, password = "MiPassword-123!"))

    // No debe llamarse save (sin rehash innecesario)
    verify(exactly = 0) { usuarioRepository.save(any()) }
}
```

### 6.4 SLA de login post-migración

| Fase | BCrypt cost=12 | Argon2id (64MB/iter=3) | Mejora |
|------|---------------|----------------------|--------|
| BD lookup (`findByEmail` con índice) | ~5 ms | ~5 ms | = |
| Hash verification | **500–700 ms** ❌ | ~150–200 ms ✅ | **~3.5x más rápido** |
| JWT generación (RS256) | ~10 ms | ~10 ms | = |
| **TOTAL (p50)** | **~550 ms** ❌ | **~165 ms** ✅ | **73% reducción** |

> **Resultado esperado**: pasar de ~569 ms a ~165 ms sin cambiar la seguridad — Argon2id es **más seguro** que BCrypt, no solo más rápido. La mejora se debe a que Argon2id consume CPU de forma predecible sin el overhead de las rondas BCrypt.

---

## 🧠 PARTE 3 — MICRO-BENCHMARKS

### 3.1 JMH — Kotlin / Java

Usar JMH para medir lógica de dominio crítica (parsing, cálculos, serializaciones en el hot path).

```kotlin
// build.gradle.kts — JMH plugin
plugins {
    id("me.champeau.jmh") version "0.7.2"
}

jmh {
    fork = 1
    warmupIterations = 3
    iterations = 5
    timeUnit = "ms"
    resultFormat = "JSON"
    resultsFile = project.file("${project.buildDir}/reports/jmh/results.json")
}
```

```kotlin
// src/jmh/kotlin/com/zenapses/benchmarks/CalculatorBenchmark.kt
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MILLISECONDS)
@State(Scope.Benchmark)
@Fork(1)
@Warmup(iterations = 3, time = 1)
@Measurement(iterations = 5, time = 1)
open class PrecioCalculadorBenchmark {

    private lateinit var calculador: PrecioCalculador
    private lateinit var lineas: List<LineaPedido>

    @Setup
    fun setUp() {
        calculador = PrecioCalculador()
        lineas = (1..100).map { LineaPedido.fixture(it) }
    }

    @Benchmark
    fun calcularTotalPedido100Lineas(): Money {
        return calculador.calcularTotal(lineas)
    }
}
// Resultado esperado: ≤ 1 ms para cálculos de dominio sin I/O
```

### 3.2 BenchmarkDotNet — .NET / C#

```csharp
// src/Benchmarks/PrecioCalculadorBenchmark.cs
[MemoryDiagnoser]
[SimpleJob(RuntimeMoniker.Net80)]
public class PrecioCalculadorBenchmark
{
    private PrecioCalculador _calculador = null!;
    private List<LineaPedido> _lineas = null!;

    [GlobalSetup]
    public void Setup()
    {
        _calculador = new PrecioCalculador();
        _lineas = Enumerable.Range(1, 100).Select(LineaPedido.Fixture).ToList();
    }

    [Benchmark]
    public Money CalcularTotalPedido100Lineas() =>
        _calculador.CalcularTotal(_lineas);
}
// Ejecutar: dotnet run -c Release --project src/Benchmarks
// Resultado esperado: Mean ≤ 1 ms — si supera este umbral, revisar algoritmo
```

---

## 🧠 PARTE 4 — TESTS DE CARGA CON K6 (GATE EN CI)

### Script k6 canónico ZNS

```javascript
// k6/performance/api-performance.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ✅ SLAs ZNS — umbrales que bloquean el pipeline si se violan
export const options = {
  stages: [
    { duration: '10s', target: 50 },   // ramp-up
    { duration: '40s', target: 50 },   // steady state
    { duration: '10s', target: 0 },    // ramp-down
  ],
  thresholds: {
    // p95 ≤ 100 ms — SLA principal
    'http_req_duration{endpoint:listar-pedidos}': ['p(95)<100'],
    'http_req_duration{endpoint:detalle-pedido}': ['p(95)<100'],
    'http_req_duration{endpoint:crear-pedido}':   ['p(95)<100'],
    // Error rate < 1%
    'http_req_failed': ['rate<0.01'],
    // p99 ≤ 150 ms — alerta amarilla
    'http_req_duration': ['p(99)<150'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';

// Métricas custom por endpoint
const pedidosLatency = new Trend('http_req_duration', true);
const errorRate = new Rate('http_req_failed');

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'X-Correlation-Id': `k6-${__VU}-${__ITER}`,
  };

  // ──────────────────────────────────────────
  // Escenario 1: Listar pedidos paginados
  // ──────────────────────────────────────────
  const listarRes = http.post(
    `${BASE_URL}/api/v1/pedidos/listar`,
    JSON.stringify({ pagina: 0, tamaño: 20 }),
    { headers, tags: { endpoint: 'listar-pedidos' } }
  );
  check(listarRes, {
    'listar-pedidos status 200': (r) => r.status === 200,
    'listar-pedidos p95 < 100ms': (r) => r.timings.duration < 100,
    'listar-pedidos tiene items': (r) => JSON.parse(r.body).content !== undefined,
  });

  // ──────────────────────────────────────────
  // Escenario 2: Crear pedido
  // ──────────────────────────────────────────
  const crearRes = http.post(
    `${BASE_URL}/api/v1/pedidos/crear`,
    JSON.stringify({
      items: [{ productoId: '550e8400-e29b-41d4-a716-446655440000', cantidad: 1 }],
    }),
    { headers, tags: { endpoint: 'crear-pedido' } }
  );
  check(crearRes, {
    'crear-pedido status 201': (r) => r.status === 201,
    'crear-pedido p95 < 100ms': (r) => r.timings.duration < 100,
    'crear-pedido retorna UUID': (r) => {
      const body = JSON.parse(r.body);
      return /^[0-9a-f-]{36}$/.test(body.id || '');
    },
  });

  sleep(0.5);  // think time
}

export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'k6/reports/performance-summary.json': JSON.stringify(data),
  };
}
```

### Integración en GitHub Actions CI

```yaml
# .github/workflows/performance-gate.yml
name: Performance Gate — p95 < 100ms

on:
  pull_request:
    branches: [main, develop]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Arrancar la app con docker-compose (incluye BD + Redis)
      - name: Start application stack
        run: |
          docker-compose -f docker-compose.test.yml up -d --wait
          curl -sf http://localhost:8080/actuator/health || (docker-compose logs && exit 1)

      # Seed de datos mínimo para k6 (fixtures de test)
      - name: Seed test data
        run: ./scripts/seed-performance-data.sh

      # Obtener token para k6
      - name: Get auth token
        id: auth
        run: |
          TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auth/login \
            -H "Content-Type: application/json" \
            -d '{"email":"perf@zenapses.com","password":"PerfTest-2024!"}' \
            -c /tmp/cookies.txt | jq -r '.accessToken // empty')
          echo "token=${TOKEN}" >> $GITHUB_OUTPUT

      # Ejecutar k6
      - name: Run k6 performance test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: k6/performance/api-performance.js
          flags: --out json=k6/reports/results.json
        env:
          BASE_URL: http://localhost:8080
          ACCESS_TOKEN: ${{ steps.auth.outputs.token }}

      # Publicar reporte como comentario en PR
      - name: Comment PR with performance results
        uses: actions/github-script@v7
        if: always()
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('k6/reports/performance-summary.json', 'utf8'));
            const p95 = results.metrics?.http_req_duration?.values?.['p(95)'];
            const failed = results.metrics?.http_req_failed?.values?.rate;
            const emoji = p95 < 100 ? '✅' : '❌';
            const body = `## ${emoji} Performance Gate\n| Métrica | Valor | SLA |\n|---------|-------|-----|\n| p95 latencia | ${p95?.toFixed(1)} ms | < 100 ms |\n| Error rate | ${(failed * 100)?.toFixed(2)}% | < 1% |`;
            github.rest.issues.createComment({ issue_number: context.issue.number, owner: context.repo.owner, repo: context.repo.repo, body });
```

---

## 🧠 PARTE 5 — OBSERVABILIDAD DE PERFORMANCE

### Métricas Micrometer por use case

```kotlin
// ✅ @Timed en Application Services — latencia de cada use case en Prometheus
@Service
@Timed(value = "zns.usecase", extraTags = ["context", "pedidos"])
class CrearPedidoService : CrearPedidoUseCase { /* ... */ }

// ✅ Métrica custom para medir operaciones críticas con tags semánticos
@Service
class ObtenerPedidoService(
    private val meterRegistry: MeterRegistry,
    private val pedidoRepository: PedidoRepository
) : ObtenerPedidoUseCase {

    override fun execute(command: ObtenerPedidoCommand): ObtenerPedidoResult {
        return Timer.builder("zns.usecase.duration")
            .tag("usecase", "obtener-pedido")
            .tag("context", "pedidos")
            .description("Latencia del use case obtener-pedido")
            .register(meterRegistry)
            .recordCallable { ejecutar(command) }!!
    }

    private fun ejecutar(command: ObtenerPedidoCommand): ObtenerPedidoResult {
        val pedido = pedidoRepository.findByIdAndPropietario(command.pedidoId, command.solicitadoPor)
        return if (pedido != null) ObtenerPedidoResult.Encontrado(pedido)
               else ObtenerPedidoResult.NoEncontrado
    }
}
```

### Slow Query Log — PostgreSQL

```yaml
# docker-compose.test.yml — habilitar slow query log en BD de tests/staging
command: >
  postgres
  -c log_min_duration_statement=50
  -c log_statement=none
  -c log_duration=off
  -c log_lock_waits=on
  -c deadlock_timeout=200ms
```

```yaml
# application.yml — Spring Data debug en dev
spring:
  jpa:
    show-sql: false   # ← NUNCA en prod — usar p6spy o datasource-proxy en dev
  datasource:
    # datasource-proxy para dev: loggea queries lentas > 50ms con parámetros reales
    url: jdbc:p6spy:postgresql://localhost:5432/zenapses
```

```properties
# src/test/resources/spy.properties (datasource-proxy — solo en tests)
logMessageFormat=com.p6spy.engine.spy.appender.MultiLineFormat
appender=com.p6spy.engine.spy.appender.Slf4JLogger
slf4JLogLevel=WARN
executionThreshold=50
```

### Alertas Prometheus — reglas de performance

```yaml
# prometheus/alerts/performance-rules.yml
groups:
  - name: zns-performance-sla
    rules:
      # 🚨 CRITICAL — p95 supera 100ms (SLA violado)
      - alert: ZNS_P95_SLA_Violated
        expr: |
          histogram_quantile(0.95,
            rate(http_server_requests_seconds_bucket{
              application="zns-aibos",
              status!~"5.."
            }[5m])
          ) * 1000 > 100
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "SLA p95 violado: {{ $labels.uri }} — {{ $value | printf \"%.1f\" }} ms"
          description: "El endpoint {{ $labels.uri }} tiene p95={{ $value | printf \"%.1f\" }}ms. SLA=100ms."

      # ⚠️ WARNING — p95 supera 80ms (warning temprana)
      - alert: ZNS_P95_PerformanceWarning
        expr: |
          histogram_quantile(0.95,
            rate(http_server_requests_seconds_bucket{application="zns-aibos"}[5m])
          ) * 1000 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Performance degradada: {{ $labels.uri }} — {{ $value | printf \"%.1f\" }} ms"

      # 🚨 CRITICAL — tasa de errores > 1%
      - alert: ZNS_HighErrorRate
        expr: |
          rate(http_server_requests_seconds_count{
            application="zns-aibos",
            status=~"5.."
          }[5m])
          /
          rate(http_server_requests_seconds_count{application="zns-aibos"}[5m])
          > 0.01
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Error rate > 1% en {{ $labels.uri }}"
```

---

## ✅ Criterios de Aplicación

- **Todo endpoint nuevo** debe tener un caso en el script k6 con su threshold individual
- **Todo listado** debe estar paginado con máximo 50 items
- **Todo campo** usado en `WHERE` en repositorios debe tener índice en migración
- **Toda relación** cargada en colecciones debe usar `JOIN FETCH` / `Include` — nunca lazy por defecto en listados
- **Toda operación de solo lectura** en Application Service debe usar `@Transactional(readOnly=true)` / `AsNoTracking()`
- **Datos de catálogo** (roles, países, tipos) deben cachearse en Redis con TTL ≥ 30 min

## ❌ Anti-patrones — PROHIBIDOS

| Anti-patrón | Consecuencia | Corrección |
|-------------|-------------|-----------|
| `findAll()` sin paginación en producción | OOM + timeout con volúmenes reales | `Pageable` / `Skip+Take` obligatorio |
| `@OneToMany` con `FetchType.EAGER` en entidades con colecciones grandes | Cartesian product → OOM | `FetchType.LAZY` + `JOIN FETCH` explícito |
| `SELECT *` en queries frecuentes | Overhead de red + memoria | `SELECT id, campo1, campo2` o projections |
| `@Transactional` en método de lectura sin `readOnly=true` | Flush innecesario, lock en BD | `@Transactional(readOnly=true)` siempre en queries |
| Cache sin TTL (`Duration.ZERO` o similar) | Datos stale indefinidamente | TTL explícito siempre |
| Ningún test de performance antes de merge | Regresión de performance silenciosa | k6 en CI — obligatorio |
| `Thread.sleep()` o `delay()` en rutas de producción sin Resilience4j timeout | Latencia acumulada | `@TimeLimiter` + `CircuitBreaker` |
| Conexiones BD sin pool sizing (`maximumPoolSize`) | Contención en carga | HikariCP `maximum-pool-size: 20` mínimo |

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Endpoint que no cumple SLA — diagnóstico y corrección

**Síntoma**: `POST /api/v1/pedidos/listar` tiene p95 = 450 ms  
**Diagnóstico con `EXPLAIN ANALYZE`**:
```sql
EXPLAIN ANALYZE SELECT * FROM pedidos WHERE propietario_id = '...' ORDER BY created_at DESC;
-- →  Seq Scan on pedidos  (cost=0.00..9500.00 rows=5000)  → Falta índice
```
**Corrección**:
1. Agregar migración `CREATE INDEX idx_pedidos_propietario_created ON pedidos(propietario_id, created_at DESC)`
2. Verificar con `EXPLAIN ANALYZE` → `Index Scan` ✅
3. Agregar test k6 con `threshold: p(95)<100`
4. Re-ejecutar CI → p95 = 18 ms ✅

### Ejemplo 2: Configuración HikariCP obligatoria

```yaml
# application.yml — HikariCP mínimo por perfil
spring:
  datasource:
    hikari:
      maximum-pool-size: 20         # máximo conexiones al pool
      minimum-idle: 5               # conexiones en idle
      connection-timeout: 3000      # 3s — error rápido si pool exhausto
      idle-timeout: 600000          # 10 min — limpiar conexiones idle
      max-lifetime: 1800000         # 30 min — rotar conexiones (evita stale)
      leak-detection-threshold: 5000 # log si una conexión no se libera en 5s
```

```csharp
// appsettings.json — EF Core + Npgsql connection pooling
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=zenapses;Username=zns;Password=...;MaxPoolSize=20;MinPoolSize=5;ConnectionIdleLifetime=600;Timeout=3"
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agregar en la sección `## SKILLS ACTIVAS` (código):

```
SKILL ACTIVA: performance-mandatory-100ms-expert → ver: 2-agents/zns-tools/skills/performance-mandatory-100ms-expert.skill.md
```

Y en la tabla resumen de skills:

| Skill | Aplicación directa |
|-------|--------------------|
| `performance-mandatory-100ms-expert` | SLA p95 ≤ 100 ms en todos los endpoints (excepto auth con Argon2id); tabla de umbrales por tipo de operación; eliminación de N+1 con `JOIN FETCH`/`Include` + `SQLStatementCountValidator` en tests; índices obligatorios en todo campo de `WHERE`/`ORDER BY` (verificados en tests); paginación máx. 50 items (`Slice<T>` / skip+take); `@Transactional(readOnly=true)` / `AsNoTracking()` en lecturas; HikariCP `maximum-pool-size=20` + `connection-timeout=3s`; k6 en CI con `threshold: p(95)<100` por endpoint — pipeline falla si no se cumple; `@Timed` Micrometer en Application Services; alertas Prometheus `ZNS_P95_SLA_Violated` (critical > 100 ms) + `ZNS_P95_PerformanceWarning` (warning > 80 ms) |

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| p95 latencia — endpoints BD+Redis | ≤ 100 ms |
| p95 latencia — consultas cacheadas | ≤ 15 ms |
| p95 latencia — auth (Argon2id) | ≤ 300 ms (excepción documentada) |
| Error rate en carga | < 1% |
| Endpoints sin caso en k6 | 0 — todo endpoint nuevo tiene threshold |
| Queries N+1 detectadas en tests | 0 — `SQLStatementCountValidator` falla el test |
| Listados sin paginación | 0 — todos con `Pageable` / skip+take |
| Application Services de lectura sin `readOnly=true` | 0 |
| Pool de conexiones sizing | `maximum-pool-size` ≥ 20 configurado explícitamente |
| Alertas Prometheus de performance | Configuradas: `ZNS_P95_SLA_Violated` + `ZNS_P95_PerformanceWarning` |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — SLA p95 ≤ 100ms, k6 CI gate, N+1 detection, índices, paginación, HikariCP, JMH/BenchmarkDotNet, alertas Prometheus
