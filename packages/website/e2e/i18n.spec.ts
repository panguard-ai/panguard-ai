import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('Chinese locale loads at /zh-TW', async ({ page }) => {
    const res = await page.goto('/zh-TW');
    expect(res?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  });

  test('English locale loads at /', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('Chinese pricing page loads', async ({ page }) => {
    const res = await page.goto('/zh-TW/pricing');
    expect(res?.status()).toBe(200);
  });
});
