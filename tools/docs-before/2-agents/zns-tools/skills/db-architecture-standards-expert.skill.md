# 🗄️ SKILL: DATABASE ARCHITECTURE STANDARDS — EXPERT

**skill_id**: db-architecture-standards-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / database / standards / flyway  
**last_updated**: 2026-03-20  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt_dev_senior_flyway, prompt-dev-backend-go  
**dependencias**: performance-mandatory-100ms-expert (complementaria — cubre índices desde la perspectiva de SLA de endpoints)  
**referencia_stack**: PostgreSQL 16 / Flyway 10.x / Spring Boot 3.4.x / Kotlin 2.1.20 / Java 21 / .NET 8 + Npgsql  
**agente_propietario**: 2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md

> **¿Por qué existe esta skill?** El agente `prompt_dev_database_senior.md` contiene el conocimiento completo de diseño de BD. Esta skill extrae las **reglas no negociables que todo desarrollador backend y el agente Flyway deben aplicar** al escribir código JPA/EF Core o scripts de migración. Para decisiones de diseño avanzado, escalar al agente completo.

---

## 📌 Propósito de la Skill

Esta skill equipa a los agentes de desarrollo backend (Kotlin, Java, .NET) y al agente Flyway con los **estándares de base de datos ZNS no negociables**, garantizando que:

- Toda tabla sigue el **Dual Key Pattern** (BIGINT interno + UUID externo)
- Toda tabla incluye los **4 campos obligatorios estándar** en el orden correcto
- Los **schemas reflejan los Bounded Contexts** (DDD)
- Los **índices se crean siempre** en campos de búsqueda, FK y UUID
- La **nomenclatura es consistente** en toda la BD (pk_, uk_, fk_, ck_, idx_)
- El **soft delete** se implementa con `expiration_date`, nunca con `deleted_at`/`is_deleted`
- Toda tabla y columna tienen **COMMENT** obligatorio

---

## 🧠 PARTE 1 — DUAL KEY PATTERN (ESTÁNDAR ZNS OBLIGATORIO)

### Regla de oro

**TODO ID en ZNS tiene dos representaciones:**
- `pkid_{tabla}` — clave interna (BIGINT, JOINs/FKs, NUNCA en API)
- `uuid_{tabla}` — clave externa (UUID, URLs/JSON, NUNCA en JOINs)

```sql
-- ✅ CORRECTO — Dual Key Pattern ZNS
CREATE TABLE authentication_schema.users (
    pkid_users  BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,   -- interno
    uuid_users  UUID   DEFAULT gen_random_uuid()   NOT NULL,   -- externo (API)
    -- ...
    CONSTRAINT pk_users   PRIMARY KEY (pkid_users),
    CONSTRAINT uk_users_uuid UNIQUE (uuid_users)
);
CREATE INDEX idx_users_uuid ON authentication_schema.users(uuid_users);

-- ❌ PROHIBIDO — nunca usar en ZNS
id          SERIAL              -- BIGSERIAL legacy, no estándar SQL
id          UUID PRIMARY KEY    -- performance pobre en JOINs masivos
id          INTEGER             -- límite de 2B registros
user_id     BIGINT              -- nombre ambiguo dentro de la tabla users
```

### Benchmark que justifica el patrón

```
10M registros, 100K JOINs:
- Solo UUID (PK):      380 ms, índices 420 MB
- Solo BIGINT (PK):    250 ms, índices 200 MB ← inseguro, enumerable
- DUAL KEY (BIGINT+UUID): 255 ms, índices 220 MB ← GANADOR: +2% sobre BIGINT puro, con seguridad total
```

### Por qué `GENERATED ALWAYS AS IDENTITY` y no `BIGSERIAL`

