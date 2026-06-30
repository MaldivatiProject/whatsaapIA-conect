import { Injectable } from '@nestjs/common';
import type { EventPublisherPort } from '../../application/ports/event-publisher.port';
import type { DomainEvent } from '../../domain/shared/domain-event';

/**
 * Fans out to multiple EventPublisher implementations.
 * Active publishers are injected based on config flags.
 */
@Injectable()
export class CompositeEventPublisher implements EventPublisherPort {
  constructor(private readonly publishers: EventPublisherPort[]) {}

  async publish(event: DomainEvent): Promise<void> {
    await Promise.allSettled(this.publishers.map((p) => p.publish(event)));
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    await Promise.allSettled(this.publishers.map((p) => p.publishMany(events)));
  }
}
