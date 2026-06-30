/**
 * Architecture fitness rules (hexagonal). Run with: npm run arch:check
 * The domain and application layers must never depend on infrastructure,
 * frameworks or transport. This is the ZNS hexagonal gate.
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-no-infrastructure',
      severity: 'error',
      comment: 'The domain must not depend on infrastructure or adapters.',
      from: { path: '^src/domain' },
      to: { path: '^src/(infrastructure|api)' },
    },
    {
      name: 'domain-no-application',
      severity: 'error',
      comment: 'The domain must not depend on the application layer.',
      from: { path: '^src/domain' },
      to: { path: '^src/application' },
    },
    {
      name: 'application-no-infrastructure',
      severity: 'error',
      comment: 'The application layer depends on ports, never on concrete adapters.',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|api)' },
    },
    {
      name: 'domain-no-frameworks',
      severity: 'error',
      comment: 'The domain must stay framework-free.',
      from: { path: '^src/domain' },
      to: { path: 'node_modules/(@nestjs|express|fastify|@prisma|@whiskeysockets|ioredis|socket.io)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'No circular dependencies.',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    exclude: { path: '(node_modules|dist|tests)' },
  },
};
