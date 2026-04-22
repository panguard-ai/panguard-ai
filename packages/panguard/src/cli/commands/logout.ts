/**
 * `pga logout` — clear the local session.
 *
 * 1. Best-effort POST to `${APP_URL}/api/auth/revoke` to invalidate the
 *    api_key server-side. Failures are swallowed — the local file is the
 *    source of truth for a logged-in session.
 * 2. Delete `~/.panguard/auth.json`.
 *
 * The `api_key` is sent only in the Authorization header and is never logged.
 *
 * @module @panguard-ai/panguard/cli/commands/logout
 */

import { Command } from 'commander';
import { rm } from 'node:fs/promises';
import { c, symbols } from '@panguard-ai/core';
import { authConfigPath, loadAuth } from '../auth-guard.js';
import { DEFAULT_APP_URL, resolveAppUrl } from '../device-flow.js';

interface LogoutOptions {
  appUrl?: string;
  quiet?: boolean;
}

export function logoutCommand(): Command {
  return new Command('logout')
    .description('Sign out and clear local PanGuard session')
    .option('--app-url <url>', `PanGuard app URL (default: ${DEFAULT_APP_URL})`)
    .option('--quiet', 'Suppress non-essential output')
    .action(async (opts: LogoutOptions) => {
      await runLogout(opts);
    });
}

export async function runLogout(opts: LogoutOptions): Promise<void> {
  const auth = await loadAuth();
  const quiet = opts.quiet === true;

  if (!auth) {
    if (!quiet) {
      console.log('');
      console.log(`  ${c.dim(symbols.info)} Not logged in — nothing to do.`);
      console.log('');
    }
    return;
  }

  // Best-effort server-side revoke. We intentionally ignore failures so a
  // dropped network (e.g. offline laptop) never blocks local cleanup.
  const appUrl = resolveAppUrl(opts.appUrl);
  try {
    await fetch(`${appUrl}/api/auth/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Swallow — local cleanup still happens below.
  }

  // Always remove the local file. `rm --force` behaviour via { force: true }.
  try {
    await rm(authConfigPath(), { force: true });
  } catch (err) {
    if (!quiet) {
      console.error('');
      console.error(
        `  ${c.critical(symbols.fail)} Could not remove local session file: ` +
          (err instanceof Error ? err.message : String(err))
      );
      console.error('');
    }
    process.exitCode = 1;
    return;
  }

  if (!quiet) {
    console.log('');
    console.log(`  ${c.safe(symbols.pass)} Logged out.`);
    console.log('');
  }
}
