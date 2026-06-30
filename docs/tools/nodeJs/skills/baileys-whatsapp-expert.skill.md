# 🎯 SKILL: BAILEYS WHATSAPP EXPERT

**skill_id**: whatsapp-baileys-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend · whatsapp · websocket · messaging  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: nodejs-async-event-loop-expert, nestjs-hexagonal-ddd-expert, typescript-strict-expert

---

## 📌 Propósito de la Skill

Dominar la integración de `@whiskeysockets/baileys` en aplicaciones NestJS de producción: conexión, autenticación multi-device, ciclo de vida del socket, procesamiento de eventos, envío de mensajes con rate-limiting y patrones anti-ban. Esta skill cubre desde la configuración inicial hasta estrategias avanzadas de resiliencia y testing.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

- **Nunca bloquear el event loop en handlers de eventos** — los callbacks de `sock.ev.on()` deben ser async con try/catch y sin operaciones CPU intensas síncronas.
- **Sesión = estado crítico** — perder las credenciales o el store implica nuevo QR y posible restricción de cuenta. Persistir siempre en Redis o sistema de archivos con respaldo.
- **Baileys no es una API oficial** — es ingeniería reversa del protocolo WhatsApp Web. Cada actualización de WhatsApp puede romper comportamientos; pinear la versión de Baileys y testear antes de actualizar.
- **Rate limiting es obligatorio** — enviar mensajes en ráfaga sin control activa mecanismos anti-spam de WhatsApp y puede resultar en ban temporal o permanente.
- **Idempotencia en procesamiento de mensajes** — los eventos `messages.upsert` pueden llegar duplicados; siempre deduplicar por `message.key.id`.

---

### Técnicas y Patrones

#### 1. Instalación y versión recomendada

```bash
npm install @whiskeysockets/baileys@6.7.x
npm install pino              # Logger requerido por Baileys
npm install @hapi/boom        # Error handling
```

```json
// package.json — pinear versión exacta en producción
{
  "dependencies": {
    "@whiskeysockets/baileys": "6.7.16"
  }
}
```

---

#### 2. Configuración de `makeWASocket` — parámetros críticos

```typescript
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  WASocket,
  ConnectionState,
  BaileysEventMap,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

async function createSocket(authPath: string): Promise<WASocket> {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const logger = pino({ level: 'warn' }); // 'silent' en prod, 'debug' en dev

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      // CacheableSignalKeyStore previene race conditions en multi-proceso
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,         // NUNCA true en producción
    markOnlineOnConnect: false,       // No marcar como disponible automáticamente
    syncFullHistory: false,           // Evitar carga masiva de historial
    generateHighQualityLinkPreview: false, // Reducir latencia
    getMessage: async (key) => {      // Requerido para retry de mensajes
      return { conversation: '' };    // Implementar con store real
    },
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}
```

---

#### 3. Auth State con Redis (producción)

```typescript
// infrastructure/adapters/out/baileys/redis-auth-state.adapter.ts
import { RedisClientType } from 'redis';
import {
  AuthenticationState,
  AuthenticationCreds,
  SignalDataTypeMap,
  initAuthCreds,
  proto,
  BufferJSON,
} from '@whiskeysockets/baileys';

export async function useRedisAuthState(
  redis: RedisClientType,
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const KEY_PREFIX = `baileys:${sessionId}`;

  const writeData = async (data: unknown, key: string): Promise<void> => {
    await redis.set(
      `${KEY_PREFIX}:${key}`,
      JSON.stringify(data, BufferJSON.replacer),
    );
  };

  const readData = async (key: string): Promise<unknown> => {
    const raw = await redis.get(`${KEY_PREFIX}:${key}`);
    return raw ? JSON.parse(raw, BufferJSON.reviver) : null;
  };

  const creds: AuthenticationCreds =
    (await readData('creds') as AuthenticationCreds) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[],
        ): Promise<Record<string, SignalDataTypeMap[T]>> => {
          const result: Record<string, SignalDataTypeMap[T]> = {};
          await Promise.all(
            ids.map(async (id) => {
              const value = await readData(`${type}:${id}`);
              if (value) {
                result[id] =
                  type === 'app-state-sync-key'
                    ? proto.Message.AppStateSyncKeyData.fromObject(value as object)
                    : (value as SignalDataTypeMap[T]);
              }
            }),
          );
          return result;
        },
        set: async (data: Record<string, unknown>): Promise<void> => {
          const tasks: Promise<void>[] = [];
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries as Record<string, unknown>)) {
              if (value) {
                tasks.push(writeData(value, `${type}:${id}`));
              } else {
                tasks.push(redis.del(`${KEY_PREFIX}:${type}:${id}`).then(() => undefined));
              }
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
}
```