| Aspecto | `GENERATED ALWAYS AS IDENTITY` ✅ | `BIGSERIAL` ❌ |
|---------|----------------------------------|--------------|
| Estándar | SQL Standard (ISO) | Solo PostgreSQL |
| Seguridad | `ALWAYS` previene INSERT manual | Permite override accidental |
| Portabilidad | Oracle, SQL Server, DB2 | Solo PostgreSQL |
| Namespacing | No crea sequence automática | Contamina namespace |

---

## 🧠 PARTE 2 — PLANTILLA OBLIGATORIA DE TODA TABLA ZNS

### Los 4 campos + constraints + índice mínimo

```sql
-- PLANTILLA MÍNIMA — aplicar a TODA tabla sin excepción
CREATE TABLE {schema}.{tabla} (

    -- ═══════════════════════════════════════════════════
    -- CAMPOS OBLIGATORIOS ESTÁNDAR (SIEMPRE PRIMEROS 4)
    -- ═══════════════════════════════════════════════════
    pkid_{tabla}     BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,  -- 1. PK interno
    uuid_{tabla}     UUID   DEFAULT gen_random_uuid()   NOT NULL,   -- 2. ID externo
    creation_date    TIMESTAMPTZ DEFAULT NOW()          NOT NULL,   -- 3. Auditoría
    expiration_date  TIMESTAMPTZ                            NULL,   -- 4. Soft delete

    -- Campos de negocio aquí...

    CONSTRAINT pk_{tabla}      PRIMARY KEY (pkid_{tabla}),
    CONSTRAINT uk_{tabla}_uuid UNIQUE      (uuid_{tabla})
);

-- Índice en UUID — OBLIGATORIO en toda tabla principal
CREATE INDEX idx_{tabla}_uuid ON {schema}.{tabla}(uuid_{tabla});

-- Comentarios — OBLIGATORIOS
COMMENT ON TABLE  {schema}.{tabla}           IS 'Aggregate Root / Entity: [descripción]';
COMMENT ON COLUMN {schema}.{tabla}.pkid_{tabla}    IS 'PK interno BIGINT IDENTITY. Usar para JOINs/FKs. NUNCA exponer en API.';
COMMENT ON COLUMN {schema}.{tabla}.uuid_{tabla}    IS 'UUID externo para API/URLs. Exponer al cliente.';
COMMENT ON COLUMN {schema}.{tabla}.creation_date   IS 'Fecha de creación del registro (inmutable).';
COMMENT ON COLUMN {schema}.{tabla}.expiration_date IS 'Soft delete: NULL = ACTIVO, NOT NULL = fecha de eliminación lógica.';
```

### Reglas de los 4 campos

| Campo | Tipo | Valor por defecto | Regla |
|-------|------|-------------------|-------|
| `pkid_{tabla}` | `BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL` | auto | NUNCA exponer en API ni URL |
| `uuid_{tabla}` | `UUID DEFAULT gen_random_uuid() NOT NULL` | auto | SIEMPRE exponer en API; NUNCA en JOINs |
| `creation_date` | `TIMESTAMPTZ DEFAULT NOW() NOT NULL` | `NOW()` | Inmutable; no actualizar en UPDATEs |
| `expiration_date` | `TIMESTAMPTZ NULL` | `NULL` | `NULL` = registro activo; NOT NULL = eliminado lógicamente |

**Aliases PROHIBIDOS:**

| En lugar de... | Usar... |
|----------------|---------|
| `created_at` | `creation_date` |
| `deleted_at` / `is_deleted` / `active` | `expiration_date` |
| `id` / `user_id` (en tabla users) | `pkid_users` |
| `updated_at` | Campo separado si el negocio lo requiere (no obligatorio) |

---

## 🧠 PARTE 3 — SCHEMAS POR BOUNDED CONTEXT

### Estructura de schemas ZNS (PostgreSQL)

```
{database}
├── authentication_schema    → Bounded Context: Identidad y Auth
│   ├── users                → Aggregate Root
│   ├── roles                → Entity
│   ├── permissions          → Entity
│   └── sessions             → Entity
│
├── {contexto}_schema        → Bounded Context: [nombre dominio]
│   ├── {aggregate}          → Aggregate Root
│   └── {entidad}            → Value Object / Entity dependiente
│
└── shared_schema            → Shared Kernel (catálogos, audit)
    ├── countries, currencies, languages
    └── domain_events        → Event Store
```

