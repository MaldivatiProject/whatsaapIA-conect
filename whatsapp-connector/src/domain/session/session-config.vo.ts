export interface SessionConfig {
  readonly maxReconnectAttempts: number;
  readonly reconnectIntervalMs: number;
  readonly heartbeatIntervalMs: number;
  readonly rateLimitMaxPerMinute: number;
  readonly rateLimitMinDelayMs: number;
  readonly metadata?: Record<string, string>;
}

export function createSessionConfig(params: Partial<SessionConfig> = {}): SessionConfig {
  return {
    maxReconnectAttempts: params.maxReconnectAttempts ?? 5,
    reconnectIntervalMs: params.reconnectIntervalMs ?? 5000,
    heartbeatIntervalMs: params.heartbeatIntervalMs ?? 30000,
    rateLimitMaxPerMinute: params.rateLimitMaxPerMinute ?? 20,
    rateLimitMinDelayMs: params.rateLimitMinDelayMs ?? 500,
    ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
  };
}
