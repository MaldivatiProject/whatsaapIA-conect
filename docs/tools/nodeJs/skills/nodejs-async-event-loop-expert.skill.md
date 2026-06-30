# 🎯 SKILL: NODE.JS ASYNC & EVENT LOOP EXPERT

**skill_id**: nodejs-async-event-loop-expert  
**version**: 1.0.0  
**nivel**: Expert  
**categoria**: backend · nodejs · async · performance  
**last_updated**: 2026-06-14  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**: prompt-dev-nodejs-nestjs-senior  
**dependencias**: typescript-strict-expert

---

## 📌 Propósito de la Skill

Dominar el modelo de concurrencia de Node.js: event loop, fases de ejecución, microtask queue, macrotask queue, Promises, async/await, Streams y Worker Threads. Esta skill permite escribir código asíncrono correcto, predecible y con alto rendimiento, evitando los errores clásicos que bloquean el event loop o generan memory leaks en aplicaciones de larga ejecución como bots de WhatsApp.

---

## 🧠 Conocimiento Núcleo

### Principios Fundamentales

- **El event loop es single-threaded** — cualquier operación síncrona que tarde > 10ms bloquea todas las demás operaciones, incluyendo I/O de red y mensajes entrantes de Baileys.
- **Microtasks tienen prioridad sobre macrotasks** — las Promises resueltas y `queueMicrotask()` se ejecutan antes del siguiente tick del event loop; `setTimeout(fn, 0)` se ejecuta después.
- **No existe paralelismo real en el hilo principal** — solo concurrencia mediante I/O no bloqueante. Para CPU paralela: Worker Threads o cluster.
- **`async/await` no es gratis** — cada `await` suspende la función y la pone en la microtask queue. Dentro de loops, puede generar overhead significativo con miles de iteraciones.
- **`unhandledRejection` en producción debe terminar el proceso** — una Promise rechazada sin catch puede dejar el sistema en estado inconsistente silenciosamente.

---

### Técnicas y Patrones

#### 1. Fases del Event Loop (orden exacto)

```
   ┌─────────────────────────────────────┐
   │           timers                    │ → setTimeout / setInterval callbacks
   │─────────────────────────────────────│
   │         pending callbacks           │ → I/O errors del ciclo anterior
   │─────────────────────────────────────│
   │           idle, prepare             │ → uso interno de Node.js
   │─────────────────────────────────────│
   │              poll                   │ → recupera nuevos eventos I/O, ejecuta callbacks
   │─────────────────────────────────────│
   │              check                  │ → setImmediate() callbacks
   │─────────────────────────────────────│
   │         close callbacks             │ → socket.on('close', ...)
   └─────────────────────────────────────┘
   Entre cada fase: process.nextTick() y Promise microtasks
```

```typescript
// Demostración del orden de ejecución
console.log('1: sync');

setTimeout(() => console.log('5: setTimeout'), 0);

setImmediate(() => console.log('4: setImmediate'));

Promise.resolve().then(() => console.log('3: Promise microtask'));

process.nextTick(() => console.log('2: nextTick'));

// Output: 1 → 2 → 3 → 4 → 5
```

---

#### 2. Patrones de concurrencia correcta

```typescript
// ✅ CORRECTO — Paralelismo con Promise.allSettled (nunca falla por un error)
async function processMultipleJids(
  jids: string[],
  handler: (jid: string) => Promise<void>,
): Promise<void> {
  const results = await Promise.allSettled(jids.map((jid) => handler(jid)));

  const failed = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  if (failed.length > 0) {
    console.error(`${failed.length} JIDs failed:`, failed.map((f) => f.reason));
  }
}

// ✅ CORRECTO — Concurrencia limitada (evita saturar recursos)
async function processWithConcurrencyLimit<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  concurrency: number = 5,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = handler(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Limpiar las que ya terminaron
      executing.splice(
        0,
        executing.length,
        ...executing.filter((p) => {
          let resolved = false;
          p.then(() => { resolved = true; }).catch(() => { resolved = true; });
          return !resolved;
        }),
      );
    }
  }

  await Promise.allSettled(executing);
  return results;
}

// ❌ INCORRECTO — await en loop secuencial cuando podrían ser paralelos
async function processSequentiallyWrong(jids: string[]): Promise<void> {
  for (const jid of jids) {
    await sendMessage(jid, 'Hola'); // Cada mensaje espera al anterior → lento
  }
}
```

---

#### 3. Streams — críticos para media en Baileys

