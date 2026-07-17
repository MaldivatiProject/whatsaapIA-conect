export const Browsers = { macOS: (): [string, string, string] => ['Test', 'Test', '1'] };
export const DisconnectReason = { loggedOut: 401 };
export const fetchLatestBaileysVersion = async (): Promise<{ version: [number, number, number] }> => ({ version: [1, 0, 0] });
export const isJidGroup = (jid: string): boolean => jid.endsWith('@g.us');
export const jidNormalizedUser = (jid: string): string => jid;
// Mirrors @whiskeysockets/baileys' real implementation closely enough for
// tests: unwraps version-proofing envelopes (documentWithCaptionMessage,
// ephemeralMessage, viewOnceMessage, etc.) to the real inner content.
export const normalizeMessageContent = (
  content: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined => {
  if (!content) return undefined;
  let current = content;
  for (let i = 0; i < 5; i += 1) {
    const inner =
      (current['ephemeralMessage'] as { message?: Record<string, unknown> } | undefined) ??
      (current['viewOnceMessage'] as { message?: Record<string, unknown> } | undefined) ??
      (current['documentWithCaptionMessage'] as { message?: Record<string, unknown> } | undefined) ??
      (current['viewOnceMessageV2'] as { message?: Record<string, unknown> } | undefined) ??
      (current['viewOnceMessageV2Extension'] as { message?: Record<string, unknown> } | undefined) ??
      (current['editedMessage'] as { message?: Record<string, unknown> } | undefined);
    if (!inner?.message) break;
    current = inner.message;
  }
  return current;
};
export const getContentType = (content: Record<string, unknown> | null | undefined): string | undefined => {
  if (!content) return undefined;
  return Object.keys(content).find(
    (key) => (key === 'conversation' || key.includes('Message')) && key !== 'senderKeyDistributionMessage',
  );
};
export const initAuthCreds = (): Record<string, never> => ({});
export const BufferJSON = { replacer: (_key: string, value: unknown): unknown => value, reviver: (_key: string, value: unknown): unknown => value };
export const proto = {};
export const useMultiFileAuthState = async (): Promise<{ state: Record<string, unknown>; saveCreds: () => Promise<void> }> => ({
  state: {},
  saveCreds: async () => undefined,
});
// Overridable per-test via `(downloadMediaMessage as jest.Mock).mockResolvedValueOnce(...)`.
export const downloadMediaMessage = jest.fn(async (): Promise<Buffer> => Buffer.from(''));
export default (): never => {
  throw new Error('Baileys socket must be overridden in tests');
};
