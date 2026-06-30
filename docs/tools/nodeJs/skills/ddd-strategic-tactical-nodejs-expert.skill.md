# 🏛️ SKILL: DDD STRATEGIC + TACTICAL — NODE.JS / TYPESCRIPT EXPERT

**skill_id**: ddd-strategic-tactical-nodejs-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: architecture · ddd · backend  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: typescript-strict-expert, nestjs-hexagonal-ddd-expert

---

## 📌 Propósito de la Skill

Dominar Domain-Driven Design en sus dos dimensiones — Diseño Estratégico (Bounded Contexts, Context Maps, Ubiquitous Language) y Diseño Táctico (Aggregates, Value Objects, Entities, Domain Events, Repositories, Domain Services, Factories) — aplicados en TypeScript idiomático dentro del stack Node.js/NestJS. Incluye reglas de dependencia verificables, patrones de consistencia y anti-patrones frecuentes en el contexto de plataformas de mensajería y automatización.

---

## 🧠 PARTE 1 — DISEÑO ESTRATÉGICO

### Principio clave: El Modelo de Dominio es el mapa del negocio

No empieces con base de datos ni con API. El primer artefacto es el **Lenguaje Ubicuo** y el **Mapa de Contextos**.

---

### 1.1 Bounded Contexts de la Plataforma WhatsApp IA

```
┌─────────────────────────────────────────────────────────────────┐
│                     MAPA DE CONTEXTOS                           │
│                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐                  │
│  │  WhatsApp Core  │─────│  Rules Engine    │                  │
│  │  (Conexión,     │     │  (Evaluación de  │                  │
│  │  Mensajes,      │     │  reglas, Motor   │                  │
│  │  Sesión)        │     │  de decisiones)  │                  │
│  └────────┬────────┘     └────────┬─────────┘                  │
│           │ Domain Events          │ Domain Events              │
│           ▼                        ▼                            │
│  ┌─────────────────┐     ┌──────────────────┐                  │
│  │  AI Integration │     │  Automation      │                  │
│  │  (Ollama,       │     │  (n8n workflows, │                  │
│  │  modelos locales│     │  Jenkins, ERPs)  │                  │
│  │  streaming)     │     │                  │                  │
│  └─────────────────┘     └──────────────────┘                  │
│                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐                  │
│  │  Contact Mgmt   │     │  Audit & Observ. │                  │
│  │  (Blacklist,    │     │  (Logs, métricas,│                  │
│  │  Whitelist,     │     │  trazabilidad)   │                  │
│  │  Perfiles)      │     │                  │                  │
│  └─────────────────┘     └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

**Relaciones entre contextos (Context Map):**
- `WhatsApp Core` → `Rules Engine`: **Customer/Supplier** (WhatsApp publica eventos, Rules consume)
- `Rules Engine` → `AI Integration`: **Conformist** (Rules llama a AI, se adapta a su contrato)
- `Rules Engine` → `Automation`: **Open Host Service** (webhook estándar para n8n/Jenkins)
- `WhatsApp Core` → `Contact Mgmt`: **Shared Kernel** (tipo `PhoneNumber` compartido)

---

### 1.2 Lenguaje Ubicuo por Bounded Context

**WhatsApp Core:**
- `Session` — conexión activa entre la app y WhatsApp (autenticada via QR)
- `IncomingMessage` — mensaje recibido de un contacto externo
- `OutgoingMessage` — mensaje enviado por la plataforma
- `Jid` (Jabber ID) — identificador único de WhatsApp `573001234567@s.whatsapp.net`
- `Sender` — quién envía el mensaje (individual o participante de grupo)
- `Chat` — conversación (individual o grupal)

**Rules Engine:**
- `Rule` — condición + acción + ámbito + prioridad
- `Condition` — criterio de evaluación del texto (`contains`, `startsWith`, etc.)
- `Action` — qué hacer cuando la regla aplica (`reply`, `call_ai`, `trigger_workflow`)
- `RuleEvaluation` — resultado de evaluar un mensaje contra las reglas activas
- `Priority` — orden de evaluación cuando múltiples reglas aplican

**Contact Management:**
- `AuthorizedContact` — contacto que puede interactuar con la plataforma
- `BlockedContact` — contacto ignorado explícitamente
- `PhoneNumber` — número internacional normalizado con código de país

---

## 🧠 PARTE 2 — DISEÑO TÁCTICO

### 2.1 Aggregates — Invariantes de Negocio

**Regla de oro**: Un Aggregate es un cluster de objetos que **siempre deben ser consistentes juntos**. La raíz controla el acceso a todos sus miembros.

```typescript
// modules/rules-engine/domain/aggregates/rule.aggregate.ts

