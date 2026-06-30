# Objetivo

Desarrollar un proyecto llamado `whatsapp-connector`, cuya única
responsabilidad sea administrar la conexión con WhatsApp utilizando
Baileys (o una alternativa Open Source compatible con WhatsApp Web).

Este proyecto **NO** debe contener lógica de negocio, agentes de IA,
reglas empresariales ni procesamiento inteligente. Su función es actuar
como un adaptador (Adapter/Gateway) entre WhatsApp y otros servicios del
ecosistema.

------------------------------------------------------------------------

# Principios de diseño

## Configuration over Code

El proyecto debe diseñarse bajo el principio de **Configuration over
Code**.

La mayor parte del comportamiento del sistema debe ser parametrizable
sin necesidad de modificar el código fuente.

Siempre que sea posible, las funcionalidades deben configurarse
mediante:

-   Variables de entorno (`.env`)
-   Archivos de configuración (`yaml`, `json` o similares)
-   Proveedores de configuración desacoplados
-   Futuro soporte para configuración almacenada en base de datos

El código no debe contener valores hardcodeados que limiten su
reutilización.

## Ejemplos de configuraciones parametrizables

-   Puerto del servicio
-   Nivel de logs
-   Ruta de almacenamiento de sesiones
-   Cantidad máxima de sesiones
-   Timeouts
-   Estrategias de reconexión
-   Cantidad máxima de reintentos
-   Intervalos de heartbeat
-   Habilitación o deshabilitación de WebSocket
-   Habilitación o deshabilitación de REST
-   Habilitación o deshabilitación de eventos
-   Formato de serialización de eventos
-   Tipo de persistencia
-   Proveedor de persistencia
-   Directorios temporales
-   Límite de tamaño de archivos
-   Tipos MIME permitidos
-   Configuración de CORS
-   Configuración de autenticación
-   Configuración de métricas
-   Configuración de observabilidad
-   Configuración de Docker
-   Configuración de Redis
-   Configuración de PostgreSQL
-   Configuración de proxies
-   Configuración de SSL/TLS

El objetivo es que una nueva instalación pueda adaptarse a distintos
escenarios modificando únicamente la configuración.

------------------------------------------------------------------------

# Responsabilidades

-   Administrar una o múltiples sesiones de WhatsApp.
-   Generar y mostrar el QR de autenticación.
-   Persistir las credenciales de sesión.
-   Reconectarse automáticamente cuando la conexión se pierda.
-   Detectar eventos de conexión y desconexión.
-   Recibir mensajes entrantes.
-   Enviar mensajes.
-   Enviar imágenes, documentos y audios.
-   Detectar mensajes de grupos y chats individuales.
-   Obtener información básica del remitente.
-   Exponer eventos mediante API o WebSocket.

------------------------------------------------------------------------

# No debe hacer

-   No responder automáticamente.
-   No invocar modelos LLM.
-   No almacenar contexto conversacional.
-   No ejecutar reglas de negocio.
-   No decidir acciones.
-   No contener prompts.
-   No implementar agentes.

Todo eso será responsabilidad de servicios externos.

------------------------------------------------------------------------

# Arquitectura

Aplicar Clean Architecture.

``` text
whatsapp-connector
├── api
├── application
├── domain
├── infrastructure
│   ├── baileys
│   ├── persistence
│   └── websocket
├── config
├── shared
└── tests
```

Toda dependencia externa debe implementarse mediante interfaces e
inversión de dependencias.

------------------------------------------------------------------------

# API REST

-   GET /health
-   GET /sessions
-   POST /sessions
-   DELETE /sessions/{id}
-   GET /sessions/{id}/qr
-   POST /messages/send
-   POST /messages/send-media
-   POST /sessions/{id}/disconnect

------------------------------------------------------------------------

# Eventos

-   SESSION_CREATED
-   SESSION_CONNECTED
-   SESSION_DISCONNECTED
-   SESSION_RECONNECTED
-   MESSAGE_RECEIVED
-   MESSAGE_SENT
-   GROUP_MESSAGE_RECEIVED
-   PRIVATE_MESSAGE_RECEIVED
-   MEDIA_RECEIVED
-   QR_GENERATED

El mecanismo de publicación de eventos debe ser reemplazable (REST,
WebSocket, Redis, RabbitMQ, Kafka, NATS, etc.) sin modificar la lógica
del dominio.

------------------------------------------------------------------------

# Configuración

Toda configuración debe centralizarse en un módulo de configuración.

Variables mínimas:

-   PORT
-   LOG_LEVEL
-   SESSION_PATH
-   MAX_SESSIONS
-   ENABLE_WEBSOCKET
-   ENABLE_REST
-   ENABLE_EVENTS
-   ENABLE_REDIS
-   ENABLE_POSTGRES
-   RECONNECT_INTERVAL
-   MAX_RECONNECT_ATTEMPTS
-   HEARTBEAT_INTERVAL
-   ALLOWED_FILE_TYPES
-   MAX_MEDIA_SIZE
-   CORS_ENABLED
-   CORS_ORIGINS

El sistema debe proporcionar un `.env.example` completo y documentado.

------------------------------------------------------------------------

# Persistencia

Las sesiones deben poder almacenarse mediante un patrón de proveedor
intercambiable:

-   Sistema de archivos
-   PostgreSQL (opcional)
-   Redis (opcional)

La implementación debe estar desacoplada mediante interfaces.

------------------------------------------------------------------------

# Escalabilidad

Debe soportar múltiples sesiones simultáneamente.

-   Cliente A → WhatsApp A
-   Cliente B → WhatsApp B
-   Cliente C → WhatsApp C

Cada sesión debe ser completamente aislada y no compartir estado.

------------------------------------------------------------------------

# Docker

Generar:

-   Dockerfile
-   docker-compose.yml
-   .env.example

Toda la configuración del contenedor debe realizarse mediante variables
de entorno.

------------------------------------------------------------------------

# Observabilidad

Implementar:

-   Health Check
-   Logs estructurados
-   Métricas básicas
-   Manejo centralizado de errores

El nivel de observabilidad debe poder configurarse sin modificar el
código.

------------------------------------------------------------------------

# Calidad

-   TypeScript estricto
-   ESLint
-   Prettier
-   Arquitectura modular
-   Código documentado
-   Tests unitarios básicos

No debe existir lógica de negocio mezclada con la infraestructura.

------------------------------------------------------------------------

# Objetivo final

El resultado debe ser un microservicio independiente, reutilizable y
altamente configurable que funcione como un **nodo especializado de
conexión con WhatsApp**, para ser consumido posteriormente por
orquestadores, MCPs, agentes de IA o cualquier otra aplicación mediante
APIs o eventos, sin contener lógica de negocio y minimizando la
necesidad de cambios de código gracias a un enfoque de configuración
parametrizable.
