/**
 * Mirrors whatsapp-connector's validateJid (send-message.params.ts): accepts
 * number@s.whatsapp.net, groupId@g.us, or number@lid — the privacy-preserving
 * JID form WhatsApp uses when a contact hasn't been resolved to a phone number
 * yet. Baileys supports sending directly to @lid recipients.
 */
export const JID_PATTERN = /^\d+@(s\.whatsapp\.net|g\.us|lid)$/;

export const JID_FORMAT_HINT = "numero@s.whatsapp.net, id@g.us o numero@lid";
