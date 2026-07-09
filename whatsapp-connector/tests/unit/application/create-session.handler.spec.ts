import { CreateSessionHandler } from '../../../src/application/sessions/commands/create-session/create-session.handler';
import { CreateSessionCommand } from '../../../src/application/sessions/commands/create-session/create-session.command';
import { InMemorySessionRepository } from '../../../src/infrastructure/persistence/in-memory.session.repository';
import { SessionAlreadyExistsError, SessionLimitReachedError } from '../../../src/domain/session/session.errors';
import type { AppConfig } from '../../../src/config/app.config';
import type { SessionSocketPort } from '../../../src/application/ports/session-socket.port';
import type { EventPublisherPort } from '../../../src/application/ports/event-publisher.port';

// ── InMemory test doubles ──────────────────────
class MockSessionSocket implements SessionSocketPort {
  readonly connected: string[] = [];
  async connect(sessionId: string): Promise<void> { this.connected.push(sessionId); }
  async disconnect(): Promise<void> {}
  async delete(): Promise<void> {}
  async sendMessage(): Promise<string> { return 'msg-id'; }
  async sendMedia(): Promise<string> { return 'msg-id'; }
  isActive(): boolean { return false; }
  getActiveSessions(): never[] { return []; }
}

class MockEventPublisher implements EventPublisherPort {
  readonly published: unknown[] = [];
  async publish(event: unknown): Promise<void> { this.published.push(event); }
  async publishMany(events: unknown[]): Promise<void> { this.published.push(...events); }
}

const testConfig = {
  MAX_SESSIONS: 5,
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_INTERVAL_MS: 5000,
  HEARTBEAT_INTERVAL_MS: 30000,
  RATE_LIMIT_MAX_PER_MINUTE: 20,
  RATE_LIMIT_MIN_DELAY_MS: 500,
} as AppConfig;

function makeHandler(repo = new InMemorySessionRepository()) {
  const socket = new MockSessionSocket();
  const publisher = new MockEventPublisher();
  const handler = new CreateSessionHandler(repo, socket, publisher, testConfig);
  return { handler, repo, socket, publisher };
}

describe('CreateSessionHandler', () => {
  it('creates session and connects the socket', async () => {
    const { handler, repo, socket } = makeHandler();

    const result = await handler.execute(new CreateSessionCommand('my-session', 'tenantA'));

    expect(result).toBe('my-session');
    expect(socket.connected).toContain('my-session');
    const saved = await repo.findById('my-session' as never);
    expect(saved).not.toBeNull();
    expect(saved?.ownerId).toBe('tenantA');
  });

  it('publishes SessionCreatedEvent', async () => {
    const { handler, publisher } = makeHandler();

    await handler.execute(new CreateSessionCommand('my-session', 'tenantA'));

    expect(publisher.published.length).toBeGreaterThan(0);
  });

  it('throws SessionAlreadyExistsError when session exists', async () => {
    const { handler } = makeHandler();
    await handler.execute(new CreateSessionCommand('duplicate', 'tenantA'));

    await expect(handler.execute(new CreateSessionCommand('duplicate', 'tenantA'))).rejects.toThrow(
      SessionAlreadyExistsError,
    );
  });

  it('throws SessionLimitReachedError when limit exceeded', async () => {
    const limitConfig = { ...testConfig, MAX_SESSIONS: 2 } as AppConfig;
    const repo = new InMemorySessionRepository();
    const limitedHandler = new CreateSessionHandler(repo, new MockSessionSocket(), new MockEventPublisher(), limitConfig);

    await limitedHandler.execute(new CreateSessionCommand('session-1', 'tenantA'));
    await limitedHandler.execute(new CreateSessionCommand('session-2', 'tenantA'));

    await expect(limitedHandler.execute(new CreateSessionCommand('session-3', 'tenantA'))).rejects.toThrow(
      SessionLimitReachedError,
    );
  });
});
