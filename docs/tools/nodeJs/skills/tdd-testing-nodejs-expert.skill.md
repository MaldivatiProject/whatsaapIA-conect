# 🧪 SKILL: TDD + TESTING PYRAMID — NODE.JS / TYPESCRIPT EXPERT

**skill_id**: tdd-testing-nodejs-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: testing · tdd · quality  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: clean-code-solid-nodejs-expert, typescript-strict-expert

---

## 📌 Propósito de la Skill

Dominar Test-Driven Development y la pirámide de testing en Node.js/TypeScript con Jest, Supertest y Testcontainers. Cubre el ciclo Red-Green-Refactor, naming semántico de tests, InMemory Adapters como estrategia principal de dobles de prueba, y la distribución correcta de la pirámide (70% Unit, 20% Integration, 10% E2E) aplicada al contexto de plataformas de mensajería con NestJS y Baileys.

---

## 🧠 PARTE 1 — TDD: Red-Green-Refactor

### Principio: "No production code without a failing test first"

```
1. 🔴 RED — Escribe el test que falla (define el comportamiento esperado)
   → El test debe COMPILAR pero FALLAR
   → Si no sabes cómo implementarlo, el test te lo mostrará

2. 🟢 GREEN — Escribe el código mínimo para que pase el test
   → La forma más rápida de llegar a verde (no la más elegante)
   → Hardcodear el resultado está permitido si hace pasar el test

3. 🔵 REFACTOR — Mejora el código sin cambiar el comportamiento
   → Clean Code, SOLID, eliminar duplicación
   → El test protege el comportamiento durante el refactor

4. 🔁 REPEAT — Siguiente comportamiento
```

**Ciclo Outside-In TDD (London School) para NestJS:**

```
1. E2E Test (Supertest) → falla porque no existe el endpoint
2. Controller test → falla porque no existe el handler
3. Use Case test → falla porque no existe la lógica de dominio
4. Domain test → falla porque no existe el Aggregate/VO
5. Implementar Domain → Domain test pasa
6. Implementar Use Case → Use Case test pasa
7. Ensamblar módulo → Controller test pasa
8. Verificar E2E → E2E pasa
```

---

## 🧠 PARTE 2 — PIRÁMIDE DE TESTING

```
              ▲
             /│\
            / │ \
           / E2E \          10% — Supertest con app real + DB Testcontainers
          /───────\
         /         \
        / Integration\      20% — Repository + DB, HTTP clients con nock/MSW
       /─────────────\
      /               \
     /   Unit Tests    \    70% — Domain, Use Cases, con InMemory Adapters
    /───────────────────\
```

### Targets de cobertura:
- **Domain Layer:** > 95% (lógica de negocio — el corazón del sistema)
- **Application Layer:** > 90% (Use Cases, Event Handlers)
- **Infrastructure Layer:** > 75% (Repositories, HTTP Clients)
- **Global:** > 85%

---

## 🧠 PARTE 3 — UNIT TESTS CON INMEMORY ADAPTERS

### InMemory Adapter — El doble de prueba correcto

```typescript
// ❌ MALO — mock de Jest para repositorios
const mockRuleRepo = {
  findAllActive: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
};
// Problema: no verifica que save() realmente guardó algo consultable después
// No detecta bugs donde save() y findAllActive() están desincronizados

// ✅ CORRECTO — InMemory Adapter (implementa la interfaz real)
export class InMemoryRuleRepository implements RuleReadRepository, RuleWriteRepository {
  private readonly store = new Map<string, Rule>();

  async findById(id: RuleId): Promise<Rule | null> {
    return this.store.get(id.value) ?? null;
  }

  async findAllActive(): Promise<Rule[]> {
    return [...this.store.values()].filter((r) => r.isActive);
  }

  async save(rule: Rule): Promise<void> {
    this.store.set(rule.id.value, rule);
  }

  async delete(id: RuleId): Promise<void> {
    this.store.delete(id.value);
  }

  // Helpers para tests
  count(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getAll(): Rule[] { return [...this.store.values()]; }
  seed(rules: Rule[]): void { rules.forEach((r) => this.store.set(r.id.value, r)); }
}

// InMemory para mensajes enviados de Baileys
export class InMemoryMessageSender implements MessageSenderPort {
  private readonly sent: Array<{ jid: string; text: string; quotedMsgId?: string }> = [];

  async sendText(jid: JID, text: string): Promise<MessageId> {
    this.sent.push({ jid: jid.toString(), text });
    return MessageId.generate();
  }

  async sendReply(jid: JID, text: string, quotedMsgId: MessageId): Promise<MessageId> {
    this.sent.push({ jid: jid.toString(), text, quotedMsgId: quotedMsgId.value });
    return MessageId.generate();
  }

  async sendImage(_jid: JID, _buffer: Buffer, _caption?: string): Promise<MessageId> {
    return MessageId.generate();
  }

  async sendTypingIndicator(_jid: JID): Promise<void> {}

  // Helpers para assertions
  getSentMessages(): ReadonlyArray<{ jid: string; text: string }> { return [...this.sent]; }
  getLastMessage(): { jid: string; text: string } | undefined { return this.sent.at(-1); }
  wasMessageSentTo(jid: string): boolean { return this.sent.some((m) => m.jid === jid); }
  clear(): void { this.sent.length = 0; }
}
```

