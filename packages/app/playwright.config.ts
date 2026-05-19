/**
 * Playwright e2e config for @panguard-ai/app (customer dashboard, port 3001).
 *
 * The customer-facing dashboard (app.panguard.ai in production) is
 * Supabase-backed, so most flows require a live Postgres + Auth service
 * to fully exercise. The specs in ./e2e are written so that flows
 * requiring Supabase mark themselves `test.skip(...)` when the
 * PLAYWRIGHT_HAS_SUPABASE env var is not truthy, while flows that can
 * be exercised with route-level mocks (e.g. empty-state UI) run in CI.
 *
 * To run against a live local Supabase: export PLAYWRIGHT_HAS_SUPABASE=1
 * after `pnpm --filter @panguard-ai/app dev` is healthy on port 3001.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.APP_E2E_PORT ?? 3001);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.e2e.spec.ts'],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'test-results/app-e2e.xml' }]]
    : 'list',
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'pnpm --filter @panguard-ai/app dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
