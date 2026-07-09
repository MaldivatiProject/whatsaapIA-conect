import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';

export interface SessionListItem {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ListSessionsHandler {
  constructor(@Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository) {}
  async execute(ownerId: string): Promise<SessionListItem[]> {
    const sessions = await this.sessions.findAllByOwner(ownerId);
    return sessions.map((session) => ({
      id: session.id,
      status: session.status.kind,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));
  }
}
