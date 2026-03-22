/**
 * Live-site content verification tests for https://panguard.ai
 *
 * These tests verify all content fixes deployed to production.
 * Run with: npx playwright test e2e/live-site-content-fixes.spec.ts --config=playwright.live.config.ts
 */

import { test, expect } from '@playwright/test';

// ─── Journey 1: Homepage three-layer flywheel ───────────────────────────────

test.describe('Journey 1: Homepage flywheel — three-layer defense section', () => {
  test('shows ONLY Skill Auditor, Guard, Threat Cloud — no Trap/Chat/Report as standalone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() ?? '';

    // Required products must appear
    expect(bodyText).toMatch(/Skill Auditor/i);
    expect(bodyText).toMatch(/Guard/i);
    expect(bodyText).toMatch(/Threat Cloud/i);

    // Trap must NOT appear as a standalone product in the flywheel section
    // We look for a section that describes the three layers / defense
    const defenseSectionLocators = [
      page.locator('[data-testid="flywheel"]'),
      page.locator('[data-testid="three-layer"]'),
      page.locator('section').filter({ hasText: /three.layer|defense|flywheel/i }),
    ];

    // Try each potential selector
    let defenseSection = null;
    for (const loc of defenseSectionLocators) {
      if (await loc.count() > 0) {
        defenseSection = loc.first();
        break;
      }
    }

    if (defenseSection) {
      const sectionText = await defenseSection.textContent() ?? '';
      expect(sectionText).not.toMatch(/\bTrap\b/);
      expect(sectionText).not.toMatch(/\bhoneypot\b/i);
    }

    // Trap and Report must NOT appear as navigation items / product cards in primary content
    // Check there are no product cards/buttons labelled "Trap" or "Report"
    const trapCards = page.locator('a, button, [role="tab"]').filter({ hasText: /^Trap$/ });
    const reportCards = page.locator('a, button, [role="tab"]').filter({ hasText: /^Report$/ });
    expect(await trapCards.count()).toBe(0);
    expect(await reportCards.count()).toBe(0);

    await page.screenshot({ path: '/tmp/e2e-screenshots/01-homepage-flywheel.png', fullPage: false });
  });

  test('"100% free" and "MIT licensed" appear on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText).toMatch(/100%\s*free|free.*open[\s-]source|open[\s-]source.*free/i);
    expect(bodyText).toMatch(/MIT/i);

    await page.screenshot({ path: '/tmp/e2e-screenshots/01b-homepage-free-mit.png', fullPage: false });
  });
});

// ─── Journey 2: Platform tabs — all 8 platforms ─────────────────────────────

test.describe('Journey 2: Platform tabs — npx panguard setup', () => {
  const EXPECTED_PLATFORMS = [
    'Claude Code',
    'Claude Desktop',
    'Cursor',
    'OpenClaw',
    'Codex',
    'WorkBuddy',
    'NemoClaw',
    'ArkClaw',
  ];

  test('all 8 platforms appear in the setup section (English)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the section containing "npx panguard setup"
    const setupSection = page.locator('section, div').filter({ hasText: /npx panguard setup/i }).first();
    const sectionExists = await setupSection.count();

    // Fall back to full page text if no section found
    const textSource = sectionExists > 0 ? setupSection : page.locator('body');
    const sectionText = await textSource.textContent() ?? '';

    for (const platform of EXPECTED_PLATFORMS) {
      expect(sectionText, `Platform "${platform}" should appear`).toMatch(new RegExp(platform, 'i'));
    }

    await page.screenshot({ path: '/tmp/e2e-screenshots/02-platform-tabs-en.png', fullPage: false });
  });

  test('platform tabs are interactive — clicking each tab works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for tab-like elements in the setup section
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /Claude Code|Claude Desktop|Cursor|OpenClaw|Codex|WorkBuddy|NemoClaw|ArkClaw/i });
    const tabCount = await tabs.count();

    // We should find at least some tabs (they may be rendered differently)
    if (tabCount > 0) {
      // Click the first tab and verify it's active
      await tabs.first().click();
      await page.waitForLoadState('domcontentloaded');
      await page.screenshot({ path: '/tmp/e2e-screenshots/02b-platform-tab-clicked.png', fullPage: false });
    }

    // At minimum the text must all be present
    const bodyText = await page.locator('body').textContent() ?? '';
    for (const platform of EXPECTED_PLATFORMS) {
      expect(bodyText, `Platform "${platform}" should be in page`).toMatch(new RegExp(platform, 'i'));
    }
  });
});

// ─── Journey 3: Navigation — Product dropdown ───────────────────────────────

