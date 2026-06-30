# 🧹 SKILL: CLEAN CODE + SOLID — NODE.JS / TYPESCRIPT EXPERT

**skill_id**: clean-code-solid-nodejs-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: calidad · typescript · clean-code  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: typescript-strict-expert

---

## 📌 Propósito de la Skill

Producir código TypeScript/Node.js que sea legible, mantenible, correctamente desacoplado y extensible mediante los principios de Clean Code (Robert C. Martin) y SOLID, adaptados al idioma de TypeScript y al contexto de NestJS, Prisma, EventEmitter y Baileys. Las tres dimensiones — Clean Code, SOLID, y naming semántico — son inseparables y se aplican siempre, no solo en refactoring.

---

## 🧠 PARTE 1 — SOLID EN TYPESCRIPT

### S — Single Responsibility Principle

> **Una clase/módulo debe tener una sola razón para cambiar.**

El test: *si cambio la lógica de negocio de Rules Engine, ¿debo tocar el mismo archivo que maneja la persistencia?* Si sí, viola SRP.

```typescript
// ❌ VIOLA SRP — un servicio hace demasiado
@Injectable()
export class RuleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(data: CreateRuleDto): Promise<void> {
    // Validación
    if (!data.pattern || data.pattern.length === 0) throw new Error('Empty pattern');

    // Transformación al modelo de dominio
    const condition = { type: data.conditionType, substring: data.pattern };

    // Persistencia directa
    await this.prisma.rule.create({
      data: {
        condition_type: data.conditionType,
        condition_data: JSON.stringify(condition),
        action_type: data.actionType,
        action_data: JSON.stringify(data.action),
        is_active: true,
      },
    });

    // Notificación
    console.log(`Rule created: ${data.conditionType}:${data.pattern}`);
  }
}

// ✅ CORRECTO — cada clase con una sola responsabilidad
// CreateRuleHandler: orquesta
// Rule (Aggregate): valida y modela el negocio
// RuleMapper: transforma
// PrismaRuleRepository: persiste
// EventEmitter: notifica
@CommandHandler(CreateRuleCommand)
export class CreateRuleHandler implements ICommandHandler<CreateRuleCommand> {
  constructor(
    @Inject(RULE_REPOSITORY) private readonly rules: RuleRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateRuleCommand): Promise<string> {
    const rule = Rule.create({
      condition: ConditionFactory.create(command.conditionType, command.conditionData),
      action: ActionFactory.create(command.actionType, command.actionData),
      scope: command.scope,
      priority: command.priority,
    });

    await this.rules.save(rule);
    rule.domainEvents.forEach((e) => this.eventEmitter.emit(e.eventName, e));
    rule.clearDomainEvents();
    return rule.id.value;
  }
}
```

---

### O — Open/Closed Principle

> **Abierto a extensión, cerrado a modificación.**

Agregar un nuevo tipo de `RuleAction` no debe modificar `OnMessageReceivedHandler`.

