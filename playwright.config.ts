import { defineConfig } from '@playwright/test';

/**
 * Browser smoke tests against the dev server (it exposes __game / __debug).
 * `npm run e2e` locally; CI runs the same after `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
