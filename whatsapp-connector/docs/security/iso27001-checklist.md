# Checklist ISO 27001 (técnico) — whatsapp-connector

> Evidencia técnica mínima alineada con el SGSI. No declara cumplimiento total del
> estándar; cubre los controles implementables en el servicio. Última revisión: 2026-06-30.

## A.9 / A.5.15 — Accesos y autenticación
- [x] Autenticación obligatoria por API key en todos los endpoints salvo `/health`
      (`ApiKeyAuthGuard`). Evidencia: `src/shared/auth/`.
- [x] Autorización por propietario (BOLA): `findByIdAndOwner`, respuesta 404 en acceso
      cruzado. Evidencia: tests `send-message`, `session-handlers`, e2e isolation.
- [x] Comparación de claves en tiempo constante (`timingSafeEqual`).
- [ ] Rotación automática de credenciales — **gap**: hoy manual. Acción: migrar a JWT
      RS256/ES256 con expiración.

## A.8.24 / Secrets management
- [x] Sin secretos en código ni repositorio; `.env` en `.gitignore`.
- [x] Secretos inyectados por entorno (`API_KEYS`, `WEBHOOK_SECRET`, `DATABASE_URL`).
- [x] Auth state cifrado en Valkey con AES-256-GCM; clave separada y obligatoria en producción.
- [ ] Vault/Secrets Manager — **gap**: recomendado para producción. Acción: integrar
      gestor de secretos en el despliegue.

## A.8.15 / A.8.16 — Logging y auditoría
- [x] Logs estructurados (`pino`) con `correlationId` propagado (`AsyncLocalStorage`).
- [x] PII (teléfonos/JIDs) hasheada; cuerpos de mensaje nunca logueados.
- [x] Sin stack traces en respuestas (filtros de excepción centralizados, ProblemDetail).
- [ ] Centralización/retención de logs (SIEM) — **gap**: fuera del servicio. Acción:
      enviar stdout JSON a la plataforma de logs corporativa.

## A.8.8 — Vulnerabilidades y dependencias
- [x] Script `npm run audit:sca` (`npm audit --audit-level=high`) disponible para CI.
- [x] Gate de arquitectura (`dependency-cruiser`) y lint con tipos.
- [ ] SCA ejecutándose en CI de forma bloqueante — **gap**: pipeline pendiente.

## A.8.6 / Disponibilidad y recuperación
- [x] Health checks liveness/readiness (`@nestjs/terminus`) y `HEALTHCHECK` en Docker.
- [x] Graceful shutdown (cierre de sockets Baileys en `onModuleDestroy`).
- [x] Borrado definitivo elimina auth state filesystem/Valkey; disconnect y shutdown
      no revocan el dispositivo enlazado.
- [x] Persistencia configurable (filesystem/Valkey/Postgres) con reconexión al arranque.
- [ ] Backups de credenciales de sesión — **gap**: depende del proveedor. Acción:
      backup del volumen `sessions/` o de Valkey/Postgres según despliegue.

## A.8.26 — Validación de entradas
- [x] Validación en el borde (`class-validator` + `zod` en config) y en el dominio.
- [x] Límite de tamaño de body y de media; allow-list de MIME.

## A.8.20 — Seguridad de red / transporte
- [x] `helmet`, CORS por configuración, rate limiting (`@nestjs/throttler`).
- [ ] TLS terminado en el servicio — **gap**: hoy se asume TLS en el proxy/ingress.
      Variables `TLS_*` reservadas. Acción: terminar TLS en el borde de infraestructura.

## Riesgos residuales
- Claves API estáticas con rotación manual (mitigación: JWT planificado).
- La rotación de `AUTH_STATE_ENCRYPTION_KEY` requiere un procedimiento de recifrado coordinado.

## Responsable / siguiente revisor
- Implementación: Backend Senior. Revisión: Seguridad / Arquitectura ZNS.
