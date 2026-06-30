# HUT-[HU_ID]-INFRA-[SECUENCIA]: [Nombre de la Migración de Base de Datos]

> **Tipo:** `INFRA` — Database Migration  
> **HU Origen:** [HU-XXX](../../05-deliverables/hus/[modulo]/HU-XXX-*.md)  
> **DBMS:** PostgreSQL [version]  
> **Migration Tool:** Flyway / Liquibase  
> **Version:** V[MAJOR].[MINOR].[PATCH]__[descripcion]

---

## 🎯 Historia Técnica

**Como** Desarrollador Backend,  
**Quiero** migrar la base de datos para [objetivo: crear tablas, modificar esquema, agregar índices],  
**Para** soportar la funcionalidad de [referencia a HU de negocio].

---

## 💼 Valor Técnico

**Propósito de la migración:**
- [Describe qué problema de persistencia resuelve]
- [Qué entidades del dominio soporta]
- [Qué capacidad de negocio habilita]

**Impacto:**
- ✅ [Ej: Permite almacenar reservas con validaciones de integridad]
- ✅ [Ej: Optimiza consultas de búsqueda con índices especializados]
- ✅ [Ej: Soporta auditoría completa con triggers]

---

## 📋 Especificación de la Migración

### Metadata de Migración

**Nombre archivo:** `V[VERSION]__[descripcion_snake_case].sql`

**Ejemplo:** `V1.2.001__crear_tabla_reservas.sql`

**Versión:** `V1.2.001`
- **1** = Major release
- **2** = Sprint/módulo
- **001** = Secuencia migración

**Checksum:** (Generado automáticamente por Flyway)

**Categoría:** `[DDL | DML | INDEX | CONSTRAINT | TRIGGER | FUNCTION]`

**Reversible:** `[Sí|No]`  
*Si Sí, crear también:* `U1.2.001__rollback_crear_tabla_reservas.sql`

---

## 🗄️ DDL (Data Definition Language)

### Tablas Nuevas

#### Tabla Principal: `[nombre_tabla]`

**Propósito:** [Descripción de qué entidad del dominio representa]

**DDL Completo:**
```sql
-- =====================================================
-- Tabla: nombre_tabla
-- Descripción: [Propósito de la tabla]
-- Creación: [YYYY-MM-DD]
-- Autor: [Nombre]
-- =====================================================

CREATE TABLE nombre_tabla (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Campos de negocio
    campo1 VARCHAR(100) NOT NULL,
    campo2 INTEGER NOT NULL CHECK (campo2 > 0),
    campo3 DECIMAL(10, 2) DEFAULT 0.00 CHECK (campo3 >= 0),
    campo4 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    campo5_enum VARCHAR(20) NOT NULL CHECK (campo5_enum IN ('VALOR1', 'VALOR2', 'VALOR3')),
    
    -- Foreign Keys
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    relacion_id BIGINT REFERENCES tabla_relacionada(id) ON DELETE SET NULL,
    
    -- Campos de auditoría
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por VARCHAR(100) NOT NULL,
    actualizado_por VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, -- Optimistic locking
    
    -- Soft delete
    eliminado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_eliminacion TIMESTAMP WITH TIME ZONE,
    eliminado_por VARCHAR(100),
    
    -- Constraints
    CONSTRAINT uk_nombre_tabla_campo_unico UNIQUE (campo1, usuario_id),
    CONSTRAINT chk_fechas_validas CHECK (fecha_eliminacion IS NULL OR fecha_eliminacion > fecha_creacion),
    CONSTRAINT chk_relaciones CHECK (
        (campo5_enum = 'VALOR1' AND relacion_id IS NOT NULL) OR
        (campo5_enum != 'VALOR1')
    )
);

-- Comentarios de documentación
COMMENT ON TABLE nombre_tabla IS 'Almacena [descripción de la entidad]';
COMMENT ON COLUMN nombre_tabla.campo1 IS 'Descripción del campo 1';
COMMENT ON COLUMN nombre_tabla.campo2 IS 'Descripción del campo 2 con validaciones';
COMMENT ON COLUMN nombre_tabla.version IS 'Contador para optimistic locking';
```

### Modificaciones a Tablas Existentes

**Si aplica, modificaciones a tablas existentes:**

