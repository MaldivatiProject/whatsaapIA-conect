import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { DomainEvent } from '../../domain/shared/domain-event';
import { SESSION_REPOSITORY, type SessionRepository } from '../../domain/session/session.repository';
import type { SessionId } from '../../domain/session/session-id.vo';
import { getConfig, getCorsOrigins } from '../../config/app.config';
import { createApiKeyResolver, type ApiKeyResolver } from '../../shared/auth/api-key.resolver';

const config = getConfig();

/**
 * Emits domain events to authenticated clients, scoped to the owner of the
 * session the event belongs to. Cross-tenant leakage (a client receiving
 * another owner's messages) is prevented by per-owner rooms — there is no
 * global broadcast.
 */
@WebSocketGateway({ cors: { origin: getCorsOrigins(config) } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly auth: ApiKeyResolver = createApiKeyResolver(config);
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  handleConnection(client: Socket): void {
    if (!this.auth.authEnabled) {
      void client.join('owner:public');
      client.data.ownerId = 'public';
      return;
    }

    const token = this.extractToken(client);
    const ownerId = this.auth.authenticate(token);
    if (!ownerId) {
      this.logger.warn(`WebSocket client ${client.id} rejected: missing/invalid API key`);
      client.emit('unauthorized', { message: 'Missing or invalid API key' });
      client.disconnect(true);
      return;
    }

    client.data.ownerId = ownerId;
    // Auto-join the owner room: the client receives events for its sessions only.
    void client.join(`owner:${ownerId}`);
    this.logger.debug(`WebSocket client connected: ${client.id} (owner=${ownerId})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`WebSocket client disconnected: ${client.id}`);
  }

  broadcast(event: DomainEvent): void {
    // Guard: server is undefined until WebSocket gateway fully initializes
    if (!this.server) return;
    const payload = this.serialize(event);
    const sessionId = typeof payload['sessionId'] === 'string' ? payload['sessionId'] : undefined;
    if (!sessionId) return; // No session scope → cannot route safely; drop.

    void this.resolveOwner(sessionId)
      .then((ownerId) => {
        if (ownerId) {
          this.server.to(`owner:${ownerId}`).emit(event.eventName, payload);
        }
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to route WS event ${event.eventName}: ${String(err)}`);
      });
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = (client.handshake.auth as { token?: unknown })?.token;
    if (typeof authToken === 'string') return authToken;
    return undefined;
  }

  private async resolveOwner(sessionId: string): Promise<string | undefined> {
    const session = await this.sessions.findById(sessionId as SessionId);
    if (!session) return undefined;
    return session.ownerId;
  }

  private serialize(event: DomainEvent): Record<string, unknown> {
    return {
      eventName: event.eventName,
      occurredAt: event.occurredAt.toISOString(),
      ...(event as unknown as Record<string, unknown>),
    };
  }
}
