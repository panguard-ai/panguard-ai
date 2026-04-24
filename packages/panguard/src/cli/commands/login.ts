/**
 * `pga login` — OAuth 2.0 Device Code Flow (RFC 8628).
 *
 * Same UX as `gh auth login`, `aws sso login`, and Claude Code CLI:
 *   1. Request a device code from the server.
 *   2. Print the short user code + verification URL.
 *   3. Try to open the browser automatically (best effort).
 *   4. Poll until the user authorises in the browser.
 *   5. Persist `{ api_key, workspace, user }` to `~/.panguard/auth.json`
 *      with mode 0600.
 *
 * Secrets policy: the `api_key`, `device_code`, and `Authorization` header
 * values are never printed or logged.
 *
 * @module @panguard-ai/panguard/cli/commands/login
 */

import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { c, symbols, box } from '@panguard-ai/core';
import { authConfigPath, loadAuth } from '../auth-guard.js';
import type { AuthInfo } from '../auth-guard.js';
import {
  DEFAULT_APP_URL,
  openBrowser,
  pollOnce,
  requestDeviceCode,
  resolveAppUrl,
} from '../device-flow.js';
import type { DeviceCodeResponse, DevicePollSuccess } from '../device-flow.js';

interface LoginOptions {
  appUrl?: string;
  browser?: boolean; // --no-browser flips this to false
  force?: boolean;
  quiet?: boolean;
}

export function loginCommand(): Command {
  return new Command('login')
    .description('Sign in to PanGuard (opens browser for authorization)')
    .option('--app-url <url>', `PanGuard app URL (default: ${DEFAULT_APP_URL})`)
    .option('--no-browser', 'Do not attempt to open the browser')
    .option('--force', 'Re-authenticate even if already logged in')
    .option('--quiet', 'Suppress non-essential output')
    .action(async (opts: LoginOptions) => {
      await runLogin(opts);
    });
}

export async function runLogin(opts: LoginOptions): Promise<void> {
  const appUrl = resolveAppUrl(opts.appUrl);
  const quiet = opts.quiet === true;

  // If a valid session already exists, short-circuit unless --force.
  if (!opts.force) {
    const existing = await loadAuth();
    if (existing) {
      if (!quiet) {
        console.log('');
        console.log(
          `  ${symbols.pass} Already logged in as ${c.bold(existing.user_email)} ` +
            `(workspace: ${c.bold(existing.workspace_name)}).`
        );
        console.log(`  ${c.dim('Use `pga login --force` to switch accounts.')}`);
        console.log('');
      }
      return;
    }
  }

  // Step 1: request a device code.
  let device: DeviceCodeResponse;
  try {
    device = await requestDeviceCode(appUrl);
  } catch (err) {
    console.error('');
    console.error(`  ${c.critical(symbols.fail)} Could not start login.`);
    console.error(`  ${c.dim(err instanceof Error ? err.message : String(err))}`);
    console.error('');
    process.exitCode = 1;
    return;
  }

  // Step 2: print the panel.
  printDevicePanel(device, quiet);

  // Step 3: best-effort browser open.
  if (opts.browser !== false) {
    openBrowser(device.verification_uri_complete);
  }

  // Step 4: set up SIGINT handler for a clean cancel.
  let cancelled = false;
  const onSigint = (): void => {
    cancelled = true;
    console.log('');
    console.log(`  ${c.caution(symbols.warn)} Login cancelled.`);
    console.log('');
    process.exit(130); // 128 + SIGINT(2)
  };
  process.once('SIGINT', onSigint);

  // Step 5: poll loop. `interval` may grow on `slow_down`.
  try {
    const success = await pollUntilDone(appUrl, device, () => cancelled);
    if (!success) {
      // pollUntilDone already printed a specific failure reason.
      process.exitCode = 1;
      return;
    }

    // Step 6: persist the session.
    const authInfo = toAuthInfo(success);
    await persistAuth(authInfo);

    // Step 7: success banner.
    if (!quiet) printSuccessBanner(authInfo);
  } finally {
    process.removeListener('SIGINT', onSigint);
  }
}

function printDevicePanel(device: DeviceCodeResponse, quiet: boolean): void {
  if (quiet) {
    // Still print the code — the user needs it.
    console.log(`Code: ${device.user_code}`);
    console.log(`URL:  ${device.verification_uri_complete}`);
    return;
  }

  const content = [
    c.heading('Authorize PanGuard CLI'),
    '',
    `${c.dim('Visit:')}  ${c.bold(device.verification_uri)}`,
    `${c.dim('Code:')}   ${c.bold(device.user_code)}`,
    '',
    c.dim('Or open this link directly:'),
    c.sage(device.verification_uri_complete),
    '',
    c.dim('Waiting for authorization ... (press Ctrl+C to cancel)'),
  ].join('\n');

  console.log('');
  console.log(box(content, { padding: 2 }));
  console.log('');
}

function printSuccessBanner(auth: AuthInfo): void {
  console.log('');
  console.log(`  ${c.safe(symbols.pass)} Logged in as ${c.bold(auth.user_email)}.`);
  console.log(
    `  ${c.dim('Workspace:')} ${c.bold(auth.workspace_name)} ${c.dim(`(${auth.workspace_slug})`)}`
  );
  console.log(`  ${c.dim('Tier:')}      ${c.bold(auth.tier)}`);
  console.log('');
}

/**
 * Poll the server until a terminal state is reached.
 * Returns the success payload on auth, or null on expiry/error/cancel
 * (after printing a user-facing message). Never throws.
 */
async function pollUntilDone(
  appUrl: string,
  device: DeviceCodeResponse,
  isCancelled: () => boolean
): Promise<DevicePollSuccess | null> {
  let intervalSec = Math.max(1, device.interval);
  const deadlineMs = Date.now() + device.expires_in * 1000;

  while (!isCancelled()) {
    if (Date.now() > deadlineMs) {
      console.error('');
      console.error(`  ${c.critical(symbols.fail)} Login code expired. Please run \`pga login\` again.`);
      console.error('');
      return null;
    }

    await sleep(intervalSec * 1000);
    if (isCancelled()) return null;

    const outcome = await pollOnce(appUrl, device.device_code);
    switch (outcome.kind) {
      case 'success':
        return outcome.payload;
      case 'pending':
        continue;
      case 'slow_down':
        intervalSec += 5;
        continue;
      case 'expired':
        console.error('');
        console.error(
          `  ${c.critical(symbols.fail)} Login code expired. Please run \`pga login\` again.`
        );
        console.error('');
        return null;
      case 'error':
        console.error('');
        console.error(`  ${c.critical(symbols.fail)} Login failed: ${outcome.message}`);
        console.error('');
        return null;
    }
  }

  return null;
}

function toAuthInfo(payload: DevicePollSuccess): AuthInfo {
  return Object.freeze({
    api_key: payload.api_key,
    workspace_id: payload.workspace.id,
    workspace_slug: payload.workspace.slug,
    workspace_name: payload.workspace.name,
    tier: payload.workspace.tier,
    user_email: payload.user.email,
    logged_in_at: new Date().toISOString(),
    // Optional TC correlation id — only written to auth.json when the server
    // returns it. Older workspaces without a TC link omit this field.
    ...(typeof payload.workspace.tc_org_id === 'string'
      ? { tc_org_id: payload.workspace.tc_org_id }
      : {}),
  });
}

/** Write the session file with mode 0600. Creates parent dir if missing. */
async function persistAuth(auth: AuthInfo): Promise<void> {
  const target = authConfigPath();
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
