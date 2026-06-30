# 🔐 SKILL: ARGON2ID — PASSWORD HASHING EXPERT

**skill_id**: argon2id-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / security / cryptography / authentication  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-backend-go, prompt_dev_senior_flyway  
**referencia**: NIST SP 800-63B, RFC 9106 (Argon2), PHC (Password Hashing Competition 2015)

> **¿Por qué Argon2id?** Es el algoritmo **ganador oficial del Password Hashing Competition** (PHC, 2015) y el recomendado por NIST SP 800-63B. Es memory-hard, time-hard y thread-hard — extremadamente costoso para crackear con GPUs/ASICs. **BCrypt tiene un límite crítico de 72 bytes**: passwords más largos se truncan silenciosamente sin error ni aviso.

---

## 📌 Propósito de la Skill

Esta skill garantiza que todo agente backend ZNS:

- Use exclusivamente **Argon2id** para hashing de passwords (NUNCA BCrypt/PBKDF2/SHA-256/MD5)
- Aplique los **parámetros ZNS estándar** de forma consistente en todos los stacks
- Sepa cómo integrar Argon2id en **Flyway seed data** (pre-computed hashes, NUNCA `crypt()` de pgcrypto)
- Conozca el **formato PHC string** del hash almacenado en BD
- Cubra tests que validen formato de hash, verificación y latencia p95 ≤ 300ms

---

## 🧠 PARTE 1 — ¿Por qué Argon2id y NO BCrypt?

### Comparativa crítica

| Aspecto | BCrypt ❌ | Argon2id ✅ |
|---------|-----------|------------|
| Estándar | No ganó PHC | **Ganador PHC 2015** |
| Recomendado NIST SP 800-63B | No | **Sí** |
| Memory-hard (GPU-resistant) | ❌ NO | ✅ Sí |
| Límite de contraseña | **72 bytes** (trunca silenciosamente 🚨) | Sin límite práctico |
| Dimensiones de costo | Solo tiempo (work factor) | Tiempo + **Memoria** + Paralelismo |
| `pgcrypto crypt()` en SQL | Soportado — ❌ NO usar | No soportado — ✅ hashear en app layer |
| Latencia típica con paráms ZNS | 300–700 ms (cost=12) | **~130–250 ms** (más seguro) |

### Vulnerabilidad crítica de truncación BCrypt

```
❌ PROBLEMA SILENCIOSO — SIN ERROR, SIN AVISO:

password = "P@ssw0rd!EstoEsUnPasswordMuyLargoQueExcedeLos72BytesEnUTF8..."
                           ↓ BCrypt solo hashea hasta aquí
           "P@ssw0rd!EstoEsUnPasswordMuyLargoQueE"   ← 72 bytes

Los caracteres restantes se IGNORAN.
Un atacante que descubra los primeros 72 bytes puede autenticarse.
```

---

## 🧠 PARTE 2 — Parámetros ZNS Estándar

```
Algoritmo:    Argon2id  (variant id — resistente a side-channel attacks)
Versión PHC:  19        (v=19, valor fijo del estándar RFC 9106)
Memoria:      65536 KB  = 64 MB  (m=65536)
Iteraciones:  3                   (t=3)
Paralelismo:  1                   (p=1)
Salt length:  16 bytes  — aleatorio único por hash (NUNCA fijo ni reutilizar)
Hash length:  32 bytes  — output del KDF

Formato PHC resultante en BD:
  $argon2id$v=19$m=65536,t=3,p=1$<base64(salt,16b)>$<base64(hash,32b)>

Longitud total aproximada: ~95 caracteres → VARCHAR(255) es suficiente

Latencia esperada (hardware commodity 2025):
  p50:  ~130-150 ms  ✅
  p95:  ~200-260 ms  ✅  ← SLA ZNS: login p95 ≤ 300 ms
  p99:  ~270-300 ms  ✅
```

---

