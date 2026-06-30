import type { SessionId } from '../session/session-id.vo';
import { InvalidJidError } from '../session/session.errors';

export interface SendMessageParams {
  readonly sessionId: SessionId;
  readonly to: string;
  readonly text: string;
  readonly quotedMessageId?: string;
}

export function validateJid(jid: string): void {
  // WhatsApp JID format: number@s.whatsapp.net or groupId@g.us
  if (!/@(s\.whatsapp\.net|g\.us)$/.test(jid)) {
    throw new InvalidJidError(jid);
  }
}

export function buildJid(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new InvalidJidError(phone);
  }
  return `${digits}@s.whatsapp.net`;
}
