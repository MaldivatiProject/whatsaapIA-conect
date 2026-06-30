import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../domain/shared/domain-error';
import { getCorrelationId } from '../context/request-context';

const STATUS_MAP: Readonly<Record<string, number>> = {
  SESSION_NOT_FOUND: 404,
  SESSION_ALREADY_EXISTS: 409,
  SESSION_LIMIT_REACHED: 422,
  SESSION_NOT_CONNECTED: 409,
  SESSION_QR_NOT_AVAILABLE: 404,
  INVALID_JID: 422,
  MEDIA_TOO_LARGE: 413,
  MIME_TYPE_NOT_ALLOWED: 415,
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = STATUS_MAP[exception.code] ?? 422;

    response.status(status).json({
      type: `https://whatsapp-connector/errors/${exception.code.toLowerCase().replace(/_/g, '-')}`,
      title: exception.name,
      status,
      detail: exception.message,
      correlationId: getCorrelationId(),
      timestamp: new Date().toISOString(),
    });
  }
}
