# 🎯 SKILL: SEGURIDAD BACKEND — OWASP Top 10 + Kotlin + Spring Security

**skill_id**: security-owasp-kotlin  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / seguridad  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`

**dependencias**: `kotlin-lang-expert`

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con conocimiento experto en **seguridad de aplicaciones backend** siguiendo el estándar OWASP Top 10, aplicado específicamente en proyectos **Kotlin + Spring Boot 3.x**. Cubre autenticación, autorización, manejo de secretos, cifrado, protección contra inyecciones, rate limiting, auditoría y gestión de vulnerabilidades en dependencias.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ OWASP Top 10 — Implementación en Kotlin

| # | Riesgo OWASP | Mitigación Principal | Herramienta/Técnica |
|---|--------------|---------------------|---------------------|
| A01 | Broken Access Control | @PreAuthorize, RBAC estricto | Spring Security Method Security |
| A02 | Cryptographic Failures | BCrypt cost=12, AES-256-GCM | Spring Security Crypto, Vault |
| A03 | Injection | Spring Data Derived Queries, Criteria API | JPA/Querydsl, no SQL nativo |
| A04 | Insecure Design | Threat modeling, Secure by Design | ADRs, revisión arquitectónica |
| A05 | Security Misconfiguration | HTTPS-only, headers HSTS | Spring Security Headers |
| A06 | Vulnerable Components | Auditoría automatizada CI | Dependabot, OWASP Dependency-Check |
| A07 | Auth & Session Failures | JWT + Refresh Token Rotation | Spring Security OAuth2 Resource Server |
| A08 | Software Integrity Failures | Checksums en artefactos CI/CD | Gradle Dependency Verification |
| A09 | Logging Failures | NO loggear PII/credenciales | SLF4J con sanitización |
| A10 | SSRF | Validación de URLs permitidas (allowlist) | WebClient con filtros |

---

### 2️⃣ Autenticación — JWT + Spring Security

```kotlin
// ✅ Configuración de Spring Security (Kotlin DSL)
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(private val jwtAuthFilter: JwtAuthenticationFilter) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.disable() }                          // API stateless — CSRF no aplica
        .sessionManagement {
            it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        }
        .authorizeHttpRequests { auth ->
            auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .anyRequest().authenticated()
        }
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)
        .headers { headers ->
            headers
                .httpStrictTransportSecurity { hsts ->
                    hsts.includeSubDomains(true).maxAgeInSeconds(31536000)
                }
                .xssProtection { it.block(true) }
                .contentTypeOptions { }
                .frameOptions { it.deny() }
        }
        .build()

    @Bean
    fun passwordEncoder(): PasswordEncoder =
        BCryptPasswordEncoder(12)  // OWASP: cost factor >= 10

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager
}

// ✅ JWT Filter — validación en cada request
@Component
class JwtAuthenticationFilter(
    private val jwtService: JwtService,
    private val userDetailsService: UserDetailsService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response)
            return
        }

        val token = authHeader.removePrefix("Bearer ")

        runCatching { jwtService.extractUsername(token) }
            .onSuccess { username ->
                if (SecurityContextHolder.getContext().authentication == null) {
                    val userDetails = userDetailsService.loadUserByUsername(username)
                    if (jwtService.isTokenValid(token, userDetails)) {
                        val authToken = UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.authorities
                        )
                        authToken.details = WebAuthenticationDetailsSource().buildDetails(request)
                        SecurityContextHolder.getContext().authentication = authToken
                    }
                }
            }
            .onFailure { log.warn("Token JWT inválido: ${it.message}") }

        filterChain.doFilter(request, response)
    }
}
```

---

### 3️⃣ JWE (JSON Web Encryption) — Datos Sensibles

```kotlin
// JWS = firmado (integridad) → 3 partes
// JWE = cifrado (confidencialidad) → 5 partes
// Usar JWE cuando payload contiene PII, credenciales, datos financieros