```typescript
// ❌ VIOLA OCP — switch/if que crece con cada nuevo tipo
@Injectable()
export class OnMessageReceivedHandler {
  async handle(event: MessageReceivedEvent): Promise<void> {
    const result = await this.evaluateRules.execute({ text: event.text });
    if (!result.matched) return;

    // ❌ Cada nuevo action type → modificar este archivo
    if (result.action.type === 'reply') {
      await this.sendMessage.execute({ jid: event.senderJid, text: result.action.template });
    } else if (result.action.type === 'call_ollama') {
      const response = await this.ollamaClient.generate({ prompt: event.text });
      await this.sendMessage.execute({ jid: event.senderJid, text: response.text });
    } else if (result.action.type === 'forward_n8n') {
      await this.n8nClient.trigger(result.action.workflowId, { text: event.text });
    }
  }
}

// ✅ CORRECTO — Strategy Pattern: cada acción es un handler independiente
export interface ActionExecutor {
  canHandle(action: RuleAction): boolean;
  execute(action: RuleAction, context: MessageContext): Promise<void>;
}

export const ACTION_EXECUTORS = Symbol('ActionExecutors');

@Injectable()
export class ReplyActionExecutor implements ActionExecutor {
  constructor(@Inject(SEND_MESSAGE_USE_CASE) private readonly send: SendMessageUseCase) {}

  canHandle(action: RuleAction): boolean { return action.type === 'reply'; }

  async execute(action: RuleAction, ctx: MessageContext): Promise<void> {
    const a = action as Extract<RuleAction, { type: 'reply' }>;
    await this.send.execute({ recipientJid: ctx.senderJid, text: a.template });
  }
}

@Injectable()
export class OllamaActionExecutor implements ActionExecutor {
  constructor(
    private readonly ollama: OllamaClientPort,
    @Inject(SEND_MESSAGE_USE_CASE) private readonly send: SendMessageUseCase,
  ) {}

  canHandle(action: RuleAction): boolean { return action.type === 'call_ollama'; }

  async execute(action: RuleAction, ctx: MessageContext): Promise<void> {
    const a = action as Extract<RuleAction, { type: 'call_ollama' }>;
    const response = await this.ollama.generate({ model: a.model, prompt: ctx.text ?? '' });
    await this.send.execute({ recipientJid: ctx.senderJid, text: response.text });
  }
}

// Handler principal — nunca se modifica al agregar nuevos executors
@Injectable()
export class OnMessageReceivedHandler {
  constructor(
    private readonly evaluateRules: EvaluateRulesService,
    @Inject(ACTION_EXECUTORS) private readonly executors: ActionExecutor[],
  ) {}

  @OnEvent(MessageReceivedEvent.EVENT_NAME, { async: true })
  async handle(event: MessageReceivedEvent): Promise<void> {
    const result = await this.evaluateRules.execute({ text: event.text });
    if (!result.matched) return;

    const executor = this.executors.find((e) => e.canHandle(result.action));
    if (!executor) return; // Tipo de acción desconocido — ignorar silenciosamente

    const ctx: MessageContext = { senderJid: event.senderJid, text: event.text };
    await executor.execute(result.action, ctx);
  }
}
```

---

### L — Liskov Substitution Principle

> **Los subtipos deben poder sustituir a sus tipos base sin alterar el comportamiento.**

```typescript
// ✅ CORRECTO — todos los ActionExecutors son intercambiables
// El handler no sabe qué executor concreto usa, solo llama a .execute()
// Agregar N8nActionExecutor no rompe nada existente

@Injectable()
export class N8nActionExecutor implements ActionExecutor { // Nueva extensión
  canHandle(action: RuleAction): boolean { return action.type === 'forward_n8n'; }
  async execute(action: RuleAction, ctx: MessageContext): Promise<void> { /* ... */ }
}

// ❌ VIOLA LSP — subclase que lanza donde la base no lo hace
export class StrictRuleRepository extends InMemoryRuleRepository {
  async findById(id: RuleId): Promise<Rule | null> {
    const rule = await super.findById(id);
    if (!rule) throw new RuleNotFoundError(id); // ← base retorna null, esta lanza
    // Código que depende de la base espera null, no excepción — LSP violado
    return rule;
  }
}
```

---

### I — Interface Segregation Principle

> **Ningún cliente debe depender de métodos que no usa.**

```typescript
// ❌ VIOLA ISP — interface "fat"
export interface RuleRepository {
  findById(id: RuleId): Promise<Rule | null>;
  findAllActive(): Promise<Rule[]>;
  save(rule: Rule): Promise<void>;
  delete(id: RuleId): Promise<void>;
  // Estas operaciones solo las usa el admin, no el engine
  exportToCsv(): Promise<Buffer>;
  importFromCsv(buffer: Buffer): Promise<void>;
  generateReport(dateRange: DateRange): Promise<RuleReport>;
}

// ✅ CORRECTO — interfaces segregadas según el consumidor
export interface RuleReadRepository { // Consumido por EvaluateRulesService
  findAllActive(): Promise<Rule[]>;
  findById(id: RuleId): Promise<Rule | null>;
}

export interface RuleWriteRepository { // Consumido por Command Handlers
  save(rule: Rule): Promise<void>;
  delete(id: RuleId): Promise<void>;
}

export interface RuleAdminRepository { // Consumido solo por controllers de admin
  exportToCsv(): Promise<Buffer>;
  importFromCsv(buffer: Buffer): Promise<void>;
}

// La implementación concreta puede implementar todas
export class PrismaRuleRepository
  implements RuleReadRepository, RuleWriteRepository, RuleAdminRepository
{
  // ...
}
```

---

### D — Dependency Inversion Principle

> **Depende de abstracciones, no de concreciones.**

