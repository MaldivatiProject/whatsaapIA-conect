# 🔐 SKILL: SECURE CODING EXPERT — Criptografía, Logging, Validación, Sesiones y Autenticación NIST 800-63B

**skill_id**: secure-coding-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / seguridad / criptografía / autenticación  
**last_updated**: 2026-03-18  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-backend-go  
**dependencias**: security-owasp-kotlin (complementaria, no redundante)  
**referencia_stack**: Kotlin 2.1.20 / Spring Boot 3.4.3 / Java 21 / .NET 8 / JJWT 0.12.6 / Spring Security 6 / NIST SP 800-63B / RFC 6238 / JSR-380

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con conocimiento práctico y detallado para implementar **codificación segura** en las cinco áreas críticas que la skill `security-owasp-kotlin` cubre solo a nivel de tabla:

1. **Criptografía aplicada** — algoritmos correctos, gestión de claves, patrones de implementación  
2. **Registro de errores seguro** — qué NO loggear, MDC, structured logging  
3. **Validación, Saneamiento y Codificación de datos** — JSR-380, sanitización HTML, encoding de salida  
4. **Gestión de sesiones JWT** — TTL, rotación, revocación, blacklisting  
5. **Autenticación NIST 800-63B** — AAL levels, requisitos de contraseña, MFA, lockout  

---

## 🧠 PARTE 1 — CRIPTOGRAFÍA APLICADA

### Reglas absolutas de algoritmos

| Categoría | ✅ USAR | ❌ PROHIBIDO | Razón |
|---|---|---|---|
| Hash de passwords | **Argon2id** (preferido) / BCrypt cost≥12 | MD5, SHA-1, SHA-256 sin sal, PBKDF2 con < 100k iter | Resistencia a GPU/ASIC |
| Cifrado simétrico | **AES-256-GCM** (con IV aleatorio 12 bytes) | AES-ECB, AES-CBC sin HMAC, DES, 3DES | ECB leaks patterns; CBC padding oracle |
| Firma asimétrica / JWT | **RS256** (RSA-PSS) o **ES256** (ECDSA P-256) | **HS256 en producción** | HMAC-shared secret → si se filtra, todos los JWT son falsificables |
| Generación de números aleatorios criptográficos | `SecureRandom` / `SecureRandom.getInstanceStrong()` | `Random`, `Math.random()`, `ThreadLocalRandom` | Predecibles con seed conocido |
| Gestión de claves | **KeyStore JKS/PKCS12** o **HashiCorp Vault** | Claves hardcodeadas en código o `.properties` | Variables de entorno como mínimo, Vault en producción |

### Kotlin — Argon2id para passwords

```kotlin
// build.gradle.kts: implementation("org.springframework.security:spring-security-crypto")
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder

@Bean
fun passwordEncoder(): PasswordEncoder =
    Argon2PasswordEncoder(
        saltLength = 16,     // 16 bytes salt
        hashLength = 32,     // 32 bytes hash output
        parallelism = 1,     // hilos
        memory = 65536,      // 64 MB memoria
        iterations = 3       // iteraciones — ajustar a ≥ 500ms en tu hardware
    )
```

> ⚠️ **NUNCA** usar `BCryptPasswordEncoder` para proyectos nuevos — Argon2id es la recomendación actual de OWASP y NIST SP 800-63B.

### Kotlin — AES-256-GCM para datos en reposo

