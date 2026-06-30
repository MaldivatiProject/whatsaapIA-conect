import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './api-key.guard';

/**
 * Injects the authenticated ownerId resolved by ApiKeyAuthGuard.
 * Controllers pass this into commands/queries so the application layer can
 * scope every operation to the owning tenant (BOLA/IDOR prevention).
 */
export const CurrentOwner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.ownerId ?? 'public';
  },
);
