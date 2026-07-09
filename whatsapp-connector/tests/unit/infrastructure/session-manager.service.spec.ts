import type { WASocket } from '@whiskeysockets/baileys';
import { SessionManagerService } from '../../../src/infrastructure/baileys/session-manager.service';
import type { SessionId } from '../../../src/domain/session/session-id.vo';

function socketDouble(): {
  socket: WASocket;
  logout: jest.Mock<Promise<void>, []>;
  end: jest.Mock<void, [Error]>;
  removeAllListeners: jest.Mock<void, []>;
} {
  const logout = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const end = jest.fn<void, [Error]>();
  const removeAllListeners = jest.fn<void, []>();
  const socket = {
    logout,
    end,
    ev: { removeAllListeners },
  } as unknown as WASocket;
  return { socket, logout, end, removeAllListeners };
}

describe('SessionManagerService lifecycle', () => {
  const id = 'session-1' as SessionId;

  it('closes a socket without revoking the linked WhatsApp device', async () => {
    const manager = new SessionManagerService();
    const fake = socketDouble();
    manager.register(id, fake.socket);

    await manager.close(id);

    expect(fake.logout).not.toHaveBeenCalled();
    expect(fake.end).toHaveBeenCalledTimes(1);
    expect(manager.isActive(id)).toBe(false);
  });

  it('logs out only during permanent deletion', async () => {
    const manager = new SessionManagerService();
    const fake = socketDouble();
    manager.register(id, fake.socket);

    await manager.logout(id);

    expect(fake.logout).toHaveBeenCalledTimes(1);
    expect(fake.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(manager.isActive(id)).toBe(false);
  });

  it('still releases the socket when remote logout fails', async () => {
    const manager = new SessionManagerService();
    const fake = socketDouble();
    fake.logout.mockRejectedValueOnce(new Error('network unavailable'));
    manager.register(id, fake.socket);

    await expect(manager.logout(id)).resolves.toBeUndefined();

    expect(fake.end).toHaveBeenCalledTimes(1);
    expect(manager.isActive(id)).toBe(false);
  });

  it('does not log out sessions during application shutdown', async () => {
    const manager = new SessionManagerService();
    const fake = socketDouble();
    manager.register(id, fake.socket);

    await manager.onModuleDestroy();

    expect(fake.logout).not.toHaveBeenCalled();
    expect(fake.end).toHaveBeenCalledTimes(1);
  });
});
