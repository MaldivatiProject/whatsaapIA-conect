declare const __sessionId: unique symbol;
export type SessionId = string & { readonly [__sessionId]: true };

export function createSessionId(value: string): SessionId {
  if (!value || value.trim().length === 0) {
    throw new Error('SessionId cannot be empty');
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(value)) {
    throw new Error('SessionId must be alphanumeric (a-z, A-Z, 0-9, _, -), max 64 chars');
  }
  return value as SessionId;
}
