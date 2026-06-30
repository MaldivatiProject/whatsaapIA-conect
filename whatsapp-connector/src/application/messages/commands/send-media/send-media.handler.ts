import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';
import { SESSION_SOCKET, type SessionSocketPort } from '../../../ports/session-socket.port';
import { EVENT_PUBLISHER, type EventPublisherPort } from '../../../ports/event-publisher.port';
import { SessionNotFoundError, SessionNotConnectedError } from '../../../../domain/session/session.errors';
import { MessageSentEvent } from '../../../../domain/session/session.events';
import { validateJid } from '../../../../domain/message/send-message.params';
import { validateMediaSize, validateMimeType, inferMediaType } from '../../../../domain/message/send-media.params';
import { createSessionId } from '../../../../domain/session/session-id.vo';
import { APP_CONFIG } from '../../../shared/tokens';
import { getAllowedMimeTypes, type AppConfig } from '../../../../config/app.config';
import type { SendMediaCommand } from './send-media.command';

export interface SendMediaResult {
  messageId: string;
  sessionId: string;
  to: string;
  mediaType: string;
  sentAt: string;
}

@Injectable()
export class SendMediaHandler {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(SESSION_SOCKET) private readonly socket: SessionSocketPort,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisherPort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async execute(command: SendMediaCommand): Promise<SendMediaResult> {
    const sessionId = createSessionId(command.sessionId);
    validateJid(command.to);
    validateMediaSize(command.data, this.config.MAX_MEDIA_SIZE_MB);
    validateMimeType(command.mimeType, getAllowedMimeTypes(this.config));

    const session = await this.sessions.findByIdAndOwner(sessionId, command.ownerId);
    if (!session) throw new SessionNotFoundError(command.sessionId);
    if (!session.isConnected) throw new SessionNotConnectedError(command.sessionId);

    const mediaType = inferMediaType(command.mimeType);

    const messageId = await this.socket.sendMedia({
      sessionId,
      to: command.to,
      mediaType,
      mimeType: command.mimeType,
      fileName: command.fileName,
      data: command.data,
      ...(command.caption !== undefined ? { caption: command.caption } : {}),
    });

    await this.eventPublisher.publish(new MessageSentEvent(sessionId, messageId, command.to));

    return {
      messageId,
      sessionId: command.sessionId,
      to: command.to,
      mediaType,
      sentAt: new Date().toISOString(),
    };
  }
}
