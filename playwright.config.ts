import { defineConfig } from '@playwright/test';

/**
 * Browser smoke tests. The `dev` project drives the dev server (it exposes
 * __game / __debug); the `prod` project boots the built bundle from `vite preview`
 * (run `npm run build` first; CI does) to catch bundling and service-worker slips.
 * `npm run e2e` locally; CI runs the same after `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'dev', testMatch: /smoke\.spec\.ts/, use: { baseURL: 'http://localhost:5199' } },
    { name: 'prod', testMatch: /prod\.spec\.ts/, use: { baseURL: 'http://localhost:5198' } },
  ],
  webServer: [
    {
      command: 'npx vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npx vite preview --port 5198 --strictPort',
      url: 'http://localhost:5198',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
