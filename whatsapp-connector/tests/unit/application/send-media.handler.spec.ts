import { SendMediaHandler } from '../../../src/application/messages/commands/send-media/send-media.handler';
import { SendMediaCommand } from '../../../src/application/messages/commands/send-media/send-media.command';
import { InMemorySessionRepository } from '../../../src/infrastructure/persistence/in-memory.session.repository';
import { Session } from '../../../src/domain/session/session.aggregate';
import {
  SessionNotFoundError,
  MediaTooLargeError,
  MimeTypeNotAllowedError,
} from '../../../src/domain/session/session.errors';
import type { AppConfig } from '../../../src/config/app.config';
import type { SessionSocketPort } from '../../../src/application/ports/session-socket.port';
import type { EventPublisherPort } from '../../../src/application/ports/event-publisher.port';
import type { SendMediaParams } from '../../../src/domain/message/send-media.params';

class MockSocket implements SessionSocketPort {
  lastMedia?: SendMediaParams;
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async sendMessage(): Promise<string> { return 'm'; }
  async sendMedia(p: SendMediaParams): Promise<string> { this.lastMedia = p; return 'media-id'; }
  isActive(): boolean { return true; }
  getActiveSessions(): never[] { return []; }
}

class MockPublisher implements EventPublisherPort {
  readonly published: unknown[] = [];
  async publish(e: unknown): Promise<void> { this.published.push(e); }
  async publishMany(es: unknown[]): Promise<void> { this.published.push(...es); }
}

const config = {
  MAX_MEDIA_SIZE_MB: 1,
  ALLOWED_MIME_TYPES: 'image/png,application/pdf',
} as AppConfig;

async function connected(repo: InMemorySessionRepository, ownerId = 'tenantA'): Promise<void> {
  const s = Session.create({ id: 'active', ownerId });
  s.markConnected('5491122334455');
  await repo.save(s);
}

function makeHandler(repo: InMemorySessionRepository) {
  const socket = new MockSocket();
  return { handler: new SendMediaHandler(repo, socket, new MockPublisher(), config), socket };
}

describe('SendMediaHandler', () => {
  const jid = '5491122334455@s.whatsapp.net';

  it('sends media and infers the media type from the mime', async () => {
    const repo = new InMemorySessionRepository();
    await connected(repo);
    const { handler, socket } = makeHandler(repo);

    const result = await handler.execute(
      new SendMediaCommand('active', 'tenantA', jid, 'image/png', 'p.png', Buffer.from('x')),
    );

    expect(result.messageId).toBe('media-id');
    expect(result.mediaType).toBe('image');
    expect(socket.lastMedia?.mediaType).toBe('image');
  });

  it('rejects media over the size limit', async () => {
    const repo = new InMemorySessionRepository();
    await connected(repo);
    const { handler } = makeHandler(repo);

    await expect(
      handler.execute(
        new SendMediaCommand('active', 'tenantA', jid, 'image/png', 'big.png', Buffer.alloc(2 * 1024 * 1024)),
      ),
    ).rejects.toThrow(MediaTooLargeError);
  });

  it('rejects disallowed mime types', async () => {
    const repo = new InMemorySessionRepository();
    await connected(repo);
    const { handler } = makeHandler(repo);

    await expect(
      handler.execute(new SendMediaCommand('active', 'tenantA', jid, 'application/zip', 'a.zip', Buffer.from('x'))),
    ).rejects.toThrow(MimeTypeNotAllowedError);
  });

  it('prevents BOLA: another owner cannot send media (404)', async () => {
    const repo = new InMemorySessionRepository();
    await connected(repo, 'tenantA');
    const { handler } = makeHandler(repo);

    await expect(
      handler.execute(new SendMediaCommand('active', 'tenantB', jid, 'image/png', 'p.png', Buffer.from('x'))),
    ).rejects.toThrow(SessionNotFoundError);
  });
});
