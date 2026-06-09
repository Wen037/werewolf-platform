import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false, // explicit imports keep tests readable
    environment: 'node',
    // Only scan source test files — prevents dist/*.test.js from being picked up
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
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
    // Give MongoMemoryServer 60 s to start — prevents flaky timeout on slow machines
    env: { MONGOMS_INSTANCE_STARTUP_TIMEOUT: '60000' },
    // Unit tests are fast; integration + concurrency tests need more time
    testTimeout: 30000,
    hookTimeout: 60000,
    // Run test files sequentially so each file gets its own MongoMemoryServer instance
    // without resource contention. Individual tests within a file still run in parallel.
    fileParallelism: false,
  },
});
