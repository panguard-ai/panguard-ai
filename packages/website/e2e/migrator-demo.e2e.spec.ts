/**
 * Migrator public demo — Sigma → ATR YAML in-browser conversion.
 *
 * The Community tier of the migrator ships in @panguard-ai/migrator-community
 * and runs entirely in the browser. We paste a small valid Sigma rule, click
 * Convert, and assert the output pane carries an ATR YAML doc with the
 * canonical `id:` and `severity:` fields.
 *
 * We also assert the comparison block surfaces Pilot-only badges on the 13
 * extra parser names + LLM enrichment + evidence pack rows, and that the
 * "Unlock Pilot" CTA points to /pricing?intent=pilot#pilot.
 */
import { test, expect } from '@playwright/test';

const SIGMA_FIXTURE = `title: Test Detection For ATR Migrator
id: 12345678-1234-1234-1234-123456789abc
description: A minimal Sigma rule used by the migrator e2e test.
status: experimental
author: panguard-e2e
date: 2026/01/01
level: high
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4625
  condition: selection
`;

test.describe('Migrator demo — public Sigma → ATR YAML conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/migrator');
  });

  test('converts a Sigma rule to ATR YAML with id + severity', async ({ page }) => {
    // The input is a <textarea> with a placeholder that reads
    // "Paste a Sigma or YARA rule here..."
    const input = page.getByPlaceholder(/Paste a Sigma or YARA rule/i);
    await expect(input).toBeVisible();
    await input.fill(SIGMA_FIXTURE);

    const convertBtn = page.getByRole('button', {
      name: /Convert to ATR YAML/i,
    });
    await expect(convertBtn).toBeEnabled();
    await convertBtn.click();

    // Output pane shows the generated YAML. We don't pin the exact
    // mapping — only that the canonical ATR schema keys are emitted.
    const output = page.locator('pre, textarea, code').filter({
      hasText: /id:\s/,
    });
    await expect(output.first()).toBeVisible({ timeout: 10_000 });
    await expect(output.first()).toContainText(/id:\s/);
    await expect(output.first()).toContainText(/severity:\s/i);
  });

  test('Copy ATR YAML button is present after conversion', async ({ page }) => {
    await page.getByPlaceholder(/Paste a Sigma or YARA rule/i).fill(SIGMA_FIXTURE);
    await page.getByRole('button', { name: /Convert to ATR YAML/i }).click();

    const copyBtn = page.getByRole('button', { name: /Copy ATR YAML/i });
    await expect(copyBtn).toBeVisible({ timeout: 10_000 });
  });

  test('comparison table shows Pilot-only rows', async ({ page }) => {
    // The Pilot card in the comparison block stamps each Pilot-only feature
    // (13 extra parser names + LLM enrichment + evidence pack + threat-cloud
    // contribute pipeline + Y1-credit) with a "Pilot only" / "Pilot" tag.
    const pilotBadges = page.getByText(/Pilot only|^Pilot$/);
    await expect(pilotBadges.first()).toBeVisible();
    expect(await pilotBadges.count()).toBeGreaterThanOrEqual(5);
  });

  test('Unlock Pilot CTA links to /pricing?intent=pilot#pilot', async ({ page }) => {
    const unlockCta = page.locator('a[href*="/pricing?intent=pilot"]').first();
    await expect(unlockCta).toBeVisible();
    const href = await unlockCta.getAttribute('href');
    expect(href).toContain('/pricing?intent=pilot');
    expect(href).toContain('#pilot');
  });
});
