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

La API key que debes usar en el dashboard queda en `API_KEY_SECRET` dentro de `.env`.
No la compartas ni la subas al repositorio.

## Comandos utiles

```bash
python3 deploy.py plan
python3 deploy.py status
python3 deploy.py logs whatsapp-connector
python3 deploy.py migrate
python3 deploy.py restart whatsapp-dashboard
python3 deploy.py down
```

Para destruir tambien volumenes de datos:

```bash
python3 deploy.py down --volumes
```