// ❌ INCORRECTO — Aggregate sin invariantes, solo datos
class Rule {
  conditionType: string;
  pattern: string;
  isActive: boolean;
  // Sin lógica de negocio — esto es un DTO, no un Aggregate
}

// ✅ CORRECTO — Aggregate con invariantes y comportamiento
export class Rule extends AggregateRoot {
  private constructor(
    private readonly _id: RuleId,
    private readonly _condition: RuleCondition,
    private _action: RuleAction,
    private _scope: RuleScope,
    private _priority: Priority,
    private _isActive: boolean,
    private readonly _authorizedContacts: ReadonlyArray<PhoneNumber>,
    private readonly _createdAt: Date,
  ) {
    super();
    this.validate();
  }

  // Factory method — única forma de crear una Rule válida
  static create(params: CreateRuleParams): Rule {
    const rule = new Rule(
      RuleId.generate(),
      params.condition,
      params.action,
      params.scope,
      Priority.create(params.priority),
      true,
      params.authorizedContacts ?? [],
      new Date(),
    );
    rule.addDomainEvent(new RuleCreatedEvent(rule._id, rule._condition, rule._action));
    return rule;
  }

  // Reconstitución desde persistencia — sin Domain Event
  static reconstitute(params: RuleSnapshot): Rule {
    return new Rule(
      RuleId.from(params.id),
      params.condition,
      params.action,
      params.scope,
      Priority.create(params.priority),
      params.isActive,
      params.authorizedContacts,
      params.createdAt,
    );
  }

  // Comportamiento de negocio — NO setters directos
  activate(): void {
    if (this._isActive) return; // Idempotente
    this._isActive = true;
    this.addDomainEvent(new RuleActivatedEvent(this._id));
  }

  deactivate(): void {
    if (!this._isActive) return;
    this._isActive = false;
    this.addDomainEvent(new RuleDeactivatedEvent(this._id));
  }

  updateAction(newAction: RuleAction): void {
    this._action = newAction;
    this.addDomainEvent(new RuleActionUpdatedEvent(this._id, newAction));
  }

  // Lógica de negocio encapsulada
  matches(message: IncomingMessage): boolean {
    if (!this._isActive) return false;
    if (!this.scopeMatches(message.chat)) return false;
    if (!this.contactIsAuthorized(message.sender)) return false;
    return this._condition.evaluate(message.text ?? '');
  }

  // Getters — solo lectura
  get id(): RuleId { return this._id; }
  get condition(): RuleCondition { return this._condition; }
  get action(): RuleAction { return this._action; }
  get isActive(): boolean { return this._isActive; }
  get priority(): Priority { return this._priority; }

  private validate(): void {
    if (this._priority.value < 0 || this._priority.value > 1000) {
      throw new InvalidRulePriorityError(this._priority.value);
    }
  }

  private scopeMatches(chat: Chat): boolean {
    return (
      this._scope === 'both' ||
      (this._scope === 'individual' && !chat.isGroup) ||
      (this._scope === 'group' && chat.isGroup)
    );
  }

