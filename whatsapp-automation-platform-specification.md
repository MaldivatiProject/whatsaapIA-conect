# Plataforma de Automatización Inteligente para WhatsApp

## Rol

Actúa como un **Arquitecto de Software Senior**, experto en:

- Node.js
- NestJS
- TypeScript
- n8n
- Docker
- PostgreSQL
- Redis
- Ollama
- Arquitectura Hexagonal
- Clean Architecture
- Automatización empresarial
- Integración con IA

Tu objetivo es diseñar y desarrollar una plataforma **100% Open Source**, **gratuita**, **escalable** y **lista para producción**, capaz de responder automáticamente mensajes de WhatsApp mediante reglas, automatizaciones e Inteligencia Artificial local.

---

## Objetivo general

Desarrollar una plataforma que permita:

- Responder automáticamente a usuarios específicos.
- Responder automáticamente en grupos específicos.
- Ignorar usuarios o grupos no autorizados.
- Ejecutar reglas configurables.
- Integrarse con n8n.
- Integrarse con Ollama para IA local.
- Ejecutarse completamente en infraestructura propia, tipo **self-hosted**.
- Desplegarse mediante Docker Compose.
- Funcionar sobre Linux: Ubuntu, Fedora, Debian, CachyOS u otra distribución compatible.

La solución debe depender únicamente de tecnologías **Open Source** y gratuitas.

---

## Arquitectura esperada

```text
WhatsApp
   ↓
Motor de conexión: Baileys o equivalente Open Source
   ↓
Backend NestJS
   ↓
Motor de reglas
   ↓
n8n
   ↓
PostgreSQL / Redis / Ollama / APIs internas / Jenkins / ERP
   ↓
Respuesta automática
   ↓
WhatsApp
```

---

## Casos de uso

### Caso 1: respuesta automática a usuario específico

Si el remitente es:

```text
+573001234567
```

Responder:

```text
Hola Juan, en este momento estoy ocupado.
```

---

### Caso 2: respuesta automática en grupo específico

Si el grupo es:

```text
Equipo DevOps
```

Y el mensaje contiene:

```text
deploy
```

Entonces:

1. Consultar Jenkins.
2. Obtener el estado del último pipeline.
3. Responder el resultado en WhatsApp.

---

### Caso 3: envío automático de catálogo

Si el mensaje contiene:

```text
precio
```

Responder automáticamente con un catálogo.

---

### Caso 4: flujo de soporte

Si el mensaje contiene:

```text
soporte
```

Entonces:

1. Enviar evento a n8n.
2. Crear flujo de soporte.
3. Registrar el caso.
4. Responder confirmación al usuario.

---

### Caso 5: respuesta con IA local usando Ollama

Si el mensaje comienza con:

```text
ia:
```

Ejemplo:

```text
ia: Explícame Kubernetes
```

El sistema debe:

1. Extraer el texto posterior a `ia:`.
2. Enviar la consulta a Ollama.
3. Esperar la respuesta.
4. Responder automáticamente en WhatsApp.

---

### Caso 6: lista negra

Si el usuario pertenece a una lista negra:

- No responder.
- Registrar el evento en logs.
- No enviar el mensaje a n8n ni a Ollama.

---

### Caso 7: grupo no autorizado

Si el grupo no está autorizado:

- Ignorar completamente el mensaje.
- No ejecutar reglas.
- No enviar respuesta.

---

## Configuración esperada

Debe existir una configuración similar a la siguiente:

```json
{
  "enabled": true,
  "allowedGroups": [],
  "allowedUsers": [],
  "blockedUsers": [],
  "blockedGroups": [],
  "rules": []
}
```

También puede almacenarse en PostgreSQL mediante entidades configurables.

---

## Arquitectura del proyecto

La estructura base debe seguir Clean Architecture y Arquitectura Hexagonal:

```text
src/
├── application/
├── domain/
├── infrastructure/
├── shared/
├── config/
└── modules/
```

---

## Requisitos técnicos

Implementar usando:

- NestJS
- TypeScript estricto
- ESLint
- Prettier
- Dependency Injection
- Repository Pattern
- Strategy Pattern para reglas
- Factory Pattern para respuestas
- Event Bus interno
- Logger centralizado
- Manejo global de excepciones
- Configuración mediante variables de entorno
- Docker Compose

No utilizar:

```typescript
any
```

---

## Integración con n8n

El backend debe exponer webhooks para que n8n pueda:

- Recibir mensajes.
- Ejecutar workflows.
- Consultar APIs externas.
- Consultar APIs internas.
- Responder usuarios.
- Ejecutar automatizaciones.
- Crear tickets.
- Consultar Jenkins, GitLab, GitHub o ERP.

---

## Integración con Ollama

Debe existir un servicio llamado:

```typescript
OllamaService
```

Con métodos como:

```typescript
generate()
chat()
health()
```

Debe ser configurable para diferentes modelos:

- Llama
- Qwen
- Gemma
- Mistral

---

## Seguridad

Implementar:

- Rate limiting.
- Lista blanca.
- Lista negra.
- Auditoría.
- Logs.
- Configuración mediante variables de entorno.
- Protección contra loops infinitos.
- Evitar responder a mensajes enviados por el propio bot.
- Validación de entradas.
- Sanitización de mensajes.
- Control de errores.
- Registro de intentos bloqueados.

---

## Docker

Generar:

```text
Dockerfile
docker-compose.yml
```

El `docker-compose.yml` debe incluir:

- NestJS
- PostgreSQL
- Redis
- n8n
- Ollama

---

## Base de datos

Diseñar el modelo para las siguientes entidades:

- users
- groups
- rules
- logs
- messages
- automations
- settings

---

## API REST

Crear endpoints para:

```http
GET     /rules
POST    /rules
PUT     /rules/:id
DELETE  /rules/:id

GET     /groups
GET     /users

POST    /send

GET     /health
GET     /logs
```

---

## Panel administrativo

Proponer una interfaz web en Angular 20 o React que permita:

- Activar o desactivar reglas.
- Administrar usuarios.
- Administrar grupos.
- Visualizar logs.
- Consultar conversaciones.
- Probar respuestas.
- Configurar Ollama.
- Configurar n8n.
- Ver estado del bot.
- Ver estado de servicios externos.

---

## Documentación requerida

Generar documentación completa incluyendo:

- Arquitectura.
- Diagramas.
- Flujo de mensajes.
- Modelo de datos.
- Casos de uso.
- Estructura de carpetas.
- Buenas prácticas.
- Guía de despliegue.
- Guía de desarrollo.
- Guía para producción.
- Variables de entorno.
- Estrategia de logs.
- Estrategia de seguridad.
- Roadmap técnico.

---

## Forma de respuesta esperada

Antes de escribir código:

1. Analizar la arquitectura propuesta.
2. Justificar las decisiones técnicas.
3. Proponer mejoras.
4. Identificar riesgos técnicos y operativos.
5. Presentar un roadmap por fases.

Luego desarrollar el proyecto completo archivo por archivo, con calidad **Senior/Enterprise**, siguiendo buenas prácticas, código listo para producción y alta mantenibilidad.

---

## Restricciones importantes

- La solución debe ser gratuita.
- La solución debe ser self-hosted.
- No debe depender de servicios pagos.
- No debe usar `any`.
- No debe exponer credenciales.
- No debe responder mensajes propios.
- No debe ejecutar reglas en chats no autorizados.
- No debe generar loops infinitos.
- Debe ser modular, mantenible y escalable.
