import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  // The ZNS 85% gate applies to domain + application (business logic).
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 80, functions: 85, lines: 85, statements: 85 },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      setupFiles: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
        '^@api/(.*)$': '<rootDir>/src/api/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
      },
    },
    {
      displayName: 'e2e',
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
      },
    },
  ],
};

export default config;