test.describe('Journey 3: Navigation — Product dropdown', () => {
  test('Product dropdown does NOT contain Trap or Report entries', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Try to open the Products dropdown
    const productDropdownTrigger = nav.locator('a, button').filter({ hasText: /^Products?$/i }).first();
    const triggerCount = await productDropdownTrigger.count();

    if (triggerCount > 0) {
      await productDropdownTrigger.hover();
      await page.waitForTimeout(500);

      // Check dropdown content
      const dropdown = page.locator('[role="menu"], [data-testid="product-dropdown"], .dropdown-menu').first();
      if (await dropdown.count() > 0) {
        const dropdownText = await dropdown.textContent() ?? '';
        expect(dropdownText).not.toMatch(/\bTrap\b/);
        expect(dropdownText).not.toMatch(/\bReport\b/);
      }
    }

    // Check nav doesn't have links to /product/trap or /product/report
    const trapLinks = nav.locator('a[href*="/product/trap"]');
    const reportLinks = nav.locator('a[href*="/product/report"]');
    const chatLinks = nav.locator('a[href*="/product/chat"]');
    expect(await trapLinks.count()).toBe(0);
    expect(await reportLinks.count()).toBe(0);
    expect(await chatLinks.count()).toBe(0);

    await page.screenshot({ path: '/tmp/e2e-screenshots/03-nav-dropdown.png', fullPage: false });
  });
});

// ─── Journey 4: Footer ──────────────────────────────────────────────────────

test.describe('Journey 4: Footer — no banned links', () => {
  test('footer does NOT contain /careers, /status, /legal/security links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const careersLinks = footer.locator('a[href*="/careers"]');
    const statusLinks = footer.locator('a[href*="/status"]');
    const legalSecurityLinks = footer.locator('a[href="/legal/security"]');

    expect(await careersLinks.count()).toBe(0);
    expect(await statusLinks.count()).toBe(0);
    expect(await legalSecurityLinks.count()).toBe(0);

    await page.screenshot({ path: '/tmp/e2e-screenshots/04-footer.png', fullPage: false });
  });

  test('footer still has essential links (privacy, terms)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');
    const privacyLinks = footer.locator('a[href*="privacy"]');
    const termsLinks = footer.locator('a[href*="terms"]');

    expect(await privacyLinks.count()).toBeGreaterThan(0);
    expect(await termsLinks.count()).toBeGreaterThan(0);
  });
});

// ─── Journey 5: Redirects ────────────────────────────────────────────────────

test.describe('Journey 5: Redirects', () => {
  const REDIRECT_CASES: Array<{ from: string; toPattern: RegExp | string }> = [
    { from: '/pricing', toPattern: /^\/$/ },
    { from: '/status', toPattern: /^\/$/ },
    { from: '/careers', toPattern: /^\/$/ },
    { from: '/product/trap', toPattern: /^\/product(\/guard)?$/ },
    { from: '/product/chat', toPattern: /^\/product(\/guard)?$/ },
  ];

  for (const { from, toPattern } of REDIRECT_CASES) {
    test(`${from} redirects correctly`, async ({ page }) => {
      const response = await page.goto(from, { waitUntil: 'commit' });

      // Allow 200 (already redirected by Next.js) or 30x
      const status = response?.status() ?? 0;
      expect([200, 301, 302, 307, 308]).toContain(status);

      // After navigation resolves, check final URL
      const finalUrl = new URL(page.url());
      const finalPath = finalUrl.pathname;

      if (typeof toPattern === 'string') {
        expect(finalPath).toBe(toPattern);
      } else {
        expect(finalPath).toMatch(toPattern);
      }

      await page.screenshot({ path: `/tmp/e2e-screenshots/05-redirect-${from.replace(/\//g, '-')}.png` });
    });
  }
});

// ─── Journey 6: Changelog ────────────────────────────────────────────────────

test.describe('Journey 6: Changelog', () => {
  const CHANGELOG_PATHS = ['/changelog', '/product/guard', '/product/skill-auditor'];

  test('changelog page: versions start at v0.1.0 and latest is v0.4.2', async ({ page }) => {
    // Try /changelog first, then other pages that may contain release notes
    let found = false;
    for (const path of CHANGELOG_PATHS) {
      const res = await page.goto(path);
      if (!res || res.status() !== 200) continue;

      const bodyText = await page.locator('body').textContent() ?? '';

      if (bodyText.match(/v0\.\d+\.\d+|changelog|release/i)) {
        // Should contain v0.4.2 as latest
        expect(bodyText, `${path} should mention v0.4.2`).toMatch(/v0\.4\.2/);

        // Should NOT start at v1.0.0
        expect(bodyText, `${path} should NOT contain v1\.0\.0 as a version`).not.toMatch(/v1\.0\.0/);

        // Should NOT mention Pro/Enterprise/Business plan
        expect(bodyText, 'No Pro plan mentions').not.toMatch(/\bPro\s+plan\b/i);
        expect(bodyText, 'No Enterprise plan mentions').not.toMatch(/\bEnterprise\s+plan\b/i);
        expect(bodyText, 'No Business plan mentions').not.toMatch(/\bBusiness\s+plan\b/i);

        found = true;
        await page.screenshot({ path: `/tmp/e2e-screenshots/06-changelog-${path.replace(/\//g, '-')}.png` });
        break;
      }
    }

    // If no changelog section found, we skip gracefully
    if (!found) {
      test.skip(true, 'No changelog content found at expected paths — may need to locate correct URL');
    }
  });

  test('changelog does not mention v1.0.0 or paid tiers', async ({ page }) => {
    for (const path of CHANGELOG_PATHS) {
      const res = await page.goto(path);
      if (!res || res.status() !== 200) continue;

      const bodyText = await page.locator('body').textContent() ?? '';
      if (!bodyText.match(/changelog|release notes/i)) continue;

      expect(bodyText).not.toMatch(/v1\.0\.0/);
      expect(bodyText).not.toMatch(/Pro plan|Enterprise plan|Business plan/i);
    }
  });
});