@Service
class JwtService(
    @Value("\${security.jwt.secret}") private val secret: String,
    @Value("\${security.jwt.access-token-expiry}") private val accessExpiry: Duration,
    @Value("\${security.jwt.refresh-token-expiry}") private val refreshExpiry: Duration,
) {
    private val signingKey: SecretKey by lazy {
        Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))
    }

    fun generateAccessToken(usuarioId: UsuarioId, rol: RolUsuario): String =
        buildToken(usuarioId, mapOf("rol" to rol.name), accessExpiry)

    fun generateRefreshToken(usuarioId: UsuarioId): String =
        buildToken(usuarioId, emptyMap(), refreshExpiry)

    private fun buildToken(
        usuarioId: UsuarioId,
        extraClaims: Map<String, Any>,
        expiry: Duration
    ): String = Jwts.builder()
        .claims(extraClaims)
        .subject(usuarioId.value.toString())
        .issuedAt(Date())
        .expiration(Date(System.currentTimeMillis() + expiry.toMillis()))
        .signWith(signingKey, Jwts.SIG.HS512)
        .compact()

    fun extractUsuarioId(token: String): UsuarioId =
        UsuarioId.from(extractClaim(token) { it.subject })

    fun isTokenValid(token: String, userDetails: UserDetails): Boolean =
        extractUsuarioId(token).value.toString() == userDetails.username &&
                !isTokenExpired(token)

    private fun isTokenExpired(token: String): Boolean =
        extractClaim(token) { it.expiration }.before(Date())

    private fun <T> extractClaim(token: String, resolver: (Claims) -> T): T =
        resolver(Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).payload)
}

// ✅ Refresh Token Rotation (previene token theft)
@Service
@Transactional
class RefreshTokenService(
    private val tokenRepository: RefreshTokenRepository,
    private val jwtService: JwtService
) {
    fun rotate(refreshToken: String): TokenPair {
        val stored = tokenRepository.findByToken(refreshToken)
            ?: throw TokenInvalidoException("Refresh token no encontrado")
        
        check(!stored.revocado) { "Refresh token ya fue utilizado (posible robo detectado)" }
        check(stored.expiracion.isAfter(Instant.now())) { "Refresh token expirado" }

        // Revocar el token usado (rotación)
        tokenRepository.save(stored.copy(revocado = true))

        // Generar nuevo par de tokens
        val nuevoAccessToken = jwtService.generateAccessToken(stored.usuarioId, stored.rol)
        val nuevoRefreshToken = jwtService.generateRefreshToken(stored.usuarioId)

        tokenRepository.save(
            RefreshTokenEntity(
                token = nuevoRefreshToken,
                usuarioId = stored.usuarioId,
                rol = stored.rol,
                expiracion = Instant.now().plus(Duration.ofDays(7)),
                revocado = false
            )
        )

        return TokenPair(accessToken = nuevoAccessToken, refreshToken = nuevoRefreshToken)
    }
}
```

---

### 4️⃣ Autorización — RBAC y Method Security

```kotlin
// ✅ Roles y permisos como constantes tipadas
enum class RolUsuario { ADMIN, TUTOR, ESTUDIANTE }

object Permisos {
    const val SUSPENDER_USUARIO = "ROLE_ADMIN"
    const val VER_RESERVAS_PROPIAS = "ROLE_ESTUDIANTE,ROLE_TUTOR"
    const val GESTIONAR_CATALOGO = "ROLE_ADMIN"
}

// ✅ Método protegido con @PreAuthorize
@Service
class UsuarioAdminService(private val usuarioRepository: UsuarioRepository) {

    @PreAuthorize("hasRole('ADMIN')")
    fun suspenderUsuario(id: UsuarioId, motivo: String) {
        val usuario = usuarioRepository.findById(id)
            ?: throw UsuarioNoEncontradoException(id)
        usuario.suspender(motivo)
        usuarioRepository.save(usuario)
    }

    @PreAuthorize("hasRole('ADMIN') or #usuarioId == authentication.principal.id")
    fun obtenerPerfil(usuarioId: UsuarioId): PerfilResponse {
        // Accede solo si es admin o el propio usuario
        TODO()
    }
}

// ✅ Security Expression personalizada para reglas complejas
@Component("securityExpression")
class CustomSecurityExpression {
    fun esPropietarioDeLaReserva(reservaId: ReservaId, authentication: Authentication): Boolean {
        val usuarioId = (authentication.principal as UserPrincipal).usuarioId
        return reservaService.existeParaUsuario(reservaId, usuarioId)
    }
}

// Uso en controller:
// @PreAuthorize("@securityExpression.esPropietarioDeLaReserva(#reservaId, authentication)")
```

---

### 5️⃣ Prevención de Inyección (A03)

```kotlin
// ✅ REGLA DE ORO: NUNCA construir queries con concatenación de strings