---

## 🧠 PARTE 4 — TESTS POR CAPA

### Domain Tests — Sin dobles, sin async (casi siempre)

```typescript
// modules/rules-engine/domain/aggregates/rule.spec.ts
describe('Rule Aggregate', () => {
  describe('create()', () => {
    it('should create a rule with PENDING state and RuleCreatedEvent', () => {
      // Arrange
      const params = RuleMother.validCreateParams();

      // Act
      const rule = Rule.create(params);

      // Assert
      expect(rule.isActive).toBe(true);
      expect(rule.priority.value).toBe(params.priority);
      expect(rule.domainEvents).toHaveLength(1);
      expect(rule.domainEvents[0]).toBeInstanceOf(RuleCreatedEvent);
    });

    it('should throw InvalidPriorityError when priority is negative', () => {
      expect(() =>
        Rule.create(RuleMother.validCreateParams({ priority: -1 })),
      ).toThrow(InvalidRulePriorityError);
    });

    it('should throw InvalidPriorityError when priority exceeds 1000', () => {
      expect(() =>
        Rule.create(RuleMother.validCreateParams({ priority: 1001 })),
      ).toThrow(InvalidRulePriorityError);
    });
  });

  describe('matches()', () => {
    it('should return true when condition matches and sender is authorized', () => {
      // Arrange
      const rule = RuleMother.withContainsCondition('precio');
      const message = IncomingMessageMother.fromPhone('+573001234567', 'precio del producto');

      // Act & Assert
      expect(rule.matches(message)).toBe(true);
    });

    it('should return false when rule is inactive', () => {
      const rule = RuleMother.inactive();
      const message = IncomingMessageMother.fromPhone('+573001234567', 'precio');
      expect(rule.matches(message)).toBe(false);
    });

    it('should return false when sender is not in authorized list', () => {
      const rule = RuleMother.authorizedTo(['+573009999999']);
      const message = IncomingMessageMother.fromPhone('+573001234567', 'precio');
      expect(rule.matches(message)).toBe(false);
    });

    it('should return true when authorized list is empty (open to all)', () => {
      const rule = RuleMother.openToAll();
      const message = IncomingMessageMother.fromPhone('+573001234567', 'precio');
      expect(rule.matches(message)).toBe(true);
    });
  });

  describe('deactivate()', () => {
    it('should emit RuleDeactivatedEvent when deactivating an active rule', () => {
      const rule = RuleMother.active();
      rule.clearDomainEvents();

      rule.deactivate();

      expect(rule.isActive).toBe(false);
      expect(rule.domainEvents).toHaveLength(1);
      expect(rule.domainEvents[0]).toBeInstanceOf(RuleDeactivatedEvent);
    });

    it('should be idempotent when rule is already inactive', () => {
      const rule = RuleMother.inactive();
      rule.clearDomainEvents();

      rule.deactivate(); // Segunda desactivación

      expect(rule.domainEvents).toHaveLength(0); // Sin nuevo evento
    });
  });
});
```

---

### Object Mother — Test Data Builders