```sql
-- Agregar nueva columna
ALTER TABLE tabla_existente
ADD COLUMN nueva_columna VARCHAR(50);

-- Agregar constraint
ALTER TABLE tabla_existente
ADD CONSTRAINT chk_nueva_validacion CHECK (nueva_columna IS NOT NULL);

-- Modificar tipo de dato
ALTER TABLE tabla_existente
ALTER COLUMN columna_existente TYPE TEXT;

-- Agregar default value
ALTER TABLE tabla_existente
ALTER COLUMN columna_existente SET DEFAULT 'valor_default';

-- Renombrar columna (evitar si posible, breaking change)
-- ALTER TABLE tabla_existente
-- RENAME COLUMN nombre_viejo TO nombre_nuevo;
```

---

## 🔗 Relaciones e Integridad Referencial

### Diagrama de Relaciones

```
┌─────────────────┐          ┌─────────────────┐
│    usuarios     │          │  tabla_relac    │
│─────────────────│          │─────────────────│
│ PK id           │◄────┐    │ PK id           │
│    email        │     │    │    campo_x      │
│    nombre       │     │    └─────────────────┘
└─────────────────┘     │              ▲
                        │              │
                        │    ┌─────────┴─────────┐
                        └────│  nombre_tabla     │
                             │───────────────────│
                             │ PK id             │
                             │ FK usuario_id     │───┐
                             │ FK relacion_id    │───┘
                             │    campo1         │
                             │    campo2         │
                             └───────────────────┘
```

### Foreign Keys Detalladas

**1. FK_nombre_tabla_usuario:**
```sql
CONSTRAINT fk_nombre_tabla_usuario 
    FOREIGN KEY (usuario_id) 
    REFERENCES usuarios(id) 
    ON DELETE CASCADE 
    ON UPDATE RESTRICT;
```
- **Tipo:** Mandatory (NOT NULL)
- **Cardinalidad:** Many-to-One
- **On Delete:** CASCADE (si se elimina usuario, se eliminan todos sus registros)
- **On Update:** RESTRICT (no permitir actualizar PK de usuario si tiene registros)
- **Justificación:** Cada registro pertenece obligatoriamente a un usuario

**2. FK_nombre_tabla_relacion:**
```sql
CONSTRAINT fk_nombre_tabla_relacion 
    FOREIGN KEY (relacion_id) 
    REFERENCES tabla_relacionada(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
```
- **Tipo:** Optional (NULL permitido)
- **Cardinalidad:** Many-to-One
- **On Delete:** SET NULL (preservar registro principal, eliminar relación)
- **On Update:** CASCADE (permitir actualización en cascada)
- **Justificación:** Relación opcional, puede existir registro sin ella

---

## 📊 Índices y Optimizaciones

### Índices Requeridos

**1. Índice Primario (automático):**
```sql
-- PK automáticamente crea índice B-tree
-- nombre_tabla_pkey ON nombre_tabla(id)
```

**2. Índices de Foreign Keys:**
```sql
-- Índice en FK para optimizar JOINs
CREATE INDEX idx_nombre_tabla_usuario_id 
ON nombre_tabla(usuario_id);

CREATE INDEX idx_nombre_tabla_relacion_id 
ON nombre_tabla(relacion_id)
WHERE relacion_id IS NOT NULL; -- Partial index
```

**3. Índices de Búsqueda:**
```sql
-- Índice para búsquedas frecuentes
CREATE INDEX idx_nombre_tabla_campo1_busqueda 
ON nombre_tabla(campo1) 
WHERE eliminado = FALSE;

-- Índice compuesto para queries complejas
CREATE INDEX idx_nombre_tabla_compuesto 
ON nombre_tabla(usuario_id, campo5_enum, fecha_creacion DESC)
WHERE eliminado = FALSE;
```

**4. Índices de Unique Constraints:**
```sql
-- Para constraint de unicidad (automático con UNIQUE)
-- uk_nombre_tabla_campo_unico ON nombre_tabla(campo1, usuario_id)

-- Índice unique parcial (solo registros activos)
CREATE UNIQUE INDEX uk_nombre_tabla_activos 
ON nombre_tabla(campo1, usuario_id)
WHERE eliminado = FALSE;
```

**5. Índices Especializados:**
```sql
-- Índice GIN para búsqueda full-text (si aplica)
CREATE INDEX idx_nombre_tabla_fulltext 
ON nombre_tabla 
USING GIN(to_tsvector('spanish', campo1 || ' ' || COALESCE(campo_texto, '')));

-- Índice BRIN para columnas timestamp (alta cardinalidad)
CREATE INDEX idx_nombre_tabla_fecha_creacion 
ON nombre_tabla 
USING BRIN(fecha_creacion);

-- Índice hash para equality searches (exacto)
CREATE INDEX idx_nombre_tabla_campo_hash 
ON nombre_tabla 
USING HASH(campo5_enum);
```

### Análisis de Cobertura de Índices

