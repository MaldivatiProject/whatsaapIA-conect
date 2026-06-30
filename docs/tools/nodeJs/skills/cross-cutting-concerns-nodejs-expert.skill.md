# 🔗 SKILL: CROSS-CUTTING CONCERNS — NODE.JS / NESTJS EXPERT

**skill_id**: cross-cutting-concerns-nodejs-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend · observability · nestjs · logging  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: typescript-strict-expert, nodejs-async-event-loop-expert

---

## 📌 Propósito de la Skill

Implementar los aspectos transversales de la aplicación — logging estructurado (pino), correlación de requests, manejo global de errores, interceptores de auditoría, validación de entrada y observabilidad — como infraestructura compartida que se aplica de forma consistente sin contaminar el dominio ni la lógica de negocio.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

- **Cross-cutting concerns en Infrastructure, nunca en Domain** — pino, Prisma middleware, interceptores de NestJS son infraestructura.
- **Correlation ID end-to-end** — cada request HTTP y cada mensaje de WhatsApp tienen un `correlationId` trazable desde entrada hasta respuesta, log, y alertas.
- **Logging estructurado siempre** — JSON lines (pino), nunca `console.log()`. Campos estándar: `correlationId`, `level`, `msg`, `timestamp`, `service`, `version`.
- **Nunca loggear datos sensibles** — texto de mensajes de WhatsApp, credenciales, tokens JWT, números de teléfono sin anonimizar.
- **Exception Filters globales** — un solo punto de transformación de errores a HTTP responses RFC 7807.

---

### Técnicas y Patrones

#### 1. Logging estructurado con Pino

```typescript
// shared/infrastructure/logging/logger.service.ts
import pino, { Logger } from 'pino';
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(config: AppConfig) {
    this.logger = pino({
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: {
        service: 'whatsapp-ia',
        version: process.env.npm_package_version ?? '0.0.0',
        env: config.NODE_ENV,
      },
      // En desarrollo: pretty print; en producción: JSON puro
      transport: config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined,
    });
  }

  log(message: string, context?: string): void {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string): void {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string): void {
    this.logger.debug({ context }, message);
  }

  // Child logger con correlationId del contexto async
  child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings);
  }
}
```

---

#### 2. Correlation ID con AsyncLocalStorage

```typescript
// shared/infrastructure/context/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlationId: string;
  sessionId?: string;
  messageId?: string;
  senderJidHash?: string; // SHA-256 — NUNCA el JID real en logs
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getContext(): RequestContext {
  return requestContext.getStore() ?? { correlationId: 'no-context' };
}

export function getCorrelationId(): string {
  return requestContext.getStore()?.correlationId ?? 'no-context';
}

// Hashear JID para logs — privacidad
import { createHash } from 'node:crypto';
export function hashJid(jid: string): string {
  return createHash('sha256').update(jid).digest('hex').substring(0, 12);
}

// shared/infrastructure/interceptors/correlation-id.interceptor.ts
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(executionCtx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = executionCtx.switchToHttp().getRequest<Request>();
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ??
      crypto.randomUUID();

    const ctx: RequestContext = { correlationId };

    return new Observable((observer) => {
      requestContext.run(ctx, () => {
        next
          .handle()
          .pipe(
            tap(() => {
              executionCtx
                .switchToHttp()
                .getResponse<Response>()
                .setHeader('x-correlation-id', correlationId);
            }),
          )
          .subscribe(observer);
      });
    });
  }
}

// Para mensajes de Baileys — contexto sin HTTP
export async function withMessageContext<T>(
  messageId: string,
  jid: string,
  fn: () => Promise<T>,
): Promise<T> {
  const ctx: RequestContext = {
    correlationId: crypto.randomUUID(),
    messageId,
    senderJidHash: hashJid(jid),
  };
  return requestContext.run(ctx, fn);
}
```

---

#### 3. Global Exception Filters — RFC 7807

