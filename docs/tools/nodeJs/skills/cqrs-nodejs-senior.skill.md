# ⚡ SKILL: CQRS — NODE.JS / TYPESCRIPT SENIOR

**skill_id**: cqrs-nodejs-senior  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: architecture · cqrs · backend  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: ddd-strategic-tactical-nodejs-expert, nestjs-hexagonal-ddd-expert

---

## 📌 Propósito de la Skill

Implementar CQRS (Command Query Responsibility Segregation) en Node.js/TypeScript con NestJS, escalando el nivel de complejidad según el dominio: CQRS Liviano (separación de paquetes), CQRS Completo (buses tipados con generics), y CQRS con Outbox Pattern para publicación confiable de Domain Events. Cubre decisión justificada de nivel, implementación paso a paso y anti-patrones frecuentes.

---

## 🧠 PARTE 1 — DECIDIR EL NIVEL DE CQRS

Antes de implementar, documentar en un ADR cuál nivel aplica:

| Nivel | Cuándo | Implementación |
|-------|--------|----------------|
| **CQRS Liviano** | < 5 use cases, sin consumidores de eventos, CRUD simple | Separación de paquetes `commands/` y `queries/`, mismo repositorio |
| **CQRS Completo** | Múltiples módulos consumidores de eventos, lecturas optimizadas independientes | Command Bus + Query Bus tipados, Read Models, EventBus |
| **CQRS + Event Sourcing** | Auditoría total, reconstrucción de estado, máx. 2 BCs por sistema | Append-only event log, Projectors, Snapshotting |

> ⚠️ **Para la plataforma WhatsApp IA**: CQRS Completo es el nivel correcto — múltiples módulos (Rules Engine, Ollama, n8n) reaccionan a los mismos eventos de mensajes.

---

## 🧠 PARTE 2 — CQRS LIVIANO

```
src/modules/rules-engine/
├── application/
│   ├── commands/
│   │   ├── create-rule/
│   │   │   ├── create-rule.command.ts     ← Command DTO
│   │   │   └── create-rule.handler.ts     ← Handler (Use Case de escritura)
│   │   └── deactivate-rule/
│   │       ├── deactivate-rule.command.ts
│   │       └── deactivate-rule.handler.ts
│   └── queries/
│       ├── find-rule-by-id/
│       │   ├── find-rule-by-id.query.ts   ← Query DTO
│       │   ├── find-rule-by-id.handler.ts ← Handler (Use Case de lectura)
│       │   └── rule.read-model.ts         ← DTO de lectura (no el Aggregate)
│       └── list-active-rules/
│           ├── list-active-rules.query.ts
│           ├── list-active-rules.handler.ts
│           └── rule-summary.read-model.ts
```

```typescript
// application/commands/create-rule/create-rule.command.ts
export class CreateRuleCommand {
  constructor(
    readonly conditionType: string,
    readonly conditionData: Record<string, unknown>,
    readonly actionType: string,
    readonly actionData: Record<string, unknown>,
    readonly scope: 'individual' | 'group' | 'both',
    readonly priority: number,
    readonly authorizedPhones: string[],
  ) {}
}

// application/commands/create-rule/create-rule.handler.ts
@Injectable()
export class CreateRuleHandler {
  constructor(
    @Inject(RULE_REPOSITORY) private readonly rules: RuleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateRuleCommand): Promise<string> {
    const condition = ConditionFactory.create(
      command.conditionType,
      command.conditionData,
    );
    const action = ActionFactory.create(command.actionType, command.actionData);
    const phones = command.authorizedPhones.map(PhoneNumber.create);

    const rule = Rule.create({
      condition,
      action,
      scope: command.scope,
      priority: command.priority,
      authorizedContacts: phones,
    });

    await this.rules.save(rule);

    // Publicar Domain Events acumulados en el Aggregate
    for (const event of rule.domainEvents) {
      this.eventEmitter.emit(event.eventName, event);
    }
    rule.clearDomainEvents();

    return rule.id.value;
  }
}

// application/queries/find-rule-by-id/rule.read-model.ts
// Read Model — optimizado para lectura, independiente del Aggregate de escritura
export interface RuleReadModel {
  id: string;
  conditionType: string;
  conditionSummary: string;
  actionType: string;
  actionSummary: string;
  scope: string;
  priority: number;
  isActive: boolean;
  createdAt: string; // ISO string — más liviano que Date para JSON
  matchCount?: number; // dato de lectura que el Aggregate no necesita rastrear
}

// application/queries/find-rule-by-id/find-rule-by-id.handler.ts
@Injectable()
export class FindRuleByIdHandler {
  constructor(
    // La query puede ir directo a un repositorio de lectura optimizado
    @Inject(RULE_READ_REPOSITORY) private readonly readRepo: RuleReadRepository,
  ) {}

  async execute(query: FindRuleByIdQuery): Promise<RuleReadModel | null> {
    return this.readRepo.findById(query.ruleId);
  }
}
```

