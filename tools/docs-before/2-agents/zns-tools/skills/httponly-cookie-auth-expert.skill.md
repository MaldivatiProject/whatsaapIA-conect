# 🍪 SKILL: HTTPONLY COOKIE AUTHENTICATION — JWT via Cookies Expert

**skill_id**: httponly-cookie-auth-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: security / backend  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-kotlin-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-springboot-senior.md`
- `2-agents/zns-tecnical-team/5.zns-develop/1.backend_senior/prompt-dev-dotnet-core-senior.md`

**dependencias**: `security-owasp-kotlin` (complementa — modifica la estrategia de CSRF)  
**referencia_owasp**: OWASP ASVS 3.4.2, 3.4.3, 3.4.4 — Cookie-based session tokens  
**referencia_hu**: `00-docs/1-business-analysis/2-user-stories/autenticacion-http-only.md`

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con dominio **Expert** en autenticación basada en **cookies HttpOnly** para APIs REST, como alternativa segura al almacenamiento de tokens JWT en `localStorage`/`sessionStorage`, que queda expuesto a ataques XSS. Cubre la estrategia completa: emisión de cookies seguras, extracción de tokens en filtros JWT, protección CSRF con `CookieCsrfTokenRepository`, configuración CORS con `allowCredentials`, refresh token rotation y logout real server-side. Aplica siempre que el cliente sea un navegador web (SPA/MPA). Para clientes API puro (mobile, m2m) el patrón Bearer header sigue siendo válido.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Fundamentos: Por Qué HttpOnly Cookies

#### Vector XSS eliminado

```
ANTES (Vulnerable — token en localStorage):
  Backend ──JSON body──► Browser ──localStorage.setItem()──► window.token
                                                                     │
                                                            Atacante XSS
                                                       document.cookie / localStorage.getItem()

DESPUÉS (Seguro — token en HttpOnly cookie):
  Backend ──Set-Cookie: HttpOnly──► Browser Cookie Jar
                                          │
                                   ✗ document.cookie  (HttpOnly lo bloquea)
                                   ✗ localStorage     (nunca llega ahí)
                                   ✓ Se envía automáticamente en cada request
