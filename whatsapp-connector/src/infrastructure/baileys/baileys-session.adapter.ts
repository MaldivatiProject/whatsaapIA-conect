import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import pino from 'pino';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  isJidGroup,
  jidNormalizedUser,
  type WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import type { SessionSocketPort } from '../../application/ports/session-socket.port';
import type { EventPublisherPort } from '../../application/ports/event-publisher.port';
import { EVENT_PUBLISHER } from '../../application/ports/event-publisher.port';
import type { SessionRepository } from '../../domain/session/session.repository';
import { SESSION_REPOSITORY } from '../../domain/session/session.repository';
import type { SessionId } from '../../domain/session/session-id.vo';
import type { SendMessageParams } from '../../domain/message/send-message.params';
import type { SendMediaParams } from '../../domain/message/send-media.params';
import { SessionManagerService } from './session-manager.service';
import {
  createFilesystemAuthState,
  deleteFilesystemAuthState,
} from './auth-state/filesystem.auth-state';
import { createValkeyAuthState, deleteValkeyAuthState } from './auth-state/valkey.auth-state';
import { isValkeyEnabled, type AppConfig } from '../../config/app.config';
import { APP_CONFIG } from '../../application/shared/tokens';
import {
  MessageReceivedEvent,
  GroupMessageReceivedEvent,
  PrivateMessageReceivedEvent,
  MediaReceivedEvent,
  type InboundAttachment,
} from '../../domain/session/session.events';
import { hashJid } from '../../shared/context/request-context';
import type { Redis as ValkeyClient } from 'ioredis';

export const VALKEY_CLIENT = Symbol('ValkeyClient');

// Message dedup TTL: 5 minutes — same as Baileys redelivery window
const DEDUP_TTL_SECONDS = 300;

// Inbound documents matching either the mimetype or filename extension get downloaded
// and base64-embedded on MessageReceivedEvent — e.g. bulk-upload CSVs (rules like
// "Traslado de tienda" read them to fan out one automation run per row). Everything
// else (images, audio, video, other documents) stays metadata-only, as before.
const CSV_LIKE_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
]);

