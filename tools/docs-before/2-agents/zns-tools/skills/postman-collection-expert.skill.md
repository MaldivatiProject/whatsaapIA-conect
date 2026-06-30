# 📬 SKILL: POSTMAN COLLECTION EXPERT — Colecciones por Dominio

**skill_id**: postman-collection-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend / api-testing / developer-experience  
**last_updated**: 2026-03-19  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-kotlin-springboot-senior, prompt-dev-springboot-senior, prompt-dev-dotnet-core-senior, prompt-dev-backend-go  
**dependencias**: api-response-standardization-expert, swagger-openapi-redoc-expert  
**referencia_stack**: Postman Collection v2.1 / Newman CLI / Spring Boot 3.4.3 / Kotlin 2.1.20 / Java 21 / .NET 8 / JWT Bearer / OpenAPI 3.1.0

---

## 📌 Propósito de la Skill

Esta skill equipa al agente para **generar, estructurar y mantener Postman Collections de nivel producción**, una por cada dominio del proyecto. Incluye:

- Estructura canónica de Collection v2.1 (carpetas por dominio, variables, pre-request scripts)
- Variables de entorno por contexto (`dev`, `staging`, `prod-readonly`)
- Autenticación JWT Bearer automática con token refresh
- Scripts de test automáticos por tipo de respuesta (201, 422, 400, 409, 403)
- Ejecución con Newman en CI/CD
- Generación desde OpenAPI (importar spec) y desde cero (manual)
- Política POST-only del stack ZNS

**Regla principal**: **una Collection por dominio**, no una colección monolítica.

---

## 🧠 PARTE 1 — ESTRUCTURA DE COLECCIÓN POR DOMINIO

### Convención de nombres y archivos

```
postman/
├── environments/
│   ├── ZNS-dev.postman_environment.json
│   ├── ZNS-staging.postman_environment.json
│   └── ZNS-prod-readonly.postman_environment.json
├── collections/
│   ├── ZNS-Identidad.postman_collection.json       ← dominio auth/usuarios/roles
│   ├── ZNS-AIBOS.postman_collection.json           ← dominio IA/asistentes
│   ├── ZNS-Administracion.postman_collection.json  ← dominio admin
│   └── ZNS-[NuevoDominio].postman_collection.json  ← un archivo por dominio
├── scripts/
│   └── run-all.sh                                   ← Newman batch runner
└── README.md
```

> **Regla**: cada Collection corresponde 1:1 con un `GroupedOpenApi` del `OpenApiConfig`. Si se añade un nuevo dominio (nuevo `GroupedOpenApi.builder().group("pagos")`), se crea `ZNS-Pagos.postman_collection.json`.

### Estructura interna de una Collection

```
ZNS-Identidad (Collection)
├── 📁 Auth
│   ├── POST Login                  → /api/v1/auth/login
│   ├── POST Refresh Token          → /api/v1/auth/refresh
│   └── POST Logout                 → /api/v1/auth/logout
├── 📁 Usuarios
│   ├── POST Registrar Usuario      → /api/v1/usuarios/registrar
│   ├── POST Buscar Usuarios        → /api/v1/usuarios/buscar
│   ├── POST Detalle Usuario        → /api/v1/usuarios/detalle
│   ├── POST Actualizar Usuario     → /api/v1/usuarios/actualizar
│   └── POST Dar de Baja Usuario    → /api/v1/usuarios/baja
└── 📁 Roles
    ├── POST Asignar Rol            → /api/v1/roles/asignar
    └── POST Listar Roles           → /api/v1/roles/listar
```

---

## 🧠 PARTE 2 — ENVIRONMENTS (VARIABLES DE ENTORNO)

### ZNS-dev.postman_environment.json

```json
{
  "id": "env-zns-dev",
  "name": "ZNS - Development",
  "values": [
    { "key": "baseUrl",       "value": "http://localhost:8080",  "enabled": true, "type": "default" },
    { "key": "apiVersion",    "value": "v1",                     "enabled": true, "type": "default" },
    { "key": "accessToken",   "value": "",                       "enabled": true, "type": "secret"  },
    { "key": "refreshToken",  "value": "",                       "enabled": true, "type": "secret"  },
    { "key": "adminEmail",    "value": "admin@zenapses.com",     "enabled": true, "type": "default" },
    { "key": "adminPassword", "value": "Admin!Dev2024",          "enabled": true, "type": "secret"  },
    { "key": "testUserId",    "value": "",                       "enabled": true, "type": "default" },
    { "key": "correlationId", "value": "",                       "enabled": true, "type": "default" }
  ],
  "_postman_variable_scope": "environment"
}
```

