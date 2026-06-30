import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../application/shared/tokens';
import type { AppConfig } from '../../config/app.config';
import { createApiKeyResolver, type ApiKeyResolver } from './api-key.resolver';

/**
 * DI wrapper around the API-key resolver used by the HTTP guard.
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly resolver: ApiKeyResolver;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.resolver = createApiKeyResolver(config);
    if (!this.resolver.authEnabled) {
      this.logger.warn('AUTH_ENABLED=false — API authentication is DISABLED. Do not run like this in production.');
    }
  }

  get authEnabled(): boolean {
    return this.resolver.authEnabled;
  }

  authenticate(presented: string | undefined): string | null {
    return this.resolver.authenticate(presented);
  }
}
