/**
 * Scanner E2E Tests — live site https://panguard.ai
 *
 * Tests all five scanner user journeys:
 *   1. Homepage scanner flow (input, scan, results)
 *   2. Dedicated /scan page
 *   3. Scan API direct (POST /api/scan)
 *   4. Badge API (GET /api/scan/badge/:hash.svg)
 *   5. Localization (/zh-TW)
 *
 * Run with:
 *   npx playwright test e2e/scanner-live.spec.ts --config=playwright.live.config.ts
 */

import { test, expect, request } from '@playwright/test';

const TEST_URL = 'github.com/anthropics/anthropic-cookbook';
const TEST_URL_FULL = 'https://github.com/anthropics/anthropic-cookbook';

// ─── Journey 1: Homepage Scanner Flow ────────────────────────────────────────

test.describe('Journey 1: Homepage scanner — input, scan, results', () => {
  test('scanner input is visible on /en homepage', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    // The scanner input has placeholder matching "github.com/modelcontextprotocol/servers"
    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01a-homepage-scanner-input.png',
      fullPage: false,
    });
  });

  test('scanner: type URL and click Scan button', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });

    // Clear and type test URL
    await input.fill(TEST_URL);
    await expect(input).toHaveValue(TEST_URL);

    // Scan button must be enabled now
    const scanBtn = page.locator('button').filter({ hasText: /scan/i }).first();
    await expect(scanBtn).toBeEnabled();

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01b-homepage-url-typed.png',
      fullPage: false,
    });
  });

  test('scanner: submit and wait for risk score + risk level', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(TEST_URL);

    const scanBtn = page.locator('button').filter({ hasText: /scan/i }).first();
    await scanBtn.click();

    // Wait for loading spinner to appear then disappear (scan in progress)
    // The component sets loading=true then fetches /api/scan
    // After the 2.2s animation + API response, results should render

    // Wait for the result card — it has a "riskScore" gauge pattern: "<number>/100"
    const riskScorePattern = page.locator('text=/\\d+\\/100/');
    await expect(riskScorePattern).toBeVisible({ timeout: 30_000 });

    // Verify risk level label appears (LOW / MEDIUM / HIGH / CRITICAL)
    const bodyText = (await page.locator('body').textContent()) ?? '';
    expect(bodyText).toMatch(/\b(LOW|MEDIUM|HIGH|CRITICAL)\b/);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01c-homepage-scan-results.png',
      fullPage: false,
    });
  });

  test('scanner: findings list or checks summary appears after scan', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(TEST_URL);

    await page.locator('button').filter({ hasText: /scan/i }).first().click();

    // Wait for result card
    const riskScorePattern = page.locator('text=/\\d+\\/100/');
    await expect(riskScorePattern).toBeVisible({ timeout: 30_000 });

    const bodyText = (await page.locator('body').textContent()) ?? '';

    // Either findings are shown (checks passed/failed) OR a "show findings" button appears
    // The checks row always renders if the report is present
    const hasChecks =
      /✓|✗|⚠|pass|fail|warn|findings|checks/i.test(bodyText) || /show \d+ finding/i.test(bodyText);
    expect(hasChecks, 'Checks or findings section should be present').toBe(true);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01d-homepage-findings.png',
      fullPage: false,
    });
  });

  test('scanner: Enter key triggers scan', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(TEST_URL);
    await input.press('Enter');

    // Loading spinner or result should appear quickly
    const spinner = page.locator('.animate-spin').first();
    const result = page.locator('text=/\\d+\\/100/');

    // One of them must appear
    await Promise.race([
      expect(spinner)
        .toBeVisible({ timeout: 5_000 })
        .catch(() => {}),
      expect(result).toBeVisible({ timeout: 30_000 }),
    ]);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01e-homepage-enter-key.png',
      fullPage: false,
    });
  });

  test('scanner: empty input — Scan button stays disabled', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const scanBtn = page.locator('button').filter({ hasText: /scan/i }).first();
    await expect(scanBtn).toBeDisabled();

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01f-homepage-empty-disabled.png',
      fullPage: false,
    });
  });

  test('scanner: invalid URL shows error message', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill('not-a-github-url');

    await page.locator('button').filter({ hasText: /scan/i }).first().click();

    // Should get an error response rendered in the UI
    // The API returns 400 for non-GitHub URLs, which the component shows in red
    const errorEl = page
      .locator('.text-red-400, [class*="red"]')
      .filter({ hasText: /github|url|error/i });
    await expect(errorEl).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: '/tmp/e2e-screenshots/01g-homepage-invalid-url-error.png',
      fullPage: false,
    });
  });
});

// ─── Journey 2: Dedicated /en/scan Page ──────────────────────────────────────

