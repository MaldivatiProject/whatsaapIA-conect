import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';
import { getCorrelationId } from '../context/request-context';
import type { AppConfig } from '../../config/app.config';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(config: AppConfig) {
    const baseOptions = {
      level: config.LOG_LEVEL,
      formatters: { level: (label: string) => ({ level: label }) },
      base: {
        service: 'whatsapp-connector',
        version: process.env['npm_package_version'] ?? '0.0.0',
        env: config.NODE_ENV,
      },
    };

    // exactOptionalPropertyTypes: spread transport only when defined
    this.logger =
      config.NODE_ENV !== 'production'
        ? pino({
            ...baseOptions,
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'SYS:standard' },
            },
          })
        : pino(baseOptions);
  }

  log(message: string, context?: string): void {
    this.logger.info({ context, correlationId: getCorrelationId() }, message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error({ context, trace, correlationId: getCorrelationId() }, message);
  }

  warn(message: string, context?: string): void {
    this.logger.warn({ context, correlationId: getCorrelationId() }, message);
  }

  debug(message: string, context?: string): void {
    this.logger.debug({ context, correlationId: getCorrelationId() }, message);
  }

  verbose(message: string, context?: string): void {
    this.logger.trace({ context, correlationId: getCorrelationId() }, message);
  }
}