---

## 🧠 PARTE 3 — CQRS COMPLETO CON BUSES TIPADOS

### 3.1 Command Bus tipado con generics

```typescript
// shared/application/command-bus/command-bus.interface.ts
export interface Command {}
export interface CommandHandler<TCommand extends Command, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

export interface CommandBus {
  dispatch<TCommand extends Command, TResult>(
    command: TCommand,
  ): Promise<TResult>;
}

export const COMMAND_BUS = Symbol('CommandBus');

// shared/infrastructure/command-bus/nestjs-command-bus.adapter.ts
@Injectable()
export class NestjsCommandBus implements CommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command, unknown>>();

  register<TCommand extends Command, TResult>(
    commandClass: new (...args: unknown[]) => TCommand,
    handler: CommandHandler<TCommand, TResult>,
  ): void {
    this.handlers.set(commandClass.name, handler as CommandHandler<Command, unknown>);
  }

  async dispatch<TCommand extends Command, TResult>(
    command: TCommand,
  ): Promise<TResult> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      throw new NoHandlerForCommandError(command.constructor.name);
    }
    return handler.execute(command) as Promise<TResult>;
  }
}

// Alternativa con @nestjs/cqrs (librería oficial)
// npm install @nestjs/cqrs
import { CommandBus as NestCommandBus } from '@nestjs/cqrs';

// Con @nestjs/cqrs el wiring es automático via ICommandHandler + @CommandHandler decorator
@CommandHandler(CreateRuleCommand)
@Injectable()
export class CreateRuleCommandHandler
  implements ICommandHandler<CreateRuleCommand, string>
{
  constructor(
    @Inject(RULE_REPOSITORY) private readonly rules: RuleRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateRuleCommand): Promise<string> {
    const rule = Rule.create({ /* ... */ });
    await this.rules.save(rule);

    // @nestjs/cqrs publica los eventos del Aggregate automáticamente
    // si el Aggregate implementa AggregateRoot de @nestjs/cqrs
    rule.domainEvents.forEach((event) => this.eventBus.publish(event));

    return rule.id.value;
  }
}
```

---

### 3.2 Query Bus con Read Models optimizados

```typescript
// El Read Model puede consultar directamente a Prisma (no al Aggregate)
// porque lectura y escritura tienen modelos de datos independientes

// modules/rules-engine/infrastructure/read-models/rule.read-repository.ts
@Injectable()
export class PrismaRuleReadRepository implements RuleReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RuleReadModel | null> {
    const row = await this.prisma.rule.findUnique({
      where: { uuid_rule: id, expiration_date: null },
      include: { authorized_phones: true },
    });

    if (!row) return null;

    return {
      id: row.uuid_rule,
      conditionType: row.condition_type,
      conditionSummary: this.summarizeCondition(row.condition_data as object),
      actionType: row.action_type,
      actionSummary: this.summarizeAction(row.action_data as object),
      scope: row.scope,
      priority: row.priority,
      isActive: row.is_active,
      createdAt: row.creation_date.toISOString(),
    };
  }

  async findAllActive(
    scope?: RuleScope,
    page = 0,
    size = 50,
  ): Promise<PageResult<RuleReadModel>> {
    const where = {
      is_active: true,
      expiration_date: null,
      ...(scope && scope !== 'both' ? { scope } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.rule.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { creation_date: 'asc' }],
        skip: page * size,
        take: size,
      }),
      this.prisma.rule.count({ where }),
    ]);

    return createPageResult(rows.map(this.toReadModel), total, { page, size });
  }

  private summarizeCondition(data: object): string {
    const d = data as Record<string, string>;
    return `${d['type']}: "${d['substring'] ?? d['prefix'] ?? d['pattern'] ?? ''}"`;
  }

  private summarizeAction(data: object): string {
    const d = data as Record<string, string>;
    return `${d['type']}${d['model'] ? ` (${d['model']})` : ''}`;
  }

  private toReadModel = (row: PrismaRuleRow): RuleReadModel => ({
    id: row.uuid_rule,
    conditionType: row.condition_type,
    conditionSummary: this.summarizeCondition(row.condition_data as object),
    actionType: row.action_type,
    actionSummary: this.summarizeAction(row.action_data as object),
    scope: row.scope,
    priority: row.priority,
    isActive: row.is_active,
    createdAt: row.creation_date.toISOString(),
  });
}
```

---

### 3.3 Outbox Pattern — Publicación confiable de Domain Events

El problema: si se guarda el Aggregate en DB y luego falla la publicación del evento al EventBus, el estado es inconsistente.

