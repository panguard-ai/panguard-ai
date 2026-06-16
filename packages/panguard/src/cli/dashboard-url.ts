/**
 * Dashboard URL helpers — shared by `pga up` and `pga setup`.
 *
 * The Guard daemon's dashboard auth token lives in DashboardServer memory and
 * mints the auth cookie ONLY for a request carrying it as `/?token=<token>`. A
 * bare http://127.0.0.1:PORT therefore lands on a 401 "Invalid token" page on a
 * rerun / already-running daemon / headless host. The daemon persists that token
 * to ~/.panguard-guard/dashboard-token (0o600) once its dashboard is listening;
 * callers read it here to construct the URL the user can actually open.
 *
 * Both `pga up` and `pga setup` open/print the dashboard, so these live in one
 * module instead of being duplicated (and drifting) across commands.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Default dashboard port — matches packages/panguard-guard config default. */
const DEFAULT_DASHBOARD_PORT = 3100;

/** Where the daemon persists its per-launch dashboard auth token (0o600). */
const DASHBOARD_TOKEN_PATH = join(homedir(), '.panguard-guard', 'dashboard-token');

/**
 * Read the dashboard port the daemon is actually configured to use, so the
 * launch URL points at the right place even on a non-default port. Falls back
 * to the shared default when config is absent or unreadable.
 */
export function readDashboardPort(): number {
  try {
    const cfgPath = join(homedir(), '.panguard-guard', 'config.json');
    if (existsSync(cfgPath)) {
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8')) as { dashboardPort?: number };
      if (typeof cfg.dashboardPort === 'number' && cfg.dashboardPort > 0) {
        return cfg.dashboardPort;
      }
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_DASHBOARD_PORT;
}

/** Base (unauthenticated) dashboard URL — only for human-readable hints. */
export function dashboardBaseUrl(): string {
  return `http://127.0.0.1:${readDashboardPort()}`;
}

/**
 * Build the AUTHENTICATED dashboard launch URL, or null if the daemon has not
 * (yet) persisted its launch token.
 *
 * Returns null when the token is absent so callers print guidance instead of a
 * dead bare URL. The token is treated like the cookie: read from an owner-only
 * file and never logged on its own.
 */
export function readAuthenticatedDashboardUrl(): string | null {
  try {
    if (!existsSync(DASHBOARD_TOKEN_PATH)) return null;
    const token = readFileSync(DASHBOARD_TOKEN_PATH, 'utf-8').trim();
    if (!token) return null;
    return `${dashboardBaseUrl()}/?token=${token}`;
  } catch {
    return null;
  }
}