  private contactIsAuthorized(sender: Sender): boolean {
    if (this._authorizedContacts.length === 0) return true; // Sin restricción
    return this._authorizedContacts.some(
      (phone) => phone.equals(sender.phoneNumber),
    );
  }
}
```

---

### 2.2 Value Objects — Inmutables, sin identidad

```typescript
// modules/whatsapp-core/domain/value-objects/jid.vo.ts
export class Jid {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): Jid {
    const normalized = raw.trim().toLowerCase();
    if (!Jid.isValid(normalized)) {
      throw new InvalidJidError(`JID inválido: "${raw}"`);
    }
    return new Jid(normalized);
  }

  static isValid(value: string): boolean {
    return value.endsWith('@s.whatsapp.net') || value.endsWith('@g.us');
  }

  static fromPhoneNumber(phone: PhoneNumber): Jid {
    const digits = phone.internationalFormat.replace('+', '');
    return new Jid(`${digits}@s.whatsapp.net`);
  }

  get value(): string { return this._value; }
  get isGroup(): boolean { return this._value.endsWith('@g.us'); }
  get isIndividual(): boolean { return this._value.endsWith('@s.whatsapp.net'); }
  get phoneDigits(): string {
    return this._value.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }

  equals(other: Jid): boolean {
    return this._value === other._value;
  }

  toString(): string { return this._value; }
}

// modules/rules-engine/domain/value-objects/priority.vo.ts
export class Priority {
  static readonly MIN = 0;
  static readonly MAX = 1000;
  static readonly DEFAULT = Priority.create(0);

  private constructor(private readonly _value: number) {}

  static create(value: number): Priority {
    if (!Number.isInteger(value) || value < Priority.MIN || value > Priority.MAX) {
      throw new InvalidPriorityError(value);
    }
    return new Priority(value);
  }

  get value(): number { return this._value; }
  isHigherThan(other: Priority): boolean { return this._value > other._value; }
  equals(other: Priority): boolean { return this._value === other._value; }
}

// modules/rules-engine/domain/value-objects/rule-condition.vo.ts
// Discriminated union tipado como Value Object
export type RuleCondition =
  | ContainsCondition
  | StartsWithCondition
  | EndsWithCondition
  | RegexCondition
  | ExactMatchCondition;

export class ContainsCondition {
  readonly type = 'contains' as const;
  private constructor(
    readonly substring: string,
    readonly caseSensitive: boolean,
  ) {}

  static create(substring: string, caseSensitive = false): ContainsCondition {
    if (!substring || substring.trim().length === 0) {
      throw new EmptyConditionPatternError();
    }
    return new ContainsCondition(substring.trim(), caseSensitive);
  }

  evaluate(text: string): boolean {
    return this.caseSensitive
      ? text.includes(this.substring)
      : text.toLowerCase().includes(this.substring.toLowerCase());
  }
}

// Implementaciones similares para StartsWithCondition, RegexCondition, etc.
```

---

### 2.3 Domain Events — Comunicación asíncrona

```typescript
// shared/domain/domain-event.base.ts
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventName: string;

  constructor() {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
  }
}

// modules/rules-engine/domain/events/rule-created.event.ts
export class RuleCreatedEvent extends DomainEvent {
  readonly eventName = 'rules-engine.rule.created' as const;

  constructor(
    readonly ruleId: RuleId,
    readonly condition: RuleCondition,
    readonly action: RuleAction,
  ) {
    super();
  }
}

// modules/whatsapp-core/domain/events/message-received.event.ts
export class MessageReceivedEvent extends DomainEvent {
  readonly eventName = 'whatsapp-core.message.received' as const;

  constructor(
    readonly messageId: MessageId,
    readonly senderJid: Jid,
    readonly chatJid: Jid,
    readonly text: string | null,
    readonly hasMedia: boolean,
    readonly receivedAt: Date,
  ) {
    super();
  }
}

// modules/whatsapp-core/domain/events/session-connected.event.ts
export class SessionConnectedEvent extends DomainEvent {
  readonly eventName = 'whatsapp-core.session.connected' as const;

  constructor(
    readonly sessionId: string,
    readonly jid: Jid,
    readonly connectedAt: Date,
  ) {
    super();
  }
}
```

---

### 2.4 Repositories — Output Ports del Domain

```typescript
// modules/rules-engine/domain/repositories/rule.repository.ts
// ← INTERFACE en Domain, IMPLEMENTACIÓN en Infrastructure

export interface RuleRepository {
  findById(id: RuleId): Promise<Rule | null>;
  findAllActive(): Promise<ReadonlyArray<Rule>>;
  findByPriority(scope: RuleScope): Promise<ReadonlyArray<Rule>>;
  save(rule: Rule): Promise<void>;
  delete(id: RuleId): Promise<void>;
}

