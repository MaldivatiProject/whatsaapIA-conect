import { SendMessageHandler } from '../../../src/application/messages/commands/send-message/send-message.handler';
import { SendMessageCommand } from '../../../src/application/messages/commands/send-message/send-message.command';
import { InMemorySessionRepository } from '../../../src/infrastructure/persistence/in-memory.session.repository';
import { Session } from '../../../src/domain/session/session.aggregate';
import { SessionNotFoundError, SessionNotConnectedError, InvalidJidError } from '../../../src/domain/session/session.errors';
import type { SessionSocketPort } from '../../../src/application/ports/session-socket.port';
import type { EventPublisherPort } from '../../../src/application/ports/event-publisher.port';

class MockSessionSocket implements SessionSocketPort {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async sendMessage(): Promise<string> { return 'generated-msg-id'; }
  async sendMedia(): Promise<string> { return 'msg-id'; }
  isActive(): boolean { return true; }
  getActiveSessions(): never[] { return []; }
}

class MockEventPublisher implements EventPublisherPort {
  readonly published: unknown[] = [];
  async publish(e: unknown): Promise<void> { this.published.push(e); }
  async publishMany(es: unknown[]): Promise<void> { this.published.push(...es); }
}

async function makeConnectedSession(repo: InMemorySessionRepository): Promise<void> {
  const session = Session.create({ id: 'active-session' });
  session.markConnected('5491122334455');
  session.clearDomainEvents();
  await repo.save(session);
}

function makeHandler(repo: InMemorySessionRepository) {
  const socket = new MockSessionSocket();
  const publisher = new MockEventPublisher();
  return {
    handler: new SendMessageHandler(repo, socket, publisher),
    publisher,
  };
}

describe('SendMessageHandler', () => {
  it('sends message and returns messageId', async () => {
    const repo = new InMemorySessionRepository();
    await makeConnectedSession(repo);
    const { handler } = makeHandler(repo);

    const result = await handler.execute(
      new SendMessageCommand('active-session', '5491122334455@s.whatsapp.net', 'Hello!'),
    );

    expect(result.messageId).toBe('generated-msg-id');
    expect(result.to).toBe('5491122334455@s.whatsapp.net');
  });

  it('publishes MessageSentEvent', async () => {
    const repo = new InMemorySessionRepository();
    await makeConnectedSession(repo);
    const { handler, publisher } = makeHandler(repo);

    await handler.execute(
      new SendMessageCommand('active-session', '5491122334455@s.whatsapp.net', 'Hello!'),
    );

    expect(publisher.published).toHaveLength(1);
  });

  it('throws SessionNotFoundError for unknown session', async () => {
    const repo = new InMemorySessionRepository();
    const { handler } = makeHandler(repo);

    await expect(
      handler.execute(new SendMessageCommand('unknown', '5491122334455@s.whatsapp.net', 'Hi')),
    ).rejects.toThrow(SessionNotFoundError);
  });

  it('throws SessionNotConnectedError for disconnected session', async () => {
    const repo = new InMemorySessionRepository();
    const session = Session.create({ id: 'disconnected-session' });
    await repo.save(session);
    const { handler } = makeHandler(repo);

    await expect(
      handler.execute(new SendMessageCommand('disconnected-session', '5491122334455@s.whatsapp.net', 'Hi')),
    ).rejects.toThrow(SessionNotConnectedError);
  });

  it('throws InvalidJidError for malformed JID', async () => {
    const repo = new InMemorySessionRepository();
    await makeConnectedSession(repo);
    const { handler } = makeHandler(repo);

    await expect(
      handler.execute(new SendMessageCommand('active-session', 'not-a-jid', 'Hi')),
    ).rejects.toThrow(InvalidJidError);
  });
});
