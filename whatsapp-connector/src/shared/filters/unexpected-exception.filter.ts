import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { PinoLoggerService } from '../logging/pino-logger.service';
import { getCorrelationId } from '../context/request-context';

@Catch()
export class UnexpectedExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(
      exception instanceof Error ? exception.message : 'Unexpected error',
      exception instanceof Error ? exception.stack : String(exception),
      'UnexpectedExceptionFilter',
    );

    response.status(500).json({
      type: 'https://whatsapp-connector/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred. Please try again later.',
      correlationId: getCorrelationId(),
      timestamp: new Date().toISOString(),
    });
  }
}
