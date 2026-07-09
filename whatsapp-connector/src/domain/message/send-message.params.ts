import type { SessionId } from '../session/session-id.vo';
import { InvalidJidError } from '../session/session.errors';

export interface SendMessageParams {
  readonly sessionId: SessionId;
  readonly to: string;
  readonly text: string;
  readonly quotedMessageId?: string;
}

export function validateJid(jid: string): void {
  // WhatsApp JID format: number@s.whatsapp.net, groupId@g.us, or the
  // privacy-preserving number@lid form Baileys treats as a first-class,
  // directly sendable JidServer (see WABinary/jid-utils). @lid senders show up
  // whenever resolveLid() in baileys-session.adapter.ts can't map them to a
  // phone JID yet (contact not synced) — rejecting them here would make those
  // contacts permanently unreachable via /messages/send(-media).
  if (!/@(s\.whatsapp\.net|g\.us|lid)$/.test(jid)) {
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
