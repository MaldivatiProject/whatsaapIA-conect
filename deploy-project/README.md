# deploy-project

Orquestador unico para levantar la plataforma completa de `projects/whatsaapIA-conect`.

## Servicios incluidos

- `postgres`: base compartida para `whatsaap-backend`.
- `valkey`: persistencia de sesiones de `whatsapp-connector`.
- `rabbitmq`: bus AMQP para workers y outbox.
- `migrate`: migraciones Flyway del backend.
- `whatsaap-backend-*`: API, workers, outbox relay y connector bridge.
- `whatsapp-connector`: gateway WhatsApp.
- `whatsapp-dashboard`: panel Next.js.

## Uso rapido

```bash
cd projects/whatsaapIA-conect/deploy-project
python3 deploy.py init
python3 deploy.py up --build
```

Si ya existen contenedores levantados desde los compose individuales
(`whatsaap-backend`, `whatsapp-connector` o `whatsapp-dashboard`), primero
entrega el control a `deploy-project`:

```bash
python3 deploy.py up --build --takeover
```

`--takeover` remueve solo contenedores con nombres esperados por
`deploy-project` pero creados por otros compose. No elimina volumenes Docker.
Es intencionalmente explicito porque detener contenedores de otro compose es una
operacion invasiva.

El despliegue se ejecuta en este orden:

1. Crear la red Docker externa `whatsapp-platform` si falta.
2. Levantar `postgres`, `valkey` y `rabbitmq`.
3. Ejecutar migraciones Flyway.
4. Levantar API y procesos del backend.
5. Levantar `whatsapp-connector` conectado al webhook del backend.
6. Construir y levantar `whatsapp-dashboard`.

## URLs locales

- Dashboard: `http://localhost:3001`
- Connector REST: `http://localhost:3000`
- Backend reglas/API: `http://localhost:8000`
- RabbitMQ Management: `http://localhost:15672`
- PostgreSQL local/DBeaver: `127.0.0.1:5432`

La API key que debes usar en el dashboard queda en `API_KEY_SECRET` dentro de `.env`.
No la compartas ni la subas al repositorio.

## Conexion desde DBeaver

PostgreSQL se publica por defecto solo en loopback:

```text
POSTGRES_HOST_BIND=127.0.0.1
POSTGRES_HOST_PORT=5432
```

Con esto DBeaver puede conectarse desde la misma maquina usando:

```text
Host: 127.0.0.1
Port: 5432
Database: whatsapp_connector
User: valor de POSTGRES_USER
Password: valor de POSTGRES_PASSWORD
Schema: automation_schema
```

Si DBeaver esta en otra maquina, no abras Postgres directamente a `0.0.0.0`
salvo que tengas firewall/VPN y una IP permitida. La opcion recomendada es un
tunel SSH hacia el server y mantener `POSTGRES_HOST_BIND=127.0.0.1`.

## Comandos utiles

```bash
python3 deploy.py plan
python3 deploy.py status
python3 deploy.py logs whatsapp-connector
python3 deploy.py migrate
python3 deploy.py restart whatsapp-dashboard
python3 deploy.py takeover
python3 deploy.py down
```

Para destruir tambien volumenes de datos:

```bash
python3 deploy.py down --volumes
```
