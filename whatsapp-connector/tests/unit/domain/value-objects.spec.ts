import { createSessionId } from '../../../src/domain/session/session-id.vo';
import {
  SessionStatus,
  isConnected,
  hasQr,
  reviveSessionStatus,
} from '../../../src/domain/session/session-status.vo';
import { createSessionConfig } from '../../../src/domain/session/session-config.vo';
import { validateJid, buildJid } from '../../../src/domain/message/send-message.params';
import {
  validateMediaSize,
  validateMimeType,
  inferMediaType,
} from '../../../src/domain/message/send-media.params';
import {
  InvalidJidError,
  MediaTooLargeError,
  MimeTypeNotAllowedError,
} from '../../../src/domain/session/session.errors';

describe('createSessionId', () => {
  it('accepts valid ids', () => {
    expect(createSessionId('acme-bot_1')).toBe('acme-bot_1');
  });
  it('rejects empty / whitespace', () => {
    expect(() => createSessionId('')).toThrow();
    expect(() => createSessionId('   ')).toThrow();
  });
  it('rejects invalid characters', () => {
    expect(() => createSessionId('has space')).toThrow();
    expect(() => createSessionId('a'.repeat(65))).toThrow();
  });
});

describe('SessionStatus', () => {
  it('isConnected only for open', () => {
    expect(isConnected(SessionStatus.open())).toBe(true);
    expect(isConnected(SessionStatus.pending())).toBe(false);
    expect(isConnected(SessionStatus.connecting())).toBe(false);
  });

  it('hasQr narrows qr_ready', () => {
    const qr = SessionStatus.qrReady('code');
    expect(hasQr(qr)).toBe(true);
    expect(hasQr(SessionStatus.pending())).toBe(false);
  });

  it('reviveSessionStatus restores Date objects from JSON', () => {
    const cases = [
      SessionStatus.qrReady('c'),
      SessionStatus.open(),
      SessionStatus.disconnected('reason'),
      SessionStatus.reconnecting(2, 5000),
      SessionStatus.pending(),
    ];
    for (const original of cases) {
      const roundTripped = JSON.parse(JSON.stringify(original)) as typeof original;
      const revived = reviveSessionStatus(roundTripped);
      if (revived.kind === 'qr_ready') expect(revived.expiresAt).toBeInstanceOf(Date);
      if (revived.kind === 'open') expect(revived.connectedAt).toBeInstanceOf(Date);
      if (revived.kind === 'disconnected') expect(revived.disconnectedAt).toBeInstanceOf(Date);
      if (revived.kind === 'reconnecting') expect(revived.nextRetryAt).toBeInstanceOf(Date);
    }
  });
});

describe('createSessionConfig', () => {
  it('applies defaults', () => {
    const c = createSessionConfig();
    expect(c.maxReconnectAttempts).toBe(5);
    expect(c.reconnectIntervalMs).toBe(5000);
    expect(c.metadata).toBeUndefined();
  });
  it('honors overrides and metadata', () => {
    const c = createSessionConfig({ maxReconnectAttempts: 1, metadata: { team: 'sales' } });
    expect(c.maxReconnectAttempts).toBe(1);
    expect(c.metadata).toEqual({ team: 'sales' });
  });
});

describe('JID helpers', () => {
  it('validateJid accepts user and group jids', () => {
    expect(() => validateJid('5491122334455@s.whatsapp.net')).not.toThrow();
    expect(() => validateJid('123-456@g.us')).not.toThrow();
  });
  it('validateJid accepts @lid jids (unresolved LID contacts)', () => {
    expect(() => validateJid('99132626702366@lid')).not.toThrow();
  });
  it('validateJid rejects malformed jids', () => {
    expect(() => validateJid('not-a-jid')).toThrow(InvalidJidError);
  });
  it('buildJid normalizes phone numbers', () => {
    expect(buildJid('+54 9 11 2233-4455')).toBe('5491122334455@s.whatsapp.net');
  });
  it('buildJid rejects out-of-range numbers', () => {
    expect(() => buildJid('123')).toThrow(InvalidJidError);
    expect(() => buildJid('1'.repeat(16))).toThrow(InvalidJidError);
  });
});

describe('media helpers', () => {
  it('validateMediaSize passes under the limit and throws over it', () => {
    expect(() => validateMediaSize(Buffer.alloc(1024), 1)).not.toThrow();
    expect(() => validateMediaSize(Buffer.alloc(2 * 1024 * 1024), 1)).toThrow(MediaTooLargeError);
  });
  it('validateMimeType enforces the allow-list', () => {
    expect(() => validateMimeType('image/png', ['image/png'])).not.toThrow();
    expect(() => validateMimeType('application/zip', ['image/png'])).toThrow(MimeTypeNotAllowedError);
  });
  it('inferMediaType maps mime prefixes', () => {
    expect(inferMediaType('image/png')).toBe('image');
    expect(inferMediaType('video/mp4')).toBe('video');
    expect(inferMediaType('audio/ogg')).toBe('audio');
    expect(inferMediaType('application/pdf')).toBe('document');
  });
});
