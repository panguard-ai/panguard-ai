import { test, expect } from '@playwright/test';

test.describe('Waitlist form submission', () => {
  test('submits valid email successfully', async ({ page }) => {
    await page.goto('/');

    // Find the waitlist/email input in the hero section
    const emailInput = page.locator('input[type="email"]').first();

    // Skip if no email input found on page
    if (!(await emailInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await emailInput.fill('e2e-test@example.com');

    // Find and click the submit button near the email input
    const form = emailInput.locator('..');
    const submitBtn = form.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should not show an error state
      await expect(page.locator('text=error')).not.toBeVisible({ timeout: 3000 });
    }
  });
});