### ZNS-staging.postman_environment.json

```json
{
  "name": "ZNS - Staging",
  "values": [
    { "key": "baseUrl",       "value": "https://api-staging.zenapses.com", "enabled": true, "type": "default" },
    { "key": "apiVersion",    "value": "v1",                               "enabled": true, "type": "default" },
    { "key": "accessToken",   "value": "",                                 "enabled": true, "type": "secret"  },
    { "key": "refreshToken",  "value": "",                                 "enabled": true, "type": "secret"  },
    { "key": "adminEmail",    "value": "{{STAGING_ADMIN_EMAIL}}",          "enabled": true, "type": "default" },
    { "key": "adminPassword", "value": "{{STAGING_ADMIN_PASSWORD}}",       "enabled": true, "type": "secret"  }
  ]
}
```

> ⚠️ En **prod-readonly** solo incluir `baseUrl` y tokens de solo lectura. NUNCA credenciales de admin en environment de prod.

---

## 🧠 PARTE 3 — COLLECTION JSON COMPLETO (ZNS-Identidad)

```json
{
  "info": {
    "name": "ZNS — Identidad",
    "_postman_id": "zns-identidad-v1",
    "description": "Colección del dominio Identidad: autenticación, usuarios y roles.\n\n**Stack**: Spring Boot 3.4.3 / Kotlin 2.1.20 / JWT RS256\n**Política**: POST-only (excepto /actuator/health)\n**Autenticación**: Bearer JWT — ejecutar 'POST Login' primero.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "version": { "major": 1, "minor": 0, "patch": 0 }
  },
  "auth": {
    "type": "bearer",
    "bearer": [{ "key": "token", "value": "{{accessToken}}", "type": "string" }]
  },
  "variable": [
    { "key": "baseUrl",    "value": "{{baseUrl}}",    "type": "string" },
    { "key": "apiVersion", "value": "{{apiVersion}}", "type": "string" }
  ],
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "type": "text/javascript",
        "exec": [
          "// Generar correlationId único por request",
          "pm.variables.set('correlationId', pm.variables.replaceIn('{{$guid}}'));"
        ]
      }
    }
  ],
  "item": [
    {
      "name": "🔐 Auth",
      "item": [
        {
          "name": "POST Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "// ✅ Status 200",
                  "pm.test('Status 200 OK', () => pm.response.to.have.status(200));",
                  "",
                  "// ✅ Guardar tokens en environment",
                  "const cookies = pm.response.headers.all()",
                  "  .filter(h => h.key === 'Set-Cookie');",
                  "",
                  "// Leer access token de cookie HttpOnly (viene en header Set-Cookie)",
                  "pm.test('Access token cookie presente', () => {",
                  "  const accessCookie = cookies.find(c => c.value.includes('accessToken'));",
                  "  pm.expect(accessCookie).to.exist;",
                  "});",
                  "",
                  "// Si el token viene en body (modo header-only):",
                  "if (pm.response.json().accessToken) {",
                  "  pm.environment.set('accessToken', pm.response.json().accessToken);",
                  "  pm.environment.set('refreshToken', pm.response.json().refreshToken);",
                  "}",
                  "",
                  "// ✅ Estructura de respuesta",
                  "pm.test('Response tiene usuarioId', () => {",
                  "  pm.expect(pm.response.json()).to.have.property('usuarioId');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type",  "value": "application/json" },
              { "key": "X-Correlation-Id", "value": "{{correlationId}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{adminEmail}}\",\n  \"password\": \"{{adminPassword}}\"\n}",
              "options": { "raw": { "language": "json" } }
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "auth", "login"]
            },
            "description": "Autenticar usuario. Retorna JWT via cookie HttpOnly o body según configuración."
          }
        },
        {
          "name": "POST Refresh Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200 OK', () => pm.response.to.have.status(200));",
                  "pm.test('Nuevo access token presente', () => {",
                  "  pm.expect(pm.response.json()).to.have.property('accessToken');",
                  "});",
                  "if (pm.response.json().accessToken) {",
                  "  pm.environment.set('accessToken', pm.response.json().accessToken);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "auth": { "type": "noauth" },
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{}",
              "options": { "raw": { "language": "json" } }
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/auth/refresh",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "auth", "refresh"]
            },
            "description": "Refresh token via cookie HttpOnly. El cookie refreshToken debe estar presente."
          }
        },
        {
          "name": "POST Logout",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 204 No Content', () => pm.response.to.have.status(204));",
                  "pm.environment.unset('accessToken');",
                  "pm.environment.unset('refreshToken');"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/auth/logout",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "auth", "logout"]
            }
          }
        }
      ]
    },
    {
      "name": "👤 Usuarios",
      "item": [
        {
          "name": "POST Registrar Usuario",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 201 Created', () => pm.response.to.have.status(201));",
                  "",
                  "pm.test('Response tiene usuarioId UUID', () => {",
                  "  const body = pm.response.json();",
                  "  pm.expect(body).to.have.property('usuarioId');",
                  "  pm.expect(body.usuarioId).to.match(",
                  "    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i",
                  "  );",
                  "  pm.environment.set('testUserId', body.usuarioId);",
                  "});",
                  "",
                  "pm.test('Content-Type es application/json', () => {",
                  "  pm.response.to.have.header('Content-Type', /application\\/json/);",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              { "key": "Content-Type",     "value": "application/json" },
              { "key": "X-Correlation-Id", "value": "{{correlationId}}" }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"nuevo.usuario@zenapses.com\",\n  \"password\": \"S3cure!Pass2024\",\n  \"nombre\": \"Juan\",\n  \"apellido\": \"Pérez\"\n}",
              "options": { "raw": { "language": "json" } }
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/usuarios/registrar",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "usuarios", "registrar"]
            }
          }
        },
        {
          "name": "POST Registrar Usuario — 400 Validación",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 400 Bad Request', () => pm.response.to.have.status(400));",
                  "",
                  "pm.test('ProblemDetail RFC 7807 con errors[]', () => {",
                  "  const body = pm.response.json();",
                  "  pm.expect(body).to.have.property('status', 400);",
                  "  pm.expect(body).to.have.property('errors');",
                  "  pm.expect(body.errors).to.be.an('array').that.is.not.empty;",
                  "});",
                  "",
                  "pm.test('Content-Type es application/problem+json', () => {",
                  "  pm.response.to.have.header('Content-Type', /application\\/problem\\+json/);",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"email-invalido\",\n  \"password\": \"123\",\n  \"nombre\": \"\"\n}",
              "options": { "raw": { "language": "json" } }
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/usuarios/registrar",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "usuarios", "registrar"]
            },
            "description": "Caso negativo: datos inválidos → 400 + ProblemDetail con errors[]"
          }
        },
        {
          "name": "POST Buscar Usuarios",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status 200 OK', () => pm.response.to.have.status(200));",
                  "",
                  "pm.test('PageResponse tiene estructura correcta', () => {",
                  "  const body = pm.response.json();",
                  "  pm.expect(body).to.have.property('content');",
                  "  pm.expect(body).to.have.property('totalElements');",
                  "  pm.expect(body).to.have.property('totalPages');",
                  "  pm.expect(body).to.have.property('pageNumber');",
                  "  pm.expect(body.content).to.be.an('array');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"filtros\": {},\n  \"pagina\": { \"numero\": 0, \"tamano\": 10, \"ordenarPor\": \"createdAt\", \"direccion\": \"DESC\" }\n}",
              "options": { "raw": { "language": "json" } }
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/usuarios/buscar",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "usuarios", "buscar"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 🧠 PARTE 4 — PRE-REQUEST SCRIPTS GLOBALES

### Collection-level pre-request script (auto-refresh de token)

```javascript
// Pre-request script a nivel de COLLECTION (aplica a todos los requests)
// Refreshea el token si está a menos de 2 minutos de expirar

