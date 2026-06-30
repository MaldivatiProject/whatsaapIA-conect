# 🎯 SKILL: NESTJS + HEXAGONAL ARCHITECTURE + DDD EXPERT

**skill_id**: nestjs-hexagonal-ddd-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend · nestjs · architecture · ddd  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: typescript-strict-expert, nodejs-async-event-loop-expert

---

## 📌 Propósito de la Skill

Diseñar e implementar aplicaciones NestJS con Arquitectura Hexagonal (Ports & Adapters) y Domain-Driven Design en TypeScript. Cubre la estructura de módulos, inyección de dependencias, lifecycle hooks, testing de aplicación, y el mapeo correcto de patrones DDD (Aggregates, Value Objects, Domain Events, Use Cases) al ecosistema NestJS.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

- **El Domain no conoce NestJS** — ningún decorador de NestJS (`@Injectable`, `@Module`) en la capa de dominio. El dominio es TypeScript puro.
- **Los módulos NestJS son los Bounded Contexts** — un módulo por contexto: `WhatsAppModule`, `RulesEngineModule`, `OllamaModule`, `NotificationModule`.
- **Los Use Cases son los `@Injectable` de la capa de Application** — implementan una interface de Port (el contrato del dominio).
- **Los Adapters son los `@Injectable` de la capa de Infrastructure** — implementan los Output Ports del dominio (repositorios, clientes HTTP, servicios externos).
- **DynamicModule para adapters intercambiables** — permite swapear implementaciones reales por mocks en tests sin cambiar el código de dominio.
- **`EventEmitter2` desacopla módulos** — los Domain Events se publican con `EventEmitter2.emit()` y los handlers están en módulos distintos.

---

### Técnicas y Patrones

#### 1. Estructura de directorios

```
src/
├── modules/
│   ├── whatsapp/                         ← Bounded Context: WhatsApp
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── whatsapp-session.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── phone-number.vo.ts
│   │   │   │   ├── whatsapp-jid.vo.ts
│   │   │   │   └── message-id.vo.ts
│   │   │   ├── events/
│   │   │   │   ├── message-received.event.ts
│   │   │   │   └── session-connected.event.ts
│   │   │   ├── ports/
│   │   │   │   ├── in/
│   │   │   │   │   ├── send-message.use-case.ts          ← Input Port (interface)
│   │   │   │   │   └── process-incoming-message.use-case.ts
│   │   │   │   └── out/
│   │   │   │       ├── message-sender.port.ts            ← Output Port (interface)
│   │   │   │       └── session-repository.port.ts
│   │   │   └── services/
│   │   │       └── message-validator.domain-service.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── send-message.service.ts               ← Implementa Input Port
│   │   │   │   └── process-incoming-message.service.ts
│   │   │   └── event-handlers/
│   │   │       └── message-received.handler.ts
│   │   ├── infrastructure/
│   │   │   ├── adapters/
│   │   │   │   ├── in/
│   │   │   │   │   └── http/
│   │   │   │   │       └── whatsapp-status.controller.ts
│   │   │   │   └── out/
│   │   │   │       ├── baileys/
│   │   │   │       │   ├── baileys-message-sender.adapter.ts ← Implementa Output Port
│   │   │   │       │   └── baileys.service.ts
│   │   │   │       └── redis/
│   │   │   │           └── redis-session.repository.ts
│   │   │   └── mappers/
│   │   │       └── baileys-message.mapper.ts
│   │   └── whatsapp.module.ts
│   ├── rules-engine/                     ← Bounded Context: Motor de Reglas
│   ├── ollama/                           ← Bounded Context: IA Local
│   └── n8n-integration/                  ← Bounded Context: Automatización
├── shared/
│   ├── domain/
│   │   ├── aggregate-root.ts
│   │   ├── domain-event.ts
│   │   ├── value-object.ts
│   │   └── entity.ts
│   └── infrastructure/
│       └── event-bus/
│           └── nestjs-event-bus.adapter.ts
└── app.module.ts
```

---

#### 2. Shared Domain — base types

```typescript
// shared/domain/value-object.ts
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(vo: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

// shared/domain/domain-event.ts
export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor(public readonly eventName: string) {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }
}

// shared/domain/aggregate-root.ts
export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

---

#### 3. Value Objects con Branded Types

```typescript
// modules/whatsapp/domain/value-objects/whatsapp-jid.vo.ts
declare const JidBrand: unique symbol;
type JidString = string & { readonly [JidBrand]: typeof JidBrand };

export class WhatsAppJid extends ValueObject<{ value: JidString }> {
  private constructor(value: JidString) {
    super({ value });
  }

