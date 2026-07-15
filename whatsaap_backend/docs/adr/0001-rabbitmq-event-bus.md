# ADR 0001 — RabbitMQ como bus de integración

- Estado: aceptado
- Fecha: 2026-07-08
- Decisores: arquitectura/backend

## Contexto

`whatsapp-connector` recibe mensajes y gestiona conexiones de WhatsApp. El nuevo
backend debe evaluar reglas, mantener conversaciones y ejecutar acciones sin
acoplar el ciclo de recepción a dependencias externas ni perder mensajes cuando
un worker o proveedor falla.

El backend es greenfield. El connector existente publica WebSocket/webhook y aún
no implementa AMQP, por lo que la adopción necesita una transición compatible.

## Decisión

RabbitMQ será el bus de integración entre el connector y el backend.

- Eventos se publican en exchanges `topic` y se nombran en pasado.
- Comandos se publican en exchanges `direct` y expresan intención.
- Las cargas críticas usan quorum queues.
- La garantía es at-least-once con consumidores idempotentes.
- Toda publicación derivada de un cambio de estado usa transactional outbox.
- Los consumidores usan inbox y manual ack después del commit.
- Los productores usan confirms, mensajes persistentes y `mandatory`.
- Cada cola tiene retries limitados y una DLQ operable.
- La topología y los contratos se versionan y validan en CI.

La primera transición usa un bridge:

1. El webhook actual del connector llega al backend.
2. El backend persiste el mensaje en inbox y un evento en outbox.
3. El relay publica el contrato AMQP.
4. Los comandos salientes son consumidos por el bridge y enviados a la API REST
   existente del connector con clave idempotente.
5. El bridge se elimina cuando el connector produzca y consuma AMQP directamente.

## Alternativas descartadas

### Celery como interfaz principal

Oculta parte de la topología, contratos y semántica de confirm/return que este
sistema necesita verificar explícitamente. Puede ser útil para tareas internas no
críticas, pero no será el contrato de integración.

### Solo webhooks síncronos

Acoplan disponibilidad y latencia, y el publisher actual agota retries sin una
cola durable ni redrive operativo.

### Kafka

El caso inicial es de comandos y trabajo durable con routing moderado. No existe
todavía una necesidad demostrada de retención extensa o replay masivo que
justifique su costo operativo.

## Consecuencias

Positivas:

- desacoplamiento temporal entre recepción, decisión y envío;
- backpressure y escalamiento por consumidor;
- reintentos y cuarentena explícitos;
- auditoría y correlación end-to-end;
- migración gradual desde el connector actual.

Costos:

- operación de RabbitMQ y sus SLO;
- duplicados posibles que deben ser absorbidos;
- contratos y topología pasan a ser artefactos versionados;
- se requieren runbooks, pruebas de fallo y disciplina de redrive.

## Garantías no ofrecidas

- exactly-once end-to-end;
- orden global;
- replay ilimitado desde quorum queues;
- SLO, RPO o RTO no acordados con negocio.