## 🧠 PARTE 3 — Implementación Kotlin + Spring Boot

```kotlin
// ✅ CORRECTO — Spring Security Argon2PasswordEncoder (incluye BouncyCastle transitivamente)
@Configuration
class SecurityConfig {

    @Bean
    fun passwordEncoder(): PasswordEncoder =
        Argon2PasswordEncoder(
            saltLength  = 16,     // bytes — salt único por hash
            hashLength  = 32,     // bytes — output del KDF
            parallelism = 1,      // threads
            memory      = 65536,  // KB = 64 MB
            iterations  = 3       // pases
        )
}

// En Application Service:
@Service
class RegistrarUsuarioService(
    private val passwordEncoder: PasswordEncoder,
    private val usuarioRepository: UsuarioRepository
) {
    fun ejecutar(cmd: RegistrarUsuarioCommand) {
        // ✅ Hash SIEMPRE en application layer, NUNCA en SQL
        val passwordHash = passwordEncoder.encode(cmd.password)
        // "$argon2id$v=19$m=65536,t=3,p=1$<salt_base64>$<hash_base64>"

        val usuario = Usuario.crear(email = cmd.email, passwordHash = passwordHash)
        usuarioRepository.save(usuario)
    }

    fun verificar(rawPassword: String, storedHash: String): Boolean =
        passwordEncoder.matches(rawPassword, storedHash)
}

// ❌ NUNCA
val encoder = BCryptPasswordEncoder(12)    // 72-byte truncation + no PHC winner
val encoder = BCryptPasswordEncoder()      // cost factor insuficiente (4 por defecto)
```

**Dependencia `build.gradle.kts`:**

```kotlin
// Spring Boot Starter Security ya incluye Argon2PasswordEncoder via BouncyCastle
implementation("org.springframework.boot:spring-boot-starter-security")
// Asegurar BouncyCastle si se excluye spring-security-crypto:
// implementation("org.bouncycastle:bcprov-jdk18on:1.78")
```

---

## 🧠 PARTE 4 — Implementación Java + Spring Boot

```java
// ✅ CORRECTO — mismo API que Kotlin
@Bean
public PasswordEncoder passwordEncoder() {
    return new Argon2PasswordEncoder(
        16,     // saltLength (bytes)
        32,     // hashLength (bytes)
        1,      // parallelism
        65536,  // memory (KB)
        3       // iterations
    );
}

// En Application Service:
@Service
public class AutenticarUsuarioService {

    private final PasswordEncoder passwordEncoder;

    public boolean verificarCredenciales(String rawPassword, String storedHash) {
        return passwordEncoder.matches(rawPassword, storedHash);
    }

    public String hashearPassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
        // Output: "$argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>"
    }
}
```

---

## 🧠 PARTE 5 — Implementación .NET / C#

```bash
# NuGet
dotnet add package Konscious.Security.Cryptography.Argon2
```

```csharp
using Konscious.Security.Cryptography;
using System.Security.Cryptography;
using System.Text;

public class Argon2idHasher : IPasswordHasher
{
    // ZNS standard params
    private const int MemorySize   = 65536;  // KB = 64 MB
    private const int Iterations   = 3;
    private const int Parallelism  = 1;
    private const int SaltLength   = 16;     // bytes
    private const int HashLength   = 32;     // bytes

    public string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltLength);  // ✅ NUNCA salt fijo

        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt                = salt,
            MemorySize          = MemorySize,
            Iterations          = Iterations,
            DegreeOfParallelism = Parallelism
        };

        var hash = argon2.GetBytes(HashLength);

        // PHC format: $argon2id$v=19$m=65536,t=3,p=1$<base64salt>$<base64hash>
        return $"$argon2id$v=19$m={MemorySize},t={Iterations},p={Parallelism}" +
               $"${Convert.ToBase64String(salt).TrimEnd('=')}" +
               $"${Convert.ToBase64String(hash).TrimEnd('=')}";
    }

    public bool VerifyPassword(string password, string encodedHash)
    {
        var parts = encodedHash.Split('$');
        // ["", "argon2id", "v=19", "m=65536,t=3,p=1", salt_b64, hash_b64]
        var salt     = Convert.FromBase64String(PadBase64(parts[4]));
        var expected = Convert.FromBase64String(PadBase64(parts[5]));

        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt                = salt,
            MemorySize          = MemorySize,
            Iterations          = Iterations,
            DegreeOfParallelism = Parallelism
        };
        var computed = argon2.GetBytes(HashLength);

        // ✅ Timing-safe comparison — previene timing attacks
        return CryptographicOperations.FixedTimeEquals(computed, expected);
    }

    private static string PadBase64(string s) =>
        s.PadRight(s.Length + (4 - s.Length % 4) % 4, '=');
}
```