  static create(raw: string): WhatsAppJid {
    const normalized = raw.trim().toLowerCase();
    if (!normalized.endsWith('@s.whatsapp.net') && !normalized.endsWith('@g.us')) {
      throw new InvalidJidError(raw);
    }
    return new WhatsAppJid(normalized as JidString);
  }

  static fromPhoneNumber(phone: string): WhatsAppJid {
    // '+573001234567' → '573001234567@s.whatsapp.net'
    const digits = phone.replace(/[^\d]/g, '');
    return new WhatsAppJid(`${digits}@s.whatsapp.net` as JidString);
  }

  get value(): string { return this.props.value; }
  get phoneNumber(): string { return this.props.value.replace('@s.whatsapp.net', ''); }
  get isGroup(): boolean { return this.props.value.endsWith('@g.us'); }
}

// modules/whatsapp/domain/value-objects/phone-number.vo.ts
export class PhoneNumber extends ValueObject<{ value: string; countryCode: string }> {
  private static readonly VALID_REGEX = /^\+\d{7,15}$/;

  private constructor(value: string, countryCode: string) {
    super({ value, countryCode });
  }

  static create(raw: string): PhoneNumber {
    const normalized = raw.trim();
    if (!PhoneNumber.VALID_REGEX.test(normalized)) {
      throw new InvalidPhoneNumberError(raw);
    }
    const countryCode = normalized.substring(1, 3); // Simplificado
    return new PhoneNumber(normalized, countryCode);
  }

  get value(): string { return this.props.value; }
  get countryCode(): string { return this.props.countryCode; }
  toJid(): WhatsAppJid { return WhatsAppJid.fromPhoneNumber(this.props.value); }
}
```

---

#### 4. Domain Events

```typescript
// modules/whatsapp/domain/events/message-received.event.ts
export class MessageReceivedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'whatsapp.message.received';

  constructor(
    public readonly messageId: MessageId,
    public readonly senderJid: WhatsAppJid,
    public readonly text: string | null,
    public readonly hasMedia: boolean,
    public readonly isGroup: boolean,
  ) {
    super(MessageReceivedEvent.EVENT_NAME);
  }
}

// modules/whatsapp/domain/events/session-status-changed.event.ts
export class SessionStatusChangedEvent extends DomainEvent {
  static readonly EVENT_NAME = 'whatsapp.session.status_changed';

  constructor(
    public readonly sessionId: string,
    public readonly status: 'connected' | 'disconnected' | 'qr_pending',
    public readonly qrCode?: string,
  ) {
    super(SessionStatusChangedEvent.EVENT_NAME);
  }
}
```

---

#### 5. Input Ports (Use Case interfaces)

```typescript
// modules/whatsapp/domain/ports/in/send-message.use-case.ts
export interface SendMessageCommand {
  readonly recipientJid: WhatsAppJid;
  readonly text: string;
  readonly quotedMessageId?: MessageId;
}

export interface SendMessageResult {
  readonly messageId: MessageId;
  readonly sentAt: Date;
}

export interface SendMessageUseCase {
  execute(command: SendMessageCommand): Promise<SendMessageResult>;
}

export const SEND_MESSAGE_USE_CASE = Symbol('SendMessageUseCase');

// modules/whatsapp/domain/ports/out/message-sender.port.ts
export interface MessageSenderPort {
  sendText(jid: string, text: string, quotedMsgId?: string): Promise<string>;
  sendImage(jid: string, buffer: Buffer, caption?: string): Promise<string>;
  sendTypingIndicator(jid: string): Promise<void>;
}

export const MESSAGE_SENDER_PORT = Symbol('MessageSenderPort');
```

---

#### 6. Application Layer — Use Case Service

```typescript
// modules/whatsapp/application/use-cases/send-message.service.ts
@Injectable()
export class SendMessageService implements SendMessageUseCase {
  constructor(
    @Inject(MESSAGE_SENDER_PORT)
    private readonly messageSender: MessageSenderPort,
    private readonly eventEmitter: EventEmitter2,
    private readonly messageRepo: MessageRepository,
  ) {}

  async execute(command: SendMessageCommand): Promise<SendMessageResult> {
    // Validación en el dominio (VOs ya garantizan integridad)
    const messageId = await this.messageSender.sendText(
      command.recipientJid.value,
      command.text,
      command.quotedMessageId?.value,
    );

    const sentMessage = new SentMessage(
      MessageId.create(messageId),
      command.recipientJid,
      command.text,
    );

    await this.messageRepo.save(sentMessage);

    return {
      messageId: MessageId.create(messageId),
      sentAt: new Date(),
    };
  }
}
```

---

#### 7. Infrastructure — Adapter implementa Output Port

```typescript
// modules/whatsapp/infrastructure/adapters/out/baileys/baileys-message-sender.adapter.ts
@Injectable()
export class BaileysMessageSenderAdapter implements MessageSenderPort {
  constructor(
    private readonly baileysService: BaileysService,
    private readonly rateLimiter: RateLimitedMessageSender,
  ) {}

