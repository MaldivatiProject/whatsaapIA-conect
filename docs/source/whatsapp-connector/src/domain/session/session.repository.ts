import type { Session } from './session.aggregate';
import type { SessionId } from './session-id.vo';

export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findAll(): Promise<Session[]>;
  save(session: Session): Promise<void>;
  delete(id: SessionId): Promise<void>;
  count(): Promise<number>;
}

export const SESSION_REPOSITORY = Symbol('SessionRepository');
