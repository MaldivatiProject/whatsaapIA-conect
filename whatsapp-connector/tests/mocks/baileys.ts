export const Browsers = { macOS: (): [string, string, string] => ['Test', 'Test', '1'] };
export const DisconnectReason = { loggedOut: 401 };
export const fetchLatestBaileysVersion = async (): Promise<{ version: [number, number, number] }> => ({ version: [1, 0, 0] });
export const isJidGroup = (jid: string): boolean => jid.endsWith('@g.us');
export const jidNormalizedUser = (jid: string): string => jid;
export const initAuthCreds = (): Record<string, never> => ({});
export const BufferJSON = { replacer: (_key: string, value: unknown): unknown => value, reviver: (_key: string, value: unknown): unknown => value };
export const proto = {};
export const useMultiFileAuthState = async (): Promise<{ state: Record<string, unknown>; saveCreds: () => Promise<void> }> => ({
  state: {},
  saveCreds: async () => undefined,
});
export default (): never => {
  throw new Error('Baileys socket must be overridden in tests');
};