// ✅ Spring Data Method Query (método más seguro — NO hay SQL)
interface UsuarioJpaRepository : JpaRepository<UsuarioJpaEntity, UUID> {
    fun findByEmail(email: String): UsuarioJpaEntity?
    fun existsByEmail(email: String): Boolean
    fun findByRolAndEstado(rol: String, estado: String): List<UsuarioJpaEntity>
}

// ✅ Criteria API para queries dinámicas (type-safe, sin SQL)
@Repository
class UsuarioCriteriaAdapter(private val em: EntityManager) {

    fun buscarConFiltros(filtro: FiltroUsuario): List<UsuarioJpaEntity> {
        val cb = em.criteriaBuilder
        val query = cb.createQuery(UsuarioJpaEntity::class.java)
        val root = query.from(UsuarioJpaEntity::class.java)

        val predicados = buildList {
            filtro.email?.let { add(cb.equal(root.get<String>("email"), it)) }
            filtro.rol?.let { add(cb.equal(root.get<String>("rol"), it.name)) }
            filtro.estado?.let { add(cb.equal(root.get<String>("estado"), it.name)) }
            filtro.creadoDesde?.let {
                add(cb.greaterThanOrEqualTo(root.get("creadoEn"), it))
            }
        }

        query.where(*predicados.toTypedArray())
        query.orderBy(cb.desc(root.get<Instant>("creadoEn")))

        return em.createQuery(query).resultList
    }
}

// ✅ Validación de input en Value Objects (primera línea de defensa)
data class Email(val value: String) {
    init {
        require(value.isNotBlank()) { "Email vacío" }
        require(!value.contains("'") && !value.contains("--")) {
            "Caracteres no permitidos en email"
        }
        require(EMAIL_REGEX.matches(value)) { "Email inválido: $value" }
    }
    companion object {
        private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\$")
    }
}
```

---

### 6️⃣ Protección de Datos Sensibles

```kotlin
// ✅ BCrypt con cost factor ≥ 12 (OWASP recomendación)
@Service
class BCryptPasswordService(
    private val encoder: BCryptPasswordEncoder = BCryptPasswordEncoder(12)
) : PasswordHashService {

    override fun hash(plain: Password): Password =
        Password(encoder.encode(plain.value))

    override fun verify(plain: Password, hashed: Password): Boolean =
        encoder.matches(plain.value, hashed.value)
}

// ✅ Cifrado en reposo — converter JPA
@Converter
class EncryptedStringConverter : AttributeConverter<String?, String?> {
    private val aesService = AESEncryptionService.instance()

    override fun convertToDatabaseColumn(attribute: String?): String? =
        attribute?.let { aesService.encrypt(it) }

    override fun convertToEntityAttribute(dbData: String?): String? =
        dbData?.let { aesService.decrypt(it) }
}

// Uso en entidad JPA
@Entity
@Table(name = "usuarios")
class UsuarioJpaEntity(
    @Convert(converter = EncryptedStringConverter::class)
    @Column(name = "telefono")
    val telefono: String?,
    // ...
)

// ✅ HashiCorp Vault para secretos (NO en application.properties en producción)
@Configuration
@Profile("production")
class VaultSecretsConfig {
    // Spring Cloud Vault toma automáticamente secretos de Vault
    // application.properties solo tiene: spring.cloud.vault.uri=https://vault.internal:8200
}

// ✅ NO loggear información sensible
@Service
class AuditLogger(private val log: Logger = LoggerFactory.getLogger(AuditLogger::class.java)) {

    fun logLoginIntent(email: Email, exitoso: Boolean) {
        log.info("Login intent | email={} | success={}", email.normalized, exitoso)
        // ❌ NUNCA: log.info("Password: {}", password)
        // ❌ NUNCA: log.info("Token: {}", jwtToken)
    }
}
```

---

### 7️⃣ Rate Limiting y Protección DDoS

```kotlin
// ✅ Rate limiting con Redis (Bucket4j)
@Component
class RateLimitFilter(
    private val redisTemplate: StringRedisTemplate,
    @Value("\${security.rate-limit.max-requests:100}") private val maxRequests: Int,
    @Value("\${security.rate-limit.window-seconds:60}") private val windowSeconds: Long
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain
    ) {
        val clientKey = resolveClientKey(request)
        val redisKey = "rate_limit:$clientKey"

        val current = redisTemplate.opsForValue().increment(redisKey) ?: 1L

        if (current == 1L) {
            redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds))
        }

        if (current > maxRequests) {
            response.status = HttpStatus.TOO_MANY_REQUESTS.value()
            response.writer.write("""{"error": "Rate limit exceeded. Retry after $windowSeconds seconds."}""")
            return
        }

        response.setHeader("X-RateLimit-Remaining", (maxRequests - current).toString())
        chain.doFilter(request, response)
    }

    private fun resolveClientKey(request: HttpServletRequest): String {
        // Preferir header X-Forwarded-For si hay proxy/LoadBalancer
        val forwarded = request.getHeader("X-Forwarded-For")
        return if (!forwarded.isNullOrBlank()) forwarded.split(",").first().trim()
        else request.remoteAddr
    }
}
```

---

### 8️⃣ SSRF Prevention (A10)

```kotlin
// ✅ Allowlist de dominios permitidos para llamadas HTTP salientes
@Component
class SafeHttpClient(builder: WebClient.Builder) {

