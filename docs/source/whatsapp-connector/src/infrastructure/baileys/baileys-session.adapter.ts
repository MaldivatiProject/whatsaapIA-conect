import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import pino from 'pino';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import type { SessionSocketPort } from '../../application/ports/session-socket.port';
import type { EventPublisherPort } from '../../application/ports/event-publisher.port';
import { EVENT_PUBLISHER } from '../../application/ports/event-publisher.port';
import type { SessionRepository } from '../../domain/session/session.repository';
import { SESSION_REPOSITORY } from '../../domain/session/session.repository';
import type { SessionId } from '../../domain/session/session-id.vo';
import { createSessionId } from '../../domain/session/session-id.vo';
import type { SendMessageParams } from '../../domain/message/send-message.params';
import type { SendMediaParams } from '../../domain/message/send-media.params';
import { SessionManagerService } from './session-manager.service';
import { createFilesystemAuthState } from './auth-state/filesystem.auth-state';
import { createRedisAuthState } from './auth-state/redis.auth-state';
import type { AppConfig } from '../../config/app.config';
import { APP_CONFIG } from '../../application/shared/tokens';
import {
  MessageReceivedEvent,
  GroupMessageReceivedEvent,
  PrivateMessageReceivedEvent,
  MediaReceivedEvent,
} from '../../domain/session/session.events';
import { hashJid } from '../../shared/context/request-context';
import type { Redis } from 'ioredis';

export const REDIS_CLIENT = Symbol('RedisClient');

// Message dedup TTL: 5 minutes — same as Baileys redelivery window
const DEDUP_TTL_SECONDS = 300;

@Injectable()
export class BaileysSessionAdapter implements SessionSocketPort, OnModuleInit {
  private readonly logger = new Logger(BaileysSessionAdapter.name);
  private readonly deduplicationCache = new Map<string, number>();
  // Baileys requires a real pino instance — a plain { level: 'silent' } object lacks
  // .child() and method calls which Baileys calls internally during socket init.
  private readonly baileysLogger = pino({ level: 'silent' });
  // Maps LID JIDs (@lid) to phone JIDs (@s.whatsapp.net) per session.
  // Populated by contacts.upsert — used to resolve sender identity in messages.
  private readonly lidToPhone = new Map<string, Map<string, string>>();

