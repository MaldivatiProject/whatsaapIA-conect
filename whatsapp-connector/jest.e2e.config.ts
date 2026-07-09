import type { Config } from 'jest';

const config: Config = {
  displayName: 'e2e',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/e2e/**/*.spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@whiskeysockets/baileys$': '<rootDir>/tests/mocks/baileys.ts',
  },
};

export default config;
