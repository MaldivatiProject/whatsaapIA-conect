import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, UnprocessableEntityException } from '@nestjs/common';
import { AppModule } from './app.module';
import { getConfig, getCorsOrigins } from './config/app.config';
import { PinoLoggerService } from './shared/logging/pino-logger.service';
import { CorrelationIdInterceptor } from './shared/interceptors/correlation-id.interceptor';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { UnexpectedExceptionFilter } from './shared/filters/unexpected-exception.filter';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter';
import { getCorrelationId } from './shared/context/request-context';

async function bootstrap(): Promise<void> {
  const config = getConfig();

  const app = await NestFactory.create(AppModule, {
    logger: false,
    bufferLogs: true,
  });

  const logger = new PinoLoggerService(config);
  app.useLogger(logger);

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