```typescript
// Solución: Outbox Pattern
// 1. Guardar Aggregate + eventos en la MISMA transacción DB (outbox table)
// 2. Un proceso separado lee el outbox y publica los eventos

// prisma/schema.prisma
model OutboxEvent {
  pkid_outbox     BigInt    @id @default(autoincrement())
  uuid_outbox     String    @unique @default(uuid())
  event_name      String
  event_payload   Json
  aggregate_id    String
  aggregate_type  String
  published_at    DateTime?
  creation_date   DateTime  @default(now())
  expiration_date DateTime?

  @@index([published_at])
  @@map("outbox_event")
  @@schema("shared_schema")
}

// shared/infrastructure/outbox/outbox.service.ts
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  // Llamado dentro de la transacción de escritura del Aggregate
  async saveEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.outboxEvent.createMany({
      data: events.map((event) => ({
        event_name: event.eventName,
        event_payload: JSON.parse(JSON.stringify(event)),
        aggregate_id: aggregateId,
        aggregate_type: aggregateType,
      })),
    });
  }
}

// shared/infrastructure/outbox/outbox-publisher.service.ts
@Injectable()
export class OutboxPublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Ejecutado cada 1 segundo por un @Cron o setInterval
  async publishPending(): Promise<void> {
    const pending = await this.prisma.outboxEvent.findMany({
      where: { published_at: null, expiration_date: null },
      orderBy: { creation_date: 'asc' },
      take: 100,
    });

    for (const outboxEvent of pending) {
      try {
        const payload = outboxEvent.event_payload as Record<string, unknown>;
        this.eventEmitter.emit(outboxEvent.event_name, payload);

        await this.prisma.outboxEvent.update({
          where: { pkid_outbox: outboxEvent.pkid_outbox },
          data: { published_at: new Date() },
        });
      } catch (error) {
        console.error(`Failed to publish outbox event ${outboxEvent.uuid_outbox}:`, error);
        // No marcar como publicado — se reintentará en el siguiente ciclo
      }
    }
  }
}

// Uso en el Command Handler con transacción atómica
@CommandHandler(CreateRuleCommand)
export class CreateRuleCommandHandler implements ICommandHandler<CreateRuleCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async execute(command: CreateRuleCommand): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const rule = Rule.create({ /* ... */ });

      // Guardar Aggregate
      await tx.rule.create({ data: RuleMapper.toPersistence(rule) });

      // Guardar Domain Events en Outbox — MISMA transacción
      await this.outbox.saveEvents(
        rule.id.value,
        'Rule',
        [...rule.domainEvents],
        tx,
      );

      rule.clearDomainEvents();
      return rule.id.value;
    });
  }
}
```

---

## ✅ Criterios de Aplicación

- Todo Use Case de escritura (crea, actualiza, elimina) → `Command` + `CommandHandler`
- Todo Use Case de lectura → `Query` + `QueryHandler` + `ReadModel`
- Módulos con múltiples consumidores de eventos → CQRS Completo con EventBus
- Operaciones que deben ser atómicas y publicar eventos confiablemente → Outbox Pattern
- Lecturas con proyecciones complejas (JOIN, agregaciones) → `ReadRepository` con Prisma directo

---

## ❌ Anti-patrones

- ❌ **Command con datos calculados** — `CreateRuleCommand` con `ruleId` generado por el cliente; el ID lo genera el Aggregate
- ❌ **Query que retorna el Aggregate** — `FindRuleByIdHandler` retornando `Rule`; debe retornar `RuleReadModel`
- ❌ **Handler que llama a otro Handler directamente** — usar EventBus; los handlers no se conocen entre sí
- ❌ **Publicar eventos FUERA de la transacción** — usar Outbox Pattern para garantizar consistencia
- ❌ **Read Model que replica exactamente el Aggregate** — si son idénticos, sobra el Read Model; optimizar el Read Model para la vista específica
- ❌ **CQRS sin justificación** — si el dominio tiene 2 operaciones CRUD, CQRS Liviano (separación de paquetes) es suficiente

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: CQRS — NODE.JS / TYPESCRIPT SENIOR
→ ver: whatsaapIA/docs/tools/nodeJs/skills/cqrs-nodejs-senior.skill.md

Puntos críticos:
- Nivel de CQRS justificado en ADR antes de implementar
- Commands en `commands/`, Queries en `queries/` — nunca mezclados
- Read Models independientes del Aggregate — optimizados para la vista
- Outbox Pattern para Domain Events cuando la consistencia es crítica
- `@nestjs/cqrs` como bus automático, o implementación manual con Symbol tokens
- QueryHandlers pueden ir directo a Prisma — no deben pasar por el Domain
- CommandHandlers guardan Aggregate y eventos en la MISMA transacción
```

---

## 📊 Métricas de Calidad

| Métrica | Valor esperado |
|---------|----------------|
| Commands que retornan datos de lectura | 0 (solo IDs de recursos creados) |
| Queries que modifican estado | 0 |
| Domain Events publicados fuera de transacción | 0 (Outbox Pattern enforced) |
| Handlers que llaman directamente a otros handlers | 0 (comunicación via EventBus) |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — CQRS Node.js TypeScript Senior