```

#### Tabla comparativa

| Característica | Token en Header (Bearer) | Cookie HttpOnly |
|----------------|--------------------------|-----------------|
| Protección XSS | ❌ Vulnerable si localStorage | ✅ Inmune — JS no puede acceder |
| Protección CSRF | ✅ Inmune por default | ⚠️ Requiere CSRF token adicional |
| Acceso desde JS | ✅ Necesario para leer | ❌ No posible (diseño intencional) |
| Logout real | ⚠️ Solo client-side | ✅ Server puede borrar la cookie |
| Multi-tab sync | ⚠️ Manual | ✅ Automático (mismo cookie jar) |
| Preflight CORS | Más simple | Requiere `allowCredentials: true` |

#### Referencias OWASP ASVS

| Requisito | Descripción |
|-----------|-------------|
| **ASVS 3.4.2** | Cookie-based tokens deben tener el atributo `HttpOnly` |
| **ASVS 3.4.3** | Cookie-based tokens deben tener el atributo `Secure` |
| **ASVS 3.4.4** | Cookie-based tokens deben tener el atributo `SameSite` |

---

### 2️⃣ Diseño de Cookies — Flags Obligatorios

| Cookie | Nombre | `HttpOnly` | `Secure` | `SameSite` | `Path` | TTL |
|--------|--------|-----------|---------|-----------|--------|-----|
| Access Token | `zns_access_token` | ✅ true | ✅ true | `Strict` | `/api` | 15 min |
| Refresh Token | `zns_refresh_token` | ✅ true | ✅ true | `Strict` | `/api/v1/auth` | 7 días |
| CSRF Token | `XSRF-TOKEN` | ❌ false | ✅ true | `Strict` | `/` | Per-session |

**Reglas críticas de diseño:**
- `Path` restrictivo — el refresh token **solo** viaja a `/api/v1/auth` (no a toda la API).
- `XSRF-TOKEN` **NO** tiene `HttpOnly` — el frontend JavaScript DEBE poder leerlo para enviarlo como header `X-XSRF-TOKEN`.
- `Secure` = `true` en producción siempre. En desarrollo local, `false` solo para `localhost`.
- `SameSite=Strict` bloquea el envío en requests cross-site (protección CSRF adicional).
- **NUNCA** incluir el token JWT en el body de respuesta cuando se usa este patrón.

---

### 3️⃣ Implementación Kotlin + Spring Boot

#### CookieService (Dominio de Infraestructura)

```kotlin
// infrastructure/security/cookie/CookieService.kt
@Service
class CookieService(
    private val jwtProperties: JwtProperties,
    private val cookieProperties: CookieProperties
) {
    companion object {
        const val ACCESS_TOKEN_COOKIE  = "zns_access_token"
        const val REFRESH_TOKEN_COOKIE = "zns_refresh_token"
        const val CSRF_TOKEN_COOKIE    = "XSRF-TOKEN"
    }

    fun setAccessTokenCookie(response: HttpServletResponse, token: String) {
        val cookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, token)
            .httpOnly(true)
            .secure(cookieProperties.secure)
            .sameSite("Strict")
            .path("/api")
            .maxAge(Duration.ofSeconds(jwtProperties.accessTokenExpiration))
            .build()
        response.addHeader("Set-Cookie", cookie.toString())
    }

    fun setRefreshTokenCookie(response: HttpServletResponse, token: String) {
        val cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
            .httpOnly(true)
            .secure(cookieProperties.secure)
            .sameSite("Strict")
            .path("/api/v1/auth")     // ← Path restrictivo: solo viaja al endpoint de refresh
            .maxAge(Duration.ofDays(7))
            .build()
        response.addHeader("Set-Cookie", cookie.toString())
    }

    fun setCsrfCookie(response: HttpServletResponse, csrfToken: String) {
        val cookie = ResponseCookie.from(CSRF_TOKEN_COOKIE, csrfToken)
            .httpOnly(false)           // ← DEBE ser false: JS lo lee para enviarlo como header
            .secure(cookieProperties.secure)
            .sameSite("Strict")
            .path("/")
            .build()
        response.addHeader("Set-Cookie", cookie.toString())
    }

    fun clearAuthCookies(response: HttpServletResponse) {
        listOf(
            Triple(ACCESS_TOKEN_COOKIE, "/api", true),
            Triple(REFRESH_TOKEN_COOKIE, "/api/v1/auth", true),
            Triple(CSRF_TOKEN_COOKIE, "/", false)
        ).forEach { (name, path, httpOnly) ->
            val cookie = ResponseCookie.from(name, "")
                .httpOnly(httpOnly)
                .secure(cookieProperties.secure)
                .sameSite("Strict")
                .path(path)
                .maxAge(0)             // ← maxAge=0 borra la cookie
                .build()
            response.addHeader("Set-Cookie", cookie.toString())
        }
    }
}

