import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { initAuthCreds, BufferJSON, proto } from '@whiskeysockets/baileys';
import type { Redis } from 'ioredis';

function keyFor(sessionId: string, type: string, id: string): string {
  return `wac:auth:${sessionId}:${type}:${id}`;
}

function credsKey(sessionId: string): string {
  return `wac:creds:${sessionId}`;
}

export async function createRedisAuthState(
  redis: Redis,
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const readData = async <T>(key: string): Promise<T | null> => {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw, BufferJSON.reviver) as T;
  };

  const writeData = async <T>(key: string, value: T): Promise<void> => {
    await redis.set(key, JSON.stringify(value, BufferJSON.replacer));
  };

  const removeData = async (key: string): Promise<void> => {
    await redis.del(key);
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
      set: async (data: { [T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null } }): Promise<void> => {
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
