/**
 * live-status.ts — best-effort query of a running Guard daemon's live status.
 *
 * `panguard-guard status` runs as its own short-lived process, so it cannot
 * call `engine.getRuleCounts()` directly even when the daemon IS running —
 * that engine instance lives in a different process. The daemon's dashboard
 * HTTP server (loopback-only, token-authenticated) is the only channel back
 * into the live engine, so we ask it for the same rule-count data the daemon
 * uses at startup to decide PROTECTED vs DEGRADED.
 *
 * Fail-safe by construction: every failure path (daemon unreachable,
 * dashboard disabled, token missing/stale, malformed response) resolves to
 * `undefined` rather than throwing or guessing — callers must treat
 * `undefined` as "unknown", never as "healthy".
 *
 * @module @panguard-ai/panguard-guard/cli/live-status
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Where the daemon persists its per-launch dashboard auth token (0o600).
 *  Mirrors DASHBOARD_TOKEN_PATH in ../dashboard/index.ts — kept as a local
 *  constant here rather than imported since that module does not export it
 *  (the token file path is a stable on-disk contract, not an internal type). */
const DASHBOARD_TOKEN_PATH = join(homedir(), '.panguard-guard', 'dashboard-token');

/** Narrow shape of the fields this module reads from GET /api/status.
 *  Everything else in the real response is intentionally ignored. */
interface LiveStatusResponse {
  readonly atrRuleCount?: number;
  readonly mode?: string;
}

export interface LiveRuleCounts {
  readonly atr: number;
}

function readDashboardToken(): string | undefined {
  try {
    if (!existsSync(DASHBOARD_TOKEN_PATH)) return undefined;
    const token = readFileSync(DASHBOARD_TOKEN_PATH, 'utf-8').trim();
    return token.length > 0 ? token : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch the daemon's live ATR rule count from its dashboard API.
 *
 * Returns `undefined` (never throws) when the daemon is unreachable, the
 * dashboard is disabled, the launch token is missing/invalid, or the
 * response is malformed — any of which mean "we don't know", not "0 rules".
 */
export async function queryLiveRuleCounts(
  dashboardPort: number,
  timeoutMs = 1500
): Promise<LiveRuleCounts | undefined> {
  const token = readDashboardToken();
  if (!token) return undefined;

  try {
    const res = await fetch(`http://127.0.0.1:${dashboardPort}/api/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as LiveStatusResponse;
    if (typeof body.atrRuleCount !== 'number') return undefined;
    return { atr: body.atrRuleCount };
  } catch {
    return undefined;
  }
}
