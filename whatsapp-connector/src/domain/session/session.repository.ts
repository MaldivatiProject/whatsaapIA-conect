import type { Session } from './session.aggregate';
import type { SessionId } from './session-id.vo';

export interface SessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  /**
   * Ownership-aware lookup (BOLA/IDOR prevention, OWASP API1:2023).
   * Returns null — never the resource of another owner — so callers map it to 404
   * without leaking the existence of sessions belonging to other tenants.
   */
  findByIdAndOwner(id: SessionId, ownerId: string): Promise<Session | null>;
  findAll(): Promise<Session[]>;
  findAllByOwner(ownerId: string): Promise<Session[]>;
  save(session: Session): Promise<void>;
  delete(id: SessionId): Promise<void>;
  count(): Promise<number>;
}

export const SESSION_REPOSITORY = Symbol('SessionRepository');