```kotlin
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.security.SecureRandom
import java.util.Base64

object AesGcmService {
    private const val ALGO = "AES/GCM/NoPadding"
    private const val TAG_BIT_LENGTH = 128
    private const val IV_SIZE_BYTES = 12  // 96 bits recomendado para GCM

    fun encrypt(plaintext: ByteArray, key: SecretKey): ByteArray {
        val iv = ByteArray(IV_SIZE_BYTES).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance(ALGO).apply {
            init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(TAG_BIT_LENGTH, iv))
        }
        val ciphertext = cipher.doFinal(plaintext)
        // prefijo IV + ciphertext para que el destinatario pueda descifrar
        return iv + ciphertext
    }

    fun decrypt(ivPlusCiphertext: ByteArray, key: SecretKey): ByteArray {
        val iv = ivPlusCiphertext.copyOfRange(0, IV_SIZE_BYTES)
        val ciphertext = ivPlusCiphertext.copyOfRange(IV_SIZE_BYTES, ivPlusCiphertext.size)
        val cipher = Cipher.getInstance(ALGO).apply {
            init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_BIT_LENGTH, iv))
        }
        return cipher.doFinal(ciphertext)
    }

    // ❌ NUNCA generar clave en runtime sin Vault/KeyStore
    // ✅ En producción: inyectar SecretKey desde Vault
    fun generateKey(): SecretKey =
        KeyGenerator.getInstance("AES").apply { init(256, SecureRandom()) }.generateKey()
}
```

### JJWT 0.12.6 — RS256/ES256 (NUNCA HS256 en producción)

```kotlin
// build.gradle.kts: implementation("io.jsonwebtoken:jjwt-api:0.12.6")
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.util.Date

@Component
class JwtTokenService(
    @Value("\${jwt.access.ttl-minutes:15}") private val accessTtlMinutes: Long,
    private val keyPair: KeyPair  // inyectado desde Vault o KeyStore
) {
    fun generateAccessToken(subject: String, jti: String): String =
        Jwts.builder()
            .subject(subject)
            .id(jti)                                  // ← jti para blacklisting
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + accessTtlMinutes * 60_000))
            .signWith(keyPair.private)                // RS256 o ES256 automático según tipo de clave
            .compact()

    fun parseToken(token: String): Claims =
        Jwts.parser()
            .verifyWith(keyPair.public as java.security.PublicKey)  // verificar con clave pública
            .build()
            .parseSignedClaims(token)
            .payload

    // ❌ PROHIBIDO: .signWith(Keys.hmacShaKeyFor(secret.toByteArray())) en producción
    // ❌ PROHIBIDO: algorithm = HS256, HS384, HS512 en producción multi-servicio
}
```

### Java 21 — Argon2id y AES-GCM (equivalentes)

```java
// Argon2id
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

@Bean
public PasswordEncoder passwordEncoder() {
    return new Argon2PasswordEncoder(16, 32, 1, 65536, 3);
}

// AES-256-GCM — misma API javax.crypto
// KeyPair EC para ES256:
KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
kpg.initialize(new ECGenParameterSpec("secp256r1"), new SecureRandom());
KeyPair keyPair = kpg.generateKeyPair();
```

---

## 🧠 PARTE 2 — REGISTRO DE ERRORES SEGURO

### Lo que NUNCA se registra en logs

```
❌ PROHIBIDO en cualquier nivel de log (ERROR, WARN, INFO, DEBUG):
   - Passwords (ni hasheados)
   - Tokens JWT completos (ni access ni refresh)
   - Números de tarjeta / CVV / cuenta bancaria
   - Números de identificación personal (CURP, CC, DNI, pasaporte)
   - Emails de usuarios (en producción — sí permitido en DEBUG local)
   - Stack traces completos en la respuesta HTTP al cliente
   - Request/Response body completo si contiene campos sensibles
   - Secretos de configuración (API keys, DB passwords)
```

### Lo que SÍ se registra (con semántica de nivel correcta)

| Nivel | Cuándo | Ejemplo |
|---|---|---|
| `ERROR` | Excepción inesperada, fallo de integración, dato corrompido | `"Error al procesar comando RegistrarUsuario correlationId=$cid"` |
| `WARN` | Regla de negocio violada, intento de acceso BOLA, token próximo a expirar | `"BOLA attempt: userId=$uid tried to access resource ownedBy=$owner"` |
| `INFO` | Inicio/fin de Use Case, evento de dominio publicado | `"UsuarioRegistrado userId=$uid"` |
| `DEBUG` | Datos de traza para desarrollo (no en producción) | Parámetros de query, tamaño de payload |

### Kotlin — Patrón MDC con cleanup garantizado