  constructor(
    private readonly manager: SessionManagerService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisherPort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  async onModuleInit(): Promise<void> {
    const all = await this.sessions.findAll();
    if (!all.length) return;

    this.logger.log(`Reconnecting ${all.length} session(s) from storage...`);
    for (const session of all) {
      this.connect(session.id as SessionId).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to reconnect session ${session.id} on startup: ${msg}`);
      });
    }
  }

  async connect(sessionId: SessionId): Promise<void> {
    let version: [number, number, number];
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch {
      // fetchLatestBaileysVersion has its own internal fallback; this outer catch is a safeguard
      version = [2, 3000, 1023456789];
      this.logger.warn('fetchLatestBaileysVersion failed — using fallback version');
    }

    const authState = this.config.ENABLE_REDIS && this.redis
      ? await createRedisAuthState(this.redis, sessionId)
      : await createFilesystemAuthState(this.config.SESSION_PATH, sessionId);

    // Mark session as connecting so the UI reflects progress
    const sessionForStatus = await this.sessions.findById(sessionId);
    if (sessionForStatus) {
      sessionForStatus.markConnecting();
      await this.sessions.save(sessionForStatus);
    }

    const socket = makeWASocket({
      version: version,
      auth: authState.state,
      printQRInTerminal: false,
      logger: this.baileysLogger,
      browser: Browsers.macOS('Safari'),
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      keepAliveIntervalMs: 25_000,
    });

    this.manager.register(sessionId, socket);
    this.lidToPhone.set(sessionId, new Map());

    socket.ev.on('creds.update', () => {
      authState.saveCreds().catch((err) => {
        this.logger.error(`Failed to save credentials for session ${sessionId}`, err);
      });
    });

    socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(sessionId, update).catch((err) => {
        this.logger.error(`connection.update handler failed for session ${sessionId}`, err);
      });
    });

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        this.handleIncomingMessage(sessionId, msg).catch((err) => {
          this.logger.error(`messages.upsert handler failed for session ${sessionId}`, err);
        });
      }
    });

    // Build LID → phone JID index so messages from @lid senders resolve to real numbers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexContacts = (contacts: any[], source: string): void => {
      const map = this.lidToPhone.get(sessionId);
      if (!map) return;
      let added = 0;
      for (const c of contacts) {
        if (c.lid && c.id) {
          map.set(jidNormalizedUser(String(c.lid)), jidNormalizedUser(String(c.id)));
          added++;
        }
      }
      // Always log so we can see whether contacts are arriving and how many have LID
      this.logger.log(
        `[LID] session=${sessionId} source=${source} total=${contacts.length} with-lid=${added} map-size=${map.size}`,
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.ev.on('messaging-history.set' as any, ({ contacts }: any) => {
      if (Array.isArray(contacts)) indexContacts(contacts, 'history');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.ev.on('contacts.upsert' as any, (contacts: any[]) => indexContacts(contacts, 'upsert'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.ev.on('contacts.update' as any, (updates: any[]) => indexContacts(updates, 'update'));

    // chats.phoneNumberShare maps chat JIDs (possibly @lid) → phone numbers directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.ev.on('chats.phoneNumberShare' as any, (data: any) => {
      const map = this.lidToPhone.get(sessionId);
      if (!map) return;
      const entries = data instanceof Map ? data : Object.entries(data as Record<string, string>);
      for (const [jid, phone] of entries) {
        const normalized = jidNormalizedUser(String(jid));
        if (normalized.endsWith('@lid')) {
          map.set(normalized, String(phone));
          this.logger.log(`[LID] session=${sessionId} phoneNumberShare resolved ${normalized} → ${String(phone)}`);
        }
      }
    });
  }

  private async handleConnectionUpdate(
    sessionId: SessionId,
    update: Parameters<Parameters<ReturnType<typeof makeWASocket>['ev']['on']>[1]>[0] extends infer U
      ? U extends { connection?: unknown }
        ? U
        : never
      : never,
  ): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (!session) return;

    const { connection, lastDisconnect, qr } = update as {
      connection?: string;
      lastDisconnect?: { error?: Error };
      qr?: string;
    };

    if (qr) {
      session.markQrReady(qr);
      await this.sessions.save(session);
      await this.eventPublisher.publishMany([...session.domainEvents] as never[]);
      session.clearDomainEvents();
      return;
    }

    if (connection === 'open') {
      const socket = this.manager.getSocket(sessionId);
      const phone = (socket?.user?.id ?? '').split(':')[0] ?? 'unknown';
      // Reset reconnect counter only on successful open — not on every connect() call
      this.manager.resetReconnectAttempt(sessionId);
      session.markConnected(phone);
      await this.sessions.save(session);
      await this.eventPublisher.publishMany([...session.domainEvents] as never[]);
      session.clearDomainEvents();
      this.logger.log(`Session ${sessionId} connected (phone: ${phone})`);
      return;
    }

    if (connection === 'close') {
      const boom = lastDisconnect?.error as Boom | undefined;
      const statusCode = boom?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      // Map Baileys status codes to human-readable reasons for logs
      const reasonName = statusCode
        ? (Object.entries(DisconnectReason).find(([, v]) => v === statusCode)?.[0] ?? 'unknown')
        : 'no-error';
      const codeLabel = statusCode ? `${statusCode} (${reasonName})` : 'no-error';
      const reason = shouldReconnect ? `connection_closed:${codeLabel}` : 'logged_out';

      this.logger.warn(`Session ${sessionId} disconnected — code: ${codeLabel} reconnect: ${String(shouldReconnect)}`);

      session.markDisconnected(reason);
      await this.sessions.save(session);
      await this.eventPublisher.publishMany([...session.domainEvents] as never[]);
      session.clearDomainEvents();

      if (shouldReconnect) {
        const attempt = this.manager.incrementReconnectAttempt(sessionId);
        if (attempt <= session.config.maxReconnectAttempts) {
          this.logger.log(`Session ${sessionId} scheduling reconnect attempt ${attempt}/${session.config.maxReconnectAttempts}`);
          session.markReconnecting(attempt);
          await this.sessions.save(session);
          this.manager.scheduleReconnect(
            sessionId,
            session.config.reconnectIntervalMs,
            () => void this.connect(sessionId),
          );
        } else {
          this.logger.error(
            `Session ${sessionId} exhausted ${attempt} reconnect attempts — manual intervention required`,
          );
        }
      } else {
        this.logger.warn(`Session ${sessionId} logged out — delete and re-create to reconnect`);
      }
    }
  }

  private resolveLid(sessionId: SessionId, jid: string): string {
    if (!jid.endsWith('@lid')) return jid;
    const normalized = jidNormalizedUser(jid);
    const resolved = this.lidToPhone.get(sessionId)?.get(normalized);
    if (!resolved) {
      this.logger.warn(
        `[LID] session=${sessionId} unresolved LID=${normalized} — contact not in address book or sync pending (map-size=${this.lidToPhone.get(sessionId)?.size ?? 0})`,
      );
    }
    return resolved ?? jid;
  }

  private async handleIncomingMessage(
    sessionId: SessionId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msg: any,
  ): Promise<void> {
    // Log every raw arrival at debug level so we can see what's being filtered
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const rawType = msg.message ? Object.keys(msg.message)[0] : 'no-message';
    this.logger.debug(
      `[RAW] session=${sessionId} fromMe=${String(msg.key?.fromMe)} type=${rawType} ` +
      `age=${Math.round(Date.now() - Number(msg.messageTimestamp) * 1000)}ms`,
    );

    // Mandatory Baileys filters — order matters
    if (msg.key?.fromMe === true) return;
    if (!msg.message) return;
    if (msg.message.protocolMessage) return;

    const ageMs = Date.now() - Number(msg.messageTimestamp) * 1000;
    if (ageMs > 60_000) return; // ignore messages older than 60s

    const messageId: string = msg.key?.id ?? '';
    if (await this.isDuplicate(messageId)) return;

    const rawFrom: string = msg.key?.remoteJid ?? '';
    // @lid JIDs are WhatsApp's internal multi-device IDs — resolve to phone JID when possible
    const from = this.resolveLid(sessionId, rawFrom);
    const isGroup = isJidGroup(from) ?? false;
    const messageType = Object.keys(msg.message)[0] ?? 'unknown';
    const timestamp = Number(msg.messageTimestamp);

    // Extract text content — covers plain text, quoted replies, and button responses
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const text: string =
      msg.message.conversation ??
      msg.message.extendedTextMessage?.text ??
      msg.message.buttonsResponseMessage?.selectedDisplayText ??
      msg.message.listResponseMessage?.title ??
      msg.message.imageMessage?.caption ??
      msg.message.videoMessage?.caption ??
      msg.message.documentMessage?.caption ??
      '';

    // pushName is the sender's display name as set on their device — always present in incoming msgs
    const pushName: string = msg.pushName ?? '';

    this.logger.debug(
      `Message received: id=${messageId} from=${hashJid(from)} type=${messageType}`,
    );

    const events = [];

    events.push(new MessageReceivedEvent(sessionId, messageId, from, isGroup, messageType, timestamp, text, pushName));

    if (isGroup) {
      const sender: string = this.resolveLid(sessionId, msg.key?.participant ?? '');
      events.push(new GroupMessageReceivedEvent(sessionId, messageId, from, sender, messageType, timestamp, text, pushName));
    } else {
      events.push(new PrivateMessageReceivedEvent(sessionId, messageId, from, messageType, timestamp, text, pushName));
    }

    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
    if (mediaTypes.includes(messageType)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const mimeType: string = msg.message[messageType]?.mimetype ?? 'application/octet-stream';
      events.push(new MediaReceivedEvent(sessionId, messageId, from, messageType, mimeType, timestamp));
    }

    await this.eventPublisher.publishMany(events as never[]);
  }

  async disconnect(sessionId: SessionId): Promise<void> {
    await this.manager.remove(sessionId);
    this.lidToPhone.delete(sessionId);
    const session = await this.sessions.findById(sessionId);
    if (session) {
      session.markDisconnected('manual_disconnect');
      await this.sessions.save(session);
    }
  }

  async sendMessage(params: SendMessageParams): Promise<string> {
    const socket = this.manager.getSocket(params.sessionId);
    if (!socket) throw new Error(`No active socket for session ${params.sessionId}`);

    const content = params.quotedMessageId
      ? { text: params.text, quoted: { key: { id: params.quotedMessageId } } }
      : { text: params.text };

    const result = await socket.sendMessage(params.to, content as never);
    return result?.key?.id ?? crypto.randomUUID();
  }

  async sendMedia(params: SendMediaParams): Promise<string> {
    const socket = this.manager.getSocket(params.sessionId);
    if (!socket) throw new Error(`No active socket for session ${params.sessionId}`);

    const result = await socket.sendMessage(params.to, {
      [params.mediaType]: params.data,
      mimetype: params.mimeType,
      fileName: params.fileName,
      ...(params.caption !== undefined ? { caption: params.caption } : {}),
    } as never);

    return result?.key?.id ?? crypto.randomUUID();
  }

  isActive(sessionId: SessionId): boolean {
    return this.manager.isActive(sessionId);
  }

  getActiveSessions(): SessionId[] {
    return this.manager.getActiveSessions();
  }

  private async isDuplicate(messageId: string): Promise<boolean> {
    if (this.redis) {
      const key = `wac:dedup:${messageId}`;
      const result = await this.redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
      return result === null;
    }

    // In-memory fallback — clean old entries periodically
    const now = Date.now();
    if (this.deduplicationCache.has(messageId)) return true;
    this.deduplicationCache.set(messageId, now);

    // Prune entries older than TTL every 100 new messages
    if (this.deduplicationCache.size % 100 === 0) {
      for (const [id, ts] of this.deduplicationCache.entries()) {
        if (now - ts > DEDUP_TTL_SECONDS * 1000) this.deduplicationCache.delete(id);
      }
    }
    return false;
  }
}