### Reglas de schemas

- **1 schema = 1 Bounded Context** — nunca mezclar BCs en el mismo schema
- **Nombre**: `{contexto}_schema` en snake_case
- **FKs cross-schema**: permitidas pero documentadas explícitamente con `COMMENT`
- **FKs cross-schema**: solo usan `pkid_` (BIGINT) — nunca UUIDs para JOINs
- **Migración Flyway**: cada schema en su propio directorio `db/migration/{contexto}/`

---

## 🧠 PARTE 4 — NOMENCLATURA DE CONSTRAINTS E ÍNDICES

### Convención estándar ZNS

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Primary Key | `pk_{tabla}` | `pk_users` |
| Unique | `uk_{tabla}_{campo(s)}` | `uk_users_email`, `uk_users_uuid` |
| Foreign Key | `fk_{tabla}_{tabla_referenciada}` | `fk_bookings_users` |
| Check | `ck_{tabla}_{campo}` | `ck_users_role`, `ck_users_email_format` |
| Index simple | `idx_{tabla}_{campo}` | `idx_users_email` |
| Index compuesto | `idx_{tabla}_{campo1}_{campo2}` | `idx_bookings_student_status` |
| Index UUID | `idx_{tabla}_uuid` | `idx_users_uuid` |
| Index FK | `idx_{tabla}_fk_{tabla_ref}` | `idx_bookings_fk_users` |

### Índices obligatorios por tipo de campo

```sql
-- ✅ SIEMPRE crear índice en:

-- 1. UUID externo de toda tabla
CREATE INDEX idx_{tabla}_uuid ON {schema}.{tabla}(uuid_{tabla});

-- 2. FK columns (todo campo fk_pkid_*)
CREATE INDEX idx_{tabla}_fk_{ref}
    ON {schema}.{tabla}(fk_pkid_{ref});

-- 3. Campos usados en WHERE frecuentes (email, status, role, etc.)
CREATE INDEX idx_users_email
    ON authentication_schema.users(email)
    WHERE expiration_date IS NULL;  -- partial index: solo registros activos

-- 4. Campos de ordenación (created_at DESC, registration_date DESC)
CREATE INDEX idx_users_creation_date
    ON authentication_schema.users(creation_date DESC);

-- 5. Campos de búsqueda full-text (si aplica)
CREATE INDEX idx_products_name_fts
    ON catalog_schema.products USING GIN(to_tsvector('spanish', name));

-- ✅ Índice parcial estándar para registros activos
CREATE INDEX idx_{tabla}_activos
    ON {schema}.{tabla}(status)
    WHERE expiration_date IS NULL;
```

### Tipos de índice PostgreSQL y cuándo usar cada uno

| Tipo | Usar cuando | Ejemplo |
|------|------------|---------|
| **B-tree** (default) | `=`, `<`, `>`, `BETWEEN`, `ORDER BY`, `LIKE 'prefix%'` | `idx_users_email` |
| **GIN** | Arrays, JSONB, full-text search | `idx_products_tags_gin` |
| **BRIN** | Columnas de fecha en tablas masivas (INSERTs secuenciales) | `idx_events_created_brin` |
| **GiST** | Geolocalización (PostGIS), rangos | `idx_locations_coords` |
| **Hash** | Solo igualdad exacta, memoria limitada | Raramente necesario |

---

## 🧠 PARTE 5 — FOREIGN KEYS: PATRÓN ZNS

