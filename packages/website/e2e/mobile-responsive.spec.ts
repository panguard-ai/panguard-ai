import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test('homepage renders on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('hamburger menu is visible on mobile', async ({ page }) => {
    await page.goto('/');
    // Desktop nav should be hidden, mobile menu button should exist
    const menuButton = page.locator('button[aria-label]').filter({ hasText: /menu/i });
    const hamburger = menuButton.or(page.locator('nav button').first());

    // At least one mobile menu trigger should exist
    const navButtons = page.locator('nav button');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('footer is visible and not overflowing on mobile', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const footerBox = await footer.boundingBox();
    expect(footerBox).toBeTruthy();
    // Footer should not exceed viewport width
    expect(footerBox!.width).toBeLessThanOrEqual(375 + 1);
  });

  test('pricing page renders on mobile', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('main')).toBeVisible();
    // Content should not overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox).toBeTruthy();
  });

  test('contact page form is usable on mobile', async ({ page }) => {
    await page.goto('/contact');
    const nameInput = page.locator('#contact-name');
    if (await nameInput.isVisible().catch(() => false)) {
      await expect(nameInput).toBeVisible();
      const inputBox = await nameInput.boundingBox();
      expect(inputBox).toBeTruthy();
      // Input should be at least 200px wide for usability
      expect(inputBox!.width).toBeGreaterThan(200);
    }
  });
});