```typescript
// test/mothers/rule.mother.ts
export class RuleMother {
  static validCreateParams(overrides: Partial<CreateRuleParams> = {}): CreateRuleParams {
    return {
      condition: ContainsCondition.create('precio'),
      action: { type: 'reply', template: 'Aquí está el catálogo: ...' },
      scope: 'individual',
      priority: 100,
      authorizedContacts: [],
      ...overrides,
    };
  }

  static active(): Rule {
    return Rule.create(RuleMother.validCreateParams());
  }

  static inactive(): Rule {
    const rule = Rule.create(RuleMother.validCreateParams());
    rule.deactivate();
    rule.clearDomainEvents();
    return rule;
  }

  static withContainsCondition(substring: string): Rule {
    return Rule.create(
      RuleMother.validCreateParams({
        condition: ContainsCondition.create(substring),
      }),
    );
  }

  static authorizedTo(phones: string[]): Rule {
    return Rule.create(
      RuleMother.validCreateParams({
        authorizedContacts: phones.map(PhoneNumber.create),
      }),
    );
  }

  static openToAll(): Rule {
    return Rule.create(RuleMother.validCreateParams({ authorizedContacts: [] }));
  }

  static withOllamaAction(model = 'llama3.2'): Rule {
    return Rule.create(
      RuleMother.validCreateParams({
        action: { type: 'call_ollama', model },
      }),
    );
  }
}

// test/mothers/incoming-message.mother.ts
export class IncomingMessageMother {
  static fromPhone(phone: string, text: string): IncomingMessage {
    const jid = Jid.fromPhoneNumber(PhoneNumber.create(phone));
    return IncomingMessage.create({
      messageId: MessageId.generate(),
      senderJid: jid,
      chatJid: jid,
      text,
      hasMedia: false,
      receivedAt: new Date(),
    });
  }

  static group(groupJid: string, senderPhone: string, text: string): IncomingMessage {
    return IncomingMessage.create({
      messageId: MessageId.generate(),
      senderJid: Jid.fromPhoneNumber(PhoneNumber.create(senderPhone)),
      chatJid: Jid.create(groupJid),
      text,
      hasMedia: false,
      receivedAt: new Date(),
    });
  }

  static withMedia(phone: string): IncomingMessage {
    return IncomingMessageMother.fromPhone(phone, null as unknown as string);
  }
}
```

---

### Application Layer Tests

```typescript
// modules/rules-engine/application/use-cases/evaluate-rules.service.spec.ts
describe('EvaluateRulesService', () => {
  let service: EvaluateRulesService;
  let ruleRepository: InMemoryRuleRepository;

  beforeEach(() => {
    ruleRepository = new InMemoryRuleRepository();
    const cacheService = new InMemoryRulesCacheService(ruleRepository);
    const evaluator = new RuleEvaluatorDomainService();
    service = new EvaluateRulesService(ruleRepository, evaluator, cacheService);
  });

  it('should return matched=false when no active rules exist', async () => {
    const message = IncomingMessageMother.fromPhone('+573001234567', 'hola');
    const result = await service.execute({ message });
    expect(result.matched).toBe(false);
  });

  it('should return the highest priority matching rule', async () => {
    const lowPriority = RuleMother.withContainsCondition('precio');
    const highPriority = Rule.create(
      RuleMother.validCreateParams({ condition: ContainsCondition.create('precio'), priority: 500 }),
    );
    ruleRepository.seed([lowPriority, highPriority]);

    const result = await service.execute({
      message: IncomingMessageMother.fromPhone('+57300', 'dame el precio'),
    });

    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.rule.priority.value).toBe(500);
    }
  });

  it('should skip inactive rules', async () => {
    ruleRepository.seed([RuleMother.inactive()]);
    const result = await service.execute({
      message: IncomingMessageMother.fromPhone('+57300', 'precio'),
    });
    expect(result.matched).toBe(false);
  });
});

// modules/rules-engine/application/use-cases/create-rule.handler.spec.ts
describe('CreateRuleHandler', () => {
  let handler: CreateRuleHandler;
  let ruleRepository: InMemoryRuleRepository;
  let messageSender: InMemoryMessageSender;

  beforeEach(async () => {
    ruleRepository = new InMemoryRuleRepository();
    messageSender = new InMemoryMessageSender();

    const module = await Test.createTestingModule({
      providers: [
        CreateRuleHandler,
        { provide: RULE_REPOSITORY, useValue: ruleRepository },
        EventEmitterModule, // real EventEmitter para tests de integración ligera
      ],
    }).compile();

    handler = module.get(CreateRuleHandler);
  });

  it('should save a rule and return its UUID', async () => {
    const command = new CreateRuleCommand(
      'contains', { substring: 'precio', caseSensitive: false },
      'reply', { template: 'El precio es...' },
      'individual', 100, [],
    );

    const ruleId = await handler.execute(command);

    expect(ruleId).toBeDefined();
    expect(ruleRepository.count()).toBe(1);
    expect(ruleRepository.getAll()[0].isActive).toBe(true);
  });
});
```

---

### Integration Tests — Repositorios con Testcontainers

```typescript
// modules/rules-engine/infrastructure/repositories/prisma-rule.repository.spec.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';

describe('PrismaRuleRepository (Integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repository: PrismaRuleRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;

    // Ejecutar migraciones de Prisma contra el container
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    repository = new PrismaRuleRepository(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await container.stop();
  });

  afterEach(async () => {
    await prisma.rule.deleteMany();
  });

  it('should save and retrieve a rule by ID', async () => {
    const rule = RuleMother.active();
    await repository.save(rule);

    const retrieved = await repository.findById(rule.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id.value).toBe(rule.id.value);
    expect(retrieved!.isActive).toBe(true);
  });

  it('should return null for non-existent rule', async () => {
    const result = await repository.findById(RuleId.generate());
    expect(result).toBeNull();
  });

  it('should return only active rules in findAllActive', async () => {
    const active = RuleMother.active();
    const inactive = RuleMother.inactive();

    await repository.save(active);
    await repository.save(inactive);

    const activeRules = await repository.findAllActive();
    expect(activeRules).toHaveLength(1);
    expect(activeRules[0].id.value).toBe(active.id.value);
  });
});
```