```kotlin
import org.slf4j.MDC

@Component
class UseCaseLogger {
    // ✅ Limpieza garantizada en finally — evita memory leaks en thread pools
    inline fun <T> withContext(correlationId: String, operation: String, block: () -> T): T {
        MDC.put("correlationId", correlationId)
        MDC.put("operation", operation)
        return try {
            block()
        } finally {
            MDC.remove("correlationId")
            MDC.remove("operation")
        }
    }
}

// Uso en Application Service:
fun registrar(command: RegistrarUsuarioCommand): RegistrarUsuarioResult =
    logger.withContext(command.correlationId, "RegistrarUsuario") {
        log.info("Iniciando registro userId=${command.usuarioId}")
        // ❌ NUNCA: log.info("email=${command.email}") en producción
        // ❌ NUNCA: log.info("password=${command.password}")
        userRepository.save(...)
        log.info("Usuario registrado exitosamente userId=${command.usuarioId}")
    }
```

### Logback — Structured JSON (logstash-logback-encoder)

```xml
<!-- logback-spring.xml: producción -->
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
        <includeMdcKeyName>correlationId</includeMdcKeyName>
        <includeMdcKeyName>operation</includeMdcKeyName>
        <!-- ❌ NO incluir: userId, email, requestBody -->
    </encoder>
</appender>
```

```gradle
// build.gradle.kts
implementation("net.logstash.logback:logstash-logback-encoder:7.4")
```

### .NET Core — Serilog estructurado con enrichment seguro

```csharp
// Program.cs
Log.Logger = new LoggerConfiguration()
    .Enrich.WithCorrelationId()         // solo correlationId
    .Enrich.FromLogContext()
    .WriteTo.Console(new JsonFormatter()) // JSON estructurado
    .CreateLogger();

// ❌ PROHIBIDO en cualquier nivel:
// _logger.LogError("Error para user {Email}", command.Email); // → PII en logs
// _logger.LogDebug("Token: {Token}", accessToken);            // → secreto en logs
// ✅ CORRECTO:
// _logger.LogError("Error procesando comando {Operation} correlationId={CorrelationId}", operationName, correlationId);
```

---

## 🧠 PARTE 3 — VALIDACIÓN, SANEAMIENTO Y CODIFICACIÓN DE DATOS

### JSR-380 en DTOs (Kotlin + Java)

```kotlin
// ✅ CORRECTO — validación en DTO de entrada (capa de infraestructura)
data class RegistrarUsuarioRequest(
    @field:NotBlank(message = "El email es requerido")
    @field:Email(message = "Formato de email inválido")
    @field:Size(max = 255)
    val email: String,

    @field:NotBlank
    @field:Size(min = 8, max = 128, message = "La contraseña debe tener entre 8 y 128 caracteres")
    @field:Pattern(
        regexp = "^(?!.*\\s).+$",
        message = "La contraseña no puede contener espacios"
    )
    val password: String,

    @field:NotBlank
    @field:Size(min = 2, max = 100)
    val nombre: String
)

// Controller — activar validación con @Valid
@PostMapping("/registrar")
fun registrar(@Valid @RequestBody request: RegistrarUsuarioRequest): ResponseEntity<UsuarioResponse> { ... }
```

> ⚠️ **NUNCA** usar `HttpStatus.BAD_REQUEST` / lanzar excepciones HTTP desde el dominio.  
> La validación de reglas de negocio retorna tipos sellados en el dominio (`sealed class`); la validación de formato se hace en el DTO con JSR-380.

### Saneamiento HTML — OWASP Java HTML Sanitizer

```kotlin
// build.gradle.kts
implementation("com.googlecode.owasp-java-html-sanitizer:owasp-java-html-sanitizer:20220608.1")

import org.owasp.html.PolicyFactory
import org.owasp.html.Sanitizers

@Component
class HtmlSanitizer {
    // Solo texto plano (sin tags)
    private val strictPolicy: PolicyFactory = Sanitizers.FORMATTING.and(Sanitizers.LINKS)

    fun sanitize(input: String): String = strictPolicy.sanitize(input)

    // Para campos que NO admiten ningún HTML:
    fun sanitizeToPlainText(input: String): String =
        PolicyFactory().sanitize(input)  // policy vacía → elimina TODO html
}
```

