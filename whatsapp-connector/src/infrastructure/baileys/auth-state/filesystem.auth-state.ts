import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { join } from 'node:path';
import type { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';

export interface AuthStateResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

export async function createFilesystemAuthState(
  sessionPath: string,
  sessionId: string,
): Promise<AuthStateResult> {
  const dir = join(sessionPath, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  return { state, saveCreds };
}
