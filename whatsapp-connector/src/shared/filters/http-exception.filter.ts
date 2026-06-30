import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { getCorrelationId } from '../context/request-context';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      type: `https://whatsapp-connector/errors/http-${status}`,
      title: exception.name,
      status,
      detail: exception.message,
      correlationId: getCorrelationId(),
      timestamp: new Date().toISOString(),
    });
  }
}
