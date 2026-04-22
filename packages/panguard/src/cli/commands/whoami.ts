/**
 * `pga whoami` — show the current logged-in user + workspace.
 *
 * Loads `~/.panguard/auth.json`, then calls `${APP_URL}/api/me` with a
 * Bearer token to fetch fresh tier/usage numbers. Falls back gracefully
 * if the network call fails — the local session is still shown.
 *
 * Support `--json` for scripting.
 *
 * @module @panguard-ai/panguard/cli/commands/whoami
 */

import { Command } from 'commander';
import { c, divider, header, statusPanel, symbols } from '@panguard-ai/core';
import type { StatusItem } from '@panguard-ai/core';
import { loadAuth } from '../auth-guard.js';
import type { AuthInfo } from '../auth-guard.js';
import { DEFAULT_APP_URL, resolveAppUrl } from '../device-flow.js';

interface WhoamiOptions {
  json?: boolean;
  appUrl?: string;
  quiet?: boolean;
}

interface MeResponse {
  readonly user: { readonly email: string; readonly name?: string };
  readonly workspace: { readonly id: string; readonly slug: string; readonly name: string };
  readonly tier: string;
  readonly tier_expires_at?: string | null;
  readonly endpoints_count?: number;
  readonly events_30d?: number;
}

export function whoamiCommand(): Command {
  return new Command('whoami')
    .description('Show the current PanGuard user and workspace')
    .option('--json', 'Output as JSON')
    .option('--app-url <url>', `PanGuard app URL (default: ${DEFAULT_APP_URL})`)
    .option('--quiet', 'Suppress non-essential output')
    .action(async (opts: WhoamiOptions) => {
      await runWhoami(opts);
    });
}

export async function runWhoami(opts: WhoamiOptions): Promise<void> {
  const auth = await loadAuth();

  if (!auth) {
    if (opts.json === true) {
      console.log(JSON.stringify({ authenticated: false }, null, 2));
    } else {
      console.log('');
      console.log(`  ${c.caution(symbols.warn)} Not logged in. Run \`pga login\`.`);
      console.log('');
    }
    process.exitCode = 1;
    return;
  }

  const appUrl = resolveAppUrl(opts.appUrl);
  const remote = await fetchMe(appUrl, auth.api_key);

  if (opts.json === true) {
    console.log(
      JSON.stringify(
        {
          authenticated: true,
          user_email: auth.user_email,
          workspace: {
            id: auth.workspace_id,
            slug: auth.workspace_slug,
            name: auth.workspace_name,
          },
          tier: remote?.tier ?? auth.tier,
          tier_expires_at: remote?.tier_expires_at ?? null,
          endpoints_count: remote?.endpoints_count ?? null,
          events_30d: remote?.events_30d ?? null,
          logged_in_at: auth.logged_in_at,
        },
        null,
        2
      )
    );
    return;
  }

  if (opts.quiet !== true) {
    console.log('');
    console.log(header('Account'));
  }

  const items: StatusItem[] = [
    { label: 'User', value: c.bold(auth.user_email) },
    {
      label: 'Workspace',
      value: `${c.bold(auth.workspace_name)} ${c.dim(`(${auth.workspace_slug})`)}`,
    },
    { label: 'Tier', value: c.bold(remote?.tier ?? auth.tier) },
  ];

  if (remote?.tier_expires_at) {
    items.push({ label: 'Tier expires', value: c.dim(remote.tier_expires_at) });
  }
  if (typeof remote?.endpoints_count === 'number') {
    items.push({ label: 'Endpoints', value: String(remote.endpoints_count) });
  }
  if (typeof remote?.events_30d === 'number') {
    items.push({
      label: 'Events (30d)',
      value: remote.events_30d.toLocaleString(),
    });
  }

  console.log(statusPanel('Session', items));

  if (!remote && opts.quiet !== true) {
    console.log('');
    console.log(
      `  ${c.dim(symbols.info)} Showing cached session info — could not reach ${appUrl}.`
    );
  }

  if (opts.quiet !== true) {
    console.log('');
    console.log(divider());
    console.log(`  ${c.dim(`Logged in at ${auth.logged_in_at}`)}`);
    console.log('');
  }
}

/**
 * GET /api/me. Returns null on any failure (network, HTTP, parse). The caller
 * falls back to cached local session info.
 */
async function fetchMe(appUrl: string, apiKey: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${appUrl}/api/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<MeResponse>;
    if (
      !body.user ||
      typeof body.user.email !== 'string' ||
      !body.workspace ||
      typeof body.workspace.id !== 'string' ||
      typeof body.workspace.slug !== 'string' ||
      typeof body.workspace.name !== 'string' ||
      typeof body.tier !== 'string'
    ) {
      return null;
    }
    return body as MeResponse;
  } catch {
    return null;
  }
}

// Unused at runtime but exported so tests can probe the shape.
export type { AuthInfo, MeResponse };
