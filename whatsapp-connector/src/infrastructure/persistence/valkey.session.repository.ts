import { Inject, Injectable } from '@nestjs/common';
import type { Redis as ValkeyClient } from 'ioredis';
import type { SessionRepository } from '../../domain/session/session.repository';
import { Session, type SessionSnapshot } from '../../domain/session/session.aggregate';
import type { SessionId } from '../../domain/session/session-id.vo';
import { reviveSessionStatus } from '../../domain/session/session-status.vo';
import { VALKEY_CLIENT } from '../baileys/baileys-session.adapter';

const KEY_PREFIX = 'wac:session:';
const INDEX_KEY = 'wac:sessions:index';

@Injectable()
export class ValkeySessionRepository implements SessionRepository {
  constructor(@Inject(VALKEY_CLIENT) private readonly valkey: ValkeyClient) {}

  private key(id: string): string {
    return `${KEY_PREFIX}${id}`;
  }

  async findById(id: SessionId): Promise<Session | null> {
    const raw = await this.valkey.get(this.key(id));
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as SessionSnapshot;
    snapshot.createdAt = new Date(snapshot.createdAt);
    snapshot.updatedAt = new Date(snapshot.updatedAt);
    snapshot.status = reviveSessionStatus(snapshot.status);
    return Session.reconstitute(snapshot);
  }

  async findByIdAndOwner(id: SessionId, ownerId: string): Promise<Session | null> {
    const session = await this.findById(id);
    return session && session.isOwnedBy(ownerId) ? session : null;
  }

  async findAll(): Promise<Session[]> {
    const ids = await this.valkey.smembers(INDEX_KEY);
    const sessions = await Promise.all(ids.map((id) => this.findById(id as SessionId)));
    return sessions.filter((session): session is Session => session !== null);
  }

  async findAllByOwner(ownerId: string): Promise<Session[]> {
    const all = await this.findAll();
    return all.filter((session) => session.isOwnedBy(ownerId));
  }

  async save(session: Session): Promise<void> {
    const snapshot = session.toSnapshot();
    await Promise.all([
      this.valkey.set(this.key(session.id), JSON.stringify(snapshot)),
      this.valkey.sadd(INDEX_KEY, session.id),
    ]);
  }

  async delete(id: SessionId): Promise<void> {
    await Promise.all([this.valkey.del(this.key(id)), this.valkey.srem(INDEX_KEY, id)]);
  }

  async deleteOwned(id: SessionId, ownerId: string): Promise<void> {
    if (await this.findByIdAndOwner(id, ownerId)) await this.delete(id);
  }

  async count(): Promise<number> {
    return this.valkey.scard(INDEX_KEY);
  }
}
