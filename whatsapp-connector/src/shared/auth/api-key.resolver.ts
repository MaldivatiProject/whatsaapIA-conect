import { timingSafeEqual } from 'node:crypto';
import { getApiKeyMap, type AppConfig } from '../../config/app.config';

export interface ApiKeyResolver {
  readonly authEnabled: boolean;
  /** Returns the ownerId for a presented secret, or null if no key matches. */
  authenticate(presented: string | undefined): string | null;
}

/**
 * Builds a constant-time API-key resolver from config. Shared by the HTTP guard
 * (via ApiKeyService) and the WebSocket gateway so both transports authenticate
 * identically without a DI cycle.
 */
export function createApiKeyResolver(config: AppConfig): ApiKeyResolver {
  const keys = getApiKeyMap(config);
  if (config.AUTH_ENABLED && keys.size === 0) {
    throw new Error(
      'AUTH_ENABLED=true but no API_KEYS configured. Set API_KEYS="owner:secret,..." or AUTH_ENABLED=false.',
    );
  }

  return {
    authEnabled: config.AUTH_ENABLED,
    authenticate(presented: string | undefined): string | null {
      if (!presented) return null;
      const presentedBuf = Buffer.from(presented);
      for (const [secret, ownerId] of keys) {
        const secretBuf = Buffer.from(secret);
        if (secretBuf.length === presentedBuf.length && timingSafeEqual(secretBuf, presentedBuf)) {
          return ownerId;
        }
      }
      return null;
    },
  };
}