const accessToken = pm.environment.get('accessToken');

if (!accessToken) {
    // No hay token — saltar (el request de login no necesita token)
    return;
}

// Decodificar el JWT para verificar expiración
try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return;

    const payload = JSON.parse(atob(parts[1]));  // base64 decode del payload
    const expEpoch = payload.exp * 1000;  // exp en milisegundos
    const nowMs = Date.now();
    const margenMs = 2 * 60 * 1000;  // 2 minutos de margen

    if (expEpoch - nowMs < margenMs) {
        // Token expirando pronto → refrescar
        const baseUrl = pm.environment.get('baseUrl');
        const apiVersion = pm.environment.get('apiVersion');

        pm.sendRequest({
            url: `${baseUrl}/api/${apiVersion}/auth/refresh`,
            method: 'POST',
            header: { 'Content-Type': 'application/json' },
            body: { mode: 'raw', raw: '{}' }
        }, (err, res) => {
            if (!err && res.code === 200) {
                const newToken = res.json().accessToken;
                if (newToken) pm.environment.set('accessToken', newToken);
            }
        });
    }
} catch (e) {
    console.warn('No se pudo verificar expiración del token:', e.message);
}
```

### Request-level pre-request script (correlationId automático)

```javascript
// Pre-request script a nivel de FOLDER o REQUEST individual
// Genera un correlationId único para trazabilidad
pm.variables.set('correlationId', pm.variables.replaceIn('{{$guid}}'));
pm.variables.set('requestTimestamp', new Date().toISOString());
```

---

## 🧠 PARTE 5 — TEST SCRIPTS REUTILIZABLES POR STATUS CODE

### Fragmentos para pegar en los test scripts de cada request

```javascript
// ═══════════════════════════════════════════
// ✅ 201 Created — Creación exitosa
// ═══════════════════════════════════════════
pm.test('[201] Status Created', () => pm.response.to.have.status(201));
pm.test('[201] Body tiene ID UUID', () => {
    const body = pm.response.json();
    const idField = Object.keys(body).find(k => k.toLowerCase().endsWith('id'));
    pm.expect(idField).to.exist;
    pm.expect(body[idField]).to.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
});
pm.test('[201] Content-Type JSON', () =>
    pm.response.to.have.header('Content-Type', /application\/json/));