**Query 1:** `SELECT * FROM nombre_tabla WHERE usuario_id = ? AND eliminado = FALSE`
- **Índice usado:** `idx_nombre_tabla_compuesto` (cubre usuario_id + eliminado)
- **Performance esperado:** <10ms con 100K registros

**Query 2:** `SELECT * FROM nombre_tabla WHERE campo1 LIKE 'ABC%' AND eliminado = FALSE`
- **Índice usado:** `idx_nombre_tabla_campo1_busqueda`
- **Performance esperado:** <50ms con 100K registros

**Query 3:** `SELECT COUNT(*) FROM nombre_tabla WHERE fecha_creacion BETWEEN ? AND ?`
- **Índice usado:** `idx_nombre_tabla_fecha_creacion` (BRIN)
- **Performance esperado:** <20ms con 1M registros

---

## 🔧 Triggers y Funciones

### Trigger: Actualizar `fecha_actualizacion`

**Propósito:** Actualizar automáticamente el timestamp cuando se modifica un registro

```sql
-- Función del trigger
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1; -- Incrementar versión (optimistic locking)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_nombre_tabla_actualizar_fecha
BEFORE UPDATE ON nombre_tabla
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_modificacion();
```

### Trigger: Auditoría de Cambios

**Propósito:** Registrar todos los cambios en tabla de auditoría

```sql
-- Tabla de auditoría
CREATE TABLE auditoria_nombre_tabla (
    id BIGSERIAL PRIMARY KEY,
    registro_id BIGINT NOT NULL,
    operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
    usuario VARCHAR(100) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datos_anteriores JSONB,
    datos_nuevos JSONB
);

-- Función de auditoría
CREATE OR REPLACE FUNCTION auditar_nombre_tabla()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO auditoria_nombre_tabla(registro_id, operacion, usuario, datos_anteriores)
        VALUES (OLD.id, 'DELETE', current_user, row_to_json(OLD));
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO auditoria_nombre_tabla(registro_id, operacion, usuario, datos_anteriores, datos_nuevos)
        VALUES (NEW.id, 'UPDATE', current_user, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria_nombre_tabla(registro_id, operacion, usuario, datos_nuevos)
        VALUES (NEW.id, 'INSERT', current_user, row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger de auditoría
CREATE TRIGGER trg_nombre_tabla_auditoria
AFTER INSERT OR UPDATE OR DELETE ON nombre_tabla
FOR EACH ROW
EXECUTE FUNCTION auditar_nombre_tabla();
```

---

## 📥 Datos Iniciales (Seed Data)

### DML: Inserción de Datos Maestros

**Si la migración requiere datos iniciales:**

```sql
-- =====================================================
-- Datos maestros / seed data
-- =====================================================

-- Insertar valores de configuración
INSERT INTO nombre_tabla (campo1, campo2, campo5_enum, creado_por, actualizado_por)
VALUES 
    ('VALOR_CONFIG_1', 100, 'VALOR1', 'SYSTEM', 'SYSTEM'),
    ('VALOR_CONFIG_2', 200, 'VALOR2', 'SYSTEM', 'SYSTEM'),
    ('VALOR_CONFIG_3', 300, 'VALOR3', 'SYSTEM', 'SYSTEM')
ON CONFLICT (campo1) DO NOTHING; -- Idempotencia

-- Insertar datos de referencia (ej: catálogos)
INSERT INTO tabla_catalogo (codigo, descripcion, activo)
SELECT codigo, descripcion, true
FROM (VALUES
    ('CAT001', 'Categoría 1'),
    ('CAT002', 'Categoría 2'),
    ('CAT003', 'Categoría 3')
) AS datos(codigo, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM tabla_catalogo WHERE codigo = datos.codigo
);
```

---

## 🔄 Script de Rollback

### Reversión Segura

**Archivo:** `U1.2.001__rollback_crear_tabla_reservas.sql`

```sql
-- =====================================================
-- ROLLBACK de V1.2.001
-- PELIGRO: Esto eliminará todos los datos de la tabla
-- =====================================================

-- Verificar que no hay datos críticos (opcional)
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM nombre_tabla) > 0 THEN
        RAISE EXCEPTION 'La tabla contiene datos. Rollback abortado.';
    END IF;
END $$;

-- Eliminar triggers
DROP TRIGGER IF EXISTS trg_nombre_tabla_auditoria ON nombre_tabla;
DROP TRIGGER IF EXISTS trg_nombre_tabla_actualizar_fecha ON nombre_tabla;

-- Eliminar índices (los que no son automáticos)
DROP INDEX IF EXISTS idx_nombre_tabla_compuesto;
DROP INDEX IF EXISTS idx_nombre_tabla_campo1_busqueda;
DROP INDEX IF EXISTS idx_nombre_tabla_fulltext;

-- Eliminar tabla
DROP TABLE IF EXISTS nombre_tabla CASCADE;

-- Eliminar tabla de auditoría
DROP TABLE IF EXISTS auditoria_nombre_tabla;

-- Eliminar funciones
DROP FUNCTION IF EXISTS auditar_nombre_tabla();
DROP FUNCTION IF EXISTS actualizar_fecha_modificacion();
```