```sql
-- ✅ FKs siempre usan BIGINT interno (pkid_*)
CREATE TABLE bookings_schema.bookings (
    pkid_bookings       BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_bookings       UUID DEFAULT gen_random_uuid() NOT NULL,
    creation_date       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expiration_date     TIMESTAMPTZ NULL,

    -- FKs — BIGINT, no UUID (performance)
    fk_pkid_users_student  BIGINT NOT NULL,   -- → authentication_schema.users.pkid_users
    fk_pkid_tutors         BIGINT NOT NULL,   -- → marketplace_schema.tutors.pkid_tutors

    status      VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    version     INT NOT NULL DEFAULT 1,        -- optimistic locking

    CONSTRAINT pk_bookings        PRIMARY KEY (pkid_bookings),
    CONSTRAINT uk_bookings_uuid   UNIQUE (uuid_bookings),
    CONSTRAINT fk_bookings_users  FOREIGN KEY (fk_pkid_users_student)
        REFERENCES authentication_schema.users(pkid_users)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_bookings_tutors FOREIGN KEY (fk_pkid_tutors)
        REFERENCES marketplace_schema.tutors(pkid_tutors)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_bookings_status CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED'))
);

-- Índices en FK — OBLIGATORIOS
CREATE INDEX idx_bookings_fk_users  ON bookings_schema.bookings(fk_pkid_users_student);
CREATE INDEX idx_bookings_fk_tutors ON bookings_schema.bookings(fk_pkid_tutors);
CREATE INDEX idx_bookings_uuid      ON bookings_schema.bookings(uuid_bookings);
CREATE INDEX idx_bookings_status    ON bookings_schema.bookings(status)
    WHERE expiration_date IS NULL;

COMMENT ON TABLE  bookings_schema.bookings                        IS 'Aggregate Root: Reserva entre estudiante y tutor.';
COMMENT ON COLUMN bookings_schema.bookings.fk_pkid_users_student  IS 'FK → authentication_schema.users.pkid_users (estudiante). Usar pkid interno para JOINs.';
COMMENT ON COLUMN bookings_schema.bookings.version                IS 'Optimistic locking — incrementa en cada UPDATE para detectar conflictos concurrentes.';
```

---

## 🧠 PARTE 6 — MAPPING JPA / EF CORE CON DUAL KEY

### Kotlin + Spring Boot (JPA)

```kotlin
// infrastructure/adapter/out/persistence/UsuarioJpaEntity.kt
@Entity
@Table(name = "users", schema = "authentication_schema")
class UsuarioJpaEntity(

    // ✅ PK interno — no exponer en API
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pkid_users")
    val pkidUsers: Long = 0,

    // ✅ UUID externo — exponer en API
    @Column(name = "uuid_users", nullable = false, unique = true, updatable = false)
    val uuidUsers: UUID = UUID.randomUUID(),

    @Column(name = "creation_date", nullable = false, updatable = false)
    val creationDate: OffsetDateTime = OffsetDateTime.now(),

    // expiration_date = null → activo; not null → soft delete
    @Column(name = "expiration_date")
    var expirationDate: OffsetDateTime? = null,

    @Column(name = "email", nullable = false)
    val email: String,

    @Column(name = "password_hash", nullable = false)
    var passwordHash: String,

    @Column(name = "version", nullable = false)
    @Version  // ← optimistic locking
    var version: Int = 1
)

// Repository — búsquedas por UUID (API), JOINs internos por pkid
interface UsuarioJpaRepository : JpaRepository<UsuarioJpaEntity, Long> {

    // ✅ Buscar por UUID (el cliente envía UUID)
    fun findByUuidUsersAndExpirationDateIsNull(uuid: UUID): Optional<UsuarioJpaEntity>

    // ✅ Soft delete activos: WHERE expiration_date IS NULL
    fun findAllByExpirationDateIsNull(pageable: Pageable): Slice<UsuarioJpaEntity>

    // ✅ NO: findById(UUID) — UUID no es el PK; pkid es el PK interno
    // ✅ JOIN usa pkid (BIGINT) — nunca UUID
}
```

### Java + Spring Boot (JPA)