export const RULE_REPOSITORY = Symbol('RuleRepository');

// modules/contact-management/domain/repositories/blocked-contact.repository.ts
export interface BlockedContactRepository {
  isBlocked(phone: PhoneNumber): Promise<boolean>;
  block(phone: PhoneNumber, reason?: string): Promise<void>;
  unblock(phone: PhoneNumber): Promise<void>;
  findAll(query: PageQuery): Promise<PageResult<BlockedContact>>;
}

export const BLOCKED_CONTACT_REPOSITORY = Symbol('BlockedContactRepository');
```

---

### 2.5 Domain Services — Lógica que no pertenece a ningún Aggregate

```typescript
// modules/rules-engine/domain/services/rule-evaluator.domain-service.ts
// Necesario porque la evaluación requiere MÚLTIPLES Rules — no pertenece a una sola

export class RuleEvaluatorDomainService {
  // Sin inyección de dependencias — Domain Service es puro TypeScript
  evaluate(
    message: IncomingMessage,
    activeRules: ReadonlyArray<Rule>,
  ): RuleEvaluationResult {
    // Ordenar por prioridad descendente
    const sorted = [...activeRules].sort((a, b) =>
      b.priority.value - a.priority.value,
    );

    const matchedRule = sorted.find((rule) => rule.matches(message));

    if (!matchedRule) {
      return { matched: false };
    }

    return {
      matched: true,
      rule: matchedRule,
      action: matchedRule.action,
    };
  }
}

export type RuleEvaluationResult =
  | { matched: false }
  | { matched: true; rule: Rule; action: RuleAction };
```

---

### 2.6 Factories — Creación compleja de Aggregates

```typescript
// modules/whatsapp-core/domain/factories/incoming-message.factory.ts
// Usado cuando la creación de un Aggregate requiere lógica compleja
// que no debería estar en el constructor

export class IncomingMessageFactory {
  static fromBaileysRaw(
    rawMessage: proto.IWebMessageInfo,
  ): IncomingMessage {
    const jid = Jid.create(
      rawMessage.key.participant ?? rawMessage.key.remoteJid ?? '',
    );
    const chatJid = Jid.create(rawMessage.key.remoteJid ?? '');
    const text = IncomingMessageFactory.extractText(rawMessage);
    const hasMedia = IncomingMessageFactory.detectMedia(rawMessage);

    return IncomingMessage.create({
      messageId: MessageId.from(rawMessage.key.id!),
      senderJid: jid,
      chatJid,
      text,
      hasMedia,
      receivedAt: new Date((rawMessage.messageTimestamp as number) * 1000),
    });
  }

  private static extractText(msg: proto.IWebMessageInfo): string | null {
    const m = msg.message;
    if (!m) return null;
    return (
      m.conversation ??
      m.extendedTextMessage?.text ??
      m.imageMessage?.caption ??
      m.videoMessage?.caption ??
      null
    );
  }