---

## 🧠 PARTE 6 — Implementación Go

```bash
go get golang.org/x/crypto/argon2
```

```go
package auth

import (
    "crypto/rand"
    "crypto/subtle"
    "encoding/base64"
    "fmt"
    "strings"

    "golang.org/x/crypto/argon2"
)

// ZNS standard Argon2id parameters
const (
    Memory      uint32 = 64 * 1024  // 65536 KB = 64 MB
    Iterations  uint32 = 3
    Parallelism uint8  = 1
    SaltLength  uint32 = 16         // bytes
    KeyLength   uint32 = 32         // bytes
)

// HashPassword genera hash Argon2id con parámetros ZNS estándar.
// Formato PHC: $argon2id$v=19$m=65536,t=3,p=1$<base64salt>$<base64hash>
func HashPassword(password string) (string, error) {
    salt := make([]byte, SaltLength)
    if _, err := rand.Read(salt); err != nil {
        return "", fmt.Errorf("argon2id: generating salt: %w", err)
    }

    hash := argon2.IDKey(
        []byte(password),
        salt,
        Iterations,
        Memory,
        Parallelism,
        KeyLength,
    )

    return fmt.Sprintf(
        "$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version,
        Memory, Iterations, Parallelism,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash),
    ), nil
}

// VerifyPassword compara password con hash PHC. Usa timing-safe comparison.
func VerifyPassword(password, encodedHash string) (bool, error) {
    parts := strings.Split(encodedHash, "$")
    // ["", "argon2id", "v=19", "m=65536,t=3,p=1", salt_b64, hash_b64]
    if len(parts) != 6 || parts[1] != "argon2id" {
        return false, fmt.Errorf("argon2id: invalid hash format")
    }

    var m, t uint32
    var p uint8
    if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
        return false, fmt.Errorf("argon2id: parsing params: %w", err)
    }

    salt, err := base64.RawStdEncoding.DecodeString(parts[4])
    if err != nil {
        return false, fmt.Errorf("argon2id: decoding salt: %w", err)
    }

    expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
    if err != nil {
        return false, fmt.Errorf("argon2id: decoding hash: %w", err)
    }

    computedHash := argon2.IDKey([]byte(password), salt, t, m, p, uint32(len(expectedHash)))

    // ✅ Timing-safe — previene timing attacks en verificación
    return subtle.ConstantTimeCompare(computedHash, expectedHash) == 1, nil
}

// ❌ NUNCA
// bcrypt.GenerateFromPassword([]byte(password), 12)  // 72-byte truncation + no PHC
// sha256.Sum256([]byte(password))                     // sin salt → rainbow tables
```

**Benchmark obligatorio:**

```go
func BenchmarkHashPassword(b *testing.B) {
    for i := 0; i < b.N; i++ {
        _, err := HashPassword("SecurePassword123!")
        if err != nil {
            b.Fatal(err)
        }
    }
    // go test -bench=BenchmarkHashPassword -benchtime=10x
    // Expected: ~150 ms/op → debe ser < 300 ms (SLA ZNS login)
}
```

---