// ═══════════════════════════════════════════
// ✅ 200 OK — Consulta exitosa
// ═══════════════════════════════════════════
pm.test('[200] Status OK', () => pm.response.to.have.status(200));
pm.test('[200] Response time < 2000ms', () => pm.expect(pm.response.responseTime).to.be.below(2000));

// ═══════════════════════════════════════════
// ✅ 200 OK — PageResponse paginado
// ═══════════════════════════════════════════
pm.test('[200] PageResponse estructura válida', () => {
    const body = pm.response.json();
    pm.expect(body).to.have.all.keys('content','totalElements','totalPages','pageNumber','pageSize');
    pm.expect(body.content).to.be.an('array');
    pm.expect(body.totalElements).to.be.a('number').and.be.at.least(0);
});

// ═══════════════════════════════════════════
// ❌ 400 Bad Request — JSR-380 Validation
// ═══════════════════════════════════════════
pm.test('[400] Status Bad Request', () => pm.response.to.have.status(400));
pm.test('[400] ProblemDetail RFC 7807 con errors[]', () => {
    const body = pm.response.json();
    pm.expect(body.status).to.eql(400);
    pm.expect(body.errors).to.be.an('array').that.is.not.empty;
    pm.expect(body.errors[0]).to.have.property('field');
    pm.expect(body.errors[0]).to.have.property('message');
});
pm.test('[400] Content-Type problem+json', () =>
    pm.response.to.have.header('Content-Type', /application\/problem\+json/));

// ═══════════════════════════════════════════
// ❌ 401 Unauthorized
// ═══════════════════════════════════════════
pm.test('[401] Status Unauthorized', () => pm.response.to.have.status(401));
pm.test('[401] NO expone detalles de seguridad', () => {
    const text = pm.response.text();
    pm.expect(text).to.not.include('JWT');
    pm.expect(text).to.not.include('token');
    pm.expect(text).to.not.include('secret');
});

// ═══════════════════════════════════════════
// ❌ 403 Forbidden — BOLA / Sin autorización
// ═══════════════════════════════════════════
pm.test('[403] Status Forbidden', () => pm.response.to.have.status(403));
pm.test('[403] NO expone ownership info', () => {
    const body = pm.response.json();
    pm.expect(body.detail ?? '').to.not.include('propietario');
    pm.expect(body.detail ?? '').to.not.include('owner');
});

// ═══════════════════════════════════════════
// ❌ 409 Conflict — Recurso ya existente
// ═══════════════════════════════════════════
pm.test('[409] Status Conflict', () => pm.response.to.have.status(409));
pm.test('[409] ProblemDetail presente', () => {
    const body = pm.response.json();
    pm.expect(body.status).to.eql(409);
    pm.expect(body.title).to.exist;
});

