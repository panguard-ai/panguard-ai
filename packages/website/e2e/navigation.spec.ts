import { test, expect } from '@playwright/test';

test.describe('Core navigation', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Panguard/i);
  });

  test('nav links are visible', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('key pages return 200', async ({ page }) => {
    const paths = ['/', '/pricing', '/compliance', '/about', '/contact'];
    for (const p of paths) {
      const res = await page.goto(p);
      expect(res?.status()).toBe(200);
    }
  });

  test('404 page for unknown route', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
  });
});
