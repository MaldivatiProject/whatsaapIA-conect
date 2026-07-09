const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'jest.config.ts', 'tests/mocks/**'] },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/infrastructure/**'], message: 'Inner layers must not import infrastructure.' }] }],
    },
  },
];