// ═══════════════════════════════════════════
// ❌ 422 Unprocessable Entity — Error de dominio
// ═══════════════════════════════════════════
pm.test('[422] Status Unprocessable Entity', () => pm.response.to.have.status(422));
pm.test('[422] ProblemDetail con errorCode de negocio', () => {
    const body = pm.response.json();
    pm.expect(body.status).to.eql(422);
    pm.expect(body.detail).to.exist.and.not.be.empty;
});

// ═══════════════════════════════════════════
// 🔒 Seguridad — checks transversales
// ═══════════════════════════════════════════
pm.test('[SEC] No expone stack trace en error', () => {
    const text = pm.response.text();
    pm.expect(text).to.not.include('at com.');
    pm.expect(text).to.not.include('at org.springframework');
    pm.expect(text).to.not.include('at java.');
});
pm.test('[SEC] No expone campos PII sensibles', () => {
    const text = pm.response.text().toLowerCase();
    pm.expect(text).to.not.include('password');
    pm.expect(text).to.not.include('passwordhash');
});
```

---

## 🧠 PARTE 6 — EJECUCIÓN CON NEWMAN EN CI/CD

### Instalación

```bash
npm install -g newman newman-reporter-htmlextra
```

### Comando Newman por Collection

```bash
# Ejecutar una collection contra entorno dev
newman run postman/collections/ZNS-Identidad.postman_collection.json \
  --environment postman/environments/ZNS-dev.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export postman/reports/ZNS-Identidad-report.html \
  --bail \
  --timeout-request 10000
```

### Script batch — run-all.sh

```bash
#!/bin/bash
set -e  # salir si algún comando falla

ENV_FILE="postman/environments/ZNS-dev.postman_environment.json"
COLLECTIONS_DIR="postman/collections"
REPORTS_DIR="postman/reports"

mkdir -p "$REPORTS_DIR"

echo "🚀 Ejecutando Postman Collections con Newman..."

