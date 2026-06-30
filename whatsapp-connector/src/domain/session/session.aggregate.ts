import { DomainEvent } from '../shared/domain-event';
import { type SessionId, createSessionId } from './session-id.vo';
import { type SessionStatus, SessionStatus as SS, hasQr, isConnected } from './session-status.vo';
import { type SessionConfig, createSessionConfig } from './session-config.vo';
import { SessionQrNotAvailableError } from './session.errors';
import {
  SessionCreatedEvent,
  SessionConnectedEvent,
  SessionDisconnectedEvent,
  SessionReconnectedEvent,
  QrGeneratedEvent,
} from './session.events';

export interface SessionSnapshot {
  id: string;
  status: SessionStatus;
  config: SessionConfig;
  createdAt: Date;
  updatedAt: Date;
}

export class Session {
  private readonly _domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: SessionId,
    private _status: SessionStatus,
    private readonly _config: SessionConfig,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: { id: string; config?: Partial<SessionConfig> }): Session {
    const id = createSessionId(params.id);
    const config = createSessionConfig(params.config);
    const now = new Date();
    const session = new Session(id, SS.pending(), config, now, now);
    session._domainEvents.push(new SessionCreatedEvent(id));
    return session;
  }

  static reconstitute(snapshot: SessionSnapshot): Session {
    return new Session(
      createSessionId(snapshot.id),
      snapshot.status,
      snapshot.config,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  markConnecting(): void {
    this._status = SS.connecting();
    this._updatedAt = new Date();
  }

  markQrReady(qrCode: string): void {
    this._status = SS.qrReady(qrCode);
    this._updatedAt = new Date();
    this._domainEvents.push(new QrGeneratedEvent(this._id, qrCode));
  }

  markConnected(phoneNumber: string): void {
    this._status = SS.open();
    this._updatedAt = new Date();
    this._domainEvents.push(new SessionConnectedEvent(this._id, phoneNumber));
  }

  markDisconnected(reason: string): void {
    this._status = SS.disconnected(reason);
    this._updatedAt = new Date();
    this._domainEvents.push(new SessionDisconnectedEvent(this._id, reason));
  }

  markReconnecting(attempt: number): void {
    this._status = SS.reconnecting(attempt, this._config.reconnectIntervalMs);
    this._updatedAt = new Date();
    if (attempt > 1) {
      this._domainEvents.push(new SessionReconnectedEvent(this._id, attempt));
    }
  }

  getQrCode(): string {
    if (!hasQr(this._status)) {
      throw new SessionQrNotAvailableError(this._id);
    }
    return this._status.qrCode;
  }

  get id(): SessionId { return this._id; }
  get status(): SessionStatus { return this._status; }
  get config(): SessionConfig { return this._config; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get isConnected(): boolean { return isConnected(this._status); }
  get domainEvents(): readonly DomainEvent[] { return [...this._domainEvents]; }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  toSnapshot(): SessionSnapshot {
    return {
      id: this._id,
      status: this._status,
      config: this._config,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