function isCsvLikeDocument(mimeType: string, fileName: string | undefined): boolean {
  return CSV_LIKE_MIME_TYPES.has(mimeType.toLowerCase()) || Boolean(fileName?.toLowerCase().endsWith('.csv'));
}

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
    @Inject(VALKEY_CLIENT) private readonly valkey: ValkeyClient | null,
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

    const authState =
      isValkeyEnabled(this.config) && this.valkey
        ? await createValkeyAuthState(this.valkey, sessionId)
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
    const indexContacts = (contacts: unknown[], source: string): void => {
      const map = this.lidToPhone.get(sessionId);
      if (!map) return;
      let added = 0;
      for (const contact of contacts) {
        if (typeof contact !== 'object' || contact === null) continue;
        const c = contact as Record<string, unknown>;
        if (typeof c['lid'] === 'string' && typeof c['id'] === 'string') {
          map.set(jidNormalizedUser(c['lid']), jidNormalizedUser(c['id']));
          added++;
        }
      }
      // Always log so we can see whether contacts are arriving and how many have LID
      this.logger.log(
        `[LID] session=${sessionId} source=${source} total=${contacts.length} with-lid=${added} map-size=${map.size}`,
      );
    };

    const looseEvents = socket.ev as unknown as {
      on(event: string, listener: (data: unknown) => void): void;
    };
    looseEvents.on('messaging-history.set', (data) => {
      if (typeof data !== 'object' || data === null) return;
      const contacts = (data as Record<string, unknown>)['contacts'];
      if (Array.isArray(contacts)) indexContacts(contacts, 'history');
    });
    looseEvents.on('contacts.upsert', (contacts) => {
      if (Array.isArray(contacts)) indexContacts(contacts, 'upsert');
    });
    looseEvents.on('contacts.update', (contacts) => {
      if (Array.isArray(contacts)) indexContacts(contacts, 'update');
    });

    // chats.phoneNumberShare maps chat JIDs (possibly @lid) → phone numbers directly
    looseEvents.on('chats.phoneNumberShare', (data) => {
      const map = this.lidToPhone.get(sessionId);
      if (!map) return;
      if (typeof data !== 'object' || data === null) return;
      const entries: Iterable<[unknown, unknown]> =
        data instanceof Map ? data.entries() : Object.entries(data as Record<string, unknown>);
      for (const [jid, phone] of entries) {
        const normalized = jidNormalizedUser(String(jid));
        if (normalized.endsWith('@lid')) {
          map.set(normalized, String(phone));
          // PII-safe: never log raw phone numbers / JIDs — hash them.
          this.logger.log(
            `[LID] session=${sessionId} phoneNumberShare resolved ${hashJid(normalized)} → ${hashJid(String(phone))}`,
          );
        }
      }
    });
  }

  private async handleConnectionUpdate(
    sessionId: SessionId,
    update: Parameters<
      Parameters<ReturnType<typeof makeWASocket>['ev']['on']>[1]
    >[0] extends infer U
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
      // PII-safe: log a hash of the phone, never the number itself.
      this.logger.log(`Session ${sessionId} connected (phone: ${hashJid(phone)})`);
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

      this.logger.warn(
        `Session ${sessionId} disconnected — code: ${codeLabel} reconnect: ${String(shouldReconnect)}`,
      );

      session.markDisconnected(reason);
      await this.sessions.save(session);
      await this.eventPublisher.publishMany([...session.domainEvents] as never[]);
      session.clearDomainEvents();

      if (shouldReconnect) {
        const attempt = this.manager.incrementReconnectAttempt(sessionId);
        if (attempt <= session.config.maxReconnectAttempts) {
          this.logger.log(
            `Session ${sessionId} scheduling reconnect attempt ${attempt}/${session.config.maxReconnectAttempts}`,
          );
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
        `[LID] session=${sessionId} unresolved LID=${hashJid(normalized)} — contact not in address book or sync pending (map-size=${this.lidToPhone.get(sessionId)?.size ?? 0})`,
      );
    }
    return resolved ?? jid;
  }

  private async handleIncomingMessage(sessionId: SessionId, msg: WAMessage): Promise<void> {
    // Log every raw arrival at debug level so we can see what's being filtered
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
    // Messages without an id cannot be deduplicated safely. An empty global key
    // would suppress every subsequent id-less message.
    if (messageId && (await this.isDuplicate(sessionId, messageId))) return;

    const rawFrom: string = msg.key?.remoteJid ?? '';
    // @lid JIDs are WhatsApp's internal multi-device IDs — resolve to phone JID when possible
    const from = this.resolveLid(sessionId, rawFrom);
    const isGroup = isJidGroup(from) ?? false;
    const messageType = Object.keys(msg.message)[0] ?? 'unknown';
    const timestamp = Number(msg.messageTimestamp);

    // Extract text content — covers plain text, quoted replies, and button responses
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

    const attachment = await this.downloadCsvAttachment(msg, messageType);

    const events = [];

    events.push(
      new MessageReceivedEvent(
        sessionId,
        messageId,
        from,
        isGroup,
        messageType,
        timestamp,
        text,
        pushName,
        attachment,
      ),
    );

    if (isGroup) {
      const sender: string = this.resolveLid(sessionId, msg.key?.participant ?? '');
      events.push(
        new GroupMessageReceivedEvent(
          sessionId,
          messageId,
          from,
          sender,
          messageType,
          timestamp,
          text,
          pushName,
        ),
      );
    } else {
      events.push(
        new PrivateMessageReceivedEvent(
          sessionId,
          messageId,
          from,
          messageType,
          timestamp,
          text,
          pushName,
        ),
      );
    }

    const mediaTypes = [
      'imageMessage',
      'videoMessage',
      'audioMessage',
      'documentMessage',
      'stickerMessage',
    ];
    if (mediaTypes.includes(messageType)) {
      const messageRecord = msg.message as Record<string, { mimetype?: string } | undefined>;
      const mimeType = messageRecord[messageType]?.mimetype ?? 'application/octet-stream';
      events.push(
        new MediaReceivedEvent(sessionId, messageId, from, messageType, mimeType, timestamp),
      );
    }

    await this.eventPublisher.publishMany(events as never[]);
  }

  /** Downloads a CSV-like document attachment and base64-encodes it for
   * MessageReceivedEvent. Never throws — a download failure (expired media,
   * network blip) must not drop the message itself; it just arrives text-only. */
  private async downloadCsvAttachment(
    msg: WAMessage,
    messageType: string,
  ): Promise<InboundAttachment | undefined> {
    if (messageType !== 'documentMessage') return undefined;
    const document = msg.message?.documentMessage;
    const mimeType = document?.mimetype ?? 'application/octet-stream';
    const fileName = document?.fileName ?? undefined;
    if (!isCsvLikeDocument(mimeType, fileName)) return undefined;

    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {});
      const maxBytes = this.config.MAX_MEDIA_SIZE_MB * 1024 * 1024;
      if (buffer.length > maxBytes) {
        this.logger.warn(
          `CSV attachment exceeds MAX_MEDIA_SIZE_MB (${buffer.length} bytes) — dropping attachment, message continues text-only`,
        );
        return undefined;
      }
      return { mimeType, base64: buffer.toString('base64'), ...(fileName !== undefined ? { fileName } : {}) };
    } catch (error) {
      this.logger.warn(
        `Failed to download CSV attachment: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  async disconnect(sessionId: SessionId): Promise<void> {
    await this.manager.close(sessionId);
    this.lidToPhone.delete(sessionId);
    const session = await this.sessions.findById(sessionId);
    if (session) {
      session.markDisconnected('manual_disconnect');
      await this.sessions.save(session);
    }
  }

  async delete(sessionId: SessionId): Promise<void> {
    await this.manager.logout(sessionId);
    this.lidToPhone.delete(sessionId);
    if (isValkeyEnabled(this.config) && this.valkey) {
      await deleteValkeyAuthState(this.valkey, sessionId);
      return;
    }
    await deleteFilesystemAuthState(this.config.SESSION_PATH, sessionId);
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

  private async isDuplicate(sessionId: SessionId, messageId: string): Promise<boolean> {
    const scopedId = `${sessionId}:${messageId}`;
    if (this.valkey) {
      const key = `wac:dedup:${scopedId}`;
      const result = await this.valkey.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
      return result === null;
    }

    // In-memory fallback — clean old entries periodically
    const now = Date.now();
    if (this.deduplicationCache.has(scopedId)) return true;
    this.deduplicationCache.set(scopedId, now);

    // Prune entries older than TTL every 100 new messages
    if (this.deduplicationCache.size % 100 === 0) {
      for (const [id, ts] of this.deduplicationCache.entries()) {
        if (now - ts > DEDUP_TTL_SECONDS * 1000) this.deduplicationCache.delete(id);
      }
    }
    return false;
  }
}