// infrastructure/config/CookieProperties.kt
@ConfigurationProperties(prefix = "zenapses.cookie")
data class CookieProperties(
    val secure: Boolean = true,
    val domain: String = ""
)
```

#### AuthController — Login y Logout

```kotlin
// infrastructure/adapter/in/rest/AuthController.kt
@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val loginUseCase: LoginUseCase,
    private val refreshTokenUseCase: RefreshTokenUseCase,
    private val logoutUseCase: LogoutUseCase,
    private val cookieService: CookieService
) {

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val result = loginUseCase.execute(LoginCommand(
            email = Email(request.email),
            password = Password(request.password)
        ))

        return when (result) {
            is LoginResult.Exito -> {
                // ✅ Tokens en cookies — NUNCA en el body
                cookieService.setAccessTokenCookie(response, result.accessToken)
                cookieService.setRefreshTokenCookie(response, result.refreshToken)
                // CSRF token se gestiona automáticamente por Spring Security
                ResponseEntity.ok(AuthResponse.from(result.usuario, result.expiresIn))
            }
            is LoginResult.CredencialesInvalidas ->
                ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
            is LoginResult.UsuarioInactivo ->
                ResponseEntity.status(HttpStatus.FORBIDDEN).build()
        }
    }

    @PostMapping("/refresh")
    fun refresh(
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        // ✅ Extraer refresh token de la cookie — nunca del body
        val refreshToken = request.cookies
            ?.firstOrNull { it.name == CookieService.REFRESH_TOKEN_COOKIE }
            ?.value
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val result = refreshTokenUseCase.execute(RefreshTokenCommand(refreshToken))

        return when (result) {
            is RefreshTokenResult.Exito -> {
                // ✅ Rotation: emitir nuevo access token + nuevo refresh token
                cookieService.setAccessTokenCookie(response, result.newAccessToken)
                cookieService.setRefreshTokenCookie(response, result.newRefreshToken)
                ResponseEntity.ok(AuthResponse.refreshed(result.expiresIn))
            }
            is RefreshTokenResult.TokenExpirado,
            is RefreshTokenResult.TokenInvalido ->
                ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }
    }

    @PostMapping("/logout")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<Unit> {
        // ✅ Invalidar refresh token en BD + borrar todas las cookies
        request.cookies
            ?.firstOrNull { it.name == CookieService.REFRESH_TOKEN_COOKIE }
            ?.value
            ?.let { logoutUseCase.execute(LogoutCommand(it)) }

        cookieService.clearAuthCookies(response)
        return ResponseEntity.noContent().build()
    }
}

// ✅ AuthResponse — sin tokens, solo info del usuario
data class AuthResponse(
    val usuario: UsuarioResponse,
    val expiresIn: Long,
    val message: String = "Authentication successful"
) {
    companion object {
        fun from(usuario: UsuarioResponse, expiresIn: Long) =
            AuthResponse(usuario = usuario, expiresIn = expiresIn)

        fun refreshed(expiresIn: Long) =
            AuthResponse(usuario = UsuarioResponse.empty(), expiresIn = expiresIn, message = "Token refreshed")
    }
}
```

#### JwtAuthenticationFilter — Extracción desde Cookie

```kotlin
// infrastructure/security/JwtAuthenticationFilter.kt
@Component
class JwtAuthenticationFilter(private val jwtService: JwtService) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain
    ) {
        val token = extractToken(request)

        if (token != null && jwtService.isValid(token)) {
            val authentication = jwtService.buildAuthentication(token)
            SecurityContextHolder.getContext().authentication = authentication
        }

        chain.doFilter(request, response)
    }

    private fun extractToken(request: HttpServletRequest): String? {
        // 1. ✅ Cookie HttpOnly (browser clients — prioridad)
        request.cookies
            ?.firstOrNull { it.name == CookieService.ACCESS_TOKEN_COOKIE }
            ?.value
            ?.let { return it }

        // 2. ✅ Authorization header (API clients: mobile, m2m, testing)
        val bearer = request.getHeader("Authorization") ?: return null
        return if (bearer.startsWith("Bearer ")) bearer.removePrefix("Bearer ") else null
    }
}
```

#### SecurityConfig — CSRF + CORS para Cookies

```kotlin
// infrastructure/config/SecurityConfig.kt
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    private val jwtAuthFilter: JwtAuthenticationFilter,
    private val corsProperties: CorsProperties
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain = http
        // ✅ CSRF activo — obligatorio cuando se usan cookies
        .csrf { csrf ->
            csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(CsrfTokenRequestAttributeHandler())
                // Excluir login/register — no tienen token aún
                .ignoringRequestMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/register",
                    "/actuator/health"
                )
        }
        // ✅ CORS con allowCredentials — obligatorio para que el navegador envíe cookies
        .cors { it.configurationSource(corsConfigurationSource()) }
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
                    hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000)
                }
                .frameOptions { it.deny() }
                .contentTypeOptions { }
        }
        .build()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins = corsProperties.allowedOrigins   // NUNCA "*" cuando allowCredentials=true
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Content-Type", "X-XSRF-TOKEN")
            allowCredentials = true    // ← CRÍTICO para que el browser envíe cookies cross-origin
            exposedHeaders = listOf("X-XSRF-TOKEN")
            maxAge = 3600L
        }
        return UrlBasedCorsConfigurationSource().also {
            it.registerCorsConfiguration("/api/**", config)
        }
    }
}