```typescript
// ❌ VIOLA DIP — depende de implementación concreta
@Injectable()
export class EvaluateRulesService {
  constructor(private readonly prisma: PrismaService) {} // ← acoplado a Prisma

  async execute(query: EvaluateRulesQuery): Promise<RuleEvaluationResult> {
    const rules = await this.prisma.rule.findMany({ where: { is_active: true } });
    // ...
  }
}

// ✅ CORRECTO — depende de la abstracción (interfaz del dominio)
@Injectable()
export class EvaluateRulesService {
  constructor(
    @Inject(RULE_READ_REPOSITORY) private readonly rules: RuleReadRepository, // ← abstracción
    private readonly evaluator: RuleEvaluatorDomainService,
    private readonly cache: RulesCacheService,
  ) {}

  async execute(query: EvaluateRulesQuery): Promise<RuleEvaluationResult> {
    // EvaluateRulesService no sabe si las reglas vienen de Prisma, Redis o memoria
    const activeRules = await this.cache.getOrLoad(() => this.rules.findAllActive());
    return this.evaluator.evaluate(query.message, activeRules);
  }
}
```

---

## 🧠 PARTE 2 — CLEAN CODE EN TYPESCRIPT

### Naming — Nombres que revelan intención

```typescript
// ❌ MALO — nombres crípticos o genéricos
const r = await this.rp.getById(id);
const res = await processMsg(m);
function handle(d: unknown): void { /* ... */ }

// ✅ CORRECTO — nombres que revelan el dominio
const rule = await this.ruleRepository.findById(ruleId);
const evaluationResult = await this.evaluateRulesService.execute(messageQuery);
async function onMessageReceived(event: MessageReceivedEvent): Promise<void> { /* ... */ }

// ✅ Nombres de tests — patrón shouldDoXWhenY
it('should reply with template when rule matches', async () => { /* ... */ });
it('should ignore message when sender is in blacklist', async () => { /* ... */ });
it('should throw InvalidJidError when JID format is invalid', async () => { /* ... */ });
```

---

### Functions — Pequeñas, con una sola responsabilidad

```typescript
// Regla: funciones ≤ 20 líneas, máximo 2 niveles de indentación

// ❌ MALO — función larga con múltiples responsabilidades
async function processIncomingMessage(raw: proto.IWebMessageInfo): Promise<void> {
  if (raw.key.fromMe) return;
  if (!raw.message) return;
  if (raw.message.protocolMessage) return;
  const ageMs = Date.now() - (raw.messageTimestamp as number) * 1000;
  if (ageMs > 60_000) return;
  const jid = raw.key.participant ?? raw.key.remoteJid ?? '';
  if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@g.us')) return;
  const phone = jid.replace('@s.whatsapp.net', '');
  const isBlocked = await this.redis.get(`blocked:${phone}`);
  if (isBlocked) return;
  const text = raw.message.conversation ?? raw.message.extendedTextMessage?.text ?? null;
  // ... 30 líneas más
}

// ✅ CORRECTO — funciones pequeñas, composición clara
async function processIncomingMessage(raw: proto.IWebMessageInfo): Promise<void> {
  if (shouldSkipMessage(raw)) return;

  const senderJid = Jid.create(extractSenderJid(raw));
  if (await this.isContactBlocked(senderJid)) return;

  const message = IncomingMessageFactory.fromBaileysRaw(raw);
  this.eventEmitter.emit(MessageReceivedEvent.EVENT_NAME, new MessageReceivedEvent(message));
}

function shouldSkipMessage(raw: proto.IWebMessageInfo): boolean {
  return (
    raw.key.fromMe === true ||
    raw.message == null ||
    raw.message.protocolMessage != null ||
    isMessageTooOld(raw)
  );
}

function isMessageTooOld(raw: proto.IWebMessageInfo): boolean {
  const ageMs = Date.now() - (raw.messageTimestamp as number) * 1000;
  return ageMs > 60_000;
}

function extractSenderJid(raw: proto.IWebMessageInfo): string {
  return raw.key.participant ?? raw.key.remoteJid ?? '';
}
```

---

### Error Handling — Excepciones de dominio tipadas

