import { defineConfig, devices } from '@playwright/test';

/**
 * Werewolf SG — Playwright E2E Configuration
 * Runs against the Vite dev server (USE_MOCK=true — no real backend required).
 * Start the dev server first: `npm run dev`
 * Run tests:  `npm run test:e2e`
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,   // mock data is shared state — run sequentially to avoid cross-test flakiness
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'tests/e2e/playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  timeout: 60_000,  // per-test timeout (default is 30s)

  /* Dev server — auto-started before tests, stopped after */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'Mobile Safari (iPhone 14)',
      use: { ...devices['iPhone 14'] },
      testMatch: /mobile\.spec\.ts/,   // only run mobile-specific spec on this project
    },
  ],
});