```java
@Entity
@Table(name = "users", schema = "authentication_schema")
public class UsuarioJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pkid_users")
    private Long pkidUsers;

    @Column(name = "uuid_users", nullable = false, unique = true, updatable = false)
    private UUID uuidUsers = UUID.randomUUID();

    @Column(name = "creation_date", nullable = false, updatable = false)
    private OffsetDateTime creationDate = OffsetDateTime.now();

    @Column(name = "expiration_date")
    private OffsetDateTime expirationDate;  // null = activo

    @Version  // optimistic locking
    @Column(name = "version", nullable = false)
    private Integer version = 1;

    // ❌ NUNCA: @Id sobre uuid_users
    // ❌ NUNCA: exponer pkidUsers en el DTO de respuesta
}
```

### .NET / EF Core (C#)

```csharp
// Infrastructure/Persistence/Entities/UsuarioEntity.cs
[Table("users", Schema = "authentication_schema")]
public class UsuarioEntity
{
    // ✅ PK interno — EF mapea con ValueGeneratedOnAdd()
    [Key]
    [Column("pkid_users")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long PkidUsers { get; init; }

    // ✅ UUID externo — exponer en API
    [Column("uuid_users")]
    [Required]
    public Guid UuidUsers { get; init; } = Guid.NewGuid();

    [Column("creation_date")]
    [Required]
    public DateTimeOffset CreationDate { get; init; } = DateTimeOffset.UtcNow;

    // null = activo; not null = eliminado lógicamente
    [Column("expiration_date")]
    public DateTimeOffset? ExpirationDate { get; set; }

    [Column("version")]
    [Timestamp]  // optimistic concurrency EF Core
    public uint Version { get; set; }
}

// EF Core — configuración en OnModelCreating
modelBuilder.Entity<UsuarioEntity>(entity =>
{
    entity.HasIndex(u => u.UuidUsers)
          .IsUnique()
          .HasDatabaseName("uk_users_uuid");

    entity.HasIndex(u => u.UuidUsers)
          .HasDatabaseName("idx_users_uuid");

    // Soft delete global query filter — WHERE expiration_date IS NULL
    entity.HasQueryFilter(u => u.ExpirationDate == null);
    // ⚠️ IgnoreQueryFilters() cuando se necesite incluir eliminados

    entity.Property(u => u.CreationDate).ValueGeneratedOnAdd();
});
```

---

## 🧠 PARTE 7 — SOFT DELETE: PATRÓN `expiration_date`

### Regla ZNS

```sql
-- ✅ Soft delete ZNS — usa expiration_date
UPDATE authentication_schema.users
SET expiration_date = NOW()
WHERE pkid_users = 42;  -- usando pkid interno

-- ✅ Query de registros activos — patrón canónico
SELECT * FROM authentication_schema.users
WHERE expiration_date IS NULL;

-- ✅ Índice parcial estándar — mejora queries de activos
CREATE INDEX idx_users_activos_email
    ON authentication_schema.users(email)
    WHERE expiration_date IS NULL;

-- ❌ PROHIBIDO en ZNS
UPDATE users SET deleted_at = NOW() WHERE id = 42;    -- nombre incorrecto
UPDATE users SET is_deleted = TRUE WHERE id = 42;     -- boolean frágil
UPDATE users SET active = FALSE WHERE id = 42;        -- semánticamente débil
DELETE FROM users WHERE id = 42;                       -- hard delete sin backup
```

### Spring Boot — filtro global JPA para soft delete

```kotlin
// Agrega en el JpaEntity del Aggregate Root
@Entity
@Table(name = "users", schema = "authentication_schema")
@Where(clause = "expiration_date IS NULL")  // ← filtro global: Spring Data solo devuelve activos
class UsuarioJpaEntity(...)

// ✅ Para queries que necesitan incluir eliminados (admin, auditoría):
@Query("SELECT u FROM UsuarioJpaEntity u WHERE u.email = :email",
       nativeQuery = false)  // override de @Where con query explícito
fun findByEmailIncludingDeleted(@Param("email") email: String): Optional<UsuarioJpaEntity>
```