## 🧠 PARTE 7 — Flyway / SQL: Reglas para Seed Data

### Regla absoluta: hashing de passwords SIEMPRE en application layer

```sql
-- ❌ ABSOLUTAMENTE PROHIBIDO — pgcrypto solo soporta BCrypt, NO Argon2id
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO authentication_schema.users (email, password_hash)
VALUES (
    'admin@zenapses.com',
    crypt('plainPassword', gen_salt('bf', 10))  -- ❌ BCrypt ($2a$), NO Argon2id
);

-- ❌ También prohibido — texto plano
INSERT INTO authentication_schema.users (email, password_hash)
VALUES ('admin@zenapses.com', 'plain_password');

-- ❌ También prohibido — hash BCrypt hardcodeado ($2a$)
INSERT INTO authentication_schema.users (email, password_hash)
VALUES ('admin@zenapses.com', '$2a$12$someHashedBCryptPassword');
```

```sql
-- ✅ CORRECTO — hash pre-computado con Argon2id en application layer
-- Generar el hash ANTES de la migración usando el seeder del servicio:
--   Spring Boot Kotlin/Java: passwordEncoder.encode("password")
--   Go:  HashPassword("password")
--   .NET: new Argon2idHasher().HashPassword("password")
--
-- El resultado tiene formato $argon2id$v=19$... (NO $2a$ = BCrypt)

INSERT INTO authentication_schema.users (email, password_hash, role, status)
VALUES (
    'super.admin@zenapses.com',
    '$argon2id$v=19$m=65536,t=3,p=1$c2FsdGFsZWF0b3Jz$YWJjZGVmMTIzNDU2Nzg5MEFCQ0RFRg',  -- ← reemplazar con hash real del seeder
    'SUPER_ADMIN',
    'ACTIVE'
) ON CONFLICT (email) DO NOTHING;
```

### COMMENT correcto para columna `password_hash`

```sql
-- ✅ CORRECTO
COMMENT ON COLUMN {schema}.{tabla}.password_hash
    IS 'Hash Argon2id del password (PHC winner, NIST SP 800-63B). ' ||
       'Parámetros ZNS: m=65536,t=3,p=1. ' ||
       'Formato: $argon2id$v=19$m=65536,t=3,p=1$<salt_base64>$<hash_base64>. ' ||
       'NUNCA BCrypt ($2a$). NUNCA texto plano.';

-- ❌ PROHIBIDOS
-- IS 'Hash BCrypt del password (nunca almacenar en texto plano)'
-- IS 'BCrypt hash con cost factor 12 (GDPR compliant)'
-- IS 'Password hasheado con BCrypt (cost factor 12)'
```

---

## 🧠 PARTE 8 — Tests Obligatorios

```kotlin
// Kotlin/Spring Boot
@Test
fun `password hash debe tener formato Argon2id y no BCrypt`() {
    val hash = passwordEncoder.encode("TestPassword123!")

    assertThat(hash).startsWith("\$argon2id\$")            // ✅ NO $2a$ (BCrypt)
    assertThat(hash).doesNotStartWith("\$2a\$")            // ❌ asegura que no es BCrypt
    assertThat(hash).contains("m=65536")                   // ✅ memoria correcta
    assertThat(hash).contains("t=3")                       // ✅ iteraciones correctas
    assertThat(hash).contains("p=1")                       // ✅ paralelismo correcto
}

@Test
fun `verificacion debe retornar true con password correcto`() {
    val raw  = "SecurePassword123!"
    val hash = passwordEncoder.encode(raw)
    assertThat(passwordEncoder.matches(raw, hash)).isTrue()
}

@Test
fun `verificacion debe retornar false con password incorrecto`() {
    val hash = passwordEncoder.encode("SecurePassword123!")
    assertThat(passwordEncoder.matches("WrongPassword!", hash)).isFalse()
}

@Test
fun `dos hashes del mismo password deben diferir por salt aleatorio`() {
    val hash1 = passwordEncoder.encode("SamePassword!")
    val hash2 = passwordEncoder.encode("SamePassword!")
    assertThat(hash1).isNotEqualTo(hash2)  // ✅ salt único por hash
}

@Test
fun `latencia de hasheo debe cumplir SLA p95 menor 300ms`() {
    val latencies = (1..20).map { measureTimeMillis { passwordEncoder.encode("BenchmarkPass!") } }
    val p95 = latencies.sorted()[18]
    assertThat(p95).isLessThan(300L)  // SLA ZNS: login p95 ≤ 300 ms
}
```

