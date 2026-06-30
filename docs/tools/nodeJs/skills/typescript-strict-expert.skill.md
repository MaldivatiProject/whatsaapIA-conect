# 🎯 SKILL: TYPESCRIPT STRICT EXPERT

**skill_id**: typescript-strict-expert  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: backend · typescript · type-safety · tooling  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: ninguna

---

## 📌 Propósito de la Skill

Dominar TypeScript en modo estricto para escribir código con type-safety máxima, eliminando categorías enteras de bugs en tiempo de compilación. Cubre configuración del compilador, Branded Types, Discriminated Unions, Template Literal Types, Conditional Types y patrones de TypeScript avanzados aplicados al contexto de WhatsApp automation con NestJS.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

- **`strict: true` es el mínimo, no el máximo** — agregar `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` y `noImplicitOverride` para type-safety real.
- **`any` es un code smell** — si estás usando `any`, hay una forma mejor con generics, `unknown` + narrowing, o assertion functions.
- **Branded Types para primitivos con semántica** — `string` y `number` son demasiado genéricos; `PhoneNumber`, `JID` y `MessageId` son tipos distintos aunque sean strings por dentro.
- **Discriminated Unions para modelar estados** — el estado de la conexión de Baileys tiene 4 formas; un objeto con `status?: string` nunca es correcto.
- **`unknown` sobre `any` en boundaries externos** — datos de Baileys, Redis, HTTP ingresan como `unknown` y se validan con type guards o Zod antes de usarlos.

---

### Técnicas y Patrones

