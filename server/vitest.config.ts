import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false, // explicit imports keep tests readable
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
      },
      exclude: [
        'src/server.ts',
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'dist/**',
      ],
    },
    // Unit tests are fast; integration + concurrency tests need more time
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