---

#### 4. Ciclo de vida de la conexión — reconexión con backoff exponencial

```typescript
// domain/services/baileys-connection.service.ts
export type ConnectionStatus =
  | { status: 'connecting' }
  | { status: 'open'; jid: string }
  | { status: 'close'; reason: string }
  | { status: 'qr'; qr: string };

export class BaileysConnectionManager {
  private sock: WASocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_ATTEMPTS = 10;
  private readonly BASE_DELAY_MS = 1000;

  constructor(
    private readonly createSocket: () => Promise<WASocket>,
    private readonly onStatusChange: (status: ConnectionStatus) => void,
    private readonly onMessage: (msg: BaileysEventMap['messages.upsert']) => void,
  ) {}

  async connect(): Promise<void> {
    this.sock = await this.createSocket();
    this.registerEventHandlers(this.sock);
  }

  private registerEventHandlers(sock: WASocket): void {
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.onStatusChange({ status: 'qr', qr });
        return;
      }

      if (connection === 'open') {
        this.reconnectAttempts = 0;
        this.onStatusChange({
          status: 'open',
          jid: sock.user?.id ?? 'unknown',
        });
        return;
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom | undefined;
        const statusCode = error?.output?.statusCode;
        const reason = DisconnectReason;

        // loggedOut = usuario cerró sesión desde el teléfono → NO reconectar
        if (statusCode === reason.loggedOut) {
          this.onStatusChange({ status: 'close', reason: 'loggedOut' });
          return;
        }

        await this.scheduleReconnect();
      }
    });

    sock.ev.on('messages.upsert', async (update) => {
      try {
        await this.onMessage(update);
      } catch (err) {
        // Log pero nunca dejar que un error de procesamiento rompa el socket
        console.error('Error processing message:', err);
      }
    });
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_ATTEMPTS) {
      this.onStatusChange({ status: 'close', reason: 'max_attempts_reached' });
      return;
    }

    // Backoff exponencial con jitter para evitar thundering herd
    const delay = Math.min(
      this.BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts) +
        Math.random() * 1000,
      30_000, // máximo 30 segundos
    );

    this.reconnectAttempts++;
    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.connect();
  }

  async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock.end(undefined);
      this.sock = null;
    }
  }
}
```

---

#### 5. Procesamiento de mensajes — filtros obligatorios

```typescript
// application/use-cases/process-incoming-message.use-case.ts
import { BaileysEventMap } from '@whiskeysockets/baileys';

// Set de IDs procesados — en producción usar Redis con TTL de 5 minutos
const processedMessageIds = new Set<string>();

export async function processIncomingMessages(
  update: BaileysEventMap['messages.upsert'],
  handler: (msg: proto.IWebMessageInfo) => Promise<void>,
): Promise<void> {
  const { messages, type } = update;

  // Solo procesar notificaciones de mensajes nuevos
  if (type !== 'notify') return;

  for (const message of messages) {
    // Filtro 1: ignorar mensajes propios
    if (message.key.fromMe) continue;

    // Filtro 2: ignorar mensajes vacíos o stubs (eventos de sistema)
    if (!message.message) continue;

    // Filtro 3: ignorar protocolMessages (receipts internos)
    if (message.message.protocolMessage) continue;

    // Filtro 4: deduplicación por messageId
    const msgId = message.key.id!;
    if (processedMessageIds.has(msgId)) continue;
    processedMessageIds.add(msgId);

    // Filtro 5: ignorar mensajes muy antiguos (> 60 segundos)
    const msgTimestamp = (message.messageTimestamp as number) * 1000;
    if (Date.now() - msgTimestamp > 60_000) continue;

    try {
      await handler(message);
    } catch (error) {
      console.error(`Failed to process message ${msgId}:`, error);
    }
  }
}

// Extractor de texto — maneja todos los tipos de mensaje
export function extractMessageText(
  message: proto.IWebMessageInfo,
): string | null {
  const msg = message.message;
  if (!msg) return null;

  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    msg.documentMessage?.caption ??
    msg.buttonsResponseMessage?.selectedDisplayText ??
    msg.listResponseMessage?.title ??
    null
  );
}

// Extractor de JID del remitente (funciona para individual y grupos)
export function getSenderJid(message: proto.IWebMessageInfo): string {
  // En grupos, el remitente real está en participant
  return message.key.participant ?? message.key.remoteJid ?? '';
}

export function isGroupMessage(message: proto.IWebMessageInfo): boolean {
  return message.key.remoteJid?.endsWith('@g.us') ?? false;
}
```

