import { DomainError } from '../shared/domain-error';

export class SessionNotFoundError extends DomainError {
  readonly code = 'SESSION_NOT_FOUND';
  constructor(sessionId: string) {
    super(`Session '${sessionId}' not found`);
  }
}

export class SessionAlreadyExistsError extends DomainError {
  readonly code = 'SESSION_ALREADY_EXISTS';
  constructor(sessionId: string) {
    super(`Session '${sessionId}' already exists`);
  }
}

export class SessionLimitReachedError extends DomainError {
  readonly code = 'SESSION_LIMIT_REACHED';
  constructor(max: number) {
    super(`Maximum number of sessions reached (${max})`);
  }
}

export class SessionNotConnectedError extends DomainError {
  readonly code = 'SESSION_NOT_CONNECTED';
  constructor(sessionId: string) {
    super(`Session '${sessionId}' is not connected`);
  }
}

export class SessionQrNotAvailableError extends DomainError {
  readonly code = 'SESSION_QR_NOT_AVAILABLE';
  constructor(sessionId: string) {
    super(`QR code not available for session '${sessionId}'`);
  }
}

export class InvalidJidError extends DomainError {
  readonly code = 'INVALID_JID';
  constructor(jid: string) {
    super(`Invalid WhatsApp JID: '${jid}'`);
  }
}

export class MediaTooLargeError extends DomainError {
  readonly code = 'MEDIA_TOO_LARGE';
  constructor(sizeMb: number, maxMb: number) {
    super(`Media size ${sizeMb}MB exceeds maximum allowed ${maxMb}MB`);
  }
}

export class MimeTypeNotAllowedError extends DomainError {
  readonly code = 'MIME_TYPE_NOT_ALLOWED';
  constructor(mimeType: string) {
    super(`MIME type '${mimeType}' is not allowed`);
  }
}
