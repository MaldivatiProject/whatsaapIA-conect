import { Module } from '@nestjs/common';
import { SessionManagerService } from './session-manager.service';
import { BaileysSessionAdapter, REDIS_CLIENT } from './baileys-session.adapter';
import { SESSION_SOCKET } from '../../application/ports/session-socket.port';
import { EVENT_PUBLISHER } from '../../application/ports/event-publisher.port';
import { SESSION_REPOSITORY } from '../../domain/session/session.repository';
import { CompositeEventPublisher } from '../events/composite.event-publisher';
import { WebSocketEventPublisher } from '../events/websocket.event-publisher';
import { RestWebhookEventPublisher } from '../events/rest-webhook.event-publisher';
import { EventsGateway } from '../websocket/events.gateway';
import { InMemorySessionRepository } from '../persistence/in-memory.session.repository';
import { FilesystemSessionRepository } from '../persistence/filesystem.session.repository';
import { RedisSessionRepository } from '../persistence/redis.session.repository';
import { APP_CONFIG } from '../../application/shared/tokens';
import { getConfig } from '../../config/app.config';
import Redis from 'ioredis';

const config = getConfig();

const sessionRepositoryProvider = {
  provide: SESSION_REPOSITORY,
  useFactory: (): object => {
    if (config.SESSION_PROVIDER === 'redis' && config.ENABLE_REDIS && config.REDIS_URL) {
      const redis = new Redis(config.REDIS_URL);
      return new RedisSessionRepository(redis);
    }
    if (config.SESSION_PROVIDER === 'filesystem') {
      return new FilesystemSessionRepository(config.SESSION_PATH);
    }
    return new InMemorySessionRepository();
  },
};

const redisClientProvider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis | null => {
    if (config.ENABLE_REDIS && config.REDIS_URL) {
      return new Redis(config.REDIS_URL);
    }
    return null;
  },
};

const eventPublisherProvider = {
  provide: EVENT_PUBLISHER,
  useFactory: (gateway: EventsGateway): CompositeEventPublisher => {
    const publishers = [];
    if (config.ENABLE_WEBSOCKET) {
      publishers.push(new WebSocketEventPublisher(gateway));
    }
    if (config.WEBHOOK_ENABLED) {
      publishers.push(new RestWebhookEventPublisher(config));
    }
    return new CompositeEventPublisher(publishers);
  },
  inject: [EventsGateway],
};

@Module({
  providers: [
    { provide: APP_CONFIG, useValue: config },
    SessionManagerService,
    sessionRepositoryProvider,
    redisClientProvider,
    eventPublisherProvider,
    EventsGateway,
    BaileysSessionAdapter,
    { provide: SESSION_SOCKET, useExisting: BaileysSessionAdapter },
  ],
  exports: [
    SESSION_REPOSITORY,
    SESSION_SOCKET,
    EVENT_PUBLISHER,
    APP_CONFIG,
    EventsGateway,
    SessionManagerService,
  ],
})
export class BaileysModule {}
