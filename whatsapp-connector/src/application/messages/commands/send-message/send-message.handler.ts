import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY, type SessionRepository } from '../../../../domain/session/session.repository';
import { SESSION_SOCKET, type SessionSocketPort } from '../../../ports/session-socket.port';
import { EVENT_PUBLISHER, type EventPublisherPort } from '../../../ports/event-publisher.port';
import { SessionNotFoundError, SessionNotConnectedError } from '../../../../domain/session/session.errors';
import { MessageSentEvent } from '../../../../domain/session/session.events';
import { validateJid } from '../../../../domain/message/send-message.params';
import { createSessionId } from '../../../../domain/session/session-id.vo';
import type { SendMessageCommand } from './send-message.command';

export interface SendMessageResult {
  messageId: string;
  sessionId: string;
  to: string;
  sentAt: string;
}

@Injectable()
export class SendMessageHandler {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(SESSION_SOCKET) private readonly socket: SessionSocketPort,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(command: SendMessageCommand): Promise<SendMessageResult> {
    const sessionId = createSessionId(command.sessionId);
    validateJid(command.to);

    const session = await this.sessions.findByIdAndOwner(sessionId, command.ownerId);
    if (!session) throw new SessionNotFoundError(command.sessionId);
    if (!session.isConnected) throw new SessionNotConnectedError(command.sessionId);

    const messageId = await this.socket.sendMessage({
      sessionId,
      to: command.to,
      text: command.text,
      ...(command.quotedMessageId !== undefined ? { quotedMessageId: command.quotedMessageId } : {}),
    });

    await this.eventPublisher.publish(new MessageSentEvent(sessionId, messageId, command.to));

    return {
      messageId,
      sessionId: command.sessionId,
      to: command.to,
      sentAt: new Date().toISOString(),
    };
  }
}