for collection in "$COLLECTIONS_DIR"/*.postman_collection.json; do
    name=$(basename "$collection" .postman_collection.json)
    echo ""
    echo "▶ Ejecutando: $name"
    newman run "$collection" \
        --environment "$ENV_FILE" \
        --reporters cli,htmlextra \
        --reporter-htmlextra-export "$REPORTS_DIR/$name-report.html" \
        --bail \
        --timeout-request 10000
done

echo ""
echo "✅ Todas las collections ejecutadas exitosamente."
echo "📄 Reportes en: $REPORTS_DIR/"
```

### GitHub Actions — integración en CI

```yaml
# .github/workflows/api-tests.yml
name: Newman API Tests

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop]

jobs:
  postman-tests:
    name: Postman / Newman API Tests
    runs-on: ubuntu-latest
    needs: [build]  # ejecutar después del build y levantamiento del servicio

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra

      - name: Start Spring Boot (background)
        run: |
          ./gradlew bootRun &
          # Esperar hasta que el servicio esté disponible (max 60s)
          timeout 60 bash -c 'until curl -sf http://localhost:8080/actuator/health/readiness; do sleep 2; done'

      - name: Run Newman Collections
        env:
          NEWMAN_BASE_URL: "http://localhost:8080"
          NEWMAN_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
          NEWMAN_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
        run: |
          # Sobrescribir variables del environment con secrets de CI
          for collection in postman/collections/*.postman_collection.json; do
            newman run "$collection" \
              --environment postman/environments/ZNS-dev.postman_environment.json \
              --env-var "baseUrl=$NEWMAN_BASE_URL" \
              --env-var "adminEmail=$NEWMAN_ADMIN_EMAIL" \
              --env-var "adminPassword=$NEWMAN_ADMIN_PASSWORD" \
              --reporters cli,htmlextra \
              --reporter-htmlextra-export "postman/reports/$(basename $collection .postman_collection.json)-report.html" \
              --bail \
              --timeout-request 15000
          done

      - name: Upload Newman Reports
        if: always()  # subir reportes aunque haya fallado
        uses: actions/upload-artifact@v4
        with:
          name: newman-reports
          path: postman/reports/
          retention-days: 30
```

---

## 🧠 PARTE 7 — GENERACIÓN DESDE OPENAPI SPEC

### Importar OpenAPI spec en Postman (UI)

```
1. Abrir Postman → Import
2. URL: http://localhost:8080/api-docs
   (o archivo local: postman/openapi-spec.yaml)
3. Postman genera automáticamente requests desde la spec
4. Reorganizar en carpetas por dominio
5. Añadir pre-request scripts y test scripts manualmente
6. Exportar como Collection v2.1
```

### Generar colección desde spec con openapi-to-postmanv2

```bash
npm install -g openapi-to-postmanv2

# Descargar spec desde el servidor local
curl http://localhost:8080/api-docs -o postman/openapi-spec.json

# Convertir a Postman Collection
openapi2postmanv2 \
  -s postman/openapi-spec.json \
  -o postman/collections/ZNS-Generada.postman_collection.json \
  -p \
  --options '{"folderStrategy":"Tags","requestNameSource":"Summary"}'
```

> ⚠️ La colección generada automáticamente requiere revisión manual para:  
> - Añadir pre-request scripts de token refresh  
> - Completar bodies de ejemplo realistas  
> - Añadir test scripts por status code  
> - Organizar en carpetas lógicas por operación (no solo por tag)

---

## 🧠 PARTE 8 — POLÍTICA POST-ONLY EN COLLECTIONS

```javascript
// Pre-request script para validar que todos los requests son POST (excepto actuator)
const method = pm.request.method;
const url = pm.request.url.toString();
const isActuator = url.includes('/actuator');
const isSwagger = url.includes('/swagger-ui') || url.includes('/api-docs');

if (!isActuator && !isSwagger) {
    pm.test('Política POST-only: método debe ser POST', () => {
        pm.expect(method).to.eql('POST');
    });
}
```

---

## 🧠 PARTE 9 — .NET CORE: EQUIVALENCIAS

La estructura de colecciones es **idéntica** para proyectos .NET Core. Las únicas diferencias son en los valores de los environments:

```json
// ZNS-dev-dotnet.postman_environment.json
{
  "name": "ZNS .NET - Development",
  "values": [
    { "key": "baseUrl",    "value": "https://localhost:7080", "enabled": true },
    { "key": "apiVersion", "value": "v1",                    "enabled": true },
    { "key": "accessToken","value": "",                      "enabled": true, "type": "secret" }
  ]
}
```

```bash
# Script de arranque para CI con .NET
dotnet run --project src/ZNS.Api/ZNS.Api.csproj &
timeout 60 bash -c 'until curl -sf https://localhost:7080/health; do sleep 2; done'
```

---

## ✅ CHECKLIST DE AUDITORÍA — POSTMAN COLLECTIONS

### Estructura
- [ ] Una Collection `.postman_collection.json` por dominio de API (1:1 con `GroupedOpenApi`)
- [ ] Carpeta `postman/` en la raíz del repositorio con subdirectorios `collections/`, `environments/`, `reports/`
- [ ] Tres environments mínimos: `dev`, `staging`, `prod-readonly`
- [ ] Credenciales de staging/prod en variables `{{PLACEHOLDER}}` nunca hardcodeadas

### Requests (por endpoint)
- [ ] Cada request tiene `name` descriptivo + `description` con comportamiento esperado
- [ ] Casos positivos Y negativos (400/401/403/409/422) para cada endpoint crítico
- [ ] Body con datos de ejemplo realistas (no `"string"` ni `null`)
- [ ] Header `X-Correlation-Id: {{correlationId}}` en todos los requests
- [ ] Auth configurado a nivel de Collection (Bearer `{{accessToken}}`) — override en requests públicos

### Pre-request scripts
- [ ] Collection-level: generación de `correlationId` con `{{$guid}}`
- [ ] Collection-level: auto-refresh de access token antes de que expire

### Test scripts
- [ ] Validación de status code en cada request
- [ ] Validación de estructura de `ProblemDetail` en todos los casos de error (400/409/422)
- [ ] Check `[SEC] No expone stack trace` en requests de error
- [ ] `PageResponse` estructura validada en endpoints de listado
- [ ] UUID v4 validado en IDs retornados

### Newman / CI
- [ ] `newman` en `package.json` devDependencies o `npm install -g`
- [ ] `run-all.sh` ejecuta todas las collections secuencialmente con `--bail`
- [ ] Job de Newman en GitHub Actions, after `build`, before `deploy`
- [ ] Reports HTML subidos como artifacts
- [ ] Variables sensibles inyectadas con `--env-var` desde `${{ secrets }}` (nunca hardcodeadas en el YML)
