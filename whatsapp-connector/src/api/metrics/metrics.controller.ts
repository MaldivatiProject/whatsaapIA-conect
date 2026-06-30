import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

/**
 * Prometheus scrape endpoint. NOT marked @Public: it stays behind the API-key
 * guard so it is never exposed unauthenticated (scraper must present a key).
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async scrape(@Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', this.metrics.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(await this.metrics.render());
  }
}
