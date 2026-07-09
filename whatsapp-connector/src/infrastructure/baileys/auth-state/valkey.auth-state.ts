import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import type { Redis as ValkeyClient } from 'ioredis';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer | undefined {
  const encoded = process.env['AUTH_STATE_ENCRYPTION_KEY'];
  if (!encoded) return undefined;
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('AUTH_STATE_ENCRYPTION_KEY must decode to 32 bytes');
  return key;
}

function encrypt(value: string): string {
  const key = encryptionKey();
  if (!key) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
}

function decrypt(value: string): string {
  if (!value.startsWith('v1:')) return value;
  const key = encryptionKey();
  if (!key) throw new Error('Encrypted auth state requires AUTH_STATE_ENCRYPTION_KEY');
  const parts = value.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted auth state');
  const [, iv, tag, ciphertext] = parts;
  if (!iv || !tag || !ciphertext) throw new Error('Invalid encrypted auth state');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function keyFor(sessionId: string, type: string, id: string): string {
  return `wac:auth:${sessionId}:${type}:${id}`;
}

function credsKey(sessionId: string): string {
  return `wac:creds:${sessionId}`;
}

export async function createValkeyAuthState(
  valkey: ValkeyClient,
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const readData = async <T>(key: string): Promise<T | null> => {
    const raw = await valkey.get(key);
    if (!raw) return null;
    return JSON.parse(decrypt(raw), BufferJSON.reviver) as T;
  };

  const writeData = async <T>(key: string, value: T): Promise<void> => {
    await valkey.set(key, encrypt(JSON.stringify(value, BufferJSON.replacer)));
  };

  const removeData = async (key: string): Promise<void> => {
    await valkey.del(key);
  };

  const creds: AuthenticationCreds =
    (await readData<AuthenticationCreds>(credsKey(sessionId))) ?? initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        await Promise.all(
          ids.map(async (id) => {
            const key = keyFor(sessionId, type, id);
            const value = await readData<SignalDataTypeMap[T]>(key);
            if (value) result[id] = value;
          }),
        );
        return result;
      },
      set: async (data: {
        [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null };
      }): Promise<void> => {
        const tasks: Promise<void>[] = [];
        for (const [type, ids] of Object.entries(data)) {
          if (!ids) continue;
          for (const [id, value] of Object.entries(ids)) {
            const key = keyFor(sessionId, type, id);
            if (value) {
              tasks.push(writeData(key, value));
            } else {
              tasks.push(removeData(key));
            }
          }
        }
        await Promise.all(tasks);
      },
    },
  };

  const saveCreds = async (): Promise<void> => {
    await writeData(credsKey(sessionId), state.creds);
  };

  return { state, saveCreds };
}

export async function deleteValkeyAuthState(
  valkey: ValkeyClient,
  sessionId: string,
): Promise<void> {
  const patterns = [`wac:auth:${sessionId}:*`, credsKey(sessionId)];
  for (const pattern of patterns) {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await valkey.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await valkey.del(...keys);
    } while (cursor !== '0');
  }
}
