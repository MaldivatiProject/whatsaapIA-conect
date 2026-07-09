import { Inject, Injectable } from '@nestjs/common';
import { createSessionId } from '../../../../domain/session/session-id.vo';
import { SessionNotFoundError } from '../../../../domain/session/session.errors';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';

@Injectable()
export class GetSessionQrHandler {
  constructor(@Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository) {}
  async execute(sessionId: string, ownerId: string): Promise<{ qrCode: string; expiresAt: string }> {
    const id = createSessionId(sessionId);
    const session = await this.sessions.findByIdAndOwner(id, ownerId);
    if (!session) throw new SessionNotFoundError(sessionId);
    const qrCode = session.getQrCode();
    const expiresAt = session.status.kind === 'qr_ready' ? session.status.expiresAt.toISOString() : '';
    return { qrCode, expiresAt };
  }
}
