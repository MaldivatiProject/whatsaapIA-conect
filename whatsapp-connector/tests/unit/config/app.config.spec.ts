import type { AppConfig } from '../../../src/config/app.config';
import { getValkeyUrl, isValkeyEnabled } from '../../../src/config/app.config';

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