#### 1. Configuración tsconfig.json recomendada

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true,

    // Strict mode completo
    "strict": true,
    "noUncheckedIndexedAccess": true,         // arr[0] → T | undefined
    "exactOptionalPropertyTypes": true,        // {a?: string} ≠ {a: string | undefined}
    "noImplicitOverride": true,               // override keyword obligatorio
    "noPropertyAccessFromIndexSignature": true, // obj['key'] en lugar de obj.key en dicts

    // Calidad extra
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,

    // Paths aliases
    "paths": {
      "@domain/*": ["src/modules/*/domain/*"],
      "@application/*": ["src/modules/*/application/*"],
      "@infrastructure/*": ["src/modules/*/infrastructure/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

---

#### 2. Branded Types — primitivos con semántica fuerte

```typescript
// Técnica: símbolo único como "marca" invisible en runtime
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// Tipos concretos del dominio WhatsApp
export type JID = Brand<string, 'JID'>;
export type MessageId = Brand<string, 'MessageId'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type SessionId = Brand<string, 'SessionId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;

// Smart constructors que validan y "castean" al tipo branded
export const JID = {
  from(raw: string): JID {
    if (!raw.endsWith('@s.whatsapp.net') && !raw.endsWith('@g.us')) {
      throw new InvalidJidError(raw);
    }
    return raw as JID;
  },
  fromPhone(phone: PhoneNumber): JID {
    return `${phone.replace('+', '')}@s.whatsapp.net` as JID;
  },
};

export const PhoneNumber = {
  from(raw: string): PhoneNumber {
    if (!/^\+\d{7,15}$/.test(raw)) throw new InvalidPhoneNumberError(raw);
    return raw as PhoneNumber;
  },
};

export const MessageId = {
  generate(): MessageId {
    return crypto.randomUUID() as MessageId;
  },
  from(raw: string): MessageId {
    if (!raw || raw.length < 10) throw new InvalidMessageIdError(raw);
    return raw as MessageId;
  },
};

// Uso: el compilador impide mezclar tipos branded
function sendMessage(to: JID, text: string): void { /* ... */ }

const phone = PhoneNumber.from('+573001234567');
const jid = JID.fromPhone(phone);

sendMessage(jid, 'hola');         // ✅
sendMessage(phone, 'hola');       // ❌ Type error en compilación
sendMessage('raw-string', 'hola'); // ❌ Type error en compilación
```

---

#### 3. Discriminated Unions para estados de Baileys

```typescript
// Modelo exacto del estado de conexión — sin null checks dispersos
export type ConnectionState =
  | { readonly status: 'connecting' }
  | { readonly status: 'qr_pending'; readonly qrCode: string }
  | { readonly status: 'open'; readonly jid: JID; readonly connectedAt: Date }
  | { readonly status: 'closed'; readonly reason: DisconnectReason; readonly closedAt: Date };

export type DisconnectReason =
  | 'logged_out'
  | 'timed_out'
  | 'restart_required'
  | 'connection_replaced'
  | 'max_retries_exceeded';

// Pattern matching exhaustivo — el compilador detecta casos no manejados
function handleConnectionChange(state: ConnectionState): string {
  switch (state.status) {
    case 'connecting':
      return 'Conectando...';
    case 'qr_pending':
      return `Escanea el QR: ${state.qrCode}`; // state.qrCode tipado correctamente
    case 'open':
      return `Conectado como ${state.jid} desde ${state.connectedAt.toISOString()}`;
    case 'closed':
      return `Desconectado: ${state.reason}`;
    // Si se agrega un nuevo caso a ConnectionState y no se maneja aquí:
    // TypeScript marca error "Not all code paths return a value"
  }
}

// Modelo de resultado de operación — nunca lanzar excepciones desde Use Cases
export type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export const Result = {
  ok<T>(data: T): Result<T> {
    return { success: true, data };
  },
  fail<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  },
};

// Uso en Use Cases
async function sendMessage(command: SendMessageCommand): Promise<Result<MessageId>> {
  if (command.text.length > 4096) {
    return Result.fail(new MessageTooLongError(command.text.length));
  }

  const msgId = await messageSender.send(command.recipientJid, command.text);
  return Result.ok(MessageId.from(msgId));
}

// Consumo en Controller — sin try/catch
const result = await sendMessage(command);
if (!result.success) {
  // result.error está tipado aquí
  return { statusCode: 422, error: result.error.message };
}
// result.data = MessageId (tipado correctamente)
return { messageId: result.data };
```

---

#### 4. Template Literal Types para patterns de JID

```typescript
// Patrones de JID de WhatsApp tipados en el sistema de tipos
type IndividualJid = `${string}@s.whatsapp.net`;
type GroupJid = `${string}@g.us`;
type BroadcastJid = `${string}@broadcast`;
type AnyJid = IndividualJid | GroupJid | BroadcastJid;

// Event names tipados — evita typos en EventEmitter
type BaileysEventNames =
  | 'whatsapp.message.received'
  | 'whatsapp.session.connected'
  | 'whatsapp.session.disconnected'
  | 'rules.engine.match'
  | 'n8n.webhook.triggered';

// Record tipado para configuración de reglas
type RuleCondition = 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'equals';
type RuleAction = 'reply' | 'forward_n8n' | 'call_ollama' | 'ignore';

interface Rule {
  readonly id: string;
  readonly condition: RuleCondition;
  readonly pattern: string;
  readonly action: RuleAction;
  readonly responseTemplate?: string;
}
```

---

#### 5. Validación de datos externos con Zod

```typescript
import { z } from 'zod';

// Schema para configuración de reglas desde la base de datos / API
const RuleSchema = z.object({
  id: z.string().uuid(),
  condition: z.enum(['contains', 'startsWith', 'endsWith', 'regex', 'equals']),
  pattern: z.string().min(1).max(500),
  action: z.enum(['reply', 'forward_n8n', 'call_ollama', 'ignore']),
  responseTemplate: z.string().max(4096).optional(),
  authorizedPhones: z.array(z.string().regex(/^\+\d{7,15}$/)).default([]),
  isActive: z.boolean().default(true),
});

type ValidatedRule = z.infer<typeof RuleSchema>;

// Schema para env variables — elimina los undefined no verificados
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().default(3000),
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  BAILEYS_SESSION_ID: z.string().min(1).default('default'),
  MAX_MESSAGES_PER_MINUTE: z.coerce.number().int().positive().default(20),
});

// Validar en bootstrap — falla rápido si falta configuración
export function validateEnv(): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new Error(`Invalid environment variables:\n${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}
```

---

#### 6. Type Guards y Assertion Functions

```typescript
// Type guard para mensajes de Baileys
function isTextMessage(
  message: proto.IWebMessageInfo,
): message is proto.IWebMessageInfo & {
  message: { conversation: string } | { extendedTextMessage: { text: string } };
} {
  const msg = message.message;
  return (
    msg != null &&
    (typeof msg.conversation === 'string' ||
      typeof msg.extendedTextMessage?.text === 'string')
  );
}

// Assertion function — lanza si no cumple la condición
function assertNonNull<T>(
  value: T | null | undefined,
  errorMessage: string,
): asserts value is T {
  if (value == null) {
    throw new AssertionError(errorMessage);
  }
}

// Narrowing con instanceof
function handleError(error: unknown): string {
  if (error instanceof InvalidJidError) {
    return `JID inválido: ${error.jid}`;
  }
  if (error instanceof RateLimitExceededError) {
    return `Rate limit alcanzado para: ${error.jid}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return 'Error desconocido';
}
```

---

#### 7. Generics útiles para repositorios y Use Cases

```typescript
// Repository generic tipado
interface Repository<TEntity, TId> {
  findById(id: TId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
  delete(id: TId): Promise<void>;
}

// Paginación genérica
interface PageQuery {
  readonly page: number;
  readonly size: number;
}

interface PageResult<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
}

function createPageResult<T>(
  items: T[],
  total: number,
  query: PageQuery,
): PageResult<T> {
  const totalPages = Math.ceil(total / query.size);
  return {
    items,
    total,
    page: query.page,
    totalPages,
    hasNext: query.page < totalPages - 1,
  };
}

// Use Case generic con Result
interface UseCase<TCommand, TResult> {
  execute(command: TCommand): Promise<Result<TResult>>;
}
```

---

### Estándares de Referencia

- **TypeScript Handbook** — typescriptlang.org/docs/handbook
- **Effective TypeScript** — Dan Vanderkam (52 specific ways to improve your TypeScript)
- **Zod documentation** — zod.dev (runtime validation)
- **ts-reset** — totaltypescript.com/ts-reset (mejoras de tipos de librerías standard)

---

## ✅ Criterios de Aplicación

- Todo archivo TypeScript en el proyecto (src/)
- Definición de tipos para datos de Baileys, n8n, Ollama y Redis
- Modelado de estados de conexión, resultados de operaciones y errores de dominio
- Validación de variables de entorno y configuración externa
- Contratos entre capas de la arquitectura (ports/adapters)

---

## ❌ Anti-patrones

- ❌ **`as any`** — usar `unknown` + type guard; si Baileys no tiene tipos correctos, declarar tipos manualmente
- ❌ **`// @ts-ignore`** — nunca suprimir errores; resolverlos o usar `// @ts-expect-error` con comentario de por qué
- ❌ **`interface` para Value Objects** — usar `class` o `type` con constructor privado para garantizar invariantes
- ❌ **`string` como tipo para JIDs, teléfonos o IDs** — usar Branded Types
- ❌ **`optional chaining` en cascada profunda** — `a?.b?.c?.d?.e` indica modelo de datos incorrecto; usar discriminated unions
- ❌ **`enum` de TypeScript** — usar `const` objects con `as const` o `z.enum()` de Zod; los enum de TS generan JS extra y tienen comportamientos sorpresivos
- ❌ **Tipos `any` en catch blocks** — `catch (e)` recibe `unknown` en TS 4+; usar `handleError(e: unknown)` con narrowing

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Modelado de reglas con discriminated unions

```typescript
// Tipos de condición con datos específicos por variante
type MessageCondition =
  | { readonly type: 'contains'; readonly substring: string; readonly caseSensitive: boolean }
  | { readonly type: 'startsWith'; readonly prefix: string }
  | { readonly type: 'endsWith'; readonly suffix: string }
  | { readonly type: 'regex'; readonly pattern: string; readonly flags: string }
  | { readonly type: 'equals'; readonly value: string };

function evaluateCondition(condition: MessageCondition, text: string): boolean {
  switch (condition.type) {
    case 'contains':
      return condition.caseSensitive
        ? text.includes(condition.substring)
        : text.toLowerCase().includes(condition.substring.toLowerCase());
    case 'startsWith':
      return text.startsWith(condition.prefix);
    case 'endsWith':
      return text.endsWith(condition.suffix);
    case 'regex':
      return new RegExp(condition.pattern, condition.flags).test(text);
    case 'equals':
      return text === condition.value;
  }
}
```

### Ejemplo 2: Configuración tipada con satisfies

```typescript
// `satisfies` verifica el tipo pero no lo widens — TypeScript 4.9+
const DISCONNECT_REASONS = {
  loggedOut: 401,
  restartRequired: 515,
  timedOut: 408,
  connectionReplaced: 440,
} satisfies Record<string, number>;

// DISCONNECT_REASONS.loggedOut es 401 (literal), no number
type ReasonCode = typeof DISCONNECT_REASONS[keyof typeof DISCONNECT_REASONS];
// ReasonCode = 401 | 515 | 408 | 440
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: TYPESCRIPT STRICT EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/typescript-strict-expert.skill.md

Puntos críticos:
- `tsconfig.json` con `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- Branded Types para JID, PhoneNumber, MessageId, SessionId — NUNCA `string` puro
- Discriminated Unions para ConnectionState, Result<T,E>, MessageCondition
- `unknown` + type guards en boundaries externos (Baileys, Redis, env vars)
- Zod para validación de env variables en bootstrap y datos externos de APIs
- NUNCA `any`, NUNCA `@ts-ignore`
- `const` objects + `as const` en lugar de `enum`
- `Result<T,E>` pattern en Use Cases — sin try/catch en capas de Application
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Ocurrencias de `any` en código fuente | 0 (tslint rule: `no-explicit-any`) |
| Ocurrencias de `@ts-ignore` | 0 |
| Errores de TypeScript en CI | 0 (bloquea merge) |
| Cobertura de tipos en boundaries externos | 100% con Zod |
| Uso de `enum` de TypeScript | 0 (usar `as const`) |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — TypeScript Strict Expert para backend Node.js con NestJS