// ✅ application.yml
// zenapses:
//   cookie:
//     secure: true          # false solo en localhost dev
//     domain: zenapses.com
//   cors:
//     allowed-origins:
//       - https://app.zenapses.com
//       - https://admin.zenapses.com
//       # NUNCA agregar "*" cuando allowCredentials=true — viola CORS spec
```

---

### 4️⃣ Implementación Java + Spring Boot

```java
// CookieService.java
@Service
public class CookieService {

    public static final String ACCESS_TOKEN_COOKIE  = "zns_access_token";
    public static final String REFRESH_TOKEN_COOKIE = "zns_refresh_token";
    public static final String CSRF_TOKEN_COOKIE    = "XSRF-TOKEN";

    private final JwtProperties jwtProperties;
    private final CookieProperties cookieProperties;

    public void setAccessTokenCookie(HttpServletResponse response, String token) {
        var cookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, token)
            .httpOnly(true)
            .secure(cookieProperties.isSecure())
            .sameSite("Strict")
            .path("/api")
            .maxAge(Duration.ofSeconds(jwtProperties.getAccessTokenExpiration()))
            .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String token) {
        var cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
            .httpOnly(true)
            .secure(cookieProperties.isSecure())
            .sameSite("Strict")
            .path("/api/v1/auth")
            .maxAge(Duration.ofDays(7))
            .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void clearAuthCookies(HttpServletResponse response) {
        Stream.of(
            Map.entry(ACCESS_TOKEN_COOKIE, "/api"),
            Map.entry(REFRESH_TOKEN_COOKIE, "/api/v1/auth"),
            Map.entry(CSRF_TOKEN_COOKIE, "/")
        ).forEach(entry -> {
            var cookie = ResponseCookie.from(entry.getKey(), "")
                .httpOnly(!entry.getKey().equals(CSRF_TOKEN_COOKIE))
                .secure(cookieProperties.isSecure())
                .sameSite("Strict")
                .path(entry.getValue())
                .maxAge(0)
                .build();
            response.addHeader("Set-Cookie", cookie.toString());
        });
    }
}

// JwtAuthenticationFilter.java — extracción desde cookie
private String extractToken(HttpServletRequest request) {
    // 1. Cookie (browser clients)
    if (request.getCookies() != null) {
        for (var cookie : request.getCookies()) {
            if (CookieService.ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
    }
    // 2. Authorization header (API clients / tests)
    var bearer = request.getHeader("Authorization");
    if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
        return bearer.substring(7);
    }
    return null;
}
```

---

### 5️⃣ Implementación .NET Core / C#

```csharp
// Infrastructure/Security/Cookie/CookieService.cs
public class CookieService(IOptions<CookieSettings> settings)
{
    public const string AccessTokenCookie  = "zns_access_token";
    public const string RefreshTokenCookie = "zns_refresh_token";
    public const string CsrfTokenCookie    = "XSRF-TOKEN";

    private readonly CookieSettings _settings = settings.Value;

    public void SetAccessTokenCookie(HttpResponse response, string token, TimeSpan expiry)
    {
        response.Cookies.Append(AccessTokenCookie, token, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = _settings.Secure,
            SameSite  = SameSiteMode.Strict,
            Path      = "/api",
            Expires   = DateTimeOffset.UtcNow.Add(expiry),
            IsEssential = true
        });
    }

    public void SetRefreshTokenCookie(HttpResponse response, string token)
    {
        response.Cookies.Append(RefreshTokenCookie, token, new CookieOptions
        {
            HttpOnly  = true,
            Secure    = _settings.Secure,
            SameSite  = SameSiteMode.Strict,
            Path      = "/api/auth",   // Path restrictivo
            Expires   = DateTimeOffset.UtcNow.AddDays(7),
            IsEssential = true
        });
    }

    public void SetCsrfCookie(HttpResponse response, string csrfToken)
    {
        response.Cookies.Append(CsrfTokenCookie, csrfToken, new CookieOptions
        {
            HttpOnly  = false,         // JS DEBE poder leerlo
            Secure    = _settings.Secure,
            SameSite  = SameSiteMode.Strict,
            Path      = "/",
            IsEssential = true
        });
    }

    public void ClearAuthCookies(HttpResponse response)
    {
        foreach (var (name, path) in new[] {
            (AccessTokenCookie, "/api"),
            (RefreshTokenCookie, "/api/auth"),
            (CsrfTokenCookie, "/")
        })
        {
            response.Cookies.Append(name, "", new CookieOptions
            {
                HttpOnly = name != CsrfTokenCookie,
                Secure   = _settings.Secure,
                SameSite = SameSiteMode.Strict,
                Path     = path,
                Expires  = DateTimeOffset.UnixEpoch  // Pasado → borra la cookie
            });
        }
    }
}

