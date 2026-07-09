import { mkdtemp, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deleteFilesystemAuthState } from '../../../src/infrastructure/baileys/auth-state/filesystem.auth-state';

describe('deleteFilesystemAuthState', () => {
  it('removes all persisted credentials for a deleted session', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wac-auth-'));
    const sessionDir = join(root, 'session-1');
    await mkdir(sessionDir);

    await deleteFilesystemAuthState(root, 'session-1');

    await expect(access(sessionDir)).rejects.toThrow();
  });

  it('is idempotent when the session has no auth state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'wac-auth-'));
    await expect(deleteFilesystemAuthState(root, 'missing')).resolves.toBeUndefined();
  });
});