---

#### 6. Envío de mensajes con rate limiting

```typescript
// infrastructure/adapters/out/baileys/message-sender.adapter.ts

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimitedMessageSender {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly TOKENS_PER_MINUTE = 20;      // Máx 20 mensajes/min por JID
  private readonly GLOBAL_TOKENS_PER_MIN = 100;  // Máx 100 mensajes/min globales
  private readonly MIN_DELAY_MS = 500;            // Mínimo 500ms entre mensajes al mismo JID
  private globalBucket: RateLimitBucket;
  private lastSentPerJid = new Map<string, number>();

  constructor(private readonly sock: WASocket) {
    this.globalBucket = {
      tokens: this.GLOBAL_TOKENS_PER_MIN,
      lastRefill: Date.now(),
    };
  }

  async sendText(jid: string, text: string): Promise<void> {
    await this.acquireToken(jid);
    await this.enforceMinDelay(jid);

    // Typing indicator humaniza el comportamiento
    await this.sock.sendPresenceUpdate('composing', jid);
    await this.delay(Math.random() * 800 + 200); // 200-1000ms escribiendo

    await this.sock.sendMessage(jid, { text });
    await this.sock.sendPresenceUpdate('paused', jid);

    this.lastSentPerJid.set(jid, Date.now());
  }

  async sendReply(
    jid: string,
    text: string,
    quotedMessage: proto.IWebMessageInfo,
  ): Promise<void> {
    await this.acquireToken(jid);
    await this.enforceMinDelay(jid);

    await this.sock.sendPresenceUpdate('composing', jid);
    await this.delay(Math.random() * 600 + 300);

    await this.sock.sendMessage(jid, { text, quoted: quotedMessage });
    await this.sock.sendPresenceUpdate('paused', jid);

    this.lastSentPerJid.set(jid, Date.now());
  }

  async sendImage(
    jid: string,
    imageBuffer: Buffer,
    caption?: string,
  ): Promise<void> {
    await this.acquireToken(jid);
    await this.enforceMinDelay(jid);

    await this.sock.sendMessage(jid, {
      image: imageBuffer,
      caption,
      mimetype: 'image/jpeg',
    });

    this.lastSentPerJid.set(jid, Date.now());
  }

  private async enforceMinDelay(jid: string): Promise<void> {
    const lastSent = this.lastSentPerJid.get(jid);
    if (lastSent) {
      const elapsed = Date.now() - lastSent;
      if (elapsed < this.MIN_DELAY_MS) {
        await this.delay(this.MIN_DELAY_MS - elapsed);
      }
    }
  }

  private async acquireToken(jid: string): Promise<void> {
    // Refill global bucket
    this.refillBucket(this.globalBucket, this.GLOBAL_TOKENS_PER_MIN);
    if (this.globalBucket.tokens < 1) {
      const waitMs = (60_000 / this.GLOBAL_TOKENS_PER_MIN) * 1000;
      await this.delay(waitMs);
    }
    this.globalBucket.tokens--;

    // Refill per-JID bucket
    if (!this.buckets.has(jid)) {
      this.buckets.set(jid, {
        tokens: this.TOKENS_PER_MINUTE,
        lastRefill: Date.now(),
      });
    }
    const bucket = this.buckets.get(jid)!;
    this.refillBucket(bucket, this.TOKENS_PER_MINUTE);

    if (bucket.tokens < 1) {
      const waitMs = (60_000 / this.TOKENS_PER_MINUTE) * 1000;
      await this.delay(waitMs);
      bucket.tokens = this.TOKENS_PER_MINUTE;
    }
    bucket.tokens--;
  }

  private refillBucket(bucket: RateLimitBucket, maxTokens: number): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = (elapsed / 60_000) * maxTokens;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

---

#### 7. Integración NestJS — BaileysModule con DynamicModule

```typescript
// infrastructure/modules/baileys.module.ts
import { DynamicModule, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

export interface BaileysModuleOptions {
  sessionId: string;
  redisUrl: string;
  qrCallback?: (qr: string) => void;
}

export const BAILEYS_MODULE_OPTIONS = 'BAILEYS_MODULE_OPTIONS';
export const BAILEYS_SOCKET = 'BAILEYS_SOCKET';

@Module({})
export class BaileysModule {
  static forRoot(options: BaileysModuleOptions): DynamicModule {
    return {
      module: BaileysModule,
      global: true,
      providers: [
        {
          provide: BAILEYS_MODULE_OPTIONS,
          useValue: options,
        },
        BaileysService,
        RateLimitedMessageSender,
        MessageProcessor,
      ],
      exports: [BaileysService, RateLimitedMessageSender],
    };
  }

  // Para testing: reemplaza el socket real con mock
  static forTesting(): DynamicModule {
    return {
      module: BaileysModule,
      providers: [
        {
          provide: BaileysService,
          useClass: MockBaileysService,
        },
        {
          provide: RateLimitedMessageSender,
          useClass: MockMessageSender,
        },
      ],
      exports: [BaileysService, RateLimitedMessageSender],
    };
  }
}

@Injectable()
export class BaileysService implements OnModuleInit, OnApplicationShutdown {
  private connectionManager: BaileysConnectionManager | null = null;
  private currentStatus: ConnectionStatus = { status: 'connecting' };

  constructor(
    @Inject(BAILEYS_MODULE_OPTIONS) private readonly options: BaileysModuleOptions,
    private readonly redisClient: RedisClientType,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeConnection();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connectionManager?.disconnect();
  }

  private async initializeConnection(): Promise<void> {
    const { state, saveCreds } = await useRedisAuthState(
      this.redisClient,
      this.options.sessionId,
    );

    this.connectionManager = new BaileysConnectionManager(
      async () => {
        const sock = makeWASocket({
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'warn' })),
          },
          logger: pino({ level: 'warn' }),
          printQRInTerminal: false,
          markOnlineOnConnect: false,
          syncFullHistory: false,
          getMessage: async () => ({ conversation: '' }),
        });
        sock.ev.on('creds.update', saveCreds);
        return sock;
      },
      (status) => {
        this.currentStatus = status;
        this.eventEmitter.emit('baileys.connection', status);
        if (status.status === 'qr' && this.options.qrCallback) {
          this.options.qrCallback(status.qr);
        }
      },
      async (update) => {
        await processIncomingMessages(update, async (message) => {
          this.eventEmitter.emit('baileys.message', message);
        });
      },
    );

    await this.connectionManager.connect();
  }

  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }
}
```

---

#### 8. Testing — MockBaileysService

```typescript
// test/mocks/mock-baileys.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MockBaileysService {
  private sentMessages: Array<{ jid: string; content: unknown }> = [];

  async sendText(jid: string, text: string): Promise<void> {
    this.sentMessages.push({ jid, content: { text } });
  }

  async sendReply(
    jid: string,
    text: string,
    _quoted: unknown,
  ): Promise<void> {
    this.sentMessages.push({ jid, content: { text, quoted: true } });
  }

  getSentMessages(): Array<{ jid: string; content: unknown }> {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }

  // Simula llegada de mensaje entrante para tests
  simulateIncomingMessage(
    fromJid: string,
    text: string,
    eventEmitter: EventEmitter2,
  ): void {
    const mockMessage: Partial<proto.IWebMessageInfo> = {
      key: {
        remoteJid: fromJid,
        fromMe: false,
        id: `mock-${Date.now()}`,
      },
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000),
    };
    eventEmitter.emit('baileys.message', mockMessage);
  }

  getStatus(): ConnectionStatus {
    return { status: 'open', jid: 'test@s.whatsapp.net' };
  }
}
```

---

### Estándares de Referencia

- **WhatsApp Business Policy** — respetar límites de mensajería masiva y opt-in
- **@whiskeysockets/baileys README** — configuración oficial y changelog de breaking changes
- **OWASP Mobile Top 10** — protección de credenciales de sesión almacenadas
- **RFC 6455** — WebSocket protocol (base de la conexión Baileys)

---

## ✅ Criterios de Aplicación

- Cualquier módulo que envíe o reciba mensajes de WhatsApp vía Baileys
- Implementación del servicio de conexión o reconexión
- Procesamiento de eventos de mensajes entrantes
- Envío programático de mensajes, imágenes o archivos
- Gestión de sesiones multi-device en entornos con múltiples instancias

---

## ❌ Anti-patrones

- ❌ **`printQRInTerminal: true` en producción** — expone sesión en logs del servidor
- ❌ **Enviar mensajes sin rate limiting** — ban de cuenta en horas o días
- ❌ **No filtrar `fromMe: true`** — bucle infinito: bot responde sus propios mensajes
- ❌ **No deduplicar por `message.key.id`** — procesamiento duplicado en eventos retry
- ❌ **Guardar creds en memoria sin persistencia** — pérdida de sesión en cada restart
- ❌ **Un solo `try/catch` global en el handler de eventos** — un error silencia todos los mensajes siguientes
- ❌ **`makeCacheableSignalKeyStore` omitido en multi-proceso** — race conditions en keys Signal
- ❌ **Ignorar `DisconnectReason.loggedOut`** — reintentos infinitos tras logout manual del teléfono
- ❌ **`syncFullHistory: true`** — carga masiva de historial en el primer connect, latencia extrema
- ❌ **No implementar `getMessage`** — los retry automáticos de mensajes fallidos no funcionan

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Respuesta automática a mensaje de usuario específico

```typescript
// application/use-cases/handle-authorized-user-message.use-case.ts

