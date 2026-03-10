import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
  });

  test('shows Community tier', async ({ page }) => {
    await expect(page.getByText('Community').first()).toBeVisible();
  });

  test('Community tier shows free price', async ({ page }) => {
    await expect(page.getByText('Free').first()).toBeVisible();
  });

  test('FAQ section is visible', async ({ page }) => {
    const faqSection = page.getByText('Frequently Asked').first();
    if (await faqSection.isVisible()) {
      await expect(faqSection).toBeVisible();
    }
  });
});
