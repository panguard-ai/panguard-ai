/**
 * Shared helper: query the live Guard daemon's authenticated `/api/status`
 * for ground truth (mode, loaded ATR rule count) instead of inferring
 * security posture from PID-file liveness alone.
 *
 * A process being alive says nothing about whether it is actually
 * protecting anything — the daemon can be running in `report-only` /
 * `learning` mode, or in `protection` mode with zero rules loaded. Both
 * `pga doctor`'s Guard engine check and the interactive CLI's status panel
 * need the same honest signal, so it lives here once instead of being
 * reimplemented (and drifting) in each caller.
 *
 * @module @panguard-ai/panguard/cli/daemon-status
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { request as httpRequest } from 'node:http';
import { readDashboardPort } from './dashboard-url.js';

/** Where the daemon persists its per-launch dashboard auth token (0o600). */
const DASHBOARD_TOKEN_PATH = join(homedir(), '.panguard-guard', 'dashboard-token');

export interface DaemonStatus {
  readonly mode?: string;
  readonly atrRuleCount?: number;
}

/** Read the daemon's dashboard auth token, or null if not (yet) persisted. */
function readDashboardToken(): string | null {
  try {
    if (!existsSync(DASHBOARD_TOKEN_PATH)) return null;
    const token = readFileSync(DASHBOARD_TOKEN_PATH, 'utf-8').trim();
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the daemon's live status envelope over its loopback-only, token
 * authenticated `/api/status`. Resolves to `null` on ANY failure — token not
 * yet persisted, dashboard disabled, timeout, connection refused — so a host
 * with the dashboard turned off (an unrelated feature) never gets a false
 * signal. Callers MUST treat `null` as "unknown", never as "0 rules" or
 * "not protected" — an honest "can't verify" beats a wrong guess either way.
 */
export function fetchDaemonStatus(timeoutMs = 800): Promise<DaemonStatus | null> {
  return new Promise((resolve) => {
    const token = readDashboardToken();
    if (!token) {
      resolve(null);
      return;
    }
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port: readDashboardPort(),
        path: '/api/status',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf-8');
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as DaemonStatus);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}
