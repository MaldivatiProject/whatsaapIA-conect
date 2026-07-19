import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const optionalBoolean = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
);

const AppConfigSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    SESSION_PATH: z.string().min(1).default('./sessions'),
    MAX_SESSIONS: z.coerce.number().int().min(1).max(100).default(10),

    RECONNECT_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
    MAX_RECONNECT_ATTEMPTS: z.coerce.number().int().min(0).default(5),
    HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(5000).default(30000),

    MAX_MEDIA_SIZE_MB: z.coerce.number().int().min(1).max(100).default(16),
    ALLOWED_MIME_TYPES: z
      .string()
      .default('image/jpeg,image/png,image/webp,video/mp4,audio/ogg,audio/mpeg,application/pdf'),

    CORS_ENABLED: z
      .string()
      .transform((v) => v === 'true')
      .default('true'),
    CORS_ORIGINS: z.string().default('*'),

    ENABLE_WEBSOCKET: z
      .string()
      .transform((v) => v === 'true')
      .default('true'),
    ENABLE_EVENTS: z
      .string()
      .transform((v) => v === 'true')
      .default('true'),

    SESSION_PROVIDER: z.enum(['filesystem', 'valkey', 'redis', 'postgres']).default('filesystem'),

    ENABLE_VALKEY: optionalBoolean,
    VALKEY_URL: z.string().optional(),
    // Deprecated aliases kept for one migration window. New deployments must use
    // ENABLE_VALKEY/VALKEY_URL and SESSION_PROVIDER=valkey.
    ENABLE_REDIS: optionalBoolean,
    REDIS_URL: z.string().optional(),
    AUTH_STATE_ENCRYPTION_KEY: z.string().optional(),

    ENABLE_POSTGRES: z
      .string()
      .transform((v) => v === 'true')
      .default('false'),
    DATABASE_URL: z.string().optional(),

    WEBHOOK_ENABLED: z
      .string()
      .transform((v) => v === 'true')
      .default('false'),
    WEBHOOK_URL: optionalUrl,
    WEBHOOK_SECRET: z.string().optional(),

    RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().int().min(1).default(20),
    RATE_LIMIT_MIN_DELAY_MS: z.coerce.number().int().min(0).default(500),

    // ── API authentication ──────────────────────────────────────────
    // When enabled, every request (except @Public routes) must carry a valid
    // API key. Keys map to an ownerId so sessions are isolated per tenant (BOLA).
    AUTH_ENABLED: z
      .string()
      .transform((v) => v === 'true')
      .default('true'),
    // Format: "ownerId:secret,ownerId2:secret2"  (secret must be >= 16 chars)
    API_KEYS: z.string().default(''),

    // ── HTTP rate limiting (throttler) ──────────────────────────────
    HTTP_RATE_LIMIT_TTL_MS: z.coerce.number().int().min(1000).default(60000),
    HTTP_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),

    // ── Observability ───────────────────────────────────────────────
    METRICS_ENABLED: z
      .string()
      .transform((v) => v === 'true')
      .default('true'),
    HEALTH_MAX_HEAP_MB: z.coerce.number().int().min(128).max(8192).default(1024),
    // Swagger/OpenAPI UI. Off in production by default — set true to expose /docs.
    SWAGGER_ENABLED: z
      .string()
      .transform((v) => v === 'true')
      .optional(),

    TLS_ENABLED: z
      .string()
      .transform((v) => v === 'true')
      .default('false'),
    TLS_CERT_PATH: z.string().optional(),
    TLS_KEY_PATH: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const valkeyEnabled = value.ENABLE_VALKEY ?? value.ENABLE_REDIS ?? false;
    const valkeyUrl = value.VALKEY_URL ?? value.REDIS_URL;
    if (
      (value.SESSION_PROVIDER === 'valkey' || value.SESSION_PROVIDER === 'redis') &&
      (!valkeyEnabled || !valkeyUrl)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['VALKEY_URL'],
        message: 'Valkey provider requires ENABLE_VALKEY=true and VALKEY_URL',
      });
    }
    if (value.SESSION_PROVIDER === 'postgres' && (!value.ENABLE_POSTGRES || !value.DATABASE_URL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'Postgres provider requires ENABLE_POSTGRES=true and DATABASE_URL',
      });
    }
    if (
      value.WEBHOOK_ENABLED &&
      (!value.WEBHOOK_URL || !value.WEBHOOK_SECRET || value.WEBHOOK_SECRET.length < 32)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WEBHOOK_SECRET'],
        message: 'Enabled webhooks require URL and a secret of at least 32 characters',
      });
    }
    if (
      value.NODE_ENV === 'production' &&
      value.CORS_ENABLED &&
      value.CORS_ORIGINS.trim() === '*'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGINS'],
        message: 'Wildcard CORS is forbidden in production',
      });
    }
    if (value.TLS_ENABLED && (!value.TLS_CERT_PATH || !value.TLS_KEY_PATH)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TLS_CERT_PATH'],
        message: 'TLS requires certificate and key paths',
      });
    }
    if (value.NODE_ENV === 'production') {
      if (!valkeyEnabled || !valkeyUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ENABLE_VALKEY'],
          message: 'Production requires Valkey-backed auth state',
        });
      }
      const key = value.AUTH_STATE_ENCRYPTION_KEY;
      if (!key || Buffer.from(key, 'base64').length !== 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_STATE_ENCRYPTION_KEY'],
          message: 'Production requires a base64-encoded 32-byte encryption key',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof AppConfigSchema>;

let _config: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (!_config) {
    const parsed = AppConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error('Invalid environment configuration:', parsed.error.format());
      process.exit(1);
    }
    _config = parsed.data;
  }
  return _config;
}