```typescript
// Jerarquía de errores de dominio — predecibles y tipables
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidJidError extends DomainError {
  constructor(readonly jid: string) {
    super(`JID inválido: "${jid}"`, 'INVALID_JID');
  }
}

export class RuleNotFoundError extends DomainError {
  constructor(readonly ruleId: string) {
    super(`Regla no encontrada: ${ruleId}`, 'RULE_NOT_FOUND');
  }
}

export class InvalidRulePriorityError extends DomainError {
  constructor(readonly value: number) {
    super(`Prioridad inválida: ${value}. Rango válido: 0-1000`, 'INVALID_PRIORITY');
  }
}

// Exception Filter global — traduce errores de dominio a HTTP
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const correlationId = asyncContext.getStore()?.correlationId ?? 'unknown';

    const statusMap: Record<string, number> = {
      RULE_NOT_FOUND: 404,
      INVALID_JID: 422,
      INVALID_PRIORITY: 422,
      BLOCKED_CONTACT: 403,
    };

    const status = statusMap[exception.code] ?? 422;

    // RFC 7807 Problem Detail
    response.status(status).json({
      type: `https://api.whatsapp-ia.local/errors/${exception.code.toLowerCase()}`,
      title: exception.name,
      status,
      detail: exception.message,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

### Comments — Solo el WHY, nunca el WHAT

```typescript
// ❌ MALO — comentario que explica el QUÉ (el código ya lo dice)
// Check if the message is from me
if (raw.key.fromMe) return;

// ❌ MALO — comentario obsoleto / mentiroso
// TODO: validate phone format (written 6 months ago, still not done)

// ✅ CORRECTO — explica el POR QUÉ (no es obvio)
// Baileys duplica eventos messages.upsert en reconexiones;
// el set en Redis con TTL 5min evita procesar el mismo mensaje dos veces.
const alreadyProcessed = await this.redis.setNX(`msg:${messageId}`, '1', 'EX', 300);
if (!alreadyProcessed) return;

// ✅ CORRECTO — workaround con razón documentada
// Baileys no garantiza que rawMessage.messageTimestamp sea un number en todos los tipos;
// el cast es seguro porque solo llegamos aquí cuando message !== null (filtrado arriba).
const ageMs = Date.now() - (rawMessage.messageTimestamp as number) * 1000;
```

---

## ✅ Criterios de Aplicación

- Todo nuevo archivo TypeScript en el proyecto
- Refactoring de código existente con code smells identificados
- Code review de Pull Requests

---

## ❌ Anti-patrones / Code Smells TypeScript

| Code Smell | Síntoma | Solución |
|------------|---------|---------|
| God Class | Servicio con > 200 líneas o > 10 métodos | Extraer en Use Cases o Domain Services separados |
| Feature Envy | Método accede más a datos de otro objeto que a los suyos | Mover el método al objeto cuyos datos usa |
| Primitive Obsession | `string` para JID, teléfono, ID | Branded Types o Value Objects |
| Long Method | Función > 20 líneas | Extraer funciones auxiliares con nombres descriptivos |
| Switch/if en cascada sobre tipos | `if type === 'reply' ... elif type === 'ollama'` | Strategy Pattern con array de handlers |
| Constructor con > 4 parámetros | Constructor ilegible | Builder Pattern o Command/Params object |
| Deep nesting | `if (a) { if (b) { if (c) { ... } } }` | Early return + extracción de funciones |
| Comentarios del WHAT | `// get user from DB` sobre `await this.userRepo.findById` | Eliminar el comentario; el nombre ya es claro |

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: CLEAN CODE + SOLID — NODE.JS / TYPESCRIPT EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/clean-code-solid-nodejs-expert.skill.md

Puntos críticos:
- SRP: un Use Case = una operación; nunca mezclar persistencia + lógica + notificación
- OCP: Strategy Pattern con `ActionExecutor[]` para tipos extensibles sin modificar handlers
- DIP: siempre inyectar interfaces (Symbol tokens), nunca clases concretas de infraestructura
- ISP: separar `RuleReadRepository` de `RuleWriteRepository` según consumidores
- Funciones ≤ 20 líneas, early return para reducir nesting, nombres que revelan dominio
- Errores: jerarquía `DomainError` con `code` tipado, `DomainExceptionFilter` global RFC 7807
- Comentarios: solo el WHY; eliminar comentarios que describan el WHAT
- Prueba de SRP: "¿Esta clase tiene más de una razón para cambiar?" → Si sí, extraer
```

---

## 📊 Métricas de Calidad

| Métrica | Valor esperado |
|---------|----------------|
| Funciones > 20 líneas | 0 (configurar en eslint: `max-lines-per-function`) |
| Clases > 200 líneas | 0 |
| Niveles de indentación > 2 en funciones | 0 |
| Métodos que retornan `null` (sin Optional) | 0 — usar `T | null` + comprobación explícita |
| `catch (e: any)` | 0 — usar `catch (e: unknown)` con narrowing |
| Comentarios redundantes (WHAT) | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Clean Code + SOLID Node.js TypeScript Expert
