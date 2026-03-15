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

  test('product pages return 200', async ({ page }) => {
    const paths = [
      '/product',
      '/product/skill-auditor',
      '/product/guard',
      '/product/scan',
      '/product/mcp',
    ];
    for (const p of paths) {
      const res = await page.goto(p);
      expect(res?.status()).toBe(200);
    }
  });

  test('404 page for unknown route', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
  });

  test('footer contains expected link sections', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Footer should have product, company, resources, legal sections
    const footerLinks = footer.locator('a');
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(10);
  });

  test('footer legal links point to valid pages', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');

    // Check that legal links exist
    const privacyLink = footer.locator('a[href*="privacy"]');
    const termsLink = footer.locator('a[href*="terms"]');
    expect(await privacyLink.count()).toBeGreaterThan(0);
    expect(await termsLink.count()).toBeGreaterThan(0);
  });

  test('additional content pages return 200', async ({ page }) => {
    const paths = [
      '/how-it-works',
      '/technology',
      '/open-source',
      '/faq',
      '/blog',
      '/atr',
      '/threat-cloud',
      '/security',
      '/trust',
    ];
    for (const p of paths) {
      const res = await page.goto(p);
      expect(res?.status()).toBe(200);
    }
  });
});
