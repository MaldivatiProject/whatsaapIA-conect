import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { SessionRepository } from '../../domain/session/session.repository';
import { Session, type SessionSnapshot } from '../../domain/session/session.aggregate';
import type { SessionId } from '../../domain/session/session-id.vo';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  private readonly prisma = new PrismaClient();

  async findById(id: SessionId): Promise<Session | null> {
    const row = await this.prisma.whatsappSession.findUnique({
      where: { session_id: id },
    });
    if (!row) return null;
    const snapshot: SessionSnapshot = {
      id: row.session_id,
      status: JSON.parse(row.status_json) as SessionSnapshot['status'],
      config: JSON.parse(row.config_json) as SessionSnapshot['config'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return Session.reconstitute(snapshot);
  }

  async findAll(): Promise<Session[]> {
    const rows = await this.prisma.whatsappSession.findMany();
    return rows.map((row) =>
      Session.reconstitute({
        id: row.session_id,
        status: JSON.parse(row.status_json) as SessionSnapshot['status'],
        config: JSON.parse(row.config_json) as SessionSnapshot['config'],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );
  }

  async save(session: Session): Promise<void> {
    const snap = session.toSnapshot();
    await this.prisma.whatsappSession.upsert({
      where: { session_id: session.id },
      create: {
        session_id: session.id,
        status_json: JSON.stringify(snap.status),
        config_json: JSON.stringify(snap.config),
        created_at: snap.createdAt,
        updated_at: snap.updatedAt,
      },
      update: {
        status_json: JSON.stringify(snap.status),
        updated_at: snap.updatedAt,
      },
    });
  }

  async delete(id: SessionId): Promise<void> {
    await this.prisma.whatsappSession.delete({ where: { session_id: id } });
  }

  async count(): Promise<number> {
    return this.prisma.whatsappSession.count();
  }
}
