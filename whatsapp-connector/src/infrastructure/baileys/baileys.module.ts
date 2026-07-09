import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { SessionManagerService } from './session-manager.service';
import { BaileysSessionAdapter, VALKEY_CLIENT } from './baileys-session.adapter';
import { SESSION_SOCKET } from '../../application/ports/session-socket.port';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../application/ports/event-publisher.port';
import { SESSION_REPOSITORY } from '../../domain/session/session.repository';
import { CompositeEventPublisher } from '../events/composite.event-publisher';
import { WebSocketEventPublisher } from '../events/websocket.event-publisher';
import { RestWebhookEventPublisher } from '../events/rest-webhook.event-publisher';
import { EventsGateway } from '../websocket/events.gateway';
import { InMemorySessionRepository } from '../persistence/in-memory.session.repository';
import { FilesystemSessionRepository } from '../persistence/filesystem.session.repository';
import { ValkeySessionRepository } from '../persistence/valkey.session.repository';
import { PrismaSessionRepository } from '../persistence/prisma.session.repository';
import type { SessionRepository } from '../../domain/session/session.repository';
import { APP_CONFIG } from '../../application/shared/tokens';
import { getConfig, getValkeyUrl, isValkeyEnabled } from '../../config/app.config';
import { Logger } from '@nestjs/common';
import Valkey from 'ioredis';

const config = getConfig();
const bootstrapLogger = new Logger('BaileysModule');

const sessionRepositoryProvider = {
  provide: SESSION_REPOSITORY,
  // Reuses the shared Valkey client instead of opening a second connection.
  useFactory: (valkey: Valkey | null): SessionRepository => {
    switch (config.SESSION_PROVIDER) {
      case 'valkey':
      case 'redis':
        if (!valkey) {
          throw new Error(
            'SESSION_PROVIDER=valkey requires ENABLE_VALKEY=true and a valid VALKEY_URL',
          );
        }
        if (config.SESSION_PROVIDER === 'redis') {
          bootstrapLogger.warn(
            'SESSION_PROVIDER=redis is deprecated; migrate to SESSION_PROVIDER=valkey',
          );
        }
        return new ValkeySessionRepository(valkey);
      case 'postgres':
        if (!config.ENABLE_POSTGRES || !config.DATABASE_URL) {
          throw new Error(
            'SESSION_PROVIDER=postgres requires ENABLE_POSTGRES=true and a valid DATABASE_URL',
          );
        }
        return new PrismaSessionRepository();
      case 'filesystem':
        return new FilesystemSessionRepository(config.SESSION_PATH);
      default:
        bootstrapLogger.warn(
          `Unknown SESSION_PROVIDER '${String(config.SESSION_PROVIDER)}' — falling back to in-memory (non-persistent)`,
        );
        return new InMemorySessionRepository();
    }
  },
  inject: [VALKEY_CLIENT],
};

const valkeyClientProvider = {
  provide: VALKEY_CLIENT,
  useFactory: (): Valkey | null => {
    const url = getValkeyUrl(config);
    if (isValkeyEnabled(config) && url) {
      return new Valkey(url);
    }
    return null;
  },
};

const eventPublisherProvider = {
  provide: EVENT_PUBLISHER,
  useFactory: (gateway: EventsGateway): CompositeEventPublisher => {
    const publishers: EventPublisherPort[] = [];
    if (!config.ENABLE_EVENTS) return new CompositeEventPublisher(publishers);
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
    valkeyClientProvider,
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
export class BaileysModule implements OnModuleDestroy {
  constructor(@Inject(VALKEY_CLIENT) private readonly valkey: Valkey | null) {}

  async onModuleDestroy(): Promise<void> {
    if (this.valkey) await this.valkey.quit();
  }
}
