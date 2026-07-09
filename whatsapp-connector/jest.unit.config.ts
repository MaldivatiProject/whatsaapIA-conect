import type { Config } from 'jest';

const config: Config = {
  displayName: 'unit',
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['<rootDir>/src/domain/**/*.ts', '<rootDir>/src/application/**/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
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
