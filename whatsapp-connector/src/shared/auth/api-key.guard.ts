import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ApiKeyService } from './api-key.service';

/** Request augmented with the authenticated ownerId (set by this guard). */
export interface AuthenticatedRequest extends Request {
  ownerId?: string;
}

export const API_KEY_HEADER = 'x-api-key';

/**
 * Global guard. Rejects requests without a valid API key and attaches the
 * resolved ownerId to the request so controllers can enforce per-tenant ownership.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeys: ApiKeyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!this.apiKeys.authEnabled) {
      request.ownerId = 'public';
      return true;
    }
    if (isPublic) {
      return true;
    }

    const header = request.headers[API_KEY_HEADER];
    // Browser-facing QR/monitor pages cannot set headers easily, so an `api_key`
    // query param is accepted as a fallback. Header is preferred (not logged).
    const queryKey = typeof request.query?.['api_key'] === 'string' ? request.query['api_key'] : undefined;
    const presented = (Array.isArray(header) ? header[0] : header) ?? queryKey;
    const ownerId = this.apiKeys.authenticate(presented);
    if (!ownerId) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    request.ownerId = ownerId;
    return true;
  }
}
