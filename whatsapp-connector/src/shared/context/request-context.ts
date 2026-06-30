import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';

export interface RequestContext {
  correlationId: string;
  sessionId?: string;
  messageId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getContext(): RequestContext {
  return requestContext.getStore() ?? { correlationId: 'no-context' };
}

export function getCorrelationId(): string {
  return requestContext.getStore()?.correlationId ?? 'no-context';
}

export function hashJid(jid: string): string {
  return createHash('sha256').update(jid).digest('hex').substring(0, 12);
}

export async function withMessageContext<T>(
  messageId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const ctx: RequestContext = { correlationId: crypto.randomUUID(), messageId };
  return requestContext.run(ctx, fn);
}