---

## 🧠 PARTE 8 — FLYWAY + ESTOS ESTÁNDARES

### Estructura de archivos de migración

```
src/main/resources/db/migration/
├── common/
│   └── V1__init_extensions.sql          ← CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
├── authentication/
│   ├── V10__create_schema.sql           ← CREATE SCHEMA IF NOT EXISTS authentication_schema
│   ├── V11__create_users.sql            ← tabla con Dual Key Pattern + 4 campos + índices
│   ├── V12__create_roles.sql
│   └── V13__seed_roles.sql
├── {contexto}/
│   ├── V{N0}__create_schema.sql
│   └── V{N1}__create_{aggregate}.sql
└── shared/
    └── V5__create_domain_events.sql
```

### Template Flyway para nueva tabla (completo y conforme)

```sql
-- V{N}__create_{aggregate}.sql
-- Contexto: {schema} | Aggregate: {tabla}
-- Autor: [dev] | Fecha: {fecha}

-- ─────────────────────────────────────────────
-- 1. EXTENSIONES (si no existe en V1)
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- para gen_random_uuid()

-- ─────────────────────────────────────────────
-- 2. TABLA — Dual Key Pattern + 4 campos estándar
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS {schema}.{tabla} (
    -- CAMPOS OBLIGATORIOS (orden fijo)
    pkid_{tabla}     BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_{tabla}     UUID   DEFAULT gen_random_uuid()   NOT NULL,
    creation_date    TIMESTAMPTZ DEFAULT NOW()          NOT NULL,
    expiration_date  TIMESTAMPTZ                            NULL,

    -- Campos de negocio (FKs con fk_pkid_* si aplica)
    -- fk_pkid_{ref}  BIGINT NOT NULL,

    -- Optimistic locking (obligatorio en Aggregates)
    version          INT NOT NULL DEFAULT 1,

    CONSTRAINT pk_{tabla}      PRIMARY KEY (pkid_{tabla}),
    CONSTRAINT uk_{tabla}_uuid UNIQUE      (uuid_{tabla})
    -- CONSTRAINT fk_{tabla}_{ref} FOREIGN KEY (fk_pkid_{ref})
    --     REFERENCES {schema_ref}.{tabla_ref}(pkid_{tabla_ref})
    --     ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ─────────────────────────────────────────────
-- 3. ÍNDICES — OBLIGATORIOS
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_{tabla}_uuid
    ON {schema}.{tabla}(uuid_{tabla});

-- Índice en FK (si aplica)
-- CREATE INDEX IF NOT EXISTS idx_{tabla}_fk_{ref}
--     ON {schema}.{tabla}(fk_pkid_{ref});

-- Índice parcial para activos (si hay campos de búsqueda frecuente)
-- CREATE INDEX IF NOT EXISTS idx_{tabla}_{campo}_activos
--     ON {schema}.{tabla}({campo})
--     WHERE expiration_date IS NULL;

-- ─────────────────────────────────────────────
-- 4. COMENTARIOS — OBLIGATORIOS
-- ─────────────────────────────────────────────
COMMENT ON TABLE  {schema}.{tabla}
    IS 'Aggregate Root / Entity: [descripción del propósito del aggregate]';

COMMENT ON COLUMN {schema}.{tabla}.pkid_{tabla}
    IS 'PK interno BIGINT IDENTITY. Usar para JOINs/FKs. NUNCA exponer en API.';

COMMENT ON COLUMN {schema}.{tabla}.uuid_{tabla}
    IS 'UUID externo para API/URLs. Exponer al cliente, nunca en JOINs.';

COMMENT ON COLUMN {schema}.{tabla}.creation_date
    IS 'Fecha y hora de creación del registro (inmutable).';

COMMENT ON COLUMN {schema}.{tabla}.expiration_date
    IS 'Soft delete: NULL = ACTIVO, NOT NULL = fecha de eliminación lógica.';

COMMENT ON COLUMN {schema}.{tabla}.version
    IS 'Optimistic locking — incrementa con cada UPDATE para detectar conflictos.';
```