**⚠️ Advertencias de Rollback:**
- ❌ Pérdida de datos permanente
- ❌ Breaking change para aplicaciones que dependen de esta tabla
- ❌ Requiere despliegue coordinado con código
- ⚠️ Solo ejecutar en entornos de desarrollo/staging

---

## ✅ Validaciones Post-Migración

### Queries de Verificación

```sql
-- 1. Verificar que la tabla fue creada
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'nombre_tabla';

-- 2. Verificar columnas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'nombre_tabla'
ORDER BY ordinal_position;

-- 3. Verificar constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'nombre_tabla';

-- 4. Verificar foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'nombre_tabla';

-- 5. Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'nombre_tabla';

-- 6. Verificar triggers
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'nombre_tabla';

-- 7. Verificar datos iniciales (si aplica)
SELECT COUNT(*) FROM nombre_tabla;
SELECT * FROM nombre_tabla WHERE campo5_enum = 'VALOR1';

-- 8. Test de inserción
INSERT INTO nombre_tabla (campo1, campo2, campo5_enum, usuario_id, creado_por, actualizado_por)
VALUES ('TEST', 999, 'VALOR1', 1, 'TEST', 'TEST')
RETURNING id, fecha_creacion, version;

-- Limpiar test
DELETE FROM nombre_tabla WHERE campo1 = 'TEST';
```

---

## 📊 Análisis de Impacto

### Estimación de Volumen de Datos

| Métrica | Valor Estimado | Justificación |
|---------|----------------|---------------|
| **Registros año 1** | 100,000 | ~300 registros/día × 365 días |
| **Crecimiento anual** | 50% | Proyección conservadora |
| **Registros año 3** | 337,500 | 100K × 1.5² |
| **Tamaño fila** | ~500 bytes | Suma de todos los campos |
| **Tamaño tabla año 1** | ~50 MB | 100K × 500 bytes |
| **Tamaño índices** | ~30 MB | 60% del tamaño tabla |
| **Total año 1** | ~80 MB | Tabla + índices |

### Performance Esperado

**Queries de lectura:**
- Primary key lookup: <5ms
- Búsqueda por índice: <50ms
- Full table scan (evitar): >500ms

**Queries de escritura:**
- INSERT: <10ms
- UPDATE: <15ms (incluye triggers)
- DELETE: <20ms (soft delete + triggers)

**Concurrencia:**
- Lecturas simultáneas: Sin límite (MVCC)
- Escrituras simultáneas: 500 TPS (Transactions Per Second)
- Lock contention: Mínimo (row-level locking)

### Impacto en Aplicación

**Breaking changes:** `[Sí|No]`

**Si Sí, detallar:**
- [Cambio 1: ej. Columna eliminada que usa código existente]
- [Cambio 2: ej. Constraint nuevo que puede rechazar datos válidos anteriormente]

**Plan de mitigación:**
1. [Paso 1: Comunicar cambios con 1 sprint anticipación]
2. [Paso 2: Desplegar migración fuera de horario pico]
3. [Paso 3: Rollback automático si error]

---

## 🧪 Testing de la Migración

### 1. Test en Ambiente Local

```bash
# Ejecutar migración con Flyway
flyway migrate -url=jdbc:postgresql://localhost:5432/mitoga_dev \
               -user=postgres \
               -password=*** \
               -locations=filesystem:./db/migrations

# Verificar estado
flyway info

# Rollback (si necesario)
flyway undo
```

### 2. Test con Testcontainers (Java)

