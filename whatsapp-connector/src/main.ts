import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, UnprocessableEntityException } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getConfig, getCorsOrigins } from './config/app.config';
import { PinoLoggerService } from './shared/logging/pino-logger.service';
import { CorrelationIdInterceptor } from './shared/interceptors/correlation-id.interceptor';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { UnexpectedExceptionFilter } from './shared/filters/unexpected-exception.filter';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter';
import { getCorrelationId } from './shared/context/request-context';
import { setupOpenApi } from './config/openapi.config';

async function bootstrap(): Promise<void> {
  const config = getConfig();

  // bodyParser disabled here so we can register parsers with a media-aware limit below.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    bufferLogs: true,
    bodyParser: false,
  });

  const logger = new PinoLoggerService(config);
  app.useLogger(logger);

  // Base64-encoded media inflates ~33%; size validation still happens in the use case.
  const bodyLimit = `${Math.ceil(config.MAX_MEDIA_SIZE_MB * 1.4) + 1}mb`;
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { extended: true, limit: bodyLimit });

  // Security headers. CSP is disabled because the QR/monitor HTML pages are self-rendered
  // and rely on inline styles + the socket.io client; tighten per-route if needed.
  app.use(helmet({ contentSecurityPolicy: false }));

  if (config.CORS_ENABLED) {
    app.enableCors({ origin: getCorsOrigins(config) });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        return new UnprocessableEntityException({
          type: 'https://whatsapp-connector/errors/validation-error',
          title: 'Validation Error',
          status: 422,
          detail: 'Input validation failed',
          errors: messages,
          correlationId: getCorrelationId(),
        });
      },
    }),
  );

  // Order: most-specific last (NestJS applies in reverse order)
  app.useGlobalFilters(
    new UnexpectedExceptionFilter(logger),
    new HttpExceptionFilter(),
    new DomainExceptionFilter(),
  );

  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new LoggingInterceptor(logger),
  );

  // OpenAPI 3.x served at /docs (and raw JSON at /docs-json) in non-production by default.
  setupOpenApi(app, config);

  app.enableShutdownHooks();

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(
      reason instanceof Error ? reason.message : 'Unhandled rejection',
      reason instanceof Error ? reason.stack : String(reason),
      'Bootstrap',
    );
    process.exit(1);
  });

  await app.listen(config.PORT);
  logger.log(`whatsapp-connector listening on port ${config.PORT}`, 'Bootstrap');
}

void bootstrap();