  async sendText(
    jid: string,
    text: string,
    quotedMsgId?: string,
  ): Promise<string> {
    // La lógica de rate limiting está en la skill de Baileys
    const result = await this.rateLimiter.sendText(jid, text);
    return result.key?.id ?? crypto.randomUUID();
  }

  async sendImage(jid: string, buffer: Buffer, caption?: string): Promise<string> {
    const result = await this.rateLimiter.sendImage(jid, buffer, caption);
    return result.key?.id ?? crypto.randomUUID();
  }

  async sendTypingIndicator(jid: string): Promise<void> {
    // Implementado en rate limiter con timing humanizado
  }
}
```

---

#### 8. Module Assembly — Wiring con DI de NestJS

```typescript
// modules/whatsapp/whatsapp.module.ts
@Module({
  imports: [
    BullModule.registerQueue({ name: 'message-processing' }),
    EventEmitterModule, // ya registrado en AppModule
    RedisModule,
  ],
  controllers: [WhatsAppStatusController],
  providers: [
    // Application Layer — Use Cases
    {
      provide: SEND_MESSAGE_USE_CASE,
      useClass: SendMessageService,
    },
    ProcessIncomingMessageService,
    MessageReceivedHandler,

    // Infrastructure — Adapters (implementan Output Ports)
    {
      provide: MESSAGE_SENDER_PORT,
      useClass: BaileysMessageSenderAdapter,
    },
    {
      provide: SESSION_REPOSITORY_PORT,
      useClass: RedisSessionRepository,
    },

    // Infrastructure — Services
    BaileysService,
    RateLimitedMessageSender,
    MessageProcessingConsumer,
  ],
  exports: [SEND_MESSAGE_USE_CASE],
})
export class WhatsAppModule {}

// Para tests: reemplaza todos los adapters reales
@Module({
  providers: [
    {
      provide: MESSAGE_SENDER_PORT,
      useClass: InMemoryMessageSenderAdapter,
    },
    {
      provide: SESSION_REPOSITORY_PORT,
      useClass: InMemorySessionRepository,
    },
    {
      provide: SEND_MESSAGE_USE_CASE,
      useClass: SendMessageService,
    },
  ],
  exports: [SEND_MESSAGE_USE_CASE, MESSAGE_SENDER_PORT],
})
export class WhatsAppTestingModule {}
```

---

#### 9. Event Handlers — comunicación desacoplada entre módulos

```typescript
// modules/rules-engine/application/event-handlers/on-message-received.handler.ts
@Injectable()
export class OnMessageReceivedHandler {
  constructor(
    private readonly rulesEngine: EvaluateRulesUseCase,
    @Inject(SEND_MESSAGE_USE_CASE)
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  @OnEvent(MessageReceivedEvent.EVENT_NAME, { async: true })
  async handle(event: MessageReceivedEvent): Promise<void> {
    if (!event.text) return;

    const result = await this.rulesEngine.evaluate({
      senderJid: event.senderJid,
      text: event.text,
      isGroup: event.isGroup,
    });

    if (result.shouldReply) {
      await this.sendMessage.execute({
        recipientJid: event.senderJid,
        text: result.replyText,
      });
    }

    if (result.shouldTriggerN8n) {
      // EventEmitter desacopla — N8nModule escucha este evento
      this.eventEmitter.emit(N8nWebhookEvent.EVENT_NAME, {
        trigger: result.n8nTrigger,
        context: { jid: event.senderJid.value, text: event.text },
      });
    }
  }
}
```

---

#### 10. Testing con `Test.createTestingModule`

```typescript
// modules/whatsapp/application/use-cases/send-message.service.spec.ts
describe('SendMessageService', () => {
  let service: SendMessageUseCase;
  let messageSender: InMemoryMessageSenderAdapter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [WhatsAppTestingModule, EventEmitterModule.forRoot()],
    }).compile();

