import { Injectable } from '@nestjs/common';
import type { SessionRepository } from '../../domain/session/session.repository';
import type { Session } from '../../domain/session/session.aggregate';
import type { SessionId } from '../../domain/session/session-id.vo';

@Injectable()
export class InMemorySessionRepository implements SessionRepository {
  private readonly store = new Map<string, Session>();

  async findById(id: SessionId): Promise<Session | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Session[]> {
    return [...this.store.values()];
  }

  async save(session: Session): Promise<void> {
    this.store.set(session.id, session);
  }

  async delete(id: SessionId): Promise<void> {
    this.store.delete(id);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  // Useful in tests
  clear(): void {
    this.store.clear();
  }
}