### Encoding de output — prevención XSS

```kotlin
// Spring Web — para respuestas que incluyen datos de usuario en HTML
import org.springframework.web.util.HtmlUtils

// ✅ Siempre encodear datos de usuario antes de incluirlos en HTML
val safeNombre = HtmlUtils.htmlEscape(usuario.nombre)

// Para APIs JSON puras (la mayoría del stack ZNS):
// Jackson serializa automáticamente sin riesgo de XSS en JSON
// El riesgo XSS existe solo si el cliente inyecta el JSON en innerHTML sin escapar
```

### Prevención SQL Injection

```kotlin
// ✅ Spring Data JPA — automáticamente previene SQL injection con parámetros nombrados
interface UsuarioRepository : JpaRepository<UsuarioEntity, UUID> {
    fun findByEmailAndActivoTrue(email: String): Optional<UsuarioEntity>  // seguro
    // ⚠️ ADVERTENCIA: NUNCA usar @Query con string concatenation:
    // @Query("SELECT u FROM Usuario u WHERE u.email = '" + email + "'") // ← VULNERABILIDAD CRÍTICA
}

// Si se requiere @Query, usar parámetros nombrados:
@Query("SELECT u FROM UsuarioEntity u WHERE u.email = :email AND u.activo = true")
fun findByEmailActivo(@Param("email") email: String): Optional<UsuarioEntity>
```

### Path Traversal Prevention

```kotlin
// ❌ VULNERABLE — nunca construir rutas con input del usuario directamente
// val file = File("/uploads/" + filename)

// ✅ CORRECTO — normalizar y validar que la ruta resultante está dentro del directorio permitido
fun resolveFileSafely(filename: String, baseDir: Path): Path {
    val resolved = baseDir.resolve(filename).normalize()
    require(resolved.startsWith(baseDir)) {
        "Path traversal detectado: $filename"
    }
    return resolved
}
```

---

## 🧠 PARTE 4 — GESTIÓN DE SESIONES JWT

### Política de TTL y tokens

| Token | TTL | Almacenamiento cliente | Almacenamiento servidor |
|---|---|---|---|
| Access Token | **≤ 15 minutos** | Cookie `HttpOnly` + `Secure` + `SameSite=Strict` | Stateless (no almacenar) |
| Refresh Token | **7 días** (configurable) | Cookie `HttpOnly` + `Secure` + `SameSite=Strict` (path=/api/v1/auth) | Redis con TTL = misma duración |

### Refresh Token Rotation + Family Revocation

```kotlin
@Service
class RefreshTokenService(
    private val redisTemplate: StringRedisTemplate,
    private val jwtTokenService: JwtTokenService
) {
    private val tokenTtl = Duration.ofDays(7)

    // ✅ Patrón: al usar un refresh token se invalida y emite uno nuevo
    fun rotate(refreshToken: String): RefreshTokenResult {
        val jti = jwtTokenService.parseToken(refreshToken).id
        val storedToken = redisTemplate.opsForValue().get("refresh:$jti")
            ?: return RefreshTokenResult.Invalido  // token no existe → ya fue usado o expiró

        // Detectar reutilización → Refresh Token Family Revocation
        if (storedToken != refreshToken) {
            revokeFamily(jti)  // ⚠️ posible robo de token — invalidar toda la familia
            return RefreshTokenResult.PosibleRobo
        }

        redisTemplate.delete("refresh:$jti")  // invalidar el token usado

        val newJti = UUID.randomUUID().toString()
        val newRefreshToken = jwtTokenService.generateRefreshToken(newJti)
        redisTemplate.opsForValue().set("refresh:$newJti", newRefreshToken, tokenTtl)

        return RefreshTokenResult.Exitoso(newRefreshToken)
    }

    fun revokeFamily(jti: String) {
        // En implementación completa: marcar toda la familia como revocada
        redisTemplate.delete("refresh:$jti")
    }
}

sealed class RefreshTokenResult {
    data class Exitoso(val newRefreshToken: String) : RefreshTokenResult()
    object Invalido : RefreshTokenResult()
    object PosibleRobo : RefreshTokenResult()
}
```

