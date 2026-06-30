import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { DomainEvent } from '../../domain/shared/domain-event';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WebSocket client disconnected: ${client.id}`);
  }

  broadcast(event: DomainEvent): void {
    // Guard: server is undefined until WebSocket gateway fully initializes
    if (!this.server) return;
    this.server.emit(event.eventName, this.serialize(event));
  }

  broadcastToSession(sessionId: string, event: DomainEvent): void {
    if (!this.server) return;
    this.server.to(sessionId).emit(event.eventName, this.serialize(event));
  }

  private serialize(event: DomainEvent): Record<string, unknown> {
    return {
      eventName: event.eventName,
      occurredAt: event.occurredAt.toISOString(),
      ...(event as unknown as Record<string, unknown>),
    };
  }
}
