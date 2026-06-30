import type { DomainEvent } from '../../domain/shared/domain-event';

export interface EventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('EventPublisherPort');
