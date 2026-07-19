import type { AppConfig } from '../../../src/config/app.config';
import { getCorsOrigins, getValkeyUrl, isValkeyEnabled } from '../../../src/config/app.config';

describe('Valkey configuration compatibility', () => {
  it('uses the Valkey variables for new deployments', () => {
    const config = {
      ENABLE_VALKEY: true,
      VALKEY_URL: 'redis://valkey:6379',
      ENABLE_REDIS: false,
      REDIS_URL: 'redis://legacy:6379',
    } as AppConfig;

    expect(isValkeyEnabled(config)).toBe(true);
    expect(getValkeyUrl(config)).toBe('redis://valkey:6379');
  });

  it('supports the deprecated Redis aliases during migration', () => {
    const config = {
      ENABLE_REDIS: true,
      REDIS_URL: 'redis://legacy:6379',
    } as AppConfig;

    expect(isValkeyEnabled(config)).toBe(true);
    expect(getValkeyUrl(config)).toBe('redis://legacy:6379');
  });

  it('lets an explicit Valkey setting override the legacy alias', () => {
    const config = {
      ENABLE_VALKEY: false,
      ENABLE_REDIS: true,
    } as AppConfig;

    expect(isValkeyEnabled(config)).toBe(false);
  });
});

describe('getCorsOrigins', () => {
  function callWith(
    origins: string | string[] | ((o: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void),
    requestOrigin: string | undefined,
  ): boolean {
    if (typeof origins !== 'function') {
      throw new Error('expected a CORS origin validator function');
    }
    let result = false;
    origins(requestOrigin, (err, allow) => {
      result = !err && Boolean(allow);
    });
    return result;
  }

  it('returns the wildcard as-is', () => {
    const config = { CORS_ORIGINS: '*' } as AppConfig;
    expect(getCorsOrigins(config)).toBe('*');
  });

  it('allows a request with no Origin header (server-to-server / same-origin)', () => {
    const config = { CORS_ORIGINS: 'http://localhost:3001' } as AppConfig;
    expect(callWith(getCorsOrigins(config), undefined)).toBe(true);
  });

  it('allows an exact configured origin', () => {
    const config = { CORS_ORIGINS: 'http://localhost:3001,http://127.0.0.1:3001' } as AppConfig;
    expect(callWith(getCorsOrigins(config), 'http://localhost:3001')).toBe(true);
  });

  it('allows a private-LAN IP reusing an already-configured localhost port', () => {
    const config = { CORS_ORIGINS: 'http://localhost:3001,http://127.0.0.1:3001' } as AppConfig;
    expect(callWith(getCorsOrigins(config), 'http://192.168.18.26:3001')).toBe(true);
    expect(callWith(getCorsOrigins(config), 'http://10.0.0.5:3001')).toBe(true);
    expect(callWith(getCorsOrigins(config), 'http://172.20.4.4:3001')).toBe(true);
  });

  it('rejects a private-LAN IP on a port that was never configured', () => {
    const config = { CORS_ORIGINS: 'http://localhost:3001' } as AppConfig;
    expect(callWith(getCorsOrigins(config), 'http://192.168.18.26:9999')).toBe(false);
  });

  it('rejects a public-internet origin even on an allowed port', () => {
    const config = { CORS_ORIGINS: 'http://localhost:3001' } as AppConfig;
    expect(callWith(getCorsOrigins(config), 'https://evil.example.com:3001')).toBe(false);
  });
});
