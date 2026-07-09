import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsController } from '../../api/metrics/metrics.controller';
import { getConfig } from '../../config/app.config';

const metricsEnabled = getConfig().METRICS_ENABLED;

/** Wires the Prometheus registry and the global latency interceptor. */
@Module({
  controllers: metricsEnabled ? [MetricsController] : [],
  providers: [
    MetricsService,
    ...(metricsEnabled ? [{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }] : []),
  ],
  exports: [MetricsService],
})
export class ObservabilityModule {}
