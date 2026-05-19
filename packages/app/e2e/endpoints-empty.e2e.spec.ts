/**
 * Endpoints page empty state.
 *
 * /w/[slug]/endpoints renders a "No endpoints yet" card with the copy-paste
 * `npx @panguard-ai/panguard login` command and a link to docs.panguard.ai
 * when the server-side fetchEndpoints query returns an empty list.
 *
 * The empty state is rendered server-side from a Supabase query, so to
 * exercise it cleanly we need either a live Supabase with an empty
 * workspace, or middleware/session mocks. Skipping in CI until the
 * Supabase test container ships (tracked in docs/e2e-coverage.md).
 *
 * Local run (with a real empty workspace named "test-ws"):
 *   PLAYWRIGHT_HAS_SUPABASE=1 \
 *   PLAYWRIGHT_TEST_WORKSPACE=test-ws \
 *   PLAYWRIGHT_TEST_USER_COOKIE='sb-...' \
 *   pnpm --filter @panguard-ai/app exec playwright test endpoints-empty
 */
import { test, expect } from '@playwright/test';

const HAS_SUPABASE = Boolean(process.env.PLAYWRIGHT_HAS_SUPABASE);
const WORKSPACE_SLUG = process.env.PLAYWRIGHT_TEST_WORKSPACE ?? 'test-ws';

test.describe('Endpoints page — empty state', () => {
  test.skip(
    !HAS_SUPABASE,
    'Empty-state UI is rendered server-side from a Supabase query. ' +
      'Mocking is not possible without intercepting the server-side fetch ' +
      '(the page is a server component). Requires a live Supabase test ' +
      'instance with an empty workspace. Set PLAYWRIGHT_HAS_SUPABASE=1.'
  );

  test('renders "No endpoints yet" + npx login command + docs link', async ({ page }) => {
    await page.goto(`/w/${WORKSPACE_SLUG}/endpoints`);

    await expect(page.getByRole('heading', { name: /No endpoints yet/i })).toBeVisible();

    // The install command is intentionally rendered inside a <pre> block
    // so copy-paste preserves whitespace.
    const preBlock = page.locator('pre').filter({ hasText: /npx @panguard-ai\/panguard login/i });
    await expect(preBlock).toBeVisible();
    await expect(preBlock).toContainText('npx @panguard-ai/panguard login');

    const docsLink = page.locator('a[href*="docs.panguard.ai/install"]');
    await expect(docsLink).toBeVisible();
  });
});
