import { defineConfig, devices } from '@playwright/test';

/**
 * Live-site Playwright configuration targeting https://panguard.ai
 *
 * Usage:
 *   npx playwright test e2e/live-site-content-fixes.spec.ts --config=playwright.live.config.ts
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-live', open: 'never' }],
    ['junit', { outputFile: 'playwright-report-live/results.xml' }],
  ],
  use: {
    baseURL: 'https://panguard.ai',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'off',
    // Give the live site more time to respond
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — tests run against the live remote site
});
