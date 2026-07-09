import type { ConnectorEvent, ConnectorEventName } from "@/shared/types/connector.types";

export const EVENT_LABEL: Record<ConnectorEventName, string> = {
  SESSION_CREATED: "Sesión creada",
  SESSION_CONNECTED: "Sesión conectada",
  SESSION_DISCONNECTED: "Sesión desconectada",
  SESSION_RECONNECTED: "Sesión reconectada",
  QR_GENERATED: "Nuevo QR generado",
  MESSAGE_RECEIVED: "Mensaje recibido",
  PRIVATE_MESSAGE_RECEIVED: "Mensaje privado recibido",
  GROUP_MESSAGE_RECEIVED: "Mensaje de grupo recibido",
  MEDIA_RECEIVED: "Multimedia recibida",
  MESSAGE_SENT: "Mensaje enviado",
};

export const MESSAGE_EVENT_NAMES: ConnectorEventName[] = [
  "MESSAGE_RECEIVED",
  "PRIVATE_MESSAGE_RECEIVED",
  "GROUP_MESSAGE_RECEIVED",
  "MEDIA_RECEIVED",
  "MESSAGE_SENT",
];

export function eventDescription(event: ConnectorEvent): string | null {
  const from = typeof event.from === "string" ? event.from : undefined;
  const to = typeof event.to === "string" ? event.to : undefined;
  const text = typeof event.text === "string" ? event.text : undefined;

  if (from) return text ? `${from}: "${text}"` : `de ${from}`;
  if (to) return `a ${to}`;
  return null;
}
