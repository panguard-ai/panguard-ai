import { test, expect } from '@playwright/test';

test.describe('Legal Pages', () => {
  const legalPages = [
    { path: '/legal/privacy', title: 'Privacy' },
    { path: '/legal/terms', title: 'Terms' },
    { path: '/legal/cookies', title: 'Cookie' },
    { path: '/legal/sla', title: 'SLA' },
    { path: '/legal/dpa', title: 'Data Processing' },
    { path: '/legal/acceptable-use', title: 'Acceptable Use' },
    { path: '/legal/responsible-disclosure', title: 'Disclosure' },
    { path: '/legal/security', title: 'Security' },
  ];

  for (const { path, title } of legalPages) {
    test(`${path} returns 200 and has content`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      // Legal pages should have meaningful text content
      const mainText = await page.locator('main').textContent();
      expect(mainText?.length).toBeGreaterThan(100);
    });
  }

  test('Chinese legal pages load', async ({ page }) => {
    for (const { path } of legalPages) {
      const res = await page.goto(`/zh${path}`);
      expect(res?.status()).toBe(200);
    }
  });
});
