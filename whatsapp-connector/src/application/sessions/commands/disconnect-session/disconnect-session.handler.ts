import { Inject, Injectable } from '@nestjs/common';
import { createSessionId } from '../../../../domain/session/session-id.vo';
import { SessionNotFoundError } from '../../../../domain/session/session.errors';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';
import { SESSION_SOCKET, type SessionSocketPort } from '../../../ports/session-socket.port';
import type { DisconnectSessionCommand } from './disconnect-session.command';

@Injectable()
export class DisconnectSessionHandler {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(SESSION_SOCKET) private readonly socket: SessionSocketPort,
  ) {}
  async execute(command: DisconnectSessionCommand): Promise<void> {
    const id = createSessionId(command.sessionId);
    if (!(await this.sessions.findByIdAndOwner(id, command.ownerId))) {
      throw new SessionNotFoundError(command.sessionId);
    }
    await this.socket.disconnect(id);
  }
}
