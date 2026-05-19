/**
 * Local Guard dashboard — tier-gated button visibility.
 *
 * The Guard dashboard at http://localhost:<port> hides the
 * "Export SARIF" and "Generate Evidence Pack" buttons (data-tier-gate="pilot")
 * for community-tier users and shows an upsell link in their place.
 *
 * The test starts a local `pga up` instance bound to a non-default port
 * (so it doesn't collide with a developer's running dashboard) with a
 * community license key, navigates to the Threats tab, and asserts the
 * pilot-only buttons remain hidden while the upsell anchor is visible.
 *
 * If `pga` is not on PATH (CI image without panguard-cli built), the
 * suite skips with an explicit reason instead of failing.
 */
import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess, spawnSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { setTimeout as wait } from 'node:timers/promises';

const PORT = 8189;
const DASHBOARD_URL = `http://localhost:${PORT}`;
const PGA_BIN = process.env.PGA_BIN ?? 'pga';

function isPgaAvailable(): boolean {
  try {
    const out = spawnSync(PGA_BIN, ['--version'], {
      stdio: 'ignore',
      timeout: 5_000,
    });
    return out.status === 0;
  } catch {
    return false;
  }
}

function probe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpRequest(url, { method: 'GET', timeout: 1_500 }, (res) => {
      res.resume();
      resolve((res.statusCode ?? 0) < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForReady(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probe(url)) return true;
    await wait(500);
  }
  return false;
}

let pgaProc: ChildProcess | null = null;

test.describe('Local Guard dashboard — community-tier gating', () => {
  test.skip(
    !isPgaAvailable(),
    "`pga` binary not on PATH in this test env. The Guard dashboard ships " +
      'with @panguard-ai/panguard-cli — run `pnpm build && pnpm link` or set ' +
      'PGA_BIN to an absolute path.',
  );

  test.beforeAll(async () => {
    pgaProc = spawn(
      PGA_BIN,
      [
        'up',
        '--no-watch',
        '--port',
        String(PORT),
        '--license-key=PG-COMMUNITY-TEST-0000-0000',
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PG_TELEMETRY_DISABLED: '1' },
      },
    );

    const ready = await waitForReady(DASHBOARD_URL, 25_000);
    if (!ready) {
      pgaProc.kill('SIGTERM');
      throw new Error(
        `pga up did not become ready on ${DASHBOARD_URL} within 25s`,
      );
    }
  });

  test.afterAll(async () => {
    if (pgaProc && !pgaProc.killed) {
      pgaProc.kill('SIGTERM');
      await wait(500);
      if (!pgaProc.killed) pgaProc.kill('SIGKILL');
    }
  });

  test('Threats tab is visible and SARIF buttons are hidden for community', async ({
    page,
  }) => {
    await page.goto(DASHBOARD_URL);

    // The sidebar has a nav item with data-tab="threats" rendering "Threats".
    const threatsNav = page.locator('.ni[data-tab="threats"]');
    await expect(threatsNav).toBeVisible();
    await threatsNav.click();

    // After tab switch, the threats action bar mounts. The SARIF button has
    // data-tier-gate="pilot" and starts with style="display:none" — the
    // dashboard JS only un-hides it when the licence tier is pilot or higher.
    const sarifBtn = page.locator('#btn-sarif');
    await expect(sarifBtn).toBeHidden();

    // The upsell anchor should be visible (it's the community-tier sibling
    // of the SARIF button).
    const upsell = page.locator('a[data-tier-upsell="pilot"]');
    await expect(upsell).toBeVisible();
    await expect(upsell).toContainText(/Upgrade to Pilot.*SARIF.*Evidence Pack/);
  });
});
