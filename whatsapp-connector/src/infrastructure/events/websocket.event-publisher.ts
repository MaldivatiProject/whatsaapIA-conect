import { Injectable } from '@nestjs/common';
import type { EventPublisherPort } from '../../application/ports/event-publisher.port';
import type { DomainEvent } from '../../domain/shared/domain-event';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class WebSocketEventPublisher implements EventPublisherPort {
  constructor(private readonly gateway: EventsGateway) {}

  async publish(event: DomainEvent): Promise<void> {
    this.gateway.broadcast(event);
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this.gateway.broadcast(event);
    }
  }
}
