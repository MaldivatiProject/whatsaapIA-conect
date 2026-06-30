// Runs before any test module is imported (jest setupFiles).
// Establishes a deterministic, authenticated test environment.
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';
process.env['AUTH_ENABLED'] = 'true';
process.env['API_KEYS'] = 'tenantA:supersecretkey-aaaaaaaa,tenantB:supersecretkey-bbbbbbbb';
process.env['SESSION_PROVIDER'] = 'filesystem';
process.env['METRICS_ENABLED'] = 'false';
process.env['CORS_ENABLED'] = 'false';