export function getAllowedMimeTypes(config: AppConfig): string[] {
  return config.ALLOWED_MIME_TYPES.split(',').map((m) => m.trim());
}

export function isValkeyEnabled(config: AppConfig): boolean {
  return config.ENABLE_VALKEY ?? config.ENABLE_REDIS ?? false;
}

export function getValkeyUrl(config: AppConfig): string | undefined {
  return config.VALKEY_URL ?? config.REDIS_URL;
}

/**
 * Parses API_KEYS ("ownerId:secret,...") into a secret → ownerId map.
 * Throws on malformed entries or weak secrets so the service never boots
 * with a silently-broken auth configuration.
 */
export function getApiKeyMap(config: AppConfig): Map<string, string> {
  const map = new Map<string, string>();
  const raw = config.API_KEYS.trim();
  if (!raw) return map;

  for (const pair of raw.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(':');
    if (sep <= 0) {
      throw new Error(`Invalid API_KEYS entry (expected "ownerId:secret"): "${trimmed}"`);
    }
    const ownerId = trimmed.slice(0, sep).trim();
    const secret = trimmed.slice(sep + 1).trim();
    if (!ownerId || secret.length < 16) {
      throw new Error(`API key for owner "${ownerId}" must be at least 16 characters`);
    }
    map.set(secret, ownerId);
  }
  return map;
}

export function isSwaggerEnabled(config: AppConfig): boolean {
  return config.SWAGGER_ENABLED ?? config.NODE_ENV !== 'production';
}

export type CorsOriginValidator = (
  requestOrigin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void;

// RFC 1918 private ranges + localhost. Deliberately excludes link-local
// (169.254.0.0/16) and anything outside these ranges — this is not a
// general LAN-detector, only wide enough to cover a typical home/office
// router-assigned address.
const PRIVATE_LAN_HOSTNAME =
  /^(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})$/;

function allowedPortsOf(origins: string[]): Set<string> {
  const ports = new Set<string>();
  for (const origin of origins) {
    try {
      ports.add(new URL(origin).port);
    } catch {
      // Not a parseable absolute URL — ignored for port extraction; it can
      // still match via the exact-string check in getCorsOrigins.
    }
  }
  return ports;
}

function isAllowedPrivateLanOrigin(origin: string, allowedPorts: Set<string>): boolean {
  try {
    const url = new URL(origin);
    return allowedPorts.has(url.port) && PRIVATE_LAN_HOSTNAME.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Configured CORS_ORIGINS entries always match exactly. Additionally, any
 * origin on a private-network address (RFC 1918, or localhost/127.0.0.1)
 * reusing one of the SAME ports already configured for localhost is allowed
 * too. This keeps the dashboard reachable when the host machine's LAN IP
 * changes (e.g. a laptop moving networks / DHCP reassignment) without
 * requiring a config change or restart, while still rejecting origins
 * outside the private network or on an unexpected port. `CORS_ORIGINS=*`
 * is handled separately and forbidden in production (see AppConfigSchema).
 */
export function getCorsOrigins(config: AppConfig): string | string[] | CorsOriginValidator {
  const origins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
  if (origins.length === 1 && origins[0] === '*') return '*';

  const allowedPorts = allowedPortsOf(origins);

  return (requestOrigin, callback) => {
    if (!requestOrigin || origins.includes(requestOrigin)) {
      callback(null, true);
      return;
    }
    const allowed = isAllowedPrivateLanOrigin(requestOrigin, allowedPorts);
    callback(allowed ? null : new Error(`Origin not allowed by CORS: ${requestOrigin}`), allowed);
  };
}
