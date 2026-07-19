import { io, type Socket } from "socket.io-client";
import { connectorWsOrigin } from "@/shared/lib/api/connectorOrigin";
import type { ConnectorEvent, ConnectorEventName } from "@/shared/types/connector.types";

type Listener = (event: ConnectorEvent) => void;

/**
 * Singleton socket.io client for whatsapp-connector's EventsGateway.
 * Recreated whenever the API key changes, since the gateway authenticates
 * on handshake and scopes clients to a private `owner:<id>` room.
 */
class ConnectorSocket {
  private socket: Socket | null = null;
  private currentApiKey: string | null = null;
  private listeners = new Map<ConnectorEventName, Set<Listener>>();

  connect(apiKey: string) {
    if (this.socket && this.currentApiKey === apiKey) return;
    this.disconnect();

    const url = connectorWsOrigin();
    this.socket = io(url, {
      transports: ["websocket"],
      auth: { token: apiKey },
    });
    this.currentApiKey = apiKey;

    for (const eventName of this.listeners.keys()) {
      this.bindSocketEvent(eventName);
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentApiKey = null;
  }

  get connected() {
    return this.socket?.connected ?? false;
  }

  subscribe(eventName: ConnectorEventName, listener: Listener): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
      this.bindSocketEvent(eventName);
    }
    this.listeners.get(eventName)!.add(listener);

    return () => {
      this.listeners.get(eventName)?.delete(listener);
    };
  }

  onStatusChange(handler: (connected: boolean) => void): () => void {
    const onConnect = () => handler(true);
    const onDisconnect = () => handler(false);
    this.socket?.on("connect", onConnect);
    this.socket?.on("disconnect", onDisconnect);
    return () => {
      this.socket?.off("connect", onConnect);
      this.socket?.off("disconnect", onDisconnect);
    };
  }

  private bindSocketEvent(eventName: ConnectorEventName) {
    this.socket?.on(eventName, (payload: Record<string, unknown>) => {
      const event = { ...payload, eventName } as ConnectorEvent;
      this.listeners.get(eventName)?.forEach((listener) => listener(event));
    });
  }
}

export const connectorSocket = new ConnectorSocket();
