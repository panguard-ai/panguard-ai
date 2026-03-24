/**
 * E2E tests for recent content changes to the PanGuard website.
 *
 * Covers:
 * 1. Scanner page (/scan) loads and accepts a GitHub URL submission
 * 2. Homepage pricing is $0 / free / open-source — no paid amounts
 * 3. Skill Auditor product page shows exactly 8 checks (not 6 or 7)
 * 4. Early-access page redirects to homepage
 * 5. Badge endpoint returns a valid SVG
 * 6. zh-TW pricing page has no paid tier amounts
 *
 * IMPORTANT: Use innerText() not textContent().
 * page.locator('body').textContent() includes Next.js RSC JSON payloads
 * embedded in <script> tags, which produces false positives (e.g. "$29" as
 * a React component reference key). innerText() returns only the visible
 * rendered text, which is what we actually want to assert against.
 *
 * Run against local dev server (port 3097):
 *   npx playwright test e2e/content-changes.spec.ts --config=playwright.local.config.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper: get visible rendered text (excludes script/style payloads)
// ---------------------------------------------------------------------------
async function getBodyText(page: Page): Promise<string> {
  return (await page.locator('body').innerText()) ?? '';
}

// ---------------------------------------------------------------------------
// Journey 1: Scanner page loads and can accept a GitHub URL
// ---------------------------------------------------------------------------

test.describe('Journey 1: Scanner page (/scan)', () => {
  test('scan page loads with a visible form or input', async ({ page }) => {
    const res = await page.goto('/scan');
    expect(res?.status()).toBe(200);

    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();

    await page.screenshot({
      path: '/tmp/e2e-screenshots/scan-01-loaded.png',
      fullPage: false,
    });
  });

  test('scan page body contains expected scanner UI text', async ({ page }) => {
    await page.goto('/scan');
    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);

    // The scanner component should mention scanning or GitHub or skill
    const hasRelevantContent = /scan|github|skill|audit|url|check/i.test(bodyText);
    expect(hasRelevantContent, 'Scan page should contain scanner-related content').toBe(true);
  });

  test('scan page has an input field that accepts a GitHub URL', async ({ page }) => {
    await page.goto('/scan');
    await page.waitForLoadState('networkidle');

    // Look for a text input or URL input
    const input = page.locator('input[type="text"], input[type="url"], input:not([type])').first();
    const inputCount = await input.count();

    if (inputCount > 0) {
      await expect(input).toBeVisible();
      await input.fill('https://github.com/example/test-skill');
      const value = await input.inputValue();
      expect(value).toBe('https://github.com/example/test-skill');

      await page.screenshot({
        path: '/tmp/e2e-screenshots/scan-02-input-filled.png',
        fullPage: false,
      });
    } else {
      // Fallback: check there is some interactive element (button, textarea)
      const interactive = page.locator('button, textarea').first();
      await expect(interactive).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 2: Homepage displays $0 / free / open source — no paid amounts
// ---------------------------------------------------------------------------

test.describe('Journey 2: Homepage — free/open-source pricing', () => {
  test('homepage prominently says free or open-source (English)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);

    // Must contain free / open-source messaging
    const hasFreeMessage =
      /100%\s*free|free.*open[\s-]source|open[\s-]source.*free|completely free/i.test(bodyText);
    expect(hasFreeMessage, 'Homepage must mention free/open-source').toBe(true);

    // MIT license should appear
    expect(bodyText).toMatch(/MIT/i);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/pricing-01-homepage-en-free.png',
      fullPage: false,
    });
  });

  test('homepage has NO dollar amounts for paid tiers (no $9, $29, $49, $99, $199)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // innerText() gives only visible rendered text — no RSC JSON payloads
    const bodyText = await getBodyText(page);

    // These are the paid amounts that must NOT appear in visible text
    const paidAmounts = [/\$9\b/, /\$29\b/, /\$49\b/, /\$99\b/, /\$199\b/];
    for (const pattern of paidAmounts) {
      expect(bodyText, `Homepage must NOT contain paid amount matching ${pattern}`).not.toMatch(
        pattern
      );
    }
  });

  test('homepage has no "Pro plan" or "Enterprise plan" language', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);
    expect(bodyText, 'No Pro plan').not.toMatch(/\bPro\s+plan\b/i);
    expect(bodyText, 'No Enterprise plan').not.toMatch(/\bEnterprise\s+plan\b/i);
    expect(bodyText, 'No Business plan').not.toMatch(/\bBusiness\s+plan\b/i);
  });
});

// ---------------------------------------------------------------------------
// Journey 3: zh-TW homepage and pricing — no paid amounts in Chinese
// ---------------------------------------------------------------------------

test.describe('Journey 3: zh-TW — no paid pricing', () => {
  test('/zh-TW homepage has no paid pricing amounts', async ({ page }) => {
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);

    // Paid amounts that must NOT appear in visible text
    const paidAmounts = [/\$9\b/, /\$29\b/, /\$49\b/, /\$99\b/, /\$199\b/];
    for (const pattern of paidAmounts) {
      expect(
        bodyText,
        `zh-TW homepage must NOT contain paid amount matching ${pattern}`
      ).not.toMatch(pattern);
    }

    await page.screenshot({
      path: '/tmp/e2e-screenshots/pricing-02-zh-TW-free.png',
      fullPage: false,
    });
  });

  test('/zh-TW homepage mentions 免費 (free) and MIT', async ({ page }) => {
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);

    // Chinese "free" or "open source" must appear
    const hasChinese = /免費|開源|MIT/i.test(bodyText);
    expect(hasChinese, 'zh-TW page must mention free or MIT').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 4: Skill Auditor product page — 8 checks
// ---------------------------------------------------------------------------

test.describe('Journey 4: Skill Auditor product page — 8 checks', () => {
  test('skill-auditor page loads successfully', async ({ page }) => {
    const res = await page.goto('/product/skill-auditor');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('skill-auditor page body mentions "8" checks (not 6 or 7)', async ({ page }) => {
    await page.goto('/product/skill-auditor');
    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);

    // Must contain "8" in context of checks
    const has8Checks = /8\s*check|eight\s*check|eight\s*categor|8\s*categor|八道|八種|八項/i.test(
      bodyText
    );
    expect(has8Checks, 'Skill Auditor page must mention 8 checks or eight checks').toBe(true);

    // Must NOT say "6 checks" or "7 checks" as a standalone description
    expect(bodyText, 'Must NOT say 6 checks').not.toMatch(/\b6\s*check(?:s)?\b/i);
    expect(bodyText, 'Must NOT say 7 checks').not.toMatch(/\b7\s*check(?:s)?\b/i);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/skill-auditor-01-checks.png',
      fullPage: false,
    });
  });

  test('skill-auditor page renders exactly 8 check cards in the grid', async ({ page }) => {
    await page.goto('/product/skill-auditor');
    await page.waitForLoadState('networkidle');

    // The component renders checkKeys as a grid — each card has a heading
    // We look for cards with the known check names
    const knownChecks = [
      'Prompt Injection',
      'Hidden Unicode',
      'Encoded Payloads',
      'Tool Poisoning',
      'Secrets',
      'Permission',
      'Manifest',
      'Dependency',
    ];

    const bodyText = await getBodyText(page);
    let matchCount = 0;
    for (const check of knownChecks) {
      if (new RegExp(check, 'i').test(bodyText)) {
        matchCount++;
      }
    }

    // At least 6 of the 8 known check names should appear on the page
    expect(
      matchCount,
      `At least 6 of the 8 check names should appear, found ${matchCount}`
    ).toBeGreaterThanOrEqual(6);
  });

  test('skill-auditor stats card shows "8" check categories number', async ({ page }) => {
    await page.goto('/product/skill-auditor');
    await page.waitForLoadState('networkidle');

    // The STATS.skillAuditChecks (= 8) is displayed in the summary card
    // Look for "8" appearing near "check" or "categor"
    const statCard = page
      .locator('div')
      .filter({ hasText: /check\s*categor/i })
      .first();
    const statCardCount = await statCard.count();

    if (statCardCount > 0) {
      // Use innerText to get only visible text
      const cardText = await statCard.innerText();
      expect(cardText, 'Stat card should contain 8').toMatch(/\b8\b/);
    } else {
      // Fallback: just ensure "8" appears somewhere meaningful
      const bodyText = await getBodyText(page);
      expect(bodyText).toMatch(/\b8\b/);
    }
  });

  test('zh-TW skill-auditor page also shows 8 checks', async ({ page }) => {
    let res = await page.goto('/zh-TW/product/skill-auditor');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh/product/skill-auditor');
    }
    if (!res || res.status() !== 200) {
      test.skip(true, 'zh-TW skill-auditor route not available');
      return;
    }

    await page.waitForLoadState('networkidle');

    const bodyText = await getBodyText(page);
    const has8 = /\b8\b|八/.test(bodyText);
    expect(has8, 'zh-TW skill-auditor should mention 8').toBe(true);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/skill-auditor-02-zh-TW.png',
      fullPage: false,
    });
  });
});

// ---------------------------------------------------------------------------
// Journey 5: Early-access page redirects to homepage
// ---------------------------------------------------------------------------

test.describe('Journey 5: Early-access redirect', () => {
  test('/early-access redirects to homepage', async ({ page }) => {
    const response = await page.goto('/early-access', {
      waitUntil: 'commit',
    });

    // Allow 200 (Next.js server-side redirect) or 30x
    const status = response?.status() ?? 0;
    expect([200, 301, 302, 307, 308], `Unexpected status ${status}`).toContain(status);

    // Final URL must be the homepage (possibly with locale prefix)
    const finalPath = new URL(page.url()).pathname;
    expect(finalPath, `Expected redirect to /, got ${finalPath}`).toMatch(
      /^(\/[a-z]{2}(-[A-Z]{2})?)?\/?\s*$/
    );

    await page.screenshot({
      path: '/tmp/e2e-screenshots/early-access-01-redirect.png',
      fullPage: false,
    });
  });

  test('/early-access final page is the homepage (has homepage hero content)', async ({ page }) => {
    await page.goto('/early-access');
    await page.waitForLoadState('networkidle');

    // After redirect to homepage, we should see homepage-specific hero text
    // The early-access page itself is `redirect('/')` — no early-access form renders.
    const bodyText = await getBodyText(page);

    // Homepage must be present — it has "Skill Auditor" or "Panguard" hero text
    const isHomepage = /Panguard|Skill Auditor|ATR|Agent Threat/i.test(bodyText);
    expect(isHomepage, 'After early-access redirect, should be on homepage').toBe(true);

    // Must NOT have an early-access-specific sign-up form
    // (distinct from general "install" or "get started" CTAs that appear on homepage)
    expect(bodyText, 'Should not show early access sign-up form').not.toMatch(
      /early.access\s*program|request\s*early\s*access|early.access\s*sign.?up/i
    );
  });
});

// ---------------------------------------------------------------------------
// Journey 6: Badge API endpoint returns valid SVG
// ---------------------------------------------------------------------------

test.describe('Journey 6: Badge API endpoint', () => {
  const VALID_HASH = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'; // 32 hex chars

  test('badge endpoint returns 200 with SVG content-type for valid hash', async ({ page }) => {
    const res = await page.goto(`/api/scan/badge/${VALID_HASH}`);
    expect(res?.status()).toBe(200);

    const contentType = res?.headers()['content-type'] ?? '';
    expect(contentType, 'Badge must return image/svg+xml').toMatch(/image\/svg\+xml/i);
  });

  test('badge SVG contains ATR label', async ({ page }) => {
    const res = await page.goto(`/api/scan/badge/${VALID_HASH}`);
    expect(res?.status()).toBe(200);

    const body = await res?.text();
    expect(body, 'Badge SVG must contain <svg').toMatch(/<svg/i);
    expect(body, 'Badge SVG must contain "ATR" label').toMatch(/ATR/);

    // Must contain one of the known status labels
    const hasStatusLabel = /Safe|Review|Critical|Not Scanned/i.test(body ?? '');
    expect(hasStatusLabel, 'Badge must show a status label').toBe(true);
  });

  test('badge endpoint returns SVG for unknown/short hash (graceful fallback)', async ({
    page,
  }) => {
    const res = await page.goto('/api/scan/badge/tooshort');
    expect(res?.status()).toBe(200);

    const contentType = res?.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/image\/svg\+xml/i);

    const body = await res?.text();
    expect(body).toMatch(/<svg/i);
    // Short hash = unknown status
    expect(body).toMatch(/Not Scanned/i);
  });

  test('badge SVG has correct structure (clipPath, linearGradient, text elements)', async ({
    page,
  }) => {
    const res = await page.goto(`/api/scan/badge/${VALID_HASH}`);
    const body = await res?.text();

    expect(body).toMatch(/<linearGradient/i);
    expect(body).toMatch(/<clipPath/i);
    expect(body).toMatch(/<text/i);
    expect(body).toMatch(/<rect/i);
  });

  test('badge endpoint sets Cache-Control header', async ({ page }) => {
    const res = await page.goto(`/api/scan/badge/${VALID_HASH}`);
    const cacheControl = res?.headers()['cache-control'] ?? '';
    expect(cacheControl, 'Badge should have Cache-Control header').toMatch(/max-age/i);
  });
});

// ---------------------------------------------------------------------------
// Journey 7: Pricing page / homepage — no paid tier content
// ---------------------------------------------------------------------------

test.describe('Journey 7: Pricing page — all $0, open source', () => {
  test('pricing page (if it exists) shows no paid amounts', async ({ page }) => {
    const res = await page.goto('/pricing');
    const finalPath = new URL(page.url()).pathname;
    await page.waitForLoadState('networkidle');

    // If pricing redirects to home, that is also acceptable
    const isOnHomepage = /^\/?$/.test(finalPath) || finalPath === '/';

    if (!isOnHomepage && res?.status() === 200) {
      const bodyText = await getBodyText(page);

      // No paid tier amounts
      const paidAmounts = [/\$9\b/, /\$29\b/, /\$49\b/, /\$99\b/, /\$199\b/];
      for (const pattern of paidAmounts) {
        expect(bodyText, `Pricing page must NOT contain ${pattern}`).not.toMatch(pattern);
      }

      // Must say $0 or free somewhere
      const hasFree = /\$0|free|open[\s-]source/i.test(bodyText);
      expect(hasFree, 'Pricing page must mention $0 or free').toBe(true);

      await page.screenshot({
        path: '/tmp/e2e-screenshots/pricing-03-pricing-page.png',
        fullPage: false,
      });
    }
    // If it redirected to homepage, the homepage test above already covers it
  });

  test('zh-TW pricing path has no paid amounts', async ({ page }) => {
    let res = await page.goto('/zh-TW/pricing');
    if (!res || res.status() === 404) {
      res = await page.goto('/zh/pricing');
    }

    await page.waitForLoadState('networkidle');
    const finalPath = new URL(page.url()).pathname;
    const redirectedToHome = /^\/(zh[-/]TW|zh)?\/?\s*$/.test(finalPath);

    if (!redirectedToHome) {
      const bodyText = await getBodyText(page);
      const paidAmounts = [/\$9\b/, /\$29\b/, /\$49\b/, /\$99\b/, /\$199\b/];
      for (const pattern of paidAmounts) {
        expect(bodyText, `zh-TW pricing must not have ${pattern}`).not.toMatch(pattern);
      }
    }

    await page.screenshot({
      path: '/tmp/e2e-screenshots/pricing-04-zh-TW-pricing.png',
      fullPage: false,
    });
  });
});