```typescript
import { Transform, pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';

const pipelineAsync = promisify(pipeline);

// ✅ CORRECTO — procesar stream de media sin cargar todo en memoria
async function streamMediaToDisk(
  mediaStream: NodeJS.ReadableStream,
  outputPath: string,
  maxSizeBytes: number = 50 * 1024 * 1024, // 50MB máximo
): Promise<void> {
  let bytesReceived = 0;

  const sizeLimiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesReceived += chunk.length;
      if (bytesReceived > maxSizeBytes) {
        callback(new Error(`Media too large: ${bytesReceived} bytes`));
        return;
      }
      callback(null, chunk);
    },
  });

  await pipelineAsync(
    mediaStream,
    sizeLimiter,
    createWriteStream(outputPath),
  );
}

// ✅ CORRECTO — Buffer eficiente para Baileys media download
async function streamToBuffer(
  stream: NodeJS.ReadableStream,
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }

  return Buffer.concat(chunks);
}
```

---

#### 4. AsyncLocalStorage — contexto de correlación sin contaminar firmas

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  correlationId: string;
  sessionId: string;
  messageId: string;
}

// Singleton — compartido por toda la aplicación
export const asyncContext = new AsyncLocalStorage<RequestContext>();

// Middleware NestJS que establece el contexto
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx: RequestContext = {
      correlationId: randomUUID(),
      sessionId: context.switchToHttp().getRequest().headers['x-session-id'] ?? 'unknown',
      messageId: 'http',
    };

    return new Observable((observer) => {
      asyncContext.run(ctx, () => {
        next.handle().subscribe(observer);
      });
    });
  }
}

// Acceso en cualquier punto de la cadena sin pasar como parámetro
function getCorrelationId(): string {
  return asyncContext.getStore()?.correlationId ?? 'no-context';
}

// Para mensajes de Baileys — envolver el handler
async function processMessageWithContext(
  message: proto.IWebMessageInfo,
  handler: () => Promise<void>,
): Promise<void> {
  const ctx: RequestContext = {
    correlationId: randomUUID(),
    sessionId: 'baileys',
    messageId: message.key.id ?? 'unknown',
  };

  await asyncContext.run(ctx, handler);
}
```

---

#### 5. Worker Threads — procesamiento CPU-intensivo

```typescript
// workers/ai-processor.worker.ts (ejecutado en hilo separado)
import { workerData, parentPort } from 'node:worker_threads';

// Este código corre en un Worker Thread, no bloquea el event loop principal
const result = expensiveAIProcessing(workerData.input);
parentPort?.postMessage({ result });

// infrastructure/services/ai-worker.service.ts
import { Worker } from 'node:worker_threads';
import { join } from 'node:path';

export class AIWorkerService {
  async processWithAI(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'ai-processor.worker.js'), {
        workerData: { input },
      });

      worker.on('message', ({ result }) => resolve(result));
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }
}
```

---

#### 6. Manejo correcto de errores asíncronos en producción

```typescript
// main.ts — configuración global de errores
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // En producción: unhandledRejection debe terminar el proceso
  // (PM2/K8s lo reiniciará automáticamente)
  process.on('unhandledRejection', (reason: Error) => {
    console.error('UNHANDLED_REJECTION:', reason);
    process.exit(1); // Salida controlada — el orquestador reinicia
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('UNCAUGHT_EXCEPTION:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received — shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  await app.listen(3000);
}

// ✅ CORRECTO — EventEmitter con async handlers (Baileys)
// El problema: EventEmitter no maneja Promise rejections automáticamente
sock.ev.on('messages.upsert', async (update) => {
  try {
    await processMessages(update); // Siempre envolver en try/catch
  } catch (error) {
    // Log y continuar — no dejar que un mensaje roto rompa el socket
    logger.error({ error, update }, 'Failed to process messages.upsert');
  }
});
```

---

#### 7. Detección de bloqueos del event loop (producción)

```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

// Monitorear lag del event loop — alerta si > 100ms
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  const lagMs = histogram.mean / 1e6; // nanoseconds → milliseconds
  if (lagMs > 100) {
    console.warn(`EVENT_LOOP_LAG: ${lagMs.toFixed(2)}ms — possible blocking operation`);
  }
  histogram.reset();
}, 5000);
```

---

### Estándares de Referencia

- **Node.js Event Loop official documentation** — nodejs.org/en/docs/guides/event-loop-timers-and-nexttick
- **libuv documentation** — base del event loop de Node.js
- **WHATWG Streams API** — estándar de Streams en Node.js 18+
- **Node.js Diagnostics Working Group** — best practices de observabilidad

---

## ✅ Criterios de Aplicación

- Cualquier módulo que procese eventos asíncronos (mensajes Baileys, webhooks, colas)
- Implementaciones de concurrencia limitada sobre arrays grandes
- Procesamiento de media o archivos usando Streams
- Código que deba mantener contexto de correlación a través de cadenas async
- Workers para tareas CPU-bound (procesamiento de IA, compresión, crypto)

---

## ❌ Anti-patrones

- ❌ **`JSON.parse/stringify` síncronos en objetos grandes dentro de handlers** — bloquea el event loop
- ❌ **`await` dentro de `Array.forEach`** — forEach no es async-aware; los errores se pierden
- ❌ **`Promise.all` sin límite de concurrencia sobre arrays de 1000+ items** — agota conexiones y memoria
- ❌ **`process.nextTick()` recursivo** — inanición del event loop (I/O nunca se procesa)
- ❌ **EventEmitter callbacks async sin try/catch** — `unhandledRejection` silencioso
- ❌ **Cargar archivos grandes enteros en Buffer** — usar Streams; un video de 100MB satura el heap
- ❌ **`setInterval` sin clearInterval en `onApplicationShutdown`** — memory leak y procesos zombi

---

## 📝 Ejemplos Concretos

### Ejemplo 1: Queue de mensajes con BullMQ (correcta integración async)

```typescript
// infrastructure/queues/message-processing.queue.ts
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue } from 'bull';

