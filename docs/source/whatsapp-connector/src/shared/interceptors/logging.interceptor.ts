import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLoggerService } from '../logging/pino-logger.service';
import { getCorrelationId } from '../context/request-context';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

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
              correlationId: getCorrelationId(),
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
              correlationId: getCorrelationId(),
              errorName: error.name,
            }),
          );
        },
      }),
    );
  }
}