    private val allowedHosts = setOf(
        "api.stripe.com",
        "api.sendgrid.com",
        "fcm.googleapis.com"
    )

    private val webClient = builder
        .filter(ssrfProtectionFilter())
        .build()

    private fun ssrfProtectionFilter(): ExchangeFilterFunction =
        ExchangeFilterFunction.ofRequestProcessor { request ->
            val host = request.url().host
            if (host !in allowedHosts) {
                Mono.error(SsrfBlockedException("Host no permitido: $host"))
            } else {
                Mono.just(request)
            }
        }
}

class SsrfBlockedException(msg: String) : SecurityException(msg)
```

---

### 9️⃣ Auditoría de Seguridad

```kotlin
// ✅ Auditoría automática con Spring Data + Kotlin
@EntityListeners(AuditingEntityListener::class)
@MappedSuperclass
abstract class AuditableEntity {
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    lateinit var createdAt: Instant

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    lateinit var updatedAt: Instant

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    var createdBy: String? = null

    @LastModifiedBy
    @Column(name = "updated_by")
    var updatedBy: String? = null
}

// ✅ Registro de eventos de seguridad en tabla de auditoría
@Entity
@Table(name = "security_audit_log")
class SecurityAuditLog(
    @Id val id: UUID = UUID.randomUUID(),
    val eventType: String,         // LOGIN_SUCCESS, LOGIN_FAILURE, PERMISSION_DENIED
    val usuarioId: UUID?,
    val recurso: String,
    val ip: String,
    val userAgent: String?,
    val timestamp: Instant = Instant.now(),
    val detalles: String?          // JSON con info adicional
)
```

---

### 🔟 Checklist de Seguridad — Antes de cada PR

```markdown
## Security Checklist (Obligatorio antes de merge)

### Autenticación y Autorización
- [ ] Todos los endpoints protegidos tienen @PreAuthorize o están en securityFilterChain
- [ ] Login responde igual ante email inexistente o password incorrecto (previene user enumeration)
- [ ] Refresh token rotation implementado (token inválido al segundo uso)
- [ ] JWT expiry: access token ≤ 15 min, refresh token ≤ 7 días

### Datos y Cifrado
- [ ] Passwords hasheados con BCrypt cost=12 (o Argon2id)
- [ ] NO hay contraseñas, API keys ni tokens en código fuente
- [ ] Secretos en Vault / variables de entorno cifradas
- [ ] Datos PII cifrados en BBDD con AES-256

### Inyección
- [ ] CERO SQL nativo o @Query con nativeQuery=true no aprobado por arquitecto
- [ ] Toda entrada de usuario validada con Bean Validation (@NotNull, @Pattern, etc.)
- [ ] Ningún dato de usuario se concatena en queries ni comandos

### Headers y Transport
- [ ] HTTPS en producción (HSTS habilitado)
- [ ] CORS configurado explícitamente (no allowedOrigins="*")
- [ ] Content-Security-Policy header configurado

### Logging
- [ ] No se loggean passwords, tokens JWT, números de tarjeta, ni datos PII
- [ ] Eventos de seguridad (login, logout, cambio de password) registrados en audit log

### Dependencias
- [ ] Dependabot / OWASP Dependency-Check sin vulnerabilidades críticas o altas
- [ ] Gradle lockfile actualizado
```

---

## 🔗 Referencias

- OWASP Top 10: https://owasp.org/Top10/
- Spring Security Reference: https://docs.spring.io/spring-security/reference/
- OWASP Cheat Sheet (Authentication): https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Dependency-Check: https://owasp.org/www-project-dependency-check/
