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

  async findByIdAndOwner(id: SessionId, ownerId: string): Promise<Session | null> {
    const session = this.store.get(id);
    return session && session.isOwnedBy(ownerId) ? session : null;
  }

  async findAll(): Promise<Session[]> {
    return [...this.store.values()];
  }

  async findAllByOwner(ownerId: string): Promise<Session[]> {
    return [...this.store.values()].filter((s) => s.isOwnedBy(ownerId));
  }

  async save(session: Session): Promise<void> {
    this.store.set(session.id, session);
  }

  async delete(id: SessionId): Promise<void> {
    this.store.delete(id);
  }

  async deleteOwned(id: SessionId, ownerId: string): Promise<void> {
    const session = this.store.get(id);
    if (session?.isOwnedBy(ownerId)) this.store.delete(id);
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  // Useful in tests
  clear(): void {
    this.store.clear();
  }
}
