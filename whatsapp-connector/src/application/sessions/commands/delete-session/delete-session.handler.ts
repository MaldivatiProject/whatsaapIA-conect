import { Inject, Injectable } from '@nestjs/common';
import { createSessionId } from '../../../../domain/session/session-id.vo';
import { SessionNotFoundError } from '../../../../domain/session/session.errors';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';
import { SESSION_SOCKET, type SessionSocketPort } from '../../../ports/session-socket.port';
import { EVENT_PUBLISHER, type EventPublisherPort } from '../../../ports/event-publisher.port';
import type { DeleteSessionCommand } from './delete-session.command';

@Injectable()
export class DeleteSessionHandler {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(SESSION_SOCKET) private readonly socket: SessionSocketPort,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisherPort,
  ) {}

  async execute(command: DeleteSessionCommand): Promise<void> {
    const id = createSessionId(command.sessionId);
    const session = await this.sessions.findByIdAndOwner(id, command.ownerId);
    if (!session) throw new SessionNotFoundError(command.sessionId);
    await this.socket.delete(id);
    await this.sessions.deleteOwned(id, command.ownerId);
    await this.events.publishMany([...session.domainEvents]);
  }
}