---

## ✅ Criterios de Aplicación

- Al crear cualquier tabla nueva en una migración Flyway
- Al escribir una entidad JPA (`@Entity`) o EF Core (`[Table]`)
- Al diseñar un repositorio con queries `findBy*`
- Al escribir cualquier endpoint que recibe o devuelve IDs (usar UUID, nunca pkid)
- Al agregar una nueva FK entre tablas
- Al revisar un PR de base de datos

## ❌ Anti-patrones PROHIBIDOS en ZNS

| ❌ Anti-patrón | ✅ Corrección |
|---------------|-------------|
| `id SERIAL` / `id BIGSERIAL` | `pkid_{tabla} BIGINT GENERATED ALWAYS AS IDENTITY` |
| `id UUID PRIMARY KEY` | Dual Key: `pkid_{tabla}` BIGINT + `uuid_{tabla}` UUID |
| `id INTEGER` | `pkid_{tabla} BIGINT` (límite 2B → demasiado pequeño) |
| `deleted_at TIMESTAMPTZ` | `expiration_date TIMESTAMPTZ` |
| `is_deleted BOOLEAN` | `expiration_date TIMESTAMPTZ NULL` |
| Exponer `pkid_` en API REST | Solo exponer `uuid_` en responses |
| Usar UUID en JOIN / FK | Solo BIGINT `pkid_` en JOINs y FKs |
| Tabla sin COMMENT | `COMMENT ON TABLE` obligatorio |
| Campo sin COMMENT | `COMMENT ON COLUMN` para todos los campos |
| FK sin índice | `CREATE INDEX idx_{tabla}_fk_{ref}` siempre |
| Hibernate `ddl-auto: update` o `create` | `validate` con Flyway (NUNCA dejar a Hibernate crear tablas) |
| `@GeneratedValue(strategy = UUID)` como PK | `@GeneratedValue(IDENTITY)` sobre `pkid_` BIGINT |

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Crear tabla `sessions` para el contexto de autenticación

**Migración Flyway `V14__create_sessions.sql`**:

```sql
CREATE TABLE IF NOT EXISTS authentication_schema.sessions (
    pkid_sessions       BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    uuid_sessions       UUID   DEFAULT gen_random_uuid()   NOT NULL,
    creation_date       TIMESTAMPTZ DEFAULT NOW()          NOT NULL,
    expiration_date     TIMESTAMPTZ                            NULL,

    fk_pkid_users       BIGINT NOT NULL,
    refresh_token_hash  VARCHAR(255) NOT NULL,
    device_fingerprint  VARCHAR(500),
    last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ,
    version             INT NOT NULL DEFAULT 1,

    CONSTRAINT pk_sessions      PRIMARY KEY (pkid_sessions),
    CONSTRAINT uk_sessions_uuid UNIQUE (uuid_sessions),
    CONSTRAINT fk_sessions_users FOREIGN KEY (fk_pkid_users)
        REFERENCES authentication_schema.users(pkid_users)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_uuid     ON authentication_schema.sessions(uuid_sessions);
CREATE INDEX IF NOT EXISTS idx_sessions_fk_users ON authentication_schema.sessions(fk_pkid_users);
CREATE INDEX IF NOT EXISTS idx_sessions_activas
    ON authentication_schema.sessions(fk_pkid_users, last_activity_at DESC)
    WHERE expiration_date IS NULL AND revoked_at IS NULL;

COMMENT ON TABLE  authentication_schema.sessions                  IS 'Entity: Sesión de usuario activa (Refresh Token)';
COMMENT ON COLUMN authentication_schema.sessions.pkid_sessions    IS 'PK interno BIGINT IDENTITY. NUNCA exponer en API.';
COMMENT ON COLUMN authentication_schema.sessions.uuid_sessions    IS 'UUID externo para API.';
COMMENT ON COLUMN authentication_schema.sessions.creation_date    IS 'Fecha de creación del registro (inmutable).';
COMMENT ON COLUMN authentication_schema.sessions.expiration_date  IS 'Soft delete: NULL = activa. NOT NULL = expirada/eliminada.';
COMMENT ON COLUMN authentication_schema.sessions.fk_pkid_users    IS 'FK → authentication_schema.users.pkid_users. Usar pkid interno para JOINs.';
COMMENT ON COLUMN authentication_schema.sessions.version          IS 'Optimistic locking.';
```