---

## ✅ Checklist de Aplicación

- [ ] `PasswordEncoder` configurado como `Argon2PasswordEncoder(16, 32, 1, 65536, 3)` en Spring
- [ ] `argon2.IDKey(pwd, salt, 3, 65536, 1, 32)` con `crypto/rand.Read()` para el salt en Go
- [ ] `Argon2id` con `MemorySize=65536, Iterations=3, DegreeOfParallelism=1` en .NET
- [ ] Sin ninguna referencia a `BCryptPasswordEncoder` / `bcrypt.GenerateFromPassword` / `BCrypt.Net`
- [ ] Sin `crypt()` / `gen_salt('bf', ...)` de pgcrypto en SQL de Flyway
- [ ] COMMENT de `password_hash` menciona Argon2id (NO BCrypt)
- [ ] Seed data SQL usa hash `$argon2id$v=19$...` pre-computado (NO `$2a$`)
- [ ] Test verifica prefijo `$argon2id$`, parámetros (`m=65536,t=3,p=1`) y latencia p95 ≤ 300ms
- [ ] Salt generado con CSPRNG (`SecureRandom` / `crypto/rand` / `RandomNumberGenerator.GetBytes()`)

---

## ❌ Anti-patrones PROHIBIDOS

| ❌ Anti-patrón | ✅ Corrección ZNS |
|----------------|-----------------|
| `BCryptPasswordEncoder(12)` | `Argon2PasswordEncoder(16, 32, 1, 65536, 3)` |
| `BCryptPasswordEncoder()` | Ídem |
| `bcrypt.GenerateFromPassword(pwd, 12)` Go | `argon2.IDKey(pwd, salt, 3, 65536, 1, 32)` |
| `BCrypt.Net-Next.BCrypt.HashPassword()` .NET | `new Argon2id(pwd){ MemorySize=65536, Iterations=3, Parallelism=1 }` |
| `crypt(pwd, gen_salt('bf', N))` pgcrypto SQL | Hash pre-computado Argon2id como string literal |
| `$2a$12$...` (BCrypt) en seed SQL | `$argon2id$v=19$m=65536,t=3,p=1$...` pre-computado |
| Salt fijo o hardcodeado | `crypto/rand` / `SecureRandom` / `RandomNumberGenerator.GetBytes()` |
| PBKDF2 / SHA-256 / MD5 para passwords | Argon2id siempre |
| Verificar password en SQL con `crypt()` | Verificar en APPLICATION LAYER |
| COMMENT dice "BCrypt" en `password_hash` | COMMENT dice "Argon2id" |

---

## 📊 Métricas de Calidad

| Métrica | Valor esperado |
|---------|----------------|
| Instancias de `BCryptPasswordEncoder` en código nuevo | 0 |
| Uso de `crypt()` pgcrypto para passwords en SQL | 0 |
| Hashes BCrypt (`$2a$`) en seed data SQL | 0 |
| COMMENTs de `password_hash` que mencionan BCrypt | 0 |
| Login con Argon2id p95 | ≤ 300 ms |
| Hashes con salt único por contraseña | 100% |
| Tests que verifican prefijo `$argon2id$` | ≥ 1 por servicio de autenticación |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Kotlin/Java/Go/.NET + Flyway rules + BCrypt anti-patterns + tests
