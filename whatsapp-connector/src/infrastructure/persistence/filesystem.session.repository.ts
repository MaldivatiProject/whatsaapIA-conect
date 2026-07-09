import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionRepository } from '../../domain/session/session.repository';
import { Session, type SessionSnapshot } from '../../domain/session/session.aggregate';
import type { SessionId } from '../../domain/session/session-id.vo';
import { reviveSessionStatus } from '../../domain/session/session-status.vo';

@Injectable()
export class FilesystemSessionRepository implements SessionRepository {
  private readonly logger = new Logger(FilesystemSessionRepository.name);
  private readonly metaDir: string;

  constructor(sessionPath: string) {
    this.metaDir = join(sessionPath, '.meta');
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.metaDir, { recursive: true });
  }

  private filePath(id: string): string {
    return join(this.metaDir, `${id}.json`);
  }

  async findById(id: SessionId): Promise<Session | null> {
    try {
      const raw = await readFile(this.filePath(id), 'utf-8');
      const snapshot = JSON.parse(raw) as SessionSnapshot;
      snapshot.createdAt = new Date(snapshot.createdAt);
      snapshot.updatedAt = new Date(snapshot.updatedAt);
      snapshot.status = reviveSessionStatus(snapshot.status);
      return Session.reconstitute(snapshot);
    } catch {
      return null;
    }
  }

  async findByIdAndOwner(id: SessionId, ownerId: string): Promise<Session | null> {
    const session = await this.findById(id);
    return session && session.isOwnedBy(ownerId) ? session : null;
  }

  async findAllByOwner(ownerId: string): Promise<Session[]> {
    const all = await this.findAll();
    return all.filter((s) => s.isOwnedBy(ownerId));
  }

  async findAll(): Promise<Session[]> {
    try {
      const files = await readdir(this.metaDir);
      const sessions = await Promise.all(
        files
          .filter((f) => f.endsWith('.json'))
          .map(async (f) => {
            const id = f.replace('.json', '') as SessionId;
            return this.findById(id);
          }),
      );
      return sessions.filter((s): s is Session => s !== null);
    } catch {
      return [];
    }
  }

  async save(session: Session): Promise<void> {
    await mkdir(this.metaDir, { recursive: true });
    const snapshot = session.toSnapshot();
    await writeFile(this.filePath(session.id), JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  async delete(id: SessionId): Promise<void> {
    try {
      await unlink(this.filePath(id));
    } catch {
      this.logger.warn(`Could not delete session file for ${id}`);
    }
  }

  async deleteOwned(id: SessionId, ownerId: string): Promise<void> {
    if (await this.findByIdAndOwner(id, ownerId)) await this.delete(id);
  }

  async count(): Promise<number> {
    try {
      const files = await readdir(this.metaDir);
      return files.filter((f) => f.endsWith('.json')).length;
    } catch {
      return 0;
    }
  }
}