@Injectable()
export class HandleAuthorizedUserMessageUseCase {
  constructor(
    private readonly messageSender: RateLimitedMessageSender,
    private readonly userRepo: AuthorizedUserRepository,
    private readonly rulesEngine: MessageRulesEngine,
  ) {}

  // Llamado desde EventEmitter cuando llega 'baileys.message'
  async execute(message: proto.IWebMessageInfo): Promise<void> {
    if (isGroupMessage(message)) return; // Este use case solo maneja individuales

    const senderJid = getSenderJid(message);
    const text = extractMessageText(message);
    if (!text) return;

    // Verificar si el usuario está autorizado
    const phoneNumber = jidToPhoneNumber(senderJid); // '+573001234567'
    const user = await this.userRepo.findByPhoneNumber(phoneNumber);
    if (!user) return; // Lista blanca — ignorar silenciosamente

    // Aplicar reglas de negocio
    const response = await this.rulesEngine.evaluate({ text, user, message });
    if (!response) return;

    await this.messageSender.sendReply(senderJid, response, message);
  }
}

function jidToPhoneNumber(jid: string): string {
  // '573001234567@s.whatsapp.net' → '+573001234567'
  return '+' + jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
}
```

### Ejemplo 2: Download y re-envío de imagen

```typescript
async function downloadAndStoreImage(
  message: proto.IWebMessageInfo,
  sock: WASocket,
  storage: StoragePort,
): Promise<string> {
  const imageMsg = message.message?.imageMessage;
  if (!imageMsg) throw new Error('Not an image message');

  // downloadMediaMessage retorna un Stream
  const stream = await downloadMediaMessage(
    message,
    'stream',
    {},
    { logger: pino({ level: 'warn' }), reuploadRequest: sock.updateMediaMessage },
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const fileId = await storage.save({
    buffer,
    mimeType: imageMsg.mimetype ?? 'image/jpeg',
    filename: `whatsapp-${Date.now()}.jpg`,
  });

  return fileId;
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agrega la siguiente sección en su archivo `.md`:

```markdown
### SKILL ACTIVA: BAILEYS WHATSAPP EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/baileys-whatsapp-expert.skill.md

Puntos críticos de aplicación:
- `makeWASocket()` SIEMPRE con `printQRInTerminal: false`, `syncFullHistory: false`, `markOnlineOnConnect: false`
- Auth state persistido en Redis con `useRedisAuthState` (NUNCA en memoria pura)
- `makeCacheableSignalKeyStore()` obligatorio para evitar race conditions
- Filtros obligatorios en `messages.upsert`: `fromMe`, `message !== null`, protocolMessage, deduplicación por `key.id`, antigüedad > 60s
- Rate limiting: máx 20 msg/min por JID, mínimo 500ms entre mensajes al mismo JID
- Reconexión: backoff exponencial (base 1s, máx 30s, jitter) + detección de `loggedOut` para no reintentar
- NestJS: `BaileysService` implementa `OnModuleInit` / `OnApplicationShutdown`
- Testing: `BaileysModule.forTesting()` con `MockBaileysService` — nunca conectar socket real en tests
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Tiempo de reconexión exitosa | < 30 segundos tras caída |
| Tasa de mensajes procesados sin duplicados | 100% con deduplicación Redis |
| Rate de envío máximo por JID | ≤ 20 msg/min |
| Uptime del socket en producción | > 99.5% mensual |
| Cobertura de tests con MockBaileysService | > 90% en use cases |
| Latencia envío mensaje → entregado | < 2 segundos en condiciones normales |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Baileys Expert para WhatsApp automation con NestJS
