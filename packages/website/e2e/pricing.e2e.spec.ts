/**
 * Pricing page — three-tier integrity check.
 *
 * Verifies that /pricing renders Community, Pilot, Enterprise tiers with
 * correct prices and CTAs. The Pilot CTA is the most fragile because it
 * routes through the cross-origin `/api/me/session` probe on app.panguard.ai
 * before deciding whether to start Stripe Checkout or bounce to /login.
 * In CI we have no app backend, so we mock the probe to 401 (guest) and
 * assert that the click navigates to /login with the correct next + intent
 * query params.
 *
 * The website renders at /[locale]/pricing — visiting /pricing redirects
 * to /en/pricing via next-intl middleware.
 */
import { test, expect } from '@playwright/test';

const APP_ORIGIN_PATTERN = /https?:\/\/(app\.panguard\.ai|localhost:\d+)/;

test.describe('Pricing page — three tiers', () => {
  test.beforeEach(async ({ page }) => {
    // Force guest mode by stubbing the cross-origin auth probe.
    await page.route(/\/api\/me\/session/, (route) => route.fulfill({ status: 401, body: '' }));
    await page.goto('/pricing');
  });

  test('renders Community, Pilot, Enterprise tier labels', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Community/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Pilot$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Enterprise/ })).toBeVisible();
  });

  test('shows tier prices: $0 / $25K / $150 floor', async ({ page }) => {
    await expect(page.getByText('$0', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/\$25K/).first()).toBeVisible();
    // Enterprise floor: shown as $150K or $150,000 or "$100K × 2 years"
    // somewhere on the page. The Enterprise card itself shows a range.
    await expect(page.getByText(/\$1(00|50)K/).first()).toBeVisible();
  });

  test('Community CTA links to install path (GitHub or npm)', async ({ page }) => {
    const installCta = page.getByRole('link', { name: /Install now/i }).first();
    await expect(installCta).toBeVisible();
    const href = await installCta.getAttribute('href');
    expect(href).toMatch(/github\.com|npmjs\.com/);
  });

  test('Enterprise CTA links to /contact?tier=enterprise', async ({ page }) => {
    const enterpriseCta = page.locator('a[href*="/contact?tier=enterprise"]').first();
    await expect(enterpriseCta).toBeVisible();
  });

  test('Pilot CTA is a button (not just a link)', async ({ page }) => {
    const pilotBtn = page.getByRole('button', { name: /Start Pilot/i }).first();
    await expect(pilotBtn).toBeVisible();
    await expect(pilotBtn).toBeEnabled();
  });

  test('Pilot click (unauthenticated) redirects to /login?next=/pricing&intent=pilot', async ({
    page,
  }) => {
    const pilotBtn = page.getByRole('button', { name: /Start Pilot/i }).first();
    await expect(pilotBtn).toBeVisible();

    // The handler does window.location.href = `${APP_ORIGIN}/login?next=...&intent=pilot`.
    // We don't actually navigate cross-origin in CI (the app host isn't
    // running), so intercept the navigation and assert the URL shape.
    const navPromise = page.waitForRequest(
      (req) =>
        /\/login\?/.test(req.url()) &&
        req.url().includes('intent=pilot') &&
        req.url().includes('next='),
      { timeout: 8_000 }
    );

    await pilotBtn.click();
    const nav = await navPromise.catch(() => null);

    if (nav) {
      const url = new URL(nav.url());
      expect(url.pathname).toBe('/login');
      expect(url.searchParams.get('intent')).toBe('pilot');
      expect(url.searchParams.get('next')).toMatch(/\/pricing$/);
      expect(nav.url()).toMatch(APP_ORIGIN_PATTERN);
    } else {
      // Fallback: assert the rendered page URL itself navigated.
      await expect(page).toHaveURL(/\/login\?.*intent=pilot/, { timeout: 8_000 });
    }
  });
});
