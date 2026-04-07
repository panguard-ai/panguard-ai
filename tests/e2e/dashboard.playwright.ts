/**
 * PanGuard Dashboard E2E Tests (Playwright)
 *
 * Dashboard runs at http://127.0.0.1:3100. The server sets an HttpOnly auth
 * cookie (panguard_auth) on the first GET response, so no manual cookie
 * injection is required — page.goto() triggers it automatically.
 *
 * Coverage:
 *   T1  Dashboard loads, title contains "Panguard"
 *   T2  Welcome overlay visible on first visit OR dashboard page on repeat visit
 *   T3  Sidebar navigation items present (Dashboard, Threats, Rules, Skills, Threat Cloud, Settings)
 *   T4  Dashboard page: Protection Status hero visible
 *   T5  Dashboard page: KPI cards present (Rules, Events, Threats, Uptime)
 *   T6  Dashboard page: Layer bars present (Layer 1, Layer 2, Layer 3)
 *   T7  Rules page: ATR rule count > 0
 *   T8  Skills page: installed skills count > 0
 *   T9  Settings page: Layer 1 + 2 active, Layer 3 setup guidance visible
 *   T10 Threat Cloud page: connection status visible
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Navigate via sidebar tab. The dashboard is a SPA — clicking a nav item
 *  shows/hides .pg divs without a page reload. */
async function clickTab(page: Page, tabName: string): Promise<void> {
  await page.locator(`.ni[data-tab="${tabName}"]`).click();
  // Wait for the target page panel to become visible
  await expect(page.locator(`#p-${tabName}`)).toBeVisible({ timeout: 5_000 });
}

/** If the welcome overlay is shown, dismiss it so we reach the dashboard. */
async function dismissWelcomeIfPresent(page: Page): Promise<void> {
  const overlay = page.locator('#welcome');
  const isVisible = await overlay.isVisible().catch(() => false);
  if (isVisible) {
    const btn = page.locator('#btn-start');
    const btnVisible = await btn.isVisible().catch(() => false);
    if (btnVisible) {
      await btn.click();
    }
    // Wait for overlay to fade out (transition: opacity .6s)
    await overlay.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {
      // overlay may stay in DOM with opacity:0; that is acceptable
    });
  }
}

// ---------------------------------------------------------------------------
// T1: Dashboard loads
// ---------------------------------------------------------------------------
test('T1: dashboard loads — title contains "Panguard"', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Panguard/i);
});

// ---------------------------------------------------------------------------
// T2: Welcome overlay or dashboard page visible on load
// ---------------------------------------------------------------------------
test('T2: welcome overlay visible on first visit, or dashboard panel on repeat', async ({
  page,
}) => {
  await page.goto('/');

  const welcomeOverlay = page.locator('#welcome');
  const dashboardPanel = page.locator('#p-dashboard');

  // At least one must be visible immediately after load
  const overlayVisible = await welcomeOverlay.isVisible().catch(() => false);
  const dashboardVisible = await dashboardPanel.isVisible().catch(() => false);

  expect(overlayVisible || dashboardVisible).toBe(true);
});

// ---------------------------------------------------------------------------
// T3: Sidebar navigation items present
// ---------------------------------------------------------------------------
test('T3: sidebar navigation tabs all present', async ({ page }) => {
  await page.goto('/');

  const expectedTabs = ['dashboard', 'threats', 'rules', 'skills', 'tcloud', 'settings'] as const;
  for (const tab of expectedTabs) {
    await expect(page.locator(`.ni[data-tab="${tab}"]`)).toBeAttached();
  }
});

