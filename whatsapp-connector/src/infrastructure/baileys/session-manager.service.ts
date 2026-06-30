import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { WASocket } from '@whiskeysockets/baileys';
import type { SessionId } from '../../domain/session/session-id.vo';

interface ManagedSocket {
  socket: WASocket;
  reconnectAttempt: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class SessionManagerService implements OnModuleDestroy {
  private readonly sockets = new Map<string, ManagedSocket>();

  register(sessionId: SessionId, socket: WASocket): void {
    const existing = this.sockets.get(sessionId);
    if (existing?.reconnectTimer) {
      clearTimeout(existing.reconnectTimer);
    }
    // Preserve reconnect counter — it only resets when connection becomes 'open'
    const reconnectAttempt = existing?.reconnectAttempt ?? 0;
    this.sockets.set(sessionId, { socket, reconnectAttempt });
  }

  resetReconnectAttempt(sessionId: SessionId): void {
    const managed = this.sockets.get(sessionId);
    if (managed) managed.reconnectAttempt = 0;
  }

  getSocket(sessionId: SessionId): WASocket | undefined {
    return this.sockets.get(sessionId)?.socket;
  }

  isActive(sessionId: SessionId): boolean {
    return this.sockets.has(sessionId);
  }

  getActiveSessions(): SessionId[] {
    return [...this.sockets.keys()] as SessionId[];
  }

  getReconnectAttempt(sessionId: SessionId): number {
    return this.sockets.get(sessionId)?.reconnectAttempt ?? 0;
  }

  incrementReconnectAttempt(sessionId: SessionId): number {
    const managed = this.sockets.get(sessionId);
    if (!managed) return 0;
    managed.reconnectAttempt += 1;
    return managed.reconnectAttempt;
  }

  scheduleReconnect(sessionId: SessionId, delayMs: number, callback: () => void): void {
    const managed = this.sockets.get(sessionId);
    if (!managed) return;
    if (managed.reconnectTimer) clearTimeout(managed.reconnectTimer);
    managed.reconnectTimer = setTimeout(callback, delayMs);
  }

  async remove(sessionId: SessionId): Promise<void> {
    const managed = this.sockets.get(sessionId);
    if (!managed) return;

    if (managed.reconnectTimer) clearTimeout(managed.reconnectTimer);

    try {
      // Baileys types require an event arg, cast to base EventEmitter to remove all
      (managed.socket.ev as unknown as { removeAllListeners(): void }).removeAllListeners();
      await managed.socket.logout().catch(() => {
        // logout can fail if already disconnected — safe to ignore
      });
      managed.socket.end(new Error('session_deleted'));
    } catch {
      // ignore cleanup errors
    }

    this.sockets.delete(sessionId);
  }

  async onModuleDestroy(): Promise<void> {
    const ids = [...this.sockets.keys()] as SessionId[];
    await Promise.allSettled(ids.map((id) => this.remove(id)));
  }
}