```java
@Testcontainers
@SpringBootTest
public class MigracionIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = 
        new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("test_db");
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @Test
    public void deberia_CrearTablaNombreTabla() {
        // Verificar que tabla existe
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables " +
            "WHERE table_name = 'nombre_tabla'",
            Integer.class
        );
        assertEquals(1, count);
    }
    
    @Test
    public void deberia_TenerIndiceCorrecto() {
        // Verificar índices
        List<String> indexes = jdbcTemplate.query(
            "SELECT indexname FROM pg_indexes " +
            "WHERE tablename = 'nombre_tabla'",
            (rs, rowNum) -> rs.getString("indexname")
        );
        assertTrue(indexes.contains("idx_nombre_tabla_compuesto"));
    }
    
    @Test
    public void deberia_RechazarDatosInvalidos() {
        // Probar constraint
        assertThrows(DataIntegrityViolationException.class, () -> {
            jdbcTemplate.update(
                "INSERT INTO nombre_tabla (campo1, campo2, campo5_enum, usuario_id, creado_por, actualizado_por) " +
                "VALUES (?, ?, ?, ?, ?, ?)",
                "", -1, "INVALIDO", 1, "TEST", "TEST" // Viola múltiples constraints
            );
        });
    }
}
```

### 3. Test de Performance

```sql
-- Generar datos de prueba
INSERT INTO nombre_tabla (campo1, campo2, campo5_enum, usuario_id, creado_por, actualizado_por)
SELECT 
    'TEST_' || generate_series,
    generate_series,
    (ARRAY['VALOR1', 'VALOR2', 'VALOR3'])[1 + (generate_series % 3)],
    1 + (generate_series % 1000),
    'PERF_TEST',
    'PERF_TEST'
FROM generate_series(1, 100000);

-- Benchmark query principal
EXPLAIN ANALYZE
SELECT * FROM nombre_tabla 
WHERE usuario_id = 500 
  AND eliminado = FALSE
ORDER BY fecha_creacion DESC
LIMIT 20;

-- Limpiar datos de prueba
DELETE FROM nombre_tabla WHERE creado_por = 'PERF_TEST';
```

---

## 🔐 Seguridad y Permisos

### Permisos de Usuario

```sql
-- Usuario de aplicación (lectura/escritura)
GRANT SELECT, INSERT, UPDATE, DELETE ON nombre_tabla TO mitoga_app_user;
GRANT USAGE, SELECT ON SEQUENCE nombre_tabla_id_seq TO mitoga_app_user;

-- Usuario de solo lectura (reportes)
GRANT SELECT ON nombre_tabla TO mitoga_readonly_user;

-- Usuario de auditoría (solo lectura auditoría)
GRANT SELECT ON auditoria_nombre_tabla TO mitoga_audit_user;
```

### Row-Level Security (RLS) - Opcional

```sql
-- Habilitar RLS
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propios registros
CREATE POLICY pol_nombre_tabla_usuario_propio
ON nombre_tabla
FOR ALL
TO mitoga_app_user
USING (usuario_id = current_setting('app.current_user_id')::BIGINT);

-- Política: Admins ven todo
CREATE POLICY pol_nombre_tabla_admin
ON nombre_tabla
FOR ALL
TO mitoga_admin_user
USING (true);
```

---

## 📝 Checklist de Ejecución

### Pre-Deployment
- [ ] Migración revisada por DBA senior
- [ ] Backup completo de base de datos (pre-migración)
- [ ] Script de rollback validado en staging
- [ ] Estimación de downtime comunicada (si aplica)
- [ ] Ventana de mantenimiento coordinada
- [ ] Monitoreo de métricas configurado

### Deployment
- [ ] Ejecutar migración con Flyway/Liquibase
- [ ] Verificar logs de ejecución (sin errores)
- [ ] Ejecutar queries de validación post-migración
- [ ] Verificar performance con queries reales
- [ ] Confirmar que aplicación puede conectarse

### Post-Deployment
- [ ] Monitorear CPU/memoria/IO de base de datos (primeras 2 horas)
- [ ] Verificar que no hay slow queries nuevas
- [ ] Confirmar que triggers funcionan correctamente
- [ ] Validar integridad referencial
- [ ] Documentación actualizada (ER diagrams, wiki)

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Migración lenta (>5 min) | Media | Alto | Ejecutar fuera de horario pico, usar `CONCURRENTLY` en índices |
| Lock de tabla bloquea escrituras | Alta | Medio | Usar `CREATE INDEX CONCURRENTLY` |
| Datos inválidos causan rollback | Baja | Alto | Validar datos pre-migración, agregar `ON CONFLICT` |
| Consumo alto de disco (índices) | Media | Medio | Monitorear espacio, provisionar 50% extra |

---

## 📚 Referencias

- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Database Refactoring Patterns](https://databaserefactoring.com/)

---

## 🏷️ Etiquetas

`#database` `#migration` `#postgresql` `#flyway` `#ddl` `#[modulo]`

---

**Generado por:** Technical User Stories Architect v1.0  
**Tipo:** HUT-INFRA Database Specialization
