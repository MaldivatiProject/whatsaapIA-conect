import { Injectable } from '@nestjs/common';
import { Registry, Histogram, collectDefaultMetrics } from 'prom-client';

/**
 * Owns the Prometheus registry. Exposes a latency histogram for HTTP routes
 * so an alert can be wired on p95 (e.g. histogram_quantile(0.95, ...) <= 0.1s).
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: 'whatsapp-connector' });
    collectDefaultMetrics({ register: this.registry });
  }

  observeHttp(method: string, route: string, status: number, seconds: number): void {
    this.httpDuration.observe({ method, route, status: String(status) }, seconds);
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
