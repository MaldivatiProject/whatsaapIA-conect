import { DomainEvent } from '../shared/domain-event';
import type { SessionId } from './session-id.vo';

export class SessionCreatedEvent extends DomainEvent {
  readonly eventName = 'SESSION_CREATED';
  constructor(readonly sessionId: SessionId) {
    super();
  }
}

export class SessionConnectedEvent extends DomainEvent {
  readonly eventName = 'SESSION_CONNECTED';
  constructor(
    readonly sessionId: SessionId,
    readonly phoneNumber: string,
  ) {
    super();
  }
}

export class SessionDisconnectedEvent extends DomainEvent {
  readonly eventName = 'SESSION_DISCONNECTED';
  constructor(
    readonly sessionId: SessionId,
    readonly reason: string,
  ) {
    super();
  }
}

export class SessionReconnectedEvent extends DomainEvent {
  readonly eventName = 'SESSION_RECONNECTED';
  constructor(
    readonly sessionId: SessionId,
    readonly attempt: number,
  ) {
    super();
  }
}

export class QrGeneratedEvent extends DomainEvent {
  readonly eventName = 'QR_GENERATED';
  constructor(
    readonly sessionId: SessionId,
    readonly qrCode: string,
  ) {
    super();
  }
}

export class MessageReceivedEvent extends DomainEvent {
  readonly eventName = 'MESSAGE_RECEIVED';
  constructor(
    readonly sessionId: SessionId,
    readonly messageId: string,
    readonly from: string,
    readonly isGroup: boolean,
    readonly type: string,
    readonly timestamp: number,
    readonly text: string,
    readonly pushName: string,
  ) {
    super();
  }
}

export class GroupMessageReceivedEvent extends DomainEvent {
  readonly eventName = 'GROUP_MESSAGE_RECEIVED';
  constructor(
    readonly sessionId: SessionId,
    readonly messageId: string,
    readonly groupJid: string,
    readonly senderJid: string,
    readonly type: string,
    readonly timestamp: number,
    readonly text: string,
    readonly pushName: string,
  ) {
    super();
  }
}

export class PrivateMessageReceivedEvent extends DomainEvent {
  readonly eventName = 'PRIVATE_MESSAGE_RECEIVED';
  constructor(
    readonly sessionId: SessionId,
    readonly messageId: string,
    readonly from: string,
    readonly type: string,
    readonly timestamp: number,
    readonly text: string,
    readonly pushName: string,
  ) {
    super();
  }
}

export class MediaReceivedEvent extends DomainEvent {
  readonly eventName = 'MEDIA_RECEIVED';
  constructor(
    readonly sessionId: SessionId,
    readonly messageId: string,
    readonly from: string,
    readonly mediaType: string,
    readonly mimeType: string,
    readonly timestamp: number,
  ) {
    super();
  }
}

export class MessageSentEvent extends DomainEvent {
  readonly eventName = 'MESSAGE_SENT';
  constructor(
    readonly sessionId: SessionId,
    readonly messageId: string,
    readonly to: string,
  ) {
    super();
  }
}