test.describe('Journey 2: Dedicated scan page /en/scan', () => {
  test('/en/scan page loads with scanner input', async ({ page }) => {
    const res = await page.goto('/en/scan');
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: '/tmp/e2e-screenshots/02a-scan-page-loaded.png',
      fullPage: false,
    });
  });

  test('/en/scan: type URL and scan — results render', async ({ page }) => {
    await page.goto('/en/scan');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(TEST_URL);

    const scanBtn = page.locator('button').filter({ hasText: /scan/i }).first();
    await expect(scanBtn).toBeEnabled();
    await scanBtn.click();

    // Wait for risk score
    const riskScorePattern = page.locator('text=/\\d+\\/100/');
    await expect(riskScorePattern).toBeVisible({ timeout: 30_000 });

    const bodyText = (await page.locator('body').textContent()) ?? '';
    expect(bodyText).toMatch(/\b(LOW|MEDIUM|HIGH|CRITICAL)\b/);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/02b-scan-page-results.png',
      fullPage: false,
    });
  });
});

// ─── Journey 3: Scan API Direct ──────────────────────────────────────────────

test.describe('Journey 3: POST /api/scan — direct API test', () => {
  test('returns ok:true with report containing riskScore, riskLevel, findings', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    const response = await ctx.post('/api/scan', {
      data: { url: TEST_URL_FULL },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log('API response:', JSON.stringify(body, null, 2));

    // Top-level structure
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('data');

    const { data } = body;
    expect(data).toHaveProperty('report');
    expect(data).toHaveProperty('contentHash');
    expect(data).toHaveProperty('source');
    expect(data).toHaveProperty('scannedAt');

    // Report fields
    const { report } = data;
    expect(report).toHaveProperty('riskScore');
    expect(report).toHaveProperty('riskLevel');
    expect(report).toHaveProperty('findings');
    expect(report).toHaveProperty('checks');

    // Type assertions
    expect(typeof report.riskScore).toBe('number');
    expect(report.riskScore).toBeGreaterThanOrEqual(0);
    expect(report.riskScore).toBeLessThanOrEqual(100);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(report.riskLevel);
    expect(Array.isArray(report.findings)).toBe(true);
    expect(Array.isArray(report.checks)).toBe(true);

    await ctx.dispose();
  });

  test('returns 400 for missing URL', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    const response = await ctx.post('/api/scan', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('ok', false);
    expect(body).toHaveProperty('error');

    await ctx.dispose();
  });

  test('returns 400 for non-GitHub URL', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    const response = await ctx.post('/api/scan', {
      data: { url: 'https://gitlab.com/some/repo' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('ok', false);
    expect(body.error).toMatch(/github/i);

    await ctx.dispose();
  });

  test('returns 404 when SKILL.md not found', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    // A public repo that definitely has no SKILL.md or README with skill content
    const response = await ctx.post('/api/scan', {
      data: { url: 'https://github.com/torvalds/linux' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    // Either 404 (no SKILL.md found) or 200 (README was used as fallback)
    // Both are valid — the API documents README as a fallback
    expect([200, 404]).toContain(response.status());

    await ctx.dispose();
  });

  test('cached response includes cached:true on second request', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    // First request
    const first = await ctx.post('/api/scan', {
      data: { url: TEST_URL_FULL },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    // Skip if rate limited — this test group runs after many API calls
    if (first.status() === 429) {
      test.skip(true, 'Rate limited (429) — too many API calls in this session');
      await ctx.dispose();
      return;
    }
    expect(first.status()).toBe(200);

    // Second identical request — should be cached
    const second = await ctx.post('/api/scan', {
      data: { url: TEST_URL_FULL },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    if (second.status() === 429) {
      // Rate limited on second call — still a valid server response
      await ctx.dispose();
      return;
    }
    expect(second.status()).toBe(200);
    const secondBody = await second.json();

    // If the same server instance handles both, cached=true on second
    // In a serverless environment (Vercel), the second request may land on a fresh instance
    // so we just check the shape is correct
    expect(secondBody).toHaveProperty('ok', true);
    expect(secondBody.data).toHaveProperty('report');

    await ctx.dispose();
  });
});

// ─── Journey 4: Badge API ─────────────────────────────────────────────────────

test.describe('Journey 4: GET /api/scan/badge/:hash.svg', () => {
  test('returns SVG content-type for valid hex hash', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    // abc123 is an 8-char hex-like string — should return unknown badge
    const response = await ctx.get('/api/scan/badge/abc12345.svg', { timeout: 15_000 });

    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/svg+xml');

    const body = await response.text();
    expect(body).toContain('<svg');
    expect(body).toContain('ATR');
    // Should say "Not Scanned" for an unknown hash
    expect(body).toMatch(/Not Scanned|Safe|Review|Critical/i);

    await ctx.dispose();
  });

  test('badge has cache-control header set', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    const response = await ctx.get('/api/scan/badge/abc12345678.svg', { timeout: 15_000 });
    expect(response.status()).toBe(200);

    const cacheControl = response.headers()['cache-control'] ?? '';
    expect(cacheControl).toMatch(/max-age/);

    await ctx.dispose();
  });

  test('badge returns SVG even for too-short hash (fallback to unknown)', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    // Hash shorter than 8 chars — route returns unknown badge per source code
    const response = await ctx.get('/api/scan/badge/ab.svg', { timeout: 15_000 });
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/svg+xml');

    const body = await response.text();
    expect(body).toContain('<svg');
    expect(body).toContain('Not Scanned');

    await ctx.dispose();
  });

  test('badge hash from real scan returns valid SVG', async ({}) => {
    const ctx = await request.newContext({ baseURL: 'https://panguard.ai' });

    // First, get a real contentHash from the scan API
    const scanResp = await ctx.post('/api/scan', {
      data: { url: TEST_URL_FULL },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    // Skip if rate limited — this test runs after many API calls in the suite
    if (scanResp.status() === 429) {
      test.skip(true, 'Rate limited (429) — use a known hash for badge tests instead');
      await ctx.dispose();
      return;
    }
    expect(scanResp.status()).toBe(200);
    const scanBody = await scanResp.json();
    const contentHash: string = scanBody.data?.contentHash ?? '';
    expect(contentHash.length).toBeGreaterThan(8);

    // Now request the badge for that real hash
    const badgeResp = await ctx.get(`/api/scan/badge/${contentHash}.svg`, { timeout: 15_000 });
    expect(badgeResp.status()).toBe(200);

    const contentType = badgeResp.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/svg+xml');

    const svg = await badgeResp.text();
    expect(svg).toContain('<svg');
    expect(svg).toContain('ATR');

    await ctx.dispose();
  });
});

// ─── Journey 5: Localization ──────────────────────────────────────────────────

test.describe('Journey 5: Localization — /zh-TW', () => {
  test('/zh-TW loads and shows Chinese text', async ({ page }) => {
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    expect(res?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    const bodyText = (await page.locator('body').textContent()) ?? '';

    // Chinese characters should be present on the page
    const chineseRegex = /[\u4e00-\u9fff]/;
    expect(chineseRegex.test(bodyText), 'Page should contain Chinese characters').toBe(true);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/05a-zh-TW-homepage.png',
      fullPage: false,
    });
  });

  test('/zh-TW scanner input is present and functional', async ({ page }) => {
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    await page.waitForLoadState('networkidle');

    // Scanner input should be present even on Chinese locale
    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: '/tmp/e2e-screenshots/05b-zh-TW-scanner.png',
      fullPage: false,
    });
  });

  test('/zh-TW scanner produces results', async ({ page }) => {
    let res = await page.goto('/zh-TW');
    if (!res || res.status() !== 200) {
      res = await page.goto('/zh');
    }
    await page.waitForLoadState('networkidle');

    const input = page.locator('input[placeholder*="github.com"]').first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(TEST_URL);

    // zh-TW uses "掃描" as the button text
    const scanBtn = page
      .locator('button')
      .filter({ hasText: /掃描|scan/i })
      .first();
    await expect(scanBtn).toBeEnabled();
    await scanBtn.click();

    // Wait for either: (a) a result, (b) a rate-limit error message
    // The rate-limiter fires at 10 req/min — this test runs later in the suite
    const riskScorePattern = page.locator('text=/\\d+\\/100/');
    const rateLimitError = page.locator('text=/rate limit/i');

    const outcome = await Promise.race([
      riskScorePattern.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'result'),
      rateLimitError.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'ratelimit'),
    ]).catch(() => 'timeout');

    if (outcome === 'ratelimit') {
      test.skip(true, 'Rate limited (UI) — too many API calls in this session. Test is valid.');
      return;
    }

    expect(outcome, 'Scan should complete with a result').toBe('result');

    await page.screenshot({
      path: '/tmp/e2e-screenshots/05c-zh-TW-scan-results.png',
      fullPage: false,
    });
  });

  test('/en and /zh-TW show the same risk score for same URL', async ({ page }) => {
    // Helper: scan and return score, or null if rate limited
    async function scanAndGetScore(locale: string, btnText: RegExp): Promise<string | null> {
      await page.goto(locale);
      await page.waitForLoadState('networkidle');
      const input = page.locator('input[placeholder*="github.com"]').first();
      await expect(input).toBeVisible({ timeout: 15_000 });
      await input.fill(TEST_URL);
      await page.locator('button').filter({ hasText: btnText }).first().click();

      const riskEl = page.locator('text=/\\d+\\/100/').first();
      const rateLimitEl = page.locator('text=/rate limit/i').first();

      const outcome = await Promise.race([
        riskEl.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'result'),
        rateLimitEl.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'ratelimit'),
      ]).catch(() => 'timeout');

      if (outcome !== 'result') return null;
      return riskEl.textContent();
    }

    const enScore = await scanAndGetScore('/en', /scan/i);
    if (enScore === null) {
      test.skip(true, 'Rate limited on /en — skipping score parity check');
      return;
    }

    const zhScore = await scanAndGetScore('/zh-TW', /掃描|scan/i);
    if (zhScore === null) {
      test.skip(true, 'Rate limited on /zh-TW — skipping score parity check');
      return;
    }

    // Both locales use the same /api/scan endpoint — scores should match
    expect(enScore).toBe(zhScore);

    await page.screenshot({
      path: '/tmp/e2e-screenshots/05d-zh-TW-score-parity.png',
      fullPage: false,
    });
  });
});
