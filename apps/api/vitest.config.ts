import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    setupFiles: ['./test/setup.ts'],
    // Cobertura sob demanda — `npm test -- --coverage`
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/server.ts',
        'src/**/*.routes.ts', // rotas usam DB — excluídas dos testes unitários
      ],
    },
  },
});