  private static detectMedia(msg: proto.IWebMessageInfo): boolean {
    const m = msg.message;
    if (!m) return false;
    return !!(m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage);
  }
}
```

---

### 2.7 Reglas de Dependencia — Verificación con ESLint

```typescript
// .eslintrc.js — reglas de arquitectura enforced en CI
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          // Domain no puede importar de Application ni Infrastructure
          {
            group: ['*/application/*', '*/infrastructure/*'],
            message: 'Domain layer must not import from Application or Infrastructure',
          },
          // Application no puede importar de Infrastructure
          {
            group: ['*/infrastructure/*'],
            message: 'Application layer must not import from Infrastructure',
          },
          // Ninguna capa puede importar directamente de NestJS en el Domain
          {
            group: ['@nestjs/*'],
            message: 'Domain must not depend on NestJS framework',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Excepciones para Infrastructure layer (puede importar todo)
      files: ['**/infrastructure/**/*.ts'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
};
```

---

## ✅ Criterios de Aplicación

- Diseño de cualquier nuevo Bounded Context en la plataforma
- Modelado de reglas, sesiones, mensajes, contactos como Aggregates o VOs
- Implementación de Domain Services cuando la lógica cruza múltiples Aggregates
- Definición de Output Ports (repositories e interfaces de infraestructura)
- Creación de Domain Events para comunicación asíncrona entre módulos

---

## ❌ Anti-patrones DDD

- ❌ **Anemic Domain Model** — Aggregate con solo getters/setters, sin comportamiento ni invariantes
- ❌ **Service que contiene lógica de dominio** — `RuleService.matches()` en Application Layer en lugar del método `rule.matches()` en el Aggregate
- ❌ **Repository que devuelve primitivos** — `findById(id: string): Promise<RuleRow>` en lugar de `Promise<Rule | null>`
- ❌ **Aggregate que depende de otro Aggregate directamente** — usar IDs, no referencias directas
- ❌ **Domain Event con datos de infraestructura** — `RuleCreatedEvent` no debe contener `prismaRow` ni `redisKey`
- ❌ **Factory en Infrastructure** — las Factories son Domain; la Infrastructure solo transforma (Mapper)
- ❌ **Value Object mutable** — un VO modificado debe crear una nueva instancia, nunca mutar el existente
- ❌ **Bounded Context sin lenguaje ubicuo documentado** — si no existe glosario, el dominio no está modelado

---

## 📝 Ejemplos — Mappers (Infrastructure → Domain)

```typescript
// modules/rules-engine/infrastructure/mappers/rule.mapper.ts
// Mapper = traducción entre mundo de persistencia y mundo de dominio

import { Rule as PrismaRule } from '@prisma/client';

export class RuleMapper {
  static toDomain(row: PrismaRule): Rule {
    return Rule.reconstitute({
      id: row.uuid_rule,
      condition: JSON.parse(row.condition_data as string) as RuleCondition,
      action: JSON.parse(row.action_data as string) as RuleAction,
      scope: row.scope as RuleScope,
      priority: row.priority,
      isActive: row.is_active,
      authorizedContacts: [], // cargados por separado con JOIN
      createdAt: row.creation_date,
    });
  }

  static toPersistence(rule: Rule): Omit<PrismaRule, 'pkid_rule'> {
    return {
      uuid_rule: rule.id.value,
      condition_type: rule.condition.type,
      condition_data: JSON.stringify(rule.condition),
      action_type: rule.action.type,
      action_data: JSON.stringify(rule.action),
      scope: rule.scope,
      priority: rule.priority.value,
      is_active: rule.isActive,
      creation_date: rule._createdAt,
      expiration_date: null,
    };
  }
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: DDD STRATEGIC + TACTICAL — NODE.JS EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/ddd-strategic-tactical-nodejs-expert.skill.md

Puntos críticos:
- Modelar Bounded Contexts ANTES de escribir código — WhatsApp Core, Rules Engine, AI, Contact Mgmt
- Aggregates con `create()` (factory) y `reconstitute()` (desde persistencia) — nunca constructor público
- Value Objects inmutables con validación en constructor privado y factory method estático
- Domain Events: solo datos del dominio, nunca primitivos de infraestructura
- Repositories: interfaces en `/domain/`, implementaciones en `/infrastructure/`
- Mappers en Infrastructure: traducen entre `PrismaRow ↔ Domain Aggregate`
- Domain Services: lógica que cruza múltiples Aggregates, sin inyección de dependencias
- Verificar reglas de dependencia con ESLint en CI — Domain no importa Application ni Infrastructure
```

---

## 📊 Métricas de Calidad

| Métrica | Valor esperado |
|---------|----------------|
| Aggregates con constructor público | 0 (siempre `create()` o `reconstitute()`) |
| Setters directos en Aggregates | 0 (solo métodos de comportamiento) |
| Imports de NestJS en `/domain/` | 0 (ESLint enforced) |
| Imports de Prisma/Redis en `/domain/` | 0 (ESLint enforced) |
| Domain Events sin ID propio (`eventId`) | 0 |
| Value Objects mutables | 0 (`Object.freeze` en constructor) |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — DDD Strategic + Tactical para Node.js / TypeScript
