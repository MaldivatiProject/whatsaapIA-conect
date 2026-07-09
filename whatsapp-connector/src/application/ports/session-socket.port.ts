import type { SessionId } from '../../domain/session/session-id.vo';
import type { SendMessageParams } from '../../domain/message/send-message.params';
import type { SendMediaParams } from '../../domain/message/send-media.params';

export interface SessionSocketPort {
  connect(sessionId: SessionId): Promise<void>;
  /** Close the local socket without revoking the linked WhatsApp device. */
  disconnect(sessionId: SessionId): Promise<void>;
  /** Revoke the linked device and permanently remove its authentication state. */
  delete(sessionId: SessionId): Promise<void>;
  sendMessage(params: SendMessageParams): Promise<string>;
  sendMedia(params: SendMediaParams): Promise<string>;
  isActive(sessionId: SessionId): boolean;
  getActiveSessions(): SessionId[];
}

export const SESSION_SOCKET = Symbol('SessionSocketPort');