---

### E2E Tests — Supertest

```typescript
// test/e2e/admin-rules.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

describe('Admin Rules API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule], // Módulo real con Testcontainers config
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  describe('POST /api/v1/admin/rules/crear', () => {
    it('should return 201 with rule ID on valid input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/rules/crear')
        .set('x-api-key', process.env.API_KEY!)
        .send({
          conditionType: 'contains',
          conditionData: { substring: 'precio', caseSensitive: false },
          actionType: 'reply',
          actionData: { template: 'El precio es...' },
          scope: 'individual',
          priority: 100,
          authorizedPhones: [],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('ruleId');
      expect(response.body.ruleId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should return 422 with ProblemDetail when priority is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/rules/crear')
        .set('x-api-key', process.env.API_KEY!)
        .send({ /* ... */ priority: -1 });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('correlationId');
      expect(response.body).not.toHaveProperty('stack'); // NUNCA stack trace en producción
    });

    it('should return 401 when API key is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/rules/crear')
        .send({ /* ... */ });

      expect(response.status).toBe(401);
    });
  });
});
```

---

### Jest Configuration

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.module.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@domain/(.*)': '<rootDir>/modules/$1/domain/$2',
    '@application/(.*)': '<rootDir>/modules/$1/application/$2',
    '@shared/(.*)': '<rootDir>/shared/$1',
  },
  coverageThresholds: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
};

// jest.e2e.config.ts — config separada para E2E
const e2eConfig: Config = {
  ...config,
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  testTimeout: 60_000, // Testcontainers tarda en levantar
};
```

---

## ✅ Criterios de Aplicación

- Todo nuevo Use Case, Aggregate o Value Object → test unitario ANTES del código (TDD)
- Todo nuevo Adapter de infraestructura → test de integración con Testcontainers
- Todo nuevo endpoint → test E2E con Supertest
- Code review → verificar que el test documenta el comportamiento esperado

---

## ❌ Anti-patrones

- ❌ **Mocks de Jest para repositorios** — usar InMemory Adapters; los mocks no verifican consistencia entre save() y find()
- ❌ **`jest.spyOn` en métodos de dominio** — si necesitas espiar el dominio, el test está mal enfocado
- ❌ **Tests que testean implementación, no comportamiento** — `expect(service.prisma.rule.create).toHaveBeenCalled()` → testear el estado resultante
- ❌ **Un solo test por método** — cubrir múltiples escenarios: happy path, edge cases, errores
- ❌ **`beforeAll` con estado compartido entre tests** — usar `beforeEach` + limpieza; tests independientes
- ❌ **Testear infra con mocks de Prisma** — usar Testcontainers; los mocks de Prisma no detectan errores de SQL reales
- ❌ **`test.only` o `test.skip` en código commiteado** — marca del CI; bloquear merge

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: TDD + TESTING PYRAMID — NODE.JS EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/tdd-testing-nodejs-expert.skill.md

Puntos críticos:
- Outside-In TDD: E2E → Controller → Use Case → Domain → implementar de adentro hacia afuera
- InMemory Adapters (no mocks de Jest) para repositorios y MessageSender en tests unitarios
- Object Mother para test data: `RuleMother.active()`, `IncomingMessageMother.fromPhone()`
- Tests de dominio sin async, sin framework, sin dobles — puro TypeScript
- Testcontainers para repositorios de infraestructura (PostgreSQL real)
- Naming: `should [comportamiento esperado] when [condición]`
- Coverage thresholds: > 95% Domain, > 90% Application, > 75% Infrastructure, > 85% global
- Test E2E con Supertest verifican: status code correcto, ProblemDetail sin stack trace, UUID v4 en 201
```

---

## 📊 Métricas de Calidad

| Métrica | Valor esperado |
|---------|----------------|
| Cobertura Domain Layer | > 95% |
| Cobertura Application Layer | > 90% |
| Cobertura Infrastructure | > 75% |
| Cobertura Global | > 85% |
| Tests que usan `jest.fn()` para repositorios | 0 (InMemory Adapters) |
| Tests con `test.only` / `test.skip` en CI | 0 (bloquea merge) |
| Tests con dependencias entre sí | 0 |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — TDD + Testing Pyramid Node.js TypeScript Expert