### JWT ID (jti) para blacklisting de Access Tokens

```kotlin
@Component
class JwtBlacklistService(private val redisTemplate: StringRedisTemplate) {

    // Llamar en logout o cuando se detecta compromiso
    fun revokeAccessToken(jti: String, remainingTtl: Duration) {
        redisTemplate.opsForValue().set("blacklist:$jti", "revoked", remainingTtl)
    }

    fun isRevoked(jti: String): Boolean =
        redisTemplate.hasKey("blacklist:$jti") == true
}

// En JwtAuthenticationFilter — verificar blacklist antes de permitir acceso
@Component
class JwtAuthenticationFilter(
    private val jwtTokenService: JwtTokenService,
    private val blacklistService: JwtBlacklistService
) : OncePerRequestFilter() {
    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val token = extractToken(request) ?: run { chain.doFilter(request, response); return }
        val claims = jwtTokenService.parseToken(token)
        val jti = claims.id

        if (blacklistService.isRevoked(jti)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token revocado")
            return
        }

        // continuar con autenticación normal
        chain.doFilter(request, response)
    }
}
```

### Logout seguro

```kotlin
@PostMapping("/logout")
fun logout(
    request: HttpServletRequest,
    response: HttpServletResponse,
    authentication: Authentication
): ResponseEntity<Void> {
    // 1. Revocar access token actual (jti en blacklist por el TTL restante)
    val token = cookieService.extractAccessToken(request)
    token?.let {
        val claims = jwtTokenService.parseToken(it)
        val remainingTtl = Duration.ofMillis(claims.expiration.time - System.currentTimeMillis())
        blacklistService.revokeAccessToken(claims.id, remainingTtl)
    }

    // 2. Revocar refresh token en Redis
    val refreshToken = cookieService.extractRefreshToken(request)
    refreshToken?.let { refreshTokenService.revoke(it) }

    // 3. Eliminar cookies — maxAge = 0
    response.addHeader(HttpHeaders.SET_COOKIE, cookieService.deleteAccessTokenCookie().toString())
    response.addHeader(HttpHeaders.SET_COOKIE, cookieService.deleteRefreshTokenCookie().toString())

    return ResponseEntity.noContent().build()
}
```

---

## 🧠 PARTE 5 — AUTENTICACIÓN NIST 800-63B

### Niveles de Assurance (AAL)

| Nivel | Nombre | Qué requiere | Cuándo usar en ZNS |
|---|---|---|---|
| **AAL1** | Single-factor | Password o factor único | Consultas de bajo riesgo |
| **AAL2** | Multi-factor | Password + TOTP/SMS OTP o passkey | Operaciones financieras, cambios de cuenta |
| **AAL3** | Hardware-bound MFA | Token físico (FIDO2/WebAuthn hardware key) | Operaciones críticas de admin |

### Requisitos de contraseña según NIST 800-63B § 5.1.1

```
✅ REQUERIMIENTOS:
   - Longitud mínima: 8 caracteres (NIST recomienda mínimo 8, máximo 64+)
   - Longitud máxima: 128 caracteres (permitir frases largas)
   - Verificar contra listas de contraseñas comprometidas (Have I Been Pwned API o lista local)
   - Permitir TODOS los caracteres Unicode imprimibles (incluido espacio)
   - Mostrar medidor de fortaleza al usuario (opcional pero recomendado)

❌ PROHIBIDO según NIST 800-63B:
   - Exigir mezcla de mayúsculas/minúsculas/números/símbolos (complexity rules)
   - Rotación periódica obligatoria (solo al detectar compromiso)
   - Preguntas de seguridad ("¿Nombre de tu mascota?")
   - Truncar contraseñas silenciosamente
   - Limitar la longitud a < 64 caracteres
```