// Program.cs — CORS con AllowCredentials + Antiforgery (CSRF)
builder.Services.AddAntiforgery(opts =>
{
    opts.HeaderName = "X-XSRF-TOKEN";   // Header que el frontend envía
    opts.Cookie.Name = CookieService.CsrfTokenCookie;
    opts.Cookie.HttpOnly = false;        // JS debe leer el valor
    opts.Cookie.SameSite = SameSiteMode.Strict;
    opts.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});

builder.Services.AddCors(opts => opts.AddPolicy("WebClients", policy =>
{
    policy.WithOrigins("https://app.zenapses.com", "https://admin.zenapses.com")
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials();  // ← CRÍTICO para envío de cookies cross-origin
          // NUNCA AllowAnyOrigin() + AllowCredentials() — viola especificación CORS
}));

// JwtCookieMiddleware.cs — extracción del token de la cookie
public class JwtCookieMiddleware(RequestDelegate next, IJwtService jwtService)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Cookie HttpOnly (browser clients — prioridad)
        if (context.Request.Cookies.TryGetValue(CookieService.AccessTokenCookie, out var tokenFromCookie))
        {
            context.Request.Headers.Authorization = $"Bearer {tokenFromCookie}";
        }
        // 2. Authorization header ya presente (API clients, m2m, tests) → no tocar
        await next(context);
    }
}

