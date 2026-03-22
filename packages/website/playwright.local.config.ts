/**
 * Playwright config for running E2E tests against a locally running dev server
 * on port 3097 (started separately with: npx next dev -p 3097).
 *
 * Usage:
 *   npx playwright test --config=playwright.local.config.ts
 *   npx playwright test e2e/content-changes.spec.ts --config=playwright.local.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-local', open: 'never' }],
    ['junit', { outputFile: 'playwright-report-local/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3097',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer block — assumes server already running on port 3097
});