```kotlin
@Component
class PasswordPolicyValidator(
    private val compromisedPasswordChecker: CompromisedPasswordChecker  // Spring Security 6.3+
) {
    fun validate(plainPassword: String): List<String> {
        val errores = mutableListOf<String>()

        if (plainPassword.length < 8) errores.add("La contraseña debe tener al menos 8 caracteres")
        if (plainPassword.length > 128) errores.add("La contraseña no puede superar 128 caracteres")

        // Verificar contra lista Have I Been Pwned (Spring Security 6.3+)
        val checkResult = compromisedPasswordChecker.check(plainPassword)
        if (checkResult.isCompromised) {
            errores.add("Esta contraseña ha sido comprometida en filtraciones conocidas. Elige una diferente.")
        }

        return errores
    }
}

// Configurar en Spring Security:
@Bean
fun compromisedPasswordChecker(): CompromisedPasswordChecker =
    HaveIBeenPwnedRestApiPasswordChecker()  // llama a la API k-anonymity de HIBP
```

### TOTP (RFC 6238) — Autenticación Multi-Factor AAL2

```kotlin
// build.gradle.kts: implementation("dev.samstevens.totp:totp-spring-boot-starter:1.7.1")
import dev.samstevens.totp.code.CodeVerifier
import dev.samstevens.totp.secret.SecretGenerator
import dev.samstevens.totp.qr.QrGenerator

@Service
class TotpService(
    private val secretGenerator: SecretGenerator,
    private val codeVerifier: CodeVerifier,
    private val qrGenerator: QrGenerator
) {
    fun generateSecret(): String = secretGenerator.generate()

    fun verifyCode(secret: String, code: String): Boolean =
        codeVerifier.isValidCode(secret, code)  // ventana de ±1 paso de tiempo (30s)

    // ❌ NUNCA: verificar solo el código sin el secreto del usuario específico
    // ❌ NUNCA: aceptar el mismo código TOTP dos veces (replay attack)
}
```

### Account Lockout Policy

```kotlin
@Service
class AccountLockoutService(private val redisTemplate: StringRedisTemplate) {

    companion object {
        const val MAX_INTENTOS = 5
        val VENTANA_BLOQUEO = Duration.ofMinutes(30)
    }

    fun registrarIntentoFallido(identifier: String): LockoutStatus {
        val key = "lockout:$identifier"
        val intentos = redisTemplate.opsForValue().increment(key) ?: 1L

        if (intentos == 1L) {
            // Primer intento fallido — establecer TTL de la ventana
            redisTemplate.expire(key, VENTANA_BLOQUEO)
        }

        return when {
            intentos >= MAX_INTENTOS -> {
                // Backoff exponencial: 30 min * 2^(intentos - MAX) hasta 24h
                val backoffMinutes = minOf(30L * (1L shl (intentos - MAX_INTENTOS).toInt()), 1440L)
                redisTemplate.expire(key, Duration.ofMinutes(backoffMinutes))
                LockoutStatus.Bloqueado(intentosRestantes = 0, minutosBloqueo = backoffMinutes)
            }
            else -> LockoutStatus.Advertencia(intentosRestantes = MAX_INTENTOS - intentos.toInt())
        }
    }

    fun estasBloqueado(identifier: String): Boolean {
        val intentos = redisTemplate.opsForValue().get("lockout:$identifier")?.toLongOrNull() ?: 0L
        return intentos >= MAX_INTENTOS
    }

    fun limpiarIntentos(identifier: String) {
        redisTemplate.delete("lockout:$identifier")  // al autenticar exitosamente
    }
}

sealed class LockoutStatus {
    data class Bloqueado(val intentosRestantes: Int, val minutosBloqueo: Long) : LockoutStatus()
    data class Advertencia(val intentosRestantes: Int) : LockoutStatus()
    object Libre : LockoutStatus()
}
```

> ⚠️ **NIST 800-63B prohíbe revelar si el email existe** en mensajes de error de login.  
> Respuesta correcta ante credenciales incorrectas: `"Credenciales inválidas"` (NUNCA "email no registrado" ni "contraseña incorrecta").

