import type { SessionStatus } from "@/shared/types/connector.types";

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  pending: "Pendiente",
  connecting: "Conectando",
  qr_ready: "Esperando QR",
  open: "Conectado",
  reconnecting: "Reconectando",
  disconnected: "Desconectado",
};

/** Maps a session status to a badge visual variant. */
export const SESSION_STATUS_VARIANT: Record<
  SessionStatus,
  "success" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  connecting: "secondary",
  qr_ready: "secondary",
  open: "success",
  reconnecting: "secondary",
  disconnected: "destructive",
};

export function sessionStatusLabel(status: string): string {
  return SESSION_STATUS_LABEL[status as SessionStatus] ?? status;
}

export function sessionStatusVariant(status: string): "success" | "secondary" | "destructive" | "outline" {
  return SESSION_STATUS_VARIANT[status as SessionStatus] ?? "outline";
}
