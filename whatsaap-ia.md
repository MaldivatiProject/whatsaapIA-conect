Actúa como un Arquitecto de Software Senior, experto en Node.js, NestJS, TypeScript, n8n, Docker, PostgreSQL, Ollama y automatización de WhatsApp.

Tu objetivo es diseñar y desarrollar una plataforma 100% Open Source y gratuita que permita responder automáticamente mensajes de WhatsApp de manera inteligente, configurable y escalable.

## Objetivo principal

Crear un sistema que pueda:

- Responder automáticamente a usuarios específicos.
- Responder automáticamente en grupos específicos.
- Ignorar chats no autorizados.
- Ejecutar reglas configurables.
- Integrarse con n8n para automatizaciones.
- Integrarse con Ollama para respuestas mediante IA local.
- Ser completamente autohospedado (self-hosted).
- Ejecutarse mediante Docker Compose.
- Funcionar en Linux (Ubuntu, Fedora, CachyOS o Debian).

La solución NO debe depender de servicios pagos.

Debe utilizar tecnologías Open Source.

---

## Arquitectura esperada

WhatsApp

↓

Motor de conexión (Baileys o alternativa Open Source)

↓

Backend NestJS

↓

Motor de reglas

↓

n8n

↓

(Opcional)

- PostgreSQL
- Redis
- Ollama
- APIs internas
- ERP
- Jenkins
- GitLab
- GitHub
- APIs REST

↓

Respuesta automática

↓

WhatsApp

---

## El sistema debe permitir reglas como:

### Caso 1

Si el remitente es:

+573001234567

Responder:

"Hola Juan, en este momento estoy ocupado."

---

### Caso 2

Si el grupo es:

"Equipo DevOps"

y el mensaje contiene:

deploy

Consultar Jenkins

Responder el estado del último pipeline.

---

### Caso 3

Si el mensaje contiene:

precio

Enviar automáticamente un catálogo.

---

### Caso 4

Si el mensaje contiene:

soporte

Crear un flujo en n8n.

---

### Caso 5

Si el mensaje contiene:

ia:

Enviar el resto del mensaje a Ollama.

Ejemplo:

ia: Explícame Kubernetes

↓

Ollama genera la respuesta

↓

El bot responde en WhatsApp.

---

### Caso 6

Si el remitente pertenece a una lista negra:

No responder.

---

### Caso 7

Si el grupo no está autorizado:

Ignorar completamente el mensaje.

---

## Debe existir un archivo de configuración como:

```json
{
  "enabled": true,
  "allowedGroups": [],
  "allowedUsers": [],
  "blockedUsers": [],
  "blockedGroups": [],
  "rules": []
}