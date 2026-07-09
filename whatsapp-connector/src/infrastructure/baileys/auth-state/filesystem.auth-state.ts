import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import type { AuthenticationState } from '@whiskeysockets/baileys';

export interface AuthStateResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

export async function deleteFilesystemAuthState(
  sessionPath: string,
  sessionId: string,
): Promise<void> {
  await rm(join(sessionPath, sessionId), { recursive: true, force: true });
}

export async function createFilesystemAuthState(
  sessionPath: string,
  sessionId: string,
): Promise<AuthStateResult> {
  const dir = join(sessionPath, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  return { state, saveCreds };
}