@Processor('message-processing')
export class MessageProcessingConsumer {
  constructor(
    private readonly handleMessage: HandleAuthorizedUserMessageUseCase,
  ) {}

  @Process('incoming-message')
  async processMessage(job: Job<proto.IWebMessageInfo>): Promise<void> {
    // Bull maneja reintentos automáticos si lanza un error
    await this.handleMessage.execute(job.data);
  }
}

// Enqueue desde el socket de Baileys
@Injectable()
export class BaileysEventBridge {
  constructor(
    @InjectQueue('message-processing') private readonly queue: Queue,
  ) {}

  @OnEvent('baileys.message')
  async onMessage(message: proto.IWebMessageInfo): Promise<void> {
    await this.queue.add('incoming-message', message, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
```

### Ejemplo 2: Detección de `await` perdido en forEach (error clásico)

```typescript
// ❌ INCORRECTO — los errores se pierden, los awaits no funcionan
async function wrongForEach(messages: string[]): Promise<void> {
  messages.forEach(async (msg) => {
    await sendToWhatsApp(msg); // Esta Promise se ignora
  });
  // La función retorna antes de que los mensajes se envíen
}

// ✅ CORRECTO — for...of con await
async function correctForOf(messages: string[]): Promise<void> {
  for (const msg of messages) {
    await sendToWhatsApp(msg);
  }
}

// ✅ CORRECTO — paralelo con límite
async function parallelWithLimit(messages: string[]): Promise<void> {
  await processWithConcurrencyLimit(messages, sendToWhatsApp, 5);
}
```

---

## 🔗 Instrucciones de Inyección en Agentes

```markdown
### SKILL ACTIVA: NODE.JS ASYNC & EVENT LOOP EXPERT
→ ver: whatsaapIA/docs/tools/nodeJs/skills/nodejs-async-event-loop-expert.skill.md

Puntos críticos:
- NUNCA operaciones síncronas bloqueantes (> 10ms) en el hilo principal
- `Promise.allSettled` para operaciones independientes que no deben fallar en bloque
- Concurrencia limitada con `processWithConcurrencyLimit` — nunca `Promise.all` sin límite sobre arrays grandes
- `AsyncLocalStorage` para contexto de correlación en cadenas async de Baileys
- `for...of` + await en lugar de `forEach` async
- `unhandledRejection` → `process.exit(1)` en producción (orquestador reinicia)
- Streams para media > 1MB — nunca `Buffer.concat` de archivos arbitrariamente grandes
- Worker Threads para procesamiento CPU-bound (IA local con Ollama, compresión)
- Monitorear event loop lag con `monitorEventLoopDelay` — alerta > 100ms
```

---

## 📊 Métricas de Calidad de la Skill

| Métrica | Valor esperado |
|---------|----------------|
| Event loop lag p99 | < 50ms en carga normal |
| Event loop lag máximo | < 200ms (alert threshold) |
| Heap usage estable en 24h | < 80% del límite configurado |
| Ningún `forEach` async en código | 0 ocurrencias (eslint rule) |
| Streams usados para archivos > 1MB | 100% de los casos |

---

## 🔄 Changelog

- v1.0.0: Versión inicial — Node.js Async & Event Loop Expert para backend WhatsApp