```typescript
// shared/infrastructure/filters/domain-exception.filter.ts
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private static readonly STATUS_MAP: Readonly<Record<string, number>> = {
    INVALID_JID: 422,
    INVALID_PRIORITY: 422,
    RULE_NOT_FOUND: 404,
    BLOCKED_CONTACT: 403,
    EMPTY_CONDITION_PATTERN: 422,
    INVALID_PHONE_NUMBER: 422,
  };

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = DomainExceptionFilter.STATUS_MAP[exception.code] ?? 422;
    const correlationId = getCorrelationId();

    response.status(status).json({
      type: `https://api.whatsapp-ia.local/errors/${exception.code.toLowerCase().replace(/_/g, '-')}`,
      title: exception.name,
      status,
      detail: exception.message,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}

// shared/infrastructure/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const correlationId = getCorrelationId();

    response.status(status).json({
      type: `https://api.whatsapp-ia.local/errors/http-${status}`,
      title: exception.name,
      status,
      detail: exception.message,
      correlationId,
      timestamp: new Date().toISOString(),
      // NUNCA incluir exception.stack en producción
    });
  }
}

// shared/infrastructure/filters/unexpected-exception.filter.ts
@Catch()
export class UnexpectedExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const correlationId = getCorrelationId();

    // Loggear el error real internamente (con stack)
    this.logger.error(
      exception instanceof Error ? exception.message : 'Unexpected error',
      exception instanceof Error ? exception.stack : String(exception),
      'UnexpectedExceptionFilter',
    );

    // Responder 500 sin detalles internos — RFC 7807
    response.status(500).json({
      type: 'https://api.whatsapp-ia.local/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred. Please try again later.',
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

#### 4. Logging Interceptor — Auditoría de requests

```typescript
// shared/infrastructure/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();
    const correlationId = getCorrelationId();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = context.switchToHttp().getResponse<Response>().statusCode;
          this.logger.log(
            JSON.stringify({
              type: 'http_request',
              method,
              url,
              statusCode,
              durationMs: Date.now() - startTime,
              correlationId,
            }),
          );
        },
        error: (error: Error) => {
          this.logger.error(
            JSON.stringify({
              type: 'http_request_error',
              method,
              url,
              durationMs: Date.now() - startTime,
              correlationId,
              errorName: error.name,
              // NUNCA loggear error.message si puede contener datos de usuario
            }),
          );
        },
      }),
    );
  }
}
```

---

#### 5. Validation Pipe global — Boundaries de entrada

```typescript
// main.ts — configuración global
async function bootstrap(): Promise<void> {
  const config = validateAndGetConfig();
  const app = await NestFactory.create(AppModule, {
    // Deshabilitar logger por defecto de NestJS — usamos pino
    logger: false,
    bufferLogs: true,
  });

  // Logger global
  const pinoLogger = app.get(PinoLoggerService);
  app.useLogger(pinoLogger);

  // Pipes globales — validación y transformación de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Eliminar propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // Error si se envían propiedades extra
      transform: true,            // Auto-transformar tipos (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        return new UnprocessableEntityException({
          type: 'https://api.whatsapp-ia.local/errors/validation-error',
          title: 'Validation Error',
          status: 422,
          detail: 'Input validation failed',
          errors: messages,
          correlationId: getCorrelationId(),
        });
      },
    }),
  );

  // Filters globales (orden: más específico primero)
  app.useGlobalFilters(
    new UnexpectedExceptionFilter(pinoLogger),
    new HttpExceptionFilter(),
    new DomainExceptionFilter(),
  );

  // Interceptors globales
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new LoggingInterceptor(pinoLogger),
  );

  // Graceful shutdown
  app.enableShutdownHooks();
  process.on('unhandledRejection', (reason: Error) => {
    pinoLogger.error('UNHANDLED_REJECTION', reason.stack, 'Bootstrap');
    process.exit(1);
  });

  await app.listen(config.PORT);
  pinoLogger.log(`Application listening on port ${config.PORT}`);
}
```

---

#### 6. Prisma Middleware — Logging de queries lentas

```typescript
// shared/infrastructure/database/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: PinoLoggerService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    // Loggear queries que tarden más de 100ms
    this.$on('query', (e) => {
      if (e.duration > 100) {
        this.logger.warn(
          JSON.stringify({
            type: 'slow_query',
            duration: e.duration,
            correlationId: getCorrelationId(),
            // NUNCA loggear e.query ni e.params — pueden contener PII
          }),
        );
      }
    });

    this.$on('error', (e) => {
      this.logger.error(e.message, e.target, 'PrismaService');
    });

    // Soft delete middleware — aplica automáticamente filtro expiration_date IS NULL
    this.$use(async (params, next) => {
      if (params.action === 'findMany' || params.action === 'findFirst') {
        params.args.where = {
          ...params.args.where,
          expiration_date: null,
        };
      }
      return next(params);
    });

    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

---

#### 7. Health Check Endpoint

```typescript
// shared/infrastructure/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: MemoryHealthIndicator,
    private readonly baileys: BaileysService,
  ) {}

  // ✅ Único endpoint GET permitido
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prisma.pingCheck('database'),
      () => this.redis.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB máx
      () => this.checkBaileysConnection(),
    ]);
  }

  private checkBaileysConnection(): HealthIndicatorResult {
    const state = this.baileys.getConnectionState();
    const isHealthy = state.status === 'open';
    return {
      baileys: {
        status: isHealthy ? 'up' : 'down',
        connectionStatus: state.status,
      },
    };
  }
}
```

---

## ✅ Criterios de Aplicación

- Bootstrap de la aplicación (`main.ts`) — siempre configurar pipes, filters, interceptors globales
- Cualquier log en la aplicación — usar `PinoLoggerService`, nunca `console.log()`
- Manejo de errores — siempre pasar por los filters globales; nunca capturar en Controller
- Queries a Prisma — el middleware detecta slow queries automáticamente
- Datos de contactos WhatsApp — siempre hashear JID/teléfono antes de loggear

---

## ❌ Anti-patrones

- ❌ **`console.log()`** — usar `PinoLoggerService` siempre; `console.log` no tiene correlationId ni estructura JSON
- ❌ **Loggear texto de mensajes de WhatsApp** — privacidad GDPR; solo loggear messageId y jidHash
- ❌ **Stack trace en respuestas HTTP 500** — el `UnexpectedExceptionFilter` lo oculta; nunca bypassear
- ❌ **try/catch en Controllers** — dejar que los Exception Filters lo manejen
- ❌ **Validation sin `whitelist: true`** — permite inyección de propiedades no esperadas
- ❌ **`forbidNonWhitelisted: false`** — propiedades extra deben fallar, no ignorarse silenciosamente
- ❌ **Correlation ID hardcodeado o estático** — debe ser único por request/mensaje (UUID v4)
- ❌ **Log a archivo en producción** — stdout siempre; el orquestador (Docker/K8s) captura y centraliza

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: CROSS-CUTTING CONCERNS — NODE.JS NESTJS EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/cross-cutting-concerns-nodejs-expert.skill.md

Puntos críticos:
- `PinoLoggerService` como logger global — NUNCA `console.log()` en producción
- `CorrelationIdInterceptor` global — UUID v4 por request y por mensaje de Baileys
- `AsyncLocalStorage` para propagar correlationId sin pasar como parámetro
- Hashear JID/teléfono con SHA-256 antes de loggear — NUNCA JID real en logs
- Tres Exception Filters globales (orden exacto): `UnexpectedExceptionFilter` → `HttpExceptionFilter` → `DomainExceptionFilter`
- `ValidationPipe` con `whitelist: true` + `forbidNonWhitelisted: true` + `transform: true`
- Prisma middleware para soft delete (expiration_date IS NULL) y slow query logging (> 100ms)
- `/health` GET endpoint único — estado de DB, memoria y socket de Baileys
- `app.enableShutdownHooks()` + `unhandledRejection → process.exit(1)`
```

---

## 📊 Métricas de Calidad

| Métrica | Valor esperado |
|---------|----------------|
| Ocurrencias de `console.log` en src/ | 0 |
| Requests HTTP sin correlationId en logs | 0 |
| Mensajes de WhatsApp con JID real en logs | 0 |
| Stack traces en respuestas HTTP | 0 |
| Queries > 100ms sin alerta en logs | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Cross-Cutting Concerns Node.js NestJS Expert