    service = module.get<SendMessageUseCase>(SEND_MESSAGE_USE_CASE);
    messageSender = module.get<InMemoryMessageSenderAdapter>(MESSAGE_SENDER_PORT);
  });

  it('should send a text message to a valid JID', async () => {
    // Arrange
    const command: SendMessageCommand = {
      recipientJid: WhatsAppJid.create('573001234567@s.whatsapp.net'),
      text: 'Hola, test message',
    };

    // Act
    const result = await service.execute(command);

    // Assert
    expect(result.messageId).toBeDefined();
    expect(messageSender.getSentMessages()).toHaveLength(1);
    expect(messageSender.getSentMessages()[0].text).toBe('Hola, test message');
  });

  it('should throw InvalidJidError for malformed JID', async () => {
    await expect(() =>
      WhatsAppJid.create('not-a-valid-jid'),
    ).toThrow(InvalidJidError);
  });
});
```

---

### Estándares de Referencia

- **Hexagonal Architecture** — Alistair Cockburn, 2005 (alistair.cockburn.us)
- **Domain-Driven Design** — Eric Evans (Blue Book)
- **NestJS Official Documentation** — docs.nestjs.com (Modules, DI, Testing)
- **SOLID Principles** — Robert C. Martin

---

## ✅ Criterios de Aplicación

- Diseño de nuevos módulos o Bounded Contexts en la plataforma
- Implementación de Use Cases que orquesten lógica de negocio
- Creación de Adapters que integren servicios externos (Baileys, Redis, n8n, Ollama)
- Tests de Application Layer sin infraestructura real
- Comunicación entre módulos mediante Domain Events

---

## ❌ Anti-patrones

- ❌ **Decoradores NestJS en clases de Domain** — `@Injectable()`, `@Inject()` en Aggregates o Value Objects acoplan el dominio al framework
- ❌ **Importar módulos de infraestructura desde Domain** — ningún `import from 'redis'` o `import from 'baileys'` en `/domain/`
- ❌ **`forwardRef()`** — indica dependencia circular; rediseñar los módulos o usar eventos
- ❌ **`@Global()` en módulos de dominio** — solo para infraestructura compartida (Redis, EventEmitter, Config)
- ❌ **Un único módulo gigante** — un archivo `app.module.ts` con 30 providers; cada Bounded Context es su propio módulo
- ❌ **Use Cases con múltiples responsabilidades** — un Use Case = una operación del dominio
- ❌ **Inyectar repositorios directamente en Controllers** — los Controllers solo conocen Use Cases (Input Ports)

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Flujo completo de mensaje entrante

```
Baileys socket → messages.upsert event
→ BaileysService.handleMessages()
→ EventEmitter2.emit('baileys.message', rawMessage)
→ BaileysEventBridge → BullMQ queue
→ MessageProcessingConsumer.process()
→ ProcessIncomingMessageService.execute(command)
  → MessageReceivedEvent created
  → EventEmitter2.emit('whatsapp.message.received', event)
→ OnMessageReceivedHandler.handle(event) [RulesEngine module]
  → EvaluateRulesUseCase.evaluate()
  → SendMessageUseCase.execute() → BaileysMessageSenderAdapter
→ WhatsApp ← respuesta enviada
```

### Ejemplo 2: Module swap para testing de rules engine

```typescript
// Testear RulesEngine sin Baileys real
const module = await Test.createTestingModule({
  imports: [
    RulesEngineModule,
    WhatsAppTestingModule, // ← Baileys mockeado
    EventEmitterModule.forRoot(),
  ],
}).compile();

// Simular mensaje entrante
const bridge = module.get(BaileysEventBridge);
bridge.simulateIncomingMessage('573001234567@s.whatsapp.net', 'precio');

// Verificar que el rules engine respondió
const sender = module.get<InMemoryMessageSenderAdapter>(MESSAGE_SENDER_PORT);
expect(sender.getSentMessages()[0].text).toContain('catálogo');
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: NESTJS + HEXAGONAL + DDD EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/nestjs-hexagonal-ddd-expert.skill.md

Puntos críticos:
- Domain = TypeScript puro, CERO decoradores NestJS
- Un módulo NestJS = un Bounded Context
- Input Ports = interfaces en `/domain/ports/in/` con Symbol token para DI
- Output Ports = interfaces en `/domain/ports/out/` con Symbol token para DI
- Use Cases = `@Injectable` en `/application/use-cases/` que implementan Input Ports
- Adapters = `@Injectable` en `/infrastructure/adapters/` que implementan Output Ports
- Domain Events con EventEmitter2 para comunicación inter-módulo (nunca importar módulos entre sí)
- `DynamicModule.forTesting()` para swapear infraestructura real por InMemory en tests
- `OnModuleInit` / `OnApplicationShutdown` para lifecycle de Baileys y conexiones externas
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Imports de infraestructura en Domain | 0 (enforced por ArchUnit/eslint) |
| Cobertura de Use Cases con tests unitarios | > 90% |
| Módulos con dependencias circulares | 0 (`forwardRef` = 0 usos) |
| Use Cases con más de 1 responsabilidad | 0 (SRP enforced) |
| Controllers que acceden a repositorios directamente | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — NestJS Hexagonal DDD Expert para WhatsApp automation