// appsettings.json
// "CookieSettings": { "Secure": true }
// appsettings.Development.json
// "CookieSettings": { "Secure": false }   // solo para localhost
```

---

### 6️⃣ Tests de HttpOnly Cookies

#### Kotlin + MockMvc

```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerHttpOnlyCookieTest(@Autowired val mockMvc: MockMvc) {

    @Test
    fun `login exitoso debe retornar cookies HttpOnly y no tokens en el body`() {
        val resultado = mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"test@zenapses.com","password":"Passw0rd!"}"""))
            .andExpect(status().isOk)
            // ✅ Verificar que las cookies están presentes y tienen los flags correctos
            .andExpect(cookie().exists(CookieService.ACCESS_TOKEN_COOKIE))
            .andExpect(cookie().httpOnly(CookieService.ACCESS_TOKEN_COOKIE, true))
            .andExpect(cookie().secure(CookieService.ACCESS_TOKEN_COOKIE, true))
            .andExpect(cookie().path(CookieService.ACCESS_TOKEN_COOKIE, "/api"))
            .andExpect(cookie().exists(CookieService.REFRESH_TOKEN_COOKIE))
            .andExpect(cookie().httpOnly(CookieService.REFRESH_TOKEN_COOKIE, true))
            .andExpect(cookie().path(CookieService.REFRESH_TOKEN_COOKIE, "/api/v1/auth"))
            // ✅ Verificar que NO hay tokens en el body
            .andExpect(jsonPath("$.accessToken").doesNotExist())
            .andExpect(jsonPath("$.refreshToken").doesNotExist())
            .andExpect(jsonPath("$.usuario").exists())
    }

    @Test
    fun `logout debe limpiar todas las cookies con maxAge=0`() {
        mockMvc.perform(post("/api/v1/auth/logout")
            .cookie(Cookie(CookieService.REFRESH_TOKEN_COOKIE, "valid-refresh-token")))
            .andExpect(status().isNoContent)
            .andExpect(cookie().maxAge(CookieService.ACCESS_TOKEN_COOKIE, 0))
            .andExpect(cookie().maxAge(CookieService.REFRESH_TOKEN_COOKIE, 0))
            .andExpect(cookie().maxAge(CookieService.CSRF_TOKEN_COOKIE, 0))
    }

    @Test
    fun `request autenticado con cookie debe acceder a endpoint protegido`() {
        val validJwt = generarJwtValido()

        mockMvc.perform(post("/api/v1/pedidos/listar")
            .cookie(Cookie(CookieService.ACCESS_TOKEN_COOKIE, validJwt))
            .header("X-XSRF-TOKEN", "csrf-token-valido"))
            .andExpect(status().isOk)
    }

    @Test
    fun `sin cookie ni header debe retornar 401`() {
        mockMvc.perform(post("/api/v1/pedidos/listar"))
            .andExpect(status().isUnauthorized)
    }
}
```

#### Java

```java
// Mismos assertions — MockMvc API es idéntica en Java
mockMvc.perform(post("/api/v1/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"test@zenapses.com\",\"password\":\"Passw0rd!\"}"))
    .andExpect(status().isOk())
    .andExpect(cookie().httpOnly("zns_access_token", true))
    .andExpect(cookie().secure("zns_access_token", true))
    .andExpect(jsonPath("$.accessToken").doesNotExist());
```

#### .NET xUnit

```csharp
[Fact]
public async Task Login_DebeRetornarCookiesHttpOnlyYNoTokensEnBody()
{
    var response = await _client.PostAsJsonAsync("/api/auth/login",
        new { Email = "test@zenapses.com", Password = "Passw0rd!" });

    response.EnsureSuccessStatusCode();

    // Verificar cookies HttpOnly
    var setCookieHeaders = response.Headers.GetValues("Set-Cookie").ToList();
    Assert.Contains(setCookieHeaders, c => c.Contains("zns_access_token") && c.Contains("HttpOnly"));
    Assert.Contains(setCookieHeaders, c => c.Contains("zns_refresh_token") && c.Contains("HttpOnly") && c.Contains("Path=/api/auth"));

    // Sin tokens en el body
    var body = await response.Content.ReadFromJsonAsync<JsonElement>();
    Assert.False(body.TryGetProperty("accessToken", out _));
    Assert.False(body.TryGetProperty("refreshToken", out _));
}

[Fact]
public async Task Logout_DebeLimpiarTodasLasCookies()
{
    var response = await _client.PostAsync("/api/auth/logout", null);
    response.EnsureSuccessStatusCode();

    var setCookieHeaders = response.Headers.GetValues("Set-Cookie").ToList();
    Assert.Contains(setCookieHeaders, c => c.Contains("zns_access_token") && c.Contains("max-age=0"));
    Assert.Contains(setCookieHeaders, c => c.Contains("zns_refresh_token") && c.Contains("max-age=0"));
}
```

---

### 7️⃣ Refresh Token Rotation

La rotación es obligatoria: cada vez que se usa el refresh token, se emite uno nuevo y el anterior se invalida. Este patrón detecta robo de tokens (si un token robado se usa, la rotación lo invalida y también invalida al usuario legítimo, alertando de la brecha).

```kotlin
// application/service/RefreshTokenService.kt
@Service
class RefreshTokenService(
    private val tokenRepository: RefreshTokenRepository,
    private val jwtService: JwtService,
    private val usuarioRepository: UsuarioRepository
) : RefreshTokenUseCase {

    @Transactional
    override fun execute(command: RefreshTokenCommand): RefreshTokenResult {
        // 1. Validar que el token existe y no fue revocado
        val storedToken = tokenRepository.findByToken(command.refreshToken)
            ?: return RefreshTokenResult.TokenInvalido

        if (storedToken.estaRevocado) {
            // ⚠️ Token revocado siendo usado → posible robo → revocar toda la familia
            tokenRepository.revocarFamilia(storedToken.familiaId)
            return RefreshTokenResult.TokenRevocado
        }

        if (storedToken.estaExpirado) {
            return RefreshTokenResult.TokenExpirado
        }

        // 2. Revocar el token actual (rotation)
        tokenRepository.revocar(storedToken.id)

        // 3. Emitir nuevos tokens
        val usuario = usuarioRepository.findById(storedToken.usuarioId)
            ?: return RefreshTokenResult.UsuarioNoEncontrado

        val newAccessToken  = jwtService.generateAccessToken(usuario)
        val newRefreshToken = jwtService.generateRefreshToken(usuario, storedToken.familiaId)
        tokenRepository.save(newRefreshToken)

        return RefreshTokenResult.Exito(
            newAccessToken = newAccessToken.value,
            newRefreshToken = newRefreshToken.value,
            expiresIn = jwtService.accessTokenExpirationSeconds
        )
    }
}
```

---

## ✅ Criterios de Aplicación

- El cliente es un navegador web (SPA Angular/Vue/React, MPA).
- Se quiere eliminar el riesgo de robo de tokens via XSS.
- El frontend puede ajustarse para no leer ni almacenar tokens (simplifica interceptores).
- Se acepta el overhead de implementar protección CSRF.

## ❌ Anti-patrones

- ❌ **`XSRF-TOKEN` con `HttpOnly=true`** — el JS del frontend no podría leerlo para enviarlo como header, rompiendo toda la protección CSRF.
- ❌ **`SameSite=None` sin necesidad real** — requiere `Secure=true` y abre vectores CSRF cross-site. Usar `Strict` siempre que sea posible.
- ❌ **`Path=/` en el refresh token** — el token viaja en TODOS los requests, no solo al endpoint de refresh. Usar `Path=/api/v1/auth`.
- ❌ **Incluir tokens JWT en el body de respuesta cuando ya se usan cookies** — expone el token innecesariamente.
- ❌ **`allowedOrigins = listOf("*")` con `allowCredentials = true`** — viola la especificación CORS y los navegadores lo rechazan; además es un vector de CSRF.
- ❌ **No borrar las cookies en logout** — el usuario no puede cerrar sesión realmente si la cookie permanece.
- ❌ **Refresh token sin rotación** — el robo de un refresh token de larga duración pasa desapercibido indefinidamente.
- ❌ **`csrf.disable()` cuando se usan cookies** — la protección CSRF es obligatoria con autenticación basada en cookies; desactivarla es una vulnerabilidad crítica.
- ❌ **Secrets de JWT en `application.properties`** — siempre en HashiCorp Vault / Azure Key Vault / AWS Secrets Manager.

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Flujo completo login → acceso a recurso → refresh → logout

```
1. POST /api/v1/auth/login { email, password }
   ← 200 OK
      Set-Cookie: zns_access_token=<jwt15min>; HttpOnly; Secure; SameSite=Strict; Path=/api
      Set-Cookie: zns_refresh_token=<jwt7d>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
      Set-Cookie: XSRF-TOKEN=<uuid>; Secure; SameSite=Strict; Path=/   ← NO HttpOnly
      Body: { "usuario": {...}, "expiresIn": 900 }                    ← SIN tokens

2. POST /api/v1/pedidos/crear { ... }
   Cookie: zns_access_token=<jwt15min>         ← Browser envía automáticamente
   X-XSRF-TOKEN: <uuid>                        ← Frontend lee XSRF-TOKEN cookie y lo envía como header
   ← 201 Created { "pedidoId": "..." }

3. (Cuando el access token expira — frontend detecta 401)
   POST /api/v1/auth/refresh
   Cookie: zns_refresh_token=<jwt7d>           ← Solo viaja a /api/v1/auth por Path restrictivo
   ← 200 OK
      Set-Cookie: zns_access_token=<nuevo_jwt15min>; HttpOnly; ...
      Set-Cookie: zns_refresh_token=<nuevo_jwt7d>; HttpOnly; ...  ← Rotation: token anterior revocado

4. POST /api/v1/auth/logout
   Cookie: zns_access_token=...; zns_refresh_token=...
   ← 204 No Content
      Set-Cookie: zns_access_token=; Max-Age=0; ...               ← Borrar cookies
      Set-Cookie: zns_refresh_token=; Max-Age=0; ...
      Set-Cookie: XSRF-TOKEN=; Max-Age=0; ...
```

### Ejemplo 2: Configuración YAML por entorno

```yaml
# application-production.yml
zenapses:
  cookie:
    secure: true
    domain: zenapses.com
  cors:
    allowed-origins:
      - https://app.zenapses.com
      - https://admin.zenapses.com

# application-development.yml
zenapses:
  cookie:
    secure: false    # http en localhost
    domain: localhost
  cors:
    allowed-origins:
      - http://localhost:4200   # Angular dev server
      - http://localhost:3000   # Vue dev server
```

---

## 🔗 Instrucciones de Inyección en Agentes

Añadir en la sección `SKILLS ACTIVAS`:

```markdown
SKILL ACTIVA: httponly-cookie-auth-expert → ver: 2-agents/zns-tools/skills/httponly-cookie-auth-expert.skill.md
```

Añadir fila en tabla resumen de skills:

```markdown
| `httponly-cookie-auth-expert` | Cookies HttpOnly+Secure+SameSite para Access/Refresh Token; CSRF con `CookieCsrfTokenRepository`; CORS `allowCredentials`; `ResponseCookie` builder; extracción dual cookie/header en `JwtAuthenticationFilter`; logout con `maxAge=0`; Refresh Token Rotation; tests `cookie().httpOnly()`; **NUNCA** tokens en body ni `csrf.disable()` con cookies |
```

Y añadir sección de reglas en el agente:

```markdown
### 🍪 HTTPONLY COOKIE AUTH — REGLAS NO NEGOCIABLES

**Cuando el cliente es un navegador web, los tokens JWT se transmiten EXCLUSIVAMENTE por cookies HttpOnly.**

- `zns_access_token` → `HttpOnly=true`, `Secure=true`, `SameSite=Strict`, `Path=/api`, TTL 15 min
- `zns_refresh_token` → `HttpOnly=true`, `Secure=true`, `SameSite=Strict`, `Path=/api/v1/auth`, TTL 7 días
- `XSRF-TOKEN` → `HttpOnly=false` (JS lo lee), `Secure=true`, `SameSite=Strict`, `Path=/`
- **NUNCA** incluir tokens JWT en el body de respuesta cuando se usan cookies
- **NUNCA** `csrf.disable()` — usar `CookieCsrfTokenRepository.withHttpOnlyFalse()`
- **NUNCA** `allowedOrigins = listOf("*")` con `allowCredentials = true`
- `JwtAuthenticationFilter` extrae del cookie primero, luego del header Authorization (dual support para API clients)
- Logout: `maxAge=0` en todas las cookies auth
- Refresh Token Rotation obligatoria: token usado → revocado, nuevo token emitido
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Cookies sin `HttpOnly=true` para access/refresh token | 0 |
| Cookies sin `Secure=true` en producción | 0 |
| `csrf.disable()` con autenticación basada en cookies | 0 |
| Tokens JWT en body de respuesta cuando se usan cookies | 0 |
| `allowedOrigins("*")` + `allowCredentials(true)` | 0 |
| Tests que verifican `HttpOnly` + ausencia de tokens en body | ≥ 1 por endpoint de auth |
| Refresh token sin rotation | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — HttpOnly Cookie Auth Expert  
  Cobertura: Kotlin+SpringBoot, Java+SpringBoot, .NET Core/C#  
  Patrones: CookieService, AuthController/Logout, JwtFilter dual cookie/header, SecurityConfig CSRF+CORS, Refresh Token Rotation, Tests MockMvc+xUnit  
  Referencia: OWASP ASVS 3.4.2/3.4.3/3.4.4 · HU-SEC-001 Zenapses
