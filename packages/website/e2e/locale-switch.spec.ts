import { test, expect } from '@playwright/test';

test.describe('Locale Switching', () => {
  test('switch from English to Chinese', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Click the Chinese locale button
    const zhButton = page.getByRole('button', { name: /中文/i });
    if (await zhButton.isVisible().catch(() => false)) {
      await zhButton.click();
      await page.waitForURL('**/zh**');
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    }
  });

  test('switch from Chinese to English', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');

    const enButton = page.getByRole('button', { name: /EN/i });
    if (await enButton.isVisible().catch(() => false)) {
      await enButton.click();
      await page.waitForURL(/\/(?:en)?$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    }
  });

  test('locale persists across navigation', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');

    // Navigate to another page
    await page.goto('/zh/pricing');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  });

  test('subpages load in both locales', async ({ page }) => {
    const paths = ['/pricing', '/about', '/contact', '/how-it-works'];
    for (const path of paths) {
      const enRes = await page.goto(path);
      expect(enRes?.status()).toBe(200);

      const zhRes = await page.goto(`/zh${path}`);
      expect(zhRes?.status()).toBe(200);
    }
  });
});
