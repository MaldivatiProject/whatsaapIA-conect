import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { EventPublisherPort } from '../../application/ports/event-publisher.port';
import type { DomainEvent } from '../../domain/shared/domain-event';
import type { AppConfig } from '../../config/app.config';

@Injectable()
export class RestWebhookEventPublisher implements EventPublisherPort {
  private readonly logger = new Logger(RestWebhookEventPublisher.name);

  constructor(private readonly config: AppConfig) {}

  async publish(event: DomainEvent): Promise<void> {
    if (!this.config.WEBHOOK_ENABLED || !this.config.WEBHOOK_URL) return;
    await this.sendWebhook(event);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    if (!this.config.WEBHOOK_ENABLED || !this.config.WEBHOOK_URL) return;
    await Promise.allSettled(events.map((e) => this.sendWebhook(e)));
  }

  private async sendWebhook(event: DomainEvent): Promise<void> {
    const payload = JSON.stringify({
      eventName: event.eventName,
      occurredAt: event.occurredAt.toISOString(),
      ...(event as unknown as Record<string, unknown>),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.WEBHOOK_SECRET) {
      const signature = createHmac('sha256', this.config.WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(this.config.WEBHOOK_URL!, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Webhook delivery failed: ${event.eventName} → ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Webhook delivery error: ${event.eventName}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
