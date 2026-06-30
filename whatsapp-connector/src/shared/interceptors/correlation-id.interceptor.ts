import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { requestContext, type RequestContext } from '../context/request-context';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/api-key.guard';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(executionCtx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = executionCtx.switchToHttp().getRequest<AuthenticatedRequest>();
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? crypto.randomUUID();

    // ownerId is populated by ApiKeyAuthGuard (runs before interceptors).
    const ctx: RequestContext = request.ownerId
      ? { correlationId, ownerId: request.ownerId }
      : { correlationId };

    return new Observable((observer) => {
      requestContext.run(ctx, () => {
        next
          .handle()
          .pipe(
            tap(() => {
              const res = executionCtx.switchToHttp().getResponse<Response>();
              // Endpoints that use @Res() + res.send() directly (e.g. qr-page, qr-image)
              // close the response before this tap runs — skip to avoid ERR_HTTP_HEADERS_SENT.
              if (!res.headersSent) {
                res.setHeader('x-correlation-id', correlationId);
              }
            }),
          )
          .subscribe(observer);
      });
    });
  }
}
