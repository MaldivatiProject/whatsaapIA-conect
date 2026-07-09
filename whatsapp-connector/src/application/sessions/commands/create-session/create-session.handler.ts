import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';
import { SESSION_SOCKET, type SessionSocketPort } from '../../../ports/session-socket.port';
import { EVENT_PUBLISHER, type EventPublisherPort } from '../../../ports/event-publisher.port';
import { Session } from '../../../../domain/session/session.aggregate';
import { createSessionId } from '../../../../domain/session/session-id.vo';
import { SessionAlreadyExistsError, SessionLimitReachedError } from '../../../../domain/session/session.errors';
import { APP_CONFIG } from '../../../shared/tokens';
import type { AppConfig } from '../../../../config/app.config';
import type { CreateSessionCommand } from './create-session.command';

@Injectable()
export class CreateSessionHandler {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(SESSION_SOCKET) private readonly socket: SessionSocketPort,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisherPort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async execute(command: CreateSessionCommand): Promise<string> {
    const existing = await this.sessions.findById(createSessionId(command.sessionId));
    if (existing) throw new SessionAlreadyExistsError(command.sessionId);
    const owned = await this.sessions.findAllByOwner(command.ownerId);
    if (owned.length >= this.config.MAX_SESSIONS) {
      throw new SessionLimitReachedError(this.config.MAX_SESSIONS);
    }

    const session = Session.create({
      id: command.sessionId,
      ownerId: command.ownerId,
      config: {
        maxReconnectAttempts: this.config.MAX_RECONNECT_ATTEMPTS,
        reconnectIntervalMs: this.config.RECONNECT_INTERVAL_MS,
        heartbeatIntervalMs: this.config.HEARTBEAT_INTERVAL_MS,
        rateLimitMaxPerMinute: this.config.RATE_LIMIT_MAX_PER_MINUTE,
        rateLimitMinDelayMs: this.config.RATE_LIMIT_MIN_DELAY_MS,
      },
    });
    await this.sessions.save(session);
    await this.events.publishMany([...session.domainEvents]);
    session.clearDomainEvents();
    try {
      await this.socket.connect(session.id);
    } catch (error) {
      await this.sessions.deleteOwned(session.id, command.ownerId);
      throw error;
    }
    return session.id;
  }
}