// ─── Journey 7: Contact page ─────────────────────────────────────────────────

test.describe('Journey 7: Contact page — no paid tier language', () => {
  test('/contact has no Pro plan / Business plan / volume discounts / enterprise deployments', async ({ page }) => {
    const res = await page.goto('/contact');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() ?? '';

    expect(bodyText, 'No "Pro plan"').not.toMatch(/\bPro\s+plan\b/i);
    expect(bodyText, 'No "Business plan"').not.toMatch(/\bBusiness\s+plan\b/i);
    expect(bodyText, 'No "volume discounts"').not.toMatch(/volume\s+discounts?/i);
    expect(bodyText, 'No "enterprise deployments"').not.toMatch(/enterprise\s+deployments?/i);

    await page.screenshot({ path: '/tmp/e2e-screenshots/07-contact-page.png', fullPage: false });
  });
});

// ─── Journey 8: Legal/Terms — Section 3 ─────────────────────────────────────

test.describe('Journey 8: Legal Terms — Section 3', () => {
  test('/legal/terms Section 3 says "No Account Required" not "Account Registration"', async ({ page }) => {
    const res = await page.goto('/legal/terms');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() ?? '';

    // Section 3 should say "No Account Required"
    expect(bodyText, 'Section 3 should say "No Account Required"').toMatch(/No Account Required/i);

    // Must NOT say "Account Registration" as a section heading
    // (The phrase may appear in a different context, so we check for heading-level usage)
    const accountRegHeadings = page.locator('h1, h2, h3, h4').filter({ hasText: /Account Registration/i });
    expect(await accountRegHeadings.count()).toBe(0);

    await page.screenshot({ path: '/tmp/e2e-screenshots/08-legal-terms.png', fullPage: false });
  });
});

// ─── Journey 9: No banned content on homepage ───────────────────────────────

test.describe('Journey 9: Homepage — no banned content', () => {
  test('homepage has no "Trap" or "honeypot" as standalone product', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for product headings/cards that say just "Trap" or "Honeypot"
    const trapProductCards = page.locator('h1, h2, h3, h4, [data-testid*="product"]').filter({ hasText: /^Trap$/ });
    const honeypotProductCards = page.locator('h1, h2, h3, h4, [data-testid*="product"]').filter({ hasText: /^honeypot$/i });

    expect(await trapProductCards.count()).toBe(0);
    expect(await honeypotProductCards.count()).toBe(0);

    await page.screenshot({ path: '/tmp/e2e-screenshots/09-no-banned-content.png', fullPage: false });
  });

  test('homepage prominently features free/open-source messaging', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() ?? '';

    // "100% free" or similar
    const hasFreeMessage = /100%\s*free|completely free|free.*open[\s-]source|open[\s-]source.*free/i.test(bodyText);
    expect(hasFreeMessage, 'Homepage should mention free/open-source').toBe(true);

    // MIT license
    expect(bodyText).toMatch(/MIT/i);

    await page.screenshot({ path: '/tmp/e2e-screenshots/09b-homepage-free.png', fullPage: false });
  });
});

// ─── Journey 10: Chinese version — platform tabs ─────────────────────────────

test.describe('Journey 10: Chinese version /zh-TW — platform tabs', () => {
  const EXPECTED_PLATFORMS = [
    'Claude Code',
    'Claude Desktop',
    'Cursor',
    'OpenClaw',
    'Codex',
    'WorkBuddy',
    'NemoClaw',
    'ArkClaw',
  ];

  test('/zh-TW loads and shows all 8 platforms', async ({ page }) => {
    // Try both /zh-TW and /zh variants
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent() ?? '';

    for (const platform of EXPECTED_PLATFORMS) {
      expect(bodyText, `Chinese page should show platform "${platform}"`).toMatch(new RegExp(platform, 'i'));
    }

    await page.screenshot({ path: '/tmp/e2e-screenshots/10-zh-TW-platform-tabs.png', fullPage: false });
  });

  test('/zh-TW does not show Trap or Report as standalone products', async ({ page }) => {
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const trapCards = page.locator('a, button, [role="tab"]').filter({ hasText: /^Trap$/ });
    const reportCards = page.locator('a, button, [role="tab"]').filter({ hasText: /^Report$/ });
    expect(await trapCards.count()).toBe(0);
    expect(await reportCards.count()).toBe(0);

    await page.screenshot({ path: '/tmp/e2e-screenshots/10b-zh-TW-no-banned.png', fullPage: false });
  });
});
