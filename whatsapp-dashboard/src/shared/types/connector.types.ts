/** Mirrors whatsapp-connector's SessionStatus discriminated union (session-status.vo.ts `kind`). */
export type SessionStatus =
  | "pending"
  | "connecting"
  | "qr_ready"
  | "open"
  | "disconnected"
  | "reconnecting";

export interface Session {
  id: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionQr {
  qrCode: string;
  expiresAt: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  correlationId: string;
  timestamp: string;
}

export interface SendMessageRequest {
  sessionId: string;
  to: string;
  text: string;
  quotedMessageId?: string;
}

export interface SendMessageResponse {
  messageId: string;
  sessionId: string;
  to: string;
  sentAt: string;
}

export interface SendMediaRequest {
  sessionId: string;
  to: string;
  mimeType: string;
  fileName: string;
  data: string;
  caption?: string;
}

export interface HealthResponse {
  status: string;
  info?: Record<string, { status: string; [key: string]: unknown }>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

/** Event names emitted by the connector's socket.io gateway (see whatsapp-connector README). */
export const CONNECTOR_EVENT_NAMES = [
  "SESSION_CREATED",
  "SESSION_CONNECTED",
  "SESSION_DISCONNECTED",
  "SESSION_RECONNECTED",
  "QR_GENERATED",
  "MESSAGE_RECEIVED",
  "PRIVATE_MESSAGE_RECEIVED",
  "GROUP_MESSAGE_RECEIVED",
  "MEDIA_RECEIVED",
  "MESSAGE_SENT",
] as const;

export type ConnectorEventName = (typeof CONNECTOR_EVENT_NAMES)[number];

export interface ConnectorEvent {
  eventName: ConnectorEventName;
  occurredAt: string;
  sessionId: string;
  [key: string]: unknown;
}
