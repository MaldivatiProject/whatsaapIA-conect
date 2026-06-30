export type SessionStatus =
  | { kind: 'pending' }
  | { kind: 'connecting' }
  | { kind: 'qr_ready'; qrCode: string; expiresAt: Date }
  | { kind: 'open'; connectedAt: Date }
  | { kind: 'disconnected'; reason: string; disconnectedAt: Date }
  | { kind: 'reconnecting'; attempt: number; nextRetryAt: Date };

export const SessionStatus = {
  pending: (): SessionStatus => ({ kind: 'pending' }),
  connecting: (): SessionStatus => ({ kind: 'connecting' }),
  qrReady: (qrCode: string, ttlSeconds = 90): SessionStatus => ({
    kind: 'qr_ready',
    qrCode,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
  }),
  open: (): SessionStatus => ({ kind: 'open', connectedAt: new Date() }),
  disconnected: (reason: string): SessionStatus => ({
    kind: 'disconnected',
    reason,
    disconnectedAt: new Date(),
  }),
  reconnecting: (attempt: number, intervalMs: number): SessionStatus => ({
    kind: 'reconnecting',
    attempt,
    nextRetryAt: new Date(Date.now() + intervalMs),
  }),
} as const;

export function isConnected(status: SessionStatus): boolean {
  return status.kind === 'open';
}

/** Revive a SessionStatus deserialized from JSON, converting string dates back to Date objects. */
export function reviveSessionStatus(raw: SessionStatus): SessionStatus {
  switch (raw.kind) {
    case 'qr_ready':
      return { ...raw, expiresAt: new Date(raw.expiresAt) };
    case 'open':
      return { ...raw, connectedAt: new Date(raw.connectedAt) };
    case 'disconnected':
      return { ...raw, disconnectedAt: new Date(raw.disconnectedAt) };
    case 'reconnecting':
      return { ...raw, nextRetryAt: new Date(raw.nextRetryAt) };
    default:
      return raw;
  }
}

export function hasQr(status: SessionStatus): status is { kind: 'qr_ready'; qrCode: string; expiresAt: Date } {
  return status.kind === 'qr_ready';
}