### .NET Core — Equivalentes C#

```csharp
// Argon2id con ASP.NET Core Identity
services.Configure<PasswordHasherOptions>(options => {
    // ASP.NET Core Identity usa PBKDF2 por defecto.
    // Para Argon2id, usar biblioteca Konscious.Security.Cryptography:
    // dotnet add package Konscious.Security.Cryptography.Argon2
});

// Argon2id implementation
using Konscious.Security.Cryptography;

public class Argon2PasswordHasher : IPasswordHasher<ApplicationUser>
{
    public string HashPassword(ApplicationUser user, string password)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = RandomNumberGenerator.GetBytes(16),
            DegreeOfParallelism = 1,
            MemorySize = 65536,  // 64 MB
            Iterations = 3
        };
        var hash = argon2.GetBytes(32);
        return Convert.ToBase64String(argon2.Salt) + ":" + Convert.ToBase64String(hash);
    }
    // ... VerifyHashedPassword
}

// AES-256-GCM en C#
using System.Security.Cryptography;

public static (byte[] nonce, byte[] ciphertext, byte[] tag) EncryptAesGcm(byte[] plaintext, byte[] key)
{
    using var aesGcm = new AesGcm(key, AesGcm.TagByteSizes.MaxSize);
    var nonce = new byte[AesGcm.NonceByteSizes.MaxSize];  // 12 bytes
    RandomNumberGenerator.Fill(nonce);
    var ciphertext = new byte[plaintext.Length];
    var tag = new byte[AesGcm.TagByteSizes.MaxSize];  // 16 bytes
    aesGcm.Encrypt(nonce, plaintext, ciphertext, tag);
    return (nonce, ciphertext, tag);
}

// Account lockout — ASP.NET Core Identity nativo
services.Configure<LockoutOptions>(options => {
    options.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(30);
    options.MaxFailedAccessAttempts = 5;
    options.AllowedForNewUsers = true;
});
```

---

## ✅ CHECKLIST DE AUDITORÍA — SECURE CODING

### Criptografía
- [ ] Passwords hasheados con Argon2id (no BCrypt, no SHA-256)
- [ ] Datos sensibles en reposo cifrados con AES-256-GCM (no AES-ECB, no AES-CBC)
- [ ] JWT firmados con RS256/ES256 (no HS256 en producción)
- [ ] Claves gestionadas por Vault o KeyStore (no hardcodeadas, no en `.properties`)
- [ ] `SecureRandom` para toda generación de valores aleatorios criptográficos

### Registro de errores
- [ ] CERO campos PII, passwords o tokens en logs
- [ ] `MDC.remove()` en bloque `finally` (no hay MDC leak entre requests)
- [ ] Stack traces NO expuestos al cliente (solo en logs internos)
- [ ] Logback/Serilog producen JSON estructurado con `correlationId`

### Validación / Saneamiento / Codificación
- [ ] Todos los DTOs tienen anotaciones `@Valid` + JSR-380
- [ ] Campos de texto libre con HTML sanitizados con OWASP Java HTML Sanitizer
- [ ] Sin concatenación de strings en `@Query` de Spring Data
- [ ] Path traversal verificado en uploads de archivos

### Gestión de sesiones
- [ ] Access token TTL ≤ 15 minutos
- [ ] Refresh token en Redis con TTL, Refresh Token Rotation activo
- [ ] Logout revoca access token (`jti` en blacklist) y refresh token (elimina de Redis)
- [ ] `jti` único por token (UUID v4)

### Autenticación NIST 800-63B
- [ ] Contraseña: mínimo 8 chars, máximo ≥ 128, sin complexity rules
- [ ] Verificación contra breached passwords (HIBP o lista local)
- [ ] Account lockout después de 5 intentos fallidos con backoff exponencial
- [ ] Mensaje de error de login NO revela si el email existe
- [ ] MFA disponible (TOTP RFC 6238) para operaciones AAL2