### Ejemplo 2: Error detectado en revisión de código

```kotlin
// ❌ PR review — VIOLATIONS detectadas:
@Entity
@Table(name = "payments")
class PaymentEntity(
    @Id
    @GeneratedValue
    val id: UUID,          // ← VIOLACIÓN: UUID como PK (performance pobre)
    val amount: BigDecimal
)

// ✅ Corrección siguiendo estándares ZNS:
@Entity
@Table(name = "payments", schema = "payments_schema")
class PaymentJpaEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pkid_payments")
    val pkidPayments: Long = 0,             // ← PK interno BIGINT

    @Column(name = "uuid_payments", nullable = false, unique = true, updatable = false)
    val uuidPayments: UUID = UUID.randomUUID(),  // ← UUID externo para API

    @Column(name = "creation_date", nullable = false, updatable = false)
    val creationDate: OffsetDateTime = OffsetDateTime.now(),

    @Column(name = "expiration_date")
    var expirationDate: OffsetDateTime? = null,

    @Column(name = "amount", nullable = false)
    val amount: BigDecimal,

    @Version
    @Column(name = "version")
    var version: Int = 1
)
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para inyectar esta skill, agregar en la sección `## SKILLS ACTIVAS`:

```
SKILL ACTIVA: db-architecture-standards-expert   → ver: 2-agents/zns-tools/skills/db-architecture-standards-expert.skill.md
```

Fila en la tabla resumen:

| Skill | Aplicación directa |
|-------|--------------------|
| `db-architecture-standards-expert` | **Dual Key Pattern** en toda tabla: `pkid_{tabla}` BIGINT IDENTITY (JOINs/FKs, NUNCA en API) + `uuid_{tabla}` UUID (API/URLs, NUNCA en JOINs); **4 campos obligatorios** en orden fijo: `pkid_`, `uuid_`, `creation_date`, `expiration_date`; **schema por Bounded Context** (`{contexto}_schema`); **índices obligatorios**: UUID, FK, campos de WHERE, ORDER BY, parciales por `expiration_date IS NULL`; **nomenclatura**: `pk_`, `uk_`, `fk_`, `ck_`, `idx_`; **soft delete** con `expiration_date` (NUNCA `deleted_at`/`is_deleted`); **COMMENT** obligatorio en tabla y columnas; `ddl-auto: validate` con Flyway (NUNCA `update`); JPA `@GeneratedValue(IDENTITY)` sobre `pkid_`; **agente propietario completo**: `2-agents/zns-tecnical-team/5.zns-develop/4.database_senior/prompt_dev_database_senior.md` |

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Tablas con Dual Key Pattern | 100% — sin excepción |
| Tablas sin los 4 campos obligatorios | 0 |
| FKs sin índice asociado | 0 |
| UUID usados como PK (sin BIGINT) | 0 |
| `pkid_` expuesto en respuesta de API | 0 |
| Tablas sin COMMENT | 0 |
| Columnas principales sin COMMENT | 0 |
| Hibernate `ddl-auto: update` en prod | 0 — siempre `validate` |
| Soft delete con `deleted_at`/`is_deleted` | 0 — siempre `expiration_date` |
| Índice faltante en campo `uuid_*` | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Dual Key Pattern, 4 campos obligatorios, schemas por BC, índices, nomenclatura, soft delete, mapping JPA/EF Core, template Flyway
