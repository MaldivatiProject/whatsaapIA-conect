import { z } from 'zod';

const AppConfigSchema = z.object({
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
  ENABLE_REST: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_EVENTS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  SESSION_PROVIDER: z.enum(['filesystem', 'redis', 'postgres']).default('filesystem'),

  ENABLE_REDIS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  REDIS_URL: z.string().optional(),

  ENABLE_POSTGRES: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  DATABASE_URL: z.string().optional(),

  WEBHOOK_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_MIN_DELAY_MS: z.coerce.number().int().min(0).default(500),

  TLS_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  TLS_CERT_PATH: z.string().optional(),
  TLS_KEY_PATH: z.string().optional(),
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

export function getCorsOrigins(config: AppConfig): string | string[] {
  const origins = config.CORS_ORIGINS.split(',').map((o) => o.trim());
  return origins.length === 1 && origins[0] === '*' ? '*' : origins;
}
