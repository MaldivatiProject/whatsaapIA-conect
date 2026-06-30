import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/** Records HTTP latency into the Prometheus histogram, labelled by route pattern. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { route?: { path?: string } }>();
    const method = request.method;
    // Use the route pattern (e.g. /sessions/:id) not the raw URL — avoids label explosion.
    const route = request.route?.path ?? request.path ?? 'unknown';
    const start = process.hrtime.bigint();

    const record = (): void => {
      const status = http.getResponse<Response>().statusCode;
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.observeHttp(method, route, status, seconds);
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
