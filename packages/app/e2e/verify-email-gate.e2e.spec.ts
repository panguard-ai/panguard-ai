/**
 * Verify-email gate — middleware redirect for unconfirmed users.
 *
 * The customer dashboard middleware (packages/app/src/middleware.ts) routes
 * any signed-in-but-unconfirmed user away from /onboarding (and every other
 * protected prefix) to /verify-email. The verify page reads `user.email`
 * from the Supabase server client and renders a "Resend link" button bound
 * to the resendVerification server action.
 *
 * Running this test against the real Supabase server-side requires a test
 * user with an unconfirmed email, a session cookie issued for that user,
 * and the Supabase service URL + keys wired into the running Next dev
 * server. Without those, we skip — there is no safe way to fake the
 * supabase.auth.getUser() response from the Playwright side alone.
 *
 * To run locally:
 *   PLAYWRIGHT_HAS_SUPABASE=1 \
 *   PLAYWRIGHT_TEST_USER_EMAIL=e2e-unverified@example.com \
 *   PLAYWRIGHT_TEST_USER_COOKIE='sb-...' \
 *   pnpm --filter @panguard-ai/app exec playwright test verify-email-gate
 */
import { test, expect } from '@playwright/test';

const HAS_SUPABASE = Boolean(process.env.PLAYWRIGHT_HAS_SUPABASE);
const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_USER_EMAIL ?? '';
const TEST_COOKIE = process.env.PLAYWRIGHT_TEST_USER_COOKIE ?? '';

test.describe('Verify-email gate', () => {
  test.skip(
    !HAS_SUPABASE,
    'Requires a live Supabase Auth test instance and an unverified test user. ' +
      'Set PLAYWRIGHT_HAS_SUPABASE=1 + PLAYWRIGHT_TEST_USER_EMAIL + PLAYWRIGHT_TEST_USER_COOKIE.'
  );

  test.beforeEach(async ({ context, baseURL }) => {
    if (!TEST_COOKIE || !baseURL) return;
    const host = new URL(baseURL).hostname;
    // Inject the Supabase session cookie issued by the test harness.
    // The cookie name follows Supabase SSR convention sb-<projectref>-auth-token.
    const cookieName = process.env.PLAYWRIGHT_TEST_COOKIE_NAME ?? 'sb-localhost-auth-token';
    await context.addCookies([
      {
        name: cookieName,
        value: TEST_COOKIE,
        domain: host,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  });

  test('navigating to /onboarding redirects to /verify-email', async ({ page }) => {
    const response = await page.goto('/onboarding');
    // Either the middleware 307s us to /verify-email server-side, or the
    // final landed URL is /verify-email. Both are acceptable.
    await expect(page).toHaveURL(/\/verify-email$/);
    if (response) {
      expect([200, 307, 308]).toContain(response.status());
    }
  });

  test('verify-email page shows the user email in the body', async ({ page }) => {
    await page.goto('/verify-email');
    if (TEST_EMAIL) {
      await expect(page.getByText(TEST_EMAIL)).toBeVisible();
    } else {
      // Fall back to asserting the page rendered the email-shaped copy.
      await expect(page.getByText(/Check your email/i)).toBeVisible();
    }
  });

  test('Resend link button is present', async ({ page }) => {
    await page.goto('/verify-email');
    const resendBtn = page.getByRole('button', { name: /Resend link/i });
    await expect(resendBtn).toBeVisible();
    await expect(resendBtn).toBeEnabled();
  });
});