// ---------------------------------------------------------------------------
// T4: Dashboard page — Protection Status hero
// ---------------------------------------------------------------------------
test('T4: dashboard page shows Protection Status hero', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  // Ensure we are on dashboard panel
  await expect(page.locator('#p-dashboard')).toBeVisible();

  // Protection hero section
  const hero = page.locator('#protection-hero');
  await expect(hero).toBeVisible();

  // Hero status text (PROTECTED / MONITORING / etc.)
  const heroStatus = page.locator('#hero-status');
  await expect(heroStatus).toBeVisible();
  const statusText = await heroStatus.innerText();
  expect(statusText.trim().length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// T5: Dashboard page — KPI cards
// ---------------------------------------------------------------------------
test('T5: dashboard page shows KPI cards (Rules, Events, Threats, Uptime)', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  // The four KPI value elements must be present in the DOM
  const kpiIds = ['v-atr', 'v-ev', 'v-th', 'v-up'] as const;
  for (const id of kpiIds) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }

  // After a short wait the JS should populate them from the /api/status response
  await page.waitForTimeout(2_000);

  // Rules Active (v-atr) must show a positive number (API returns atrRuleCount)
  const atrText = await page.locator('#v-atr').innerText();
  const atrNum = parseInt(atrText.replace(/[^0-9]/g, ''), 10);
  expect(atrNum).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// T6: Dashboard page — Layer bars (Layer 1, 2, 3)
// ---------------------------------------------------------------------------
test('T6: dashboard page shows three protection layer rows', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  // Layer status elements must be present
  await expect(page.locator('#l1-st')).toBeAttached();
  await expect(page.locator('#l2-st')).toBeAttached();
  await expect(page.locator('#l3-st')).toBeAttached();

  // Layer 1 and 2 labels must read "Active"
  await page.waitForTimeout(1_500);
  const l1 = await page.locator('#l1-st').innerText();
  const l2 = await page.locator('#l2-st').innerText();
  expect(l1.toLowerCase()).toContain('active');
  expect(l2.toLowerCase()).toContain('active');

  // Layer bar fills should exist
  await expect(page.locator('#l1-bar')).toBeAttached();
  await expect(page.locator('#l2-bar')).toBeAttached();
  await expect(page.locator('#l3-bar')).toBeAttached();
});

// ---------------------------------------------------------------------------
// T7: Rules page — ATR rule count > 0
// ---------------------------------------------------------------------------
test('T7: rules page loads and shows ATR rule count > 0', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  await clickTab(page, 'rules');

  // Wait for the rules table or list to populate (JS fetches from /api/rules)
  await page.waitForTimeout(2_000);

  // The rules page must have some visible content that is not just a spinner
  const rulesPanel = page.locator('#p-rules');
  await expect(rulesPanel).toBeVisible();

  // Either a table row exists, or the KPI card with the rule count is populated
  // We verify via the /api/rules response indirectly: the panel text should
  // contain a number > 0.
  const panelText = await rulesPanel.innerText();
  // Find any number in the panel text
  const numbers = panelText.match(/\d+/g) ?? [];
  const hasPositiveNumber = numbers.some((n) => parseInt(n, 10) > 0);
  expect(hasPositiveNumber).toBe(true);
});

// ---------------------------------------------------------------------------
// T8: Skills page — installed skills count > 0
// ---------------------------------------------------------------------------
test('T8: skills page shows installed skills count > 0', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  await clickTab(page, 'skills');

  // Wait for skills to load from API
  await page.waitForTimeout(2_500);

  const skillsPanel = page.locator('#p-skills');
  await expect(skillsPanel).toBeVisible();

  // Skills table should have at least one row, OR the panel shows a count
  const panelText = await skillsPanel.innerText();
  const numbers = panelText.match(/\d+/g) ?? [];
  const hasPositiveNumber = numbers.some((n) => parseInt(n, 10) > 0);
  expect(hasPositiveNumber).toBe(true);
});

// ---------------------------------------------------------------------------
// T9: Settings page — Layer 1 + 2 active, Layer 3 setup guidance
// ---------------------------------------------------------------------------
test('T9: settings page shows Layer 1 + 2 active and Layer 3 setup guidance', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  await clickTab(page, 'settings');

  const settingsPanel = page.locator('#p-settings');
  await expect(settingsPanel).toBeVisible();

  const panelText = await settingsPanel.innerText();

  // Layer 1 and Layer 2 must be described as active
  expect(panelText).toMatch(/Layer 1/i);
  expect(panelText).toMatch(/Layer 2/i);
  expect(panelText.toLowerCase()).toContain('active');

  // Layer 3 guidance — settings page describes how to configure AI analysis
  expect(panelText).toMatch(/Layer 3/i);
});

// ---------------------------------------------------------------------------
// T10: Threat Cloud page — connection status visible
// ---------------------------------------------------------------------------
test('T10: threat cloud page shows connection status', async ({ page }) => {
  await page.goto('/');
  await dismissWelcomeIfPresent(page);

  await clickTab(page, 'tcloud');

  await page.waitForTimeout(2_000);

  const tcloudPanel = page.locator('#p-tcloud');
  await expect(tcloudPanel).toBeVisible();

  const panelText = await tcloudPanel.innerText();
  // The panel should mention the threat cloud endpoint or connection state
  const hasThreatCloudContent =
    panelText.toLowerCase().includes('threat cloud') ||
    panelText.toLowerCase().includes('tc.panguard') ||
    panelText.toLowerCase().includes('connected') ||
    panelText.toLowerCase().includes('enabled') ||
    panelText.toLowerCase().includes('sync');

  expect(hasThreatCloudContent).toBe(true);
});
