import { DeleteSessionHandler } from '../../../src/application/sessions/commands/delete-session/delete-session.handler';
import { DeleteSessionCommand } from '../../../src/application/sessions/commands/delete-session/delete-session.command';
import { DisconnectSessionHandler } from '../../../src/application/sessions/commands/disconnect-session/disconnect-session.handler';
import { DisconnectSessionCommand } from '../../../src/application/sessions/commands/disconnect-session/disconnect-session.command';
import { GetSessionQrHandler } from '../../../src/application/sessions/queries/get-session-qr/get-session-qr.handler';
import { ListSessionsHandler } from '../../../src/application/sessions/queries/list-sessions/list-sessions.handler';
import { InMemorySessionRepository } from '../../../src/infrastructure/persistence/in-memory.session.repository';
import { Session } from '../../../src/domain/session/session.aggregate';
import {
  SessionNotFoundError,
  SessionQrNotAvailableError,
} from '../../../src/domain/session/session.errors';
import type { SessionSocketPort } from '../../../src/application/ports/session-socket.port';
import type { EventPublisherPort } from '../../../src/application/ports/event-publisher.port';

class MockSocket implements SessionSocketPort {
  active = true;
  readonly disconnected: string[] = [];
  readonly deleted: string[] = [];
  async connect(): Promise<void> {}
  async disconnect(id: string): Promise<void> { this.disconnected.push(id); }
  async delete(id: string): Promise<void> { this.deleted.push(id); }
  async sendMessage(): Promise<string> { return 'm'; }
  async sendMedia(): Promise<string> { return 'm'; }
  isActive(): boolean { return this.active; }
  getActiveSessions(): never[] { return []; }
}

class MockPublisher implements EventPublisherPort {
  readonly published: unknown[] = [];
  async publish(e: unknown): Promise<void> { this.published.push(e); }
  async publishMany(es: unknown[]): Promise<void> { this.published.push(...es); }
}

async function seed(repo: InMemorySessionRepository, id: string, ownerId: string, connected = true): Promise<void> {
  const s = Session.create({ id, ownerId });
  if (connected) s.markConnected('5491122334455');
  s.clearDomainEvents();
  await repo.save(s);
}

describe('DeleteSessionHandler', () => {
  it('deletes an owned session and disconnects the socket', async () => {
    const repo = new InMemorySessionRepository();
    await seed(repo, 's1', 'tenantA');
    const socket = new MockSocket();
    const handler = new DeleteSessionHandler(repo, socket, new MockPublisher());

    await handler.execute(new DeleteSessionCommand('s1', 'tenantA'));

    expect(await repo.findById('s1' as never)).toBeNull();
    expect(socket.deleted).toContain('s1');
    expect(socket.disconnected).not.toContain('s1');
  });

  it('prevents BOLA: another owner cannot delete (404)', async () => {
    const repo = new InMemorySessionRepository();
    await seed(repo, 's1', 'tenantA');
    const handler = new DeleteSessionHandler(repo, new MockSocket(), new MockPublisher());

    await expect(handler.execute(new DeleteSessionCommand('s1', 'tenantB'))).rejects.toThrow(
      SessionNotFoundError,
    );
    expect(await repo.findById('s1' as never)).not.toBeNull();
  });
});

describe('DisconnectSessionHandler', () => {
  it('disconnects an owned, active session', async () => {
    const repo = new InMemorySessionRepository();
    await seed(repo, 's1', 'tenantA');
    const socket = new MockSocket();
    const handler = new DisconnectSessionHandler(repo, socket);

    await handler.execute(new DisconnectSessionCommand('s1', 'tenantA'));
    expect(socket.disconnected).toContain('s1');
  });

  it('throws 404 for unknown / cross-owner session', async () => {
    const repo = new InMemorySessionRepository();
    await seed(repo, 's1', 'tenantA');
    const handler = new DisconnectSessionHandler(repo, new MockSocket());

    await expect(handler.execute(new DisconnectSessionCommand('s1', 'tenantB'))).rejects.toThrow(
      SessionNotFoundError,
    );
  });
});

describe('GetSessionQrHandler', () => {
  it('returns QR for an owned session in qr_ready', async () => {
    const repo = new InMemorySessionRepository();
    const s = Session.create({ id: 's1', ownerId: 'tenantA' });
    s.markQrReady('qr-data');
    await repo.save(s);
    const handler = new GetSessionQrHandler(repo);

    const result = await handler.execute('s1', 'tenantA');
    expect(result.qrCode).toBe('qr-data');
    expect(typeof result.expiresAt).toBe('string');
  });

  it('throws when QR not available', async () => {
    const repo = new InMemorySessionRepository();
    await seed(repo, 's1', 'tenantA');
    const handler = new GetSessionQrHandler(repo);

    await expect(handler.execute('s1', 'tenantA')).rejects.toThrow(SessionQrNotAvailableError);
  });

  it('throws 404 for cross-owner access', async () => {
    const repo = new InMemorySessionRepository();
    const s = Session.create({ id: 's1', ownerId: 'tenantA' });
    s.markQrReady('qr-data');
    await repo.save(s);
    const handler = new GetSessionQrHandler(repo);

    await expect(handler.execute('s1', 'tenantB')).rejects.toThrow(SessionNotFoundError);
  });
});

describe('ListSessionsHandler', () => {
  it('returns only sessions owned by the caller', async () => {
    const repo = new InMemorySessionRepository();
    await seed(repo, 'a1', 'tenantA');
    await seed(repo, 'a2', 'tenantA', false);
    await seed(repo, 'b1', 'tenantB');
    const handler = new ListSessionsHandler(repo);

    const list = await handler.execute('tenantA');
    expect(list.map((s) => s.id).sort()).toEqual(['a1', 'a2']);
    expect(list.every((s) => typeof s.createdAt === 'string')).toBe(true);
  });
});
