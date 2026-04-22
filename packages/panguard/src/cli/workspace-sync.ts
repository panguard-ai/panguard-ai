/**
 * workspace-sync.ts — push scan events to app.panguard.ai when authenticated
 *
 * Flow:
 *   1. `pga audit` / `pga scan` finish a scan locally (offline-first)
 *   2. If ~/.panguard/auth.json exists (user has run `pga login`), this module
 *      POSTs the findings to app.panguard.ai/api/v2/events so they appear in
 *      the customer dashboard timeline.
 *   3. Anonymous / Community users are unaffected — they continue to use the
 *      existing TC telemetry path (tc.panguard.ai) via panguard-guard's
 *      ThreatCloudClient.
 *
 * Privacy:
 *   - Raw adversarial payloads are NEVER uploaded. Only: rule_id, severity,
 *     target (path/URL), target_hash (sha256 of content), and a 1-line summary
 *     produced by the CLI.
 *   - Endpoint identification: a stable hash of machine-id + logged-in user.
 *     Not the hostname itself, not the user's email.
 *
 * Failure mode:
 *   - Network / HTTP failure is logged via `log.debug` and swallowed.
 *   - 401 (token revoked/expired) prints ONE warning then deletes auth.json
 *     so subsequent commands don't keep hitting the broken path.
 *   - The main scan result printed to stdout is never altered by sync result.
 */

import { createHash } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { homedir, hostname, platform } from 'node:os';
import { join } from 'node:path';
import { c, symbols } from '@panguard-ai/core';

const DEFAULT_APP_URL = 'https://app.panguard.ai';
const AUTH_JSON_RELATIVE = '.panguard/auth.json';
const TIMEOUT_MS = 5000;

// ─── Auth payload shape (must match packages/panguard/src/cli/auth-guard.ts) ──

interface AuthInfo {
  api_key: string;
  workspace_id: string;
  workspace_slug: string;
  workspace_name: string;
  tier: string;
  user_email: string;
}

export function authJsonPath(): string {
  return join(homedir(), AUTH_JSON_RELATIVE);
}

export function tryLoadAuth(): AuthInfo | null {
  try {
    const raw = readFileSync(authJsonPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AuthInfo>;
    if (!parsed.api_key || !parsed.workspace_id) return null;
    return parsed as AuthInfo;
  } catch {
    return null;
  }
}

// ─── Event payload shape (must match app/src/app/api/v2/events/route.ts zod) ──

export type EventType =
  | 'scan.rule_match'
  | 'scan.completed'
  | 'guard.blocked'
  | 'guard.flagged'
  | 'trap.triggered'
  | 'respond.action';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface WorkspaceEvent {
  event_type: EventType;
  severity: Severity;
  rule_id?: string;
  target: string;
  target_hash?: string;
  payload_summary: string;
  occurred_at?: string; // ISO; defaults to now on the server
  metadata?: Record<string, unknown>;
}

export interface EndpointInfo {
  machine_id: string;
  hostname?: string;
  os_type?: string;
  panguard_version?: string;
}

// ─── Stable endpoint id (not PII) ──────────────────────────────────────────

let cachedMachineId: string | null = null;

export function getEndpointInfo(panguardVersion: string | undefined, userEmail: string): EndpointInfo {
  if (!cachedMachineId) {
    // Combine OS hostname + userEmail (from auth) + node arch → sha256.
    // Server never sees the raw values, and the hash is stable across runs of
    // the same user on the same machine, giving the dashboard a useful
    // "endpoint" without leaking hostname or email to the database.
    const seed = `${hostname()}::${userEmail}::${process.arch}`;
    cachedMachineId = 'm_' + createHash('sha256').update(seed).digest('hex').slice(0, 48);
  }
  return {
    machine_id: cachedMachineId,
    hostname: hostname(),
    os_type: platform(),
    ...(panguardVersion ? { panguard_version: panguardVersion } : {}),
  };
}

// ─── POST helper ───────────────────────────────────────────────────────────

interface SyncResult {
  ingested: number;
  skipped: string; // reason string if skipped
}

/**
 * Push a batch of events to app.panguard.ai under the current workspace.
 * Returns the number ingested. Non-throwing: any error is logged and the
 * function returns `{ ingested: 0, skipped: <reason> }`.
 */
export async function syncEvents(
  events: WorkspaceEvent[],
  opts?: {
    appUrl?: string;
    panguardVersion?: string;
    /** Print a one-line success/failure summary to stdout. Default false. */
    verbose?: boolean;
  }
): Promise<SyncResult> {
  if (events.length === 0) {
    return { ingested: 0, skipped: 'empty' };
  }

  const auth = tryLoadAuth();
  if (!auth) {
    // Not authenticated — not an error, just means Community mode.
    return { ingested: 0, skipped: 'anonymous' };
  }

  const appUrl = (opts?.appUrl ?? process.env['PANGUARD_APP_URL'] ?? DEFAULT_APP_URL).replace(
    /\/$/,
    ''
  );
  const endpoint = getEndpointInfo(opts?.panguardVersion, auth.user_email);

  const body = { events, endpoint };

  try {
    const res = await fetch(`${appUrl}/api/v2/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.api_key}`,
        'User-Agent': `panguard-cli/${opts?.panguardVersion ?? 'unknown'}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 401) {
      // Token revoked or expired — clear auth.json so future commands go
      // anonymous instead of repeatedly failing.
      try {
        unlinkSync(authJsonPath());
      } catch {
        // fine
      }
      if (opts?.verbose) {
        console.log(
          `  ${c.caution(symbols.warn)} ${c.dim('Session expired. Run')} ${c.sage('pga login')} ${c.dim('to reconnect.')}`
        );
      }
      return { ingested: 0, skipped: 'auth_revoked' };
    }

    if (!res.ok) {
      if (opts?.verbose) {
        console.log(
          `  ${c.caution(symbols.warn)} ${c.dim(`Dashboard sync failed (HTTP ${res.status}) — results are local only.`)}`
        );
      }
      return { ingested: 0, skipped: `http_${res.status}` };
    }

    const parsed = (await res.json().catch(() => ({}))) as { ingested?: number };
    const ingested = typeof parsed.ingested === 'number' ? parsed.ingested : events.length;

    if (opts?.verbose) {
      console.log(
        `  ${c.safe(symbols.pass)} ${c.dim(`${ingested} event${ingested === 1 ? '' : 's'} synced to`)} ${c.sage(auth.workspace_name)}`
      );
    }
    return { ingested, skipped: '' };
  } catch (err) {
    // Network / timeout / malformed response. Swallow — offline-first principle.
    if (opts?.verbose) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(
        `  ${c.dim(`Dashboard sync skipped (${msg.slice(0, 60)}) — results are local only.`)}`
      );
    }
    return { ingested: 0, skipped: 'network_error' };
  }
}

// ─── Finding → Event mapper ────────────────────────────────────────────────

export interface AuditFindingLike {
  ruleId?: string;
  severity?: string;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

/** Convert a normalized severity string (from audit/scan reports) to the allowed enum. */
function normalizeSeverity(s: string | undefined): Severity {
  const lower = (s ?? '').toLowerCase();
  if (lower === 'critical' || lower === 'high' || lower === 'medium' || lower === 'low') {
    return lower;
  }
  return 'info';
}

/**
 * Build a WorkspaceEvent[] from an audit report's findings + a scan summary row.
 * This is the shared shape emitted by both `pga audit` and `pga scan`.
 */
export function buildEventsFromAuditReport(args: {
  target: string;
  targetHash?: string;
  riskLevel: string;
  riskScore: number;
  findings: AuditFindingLike[];
  skillName?: string;
}): WorkspaceEvent[] {
  const out: WorkspaceEvent[] = [];

  // One event per rule match — this is the unit of compliance evidence.
  for (const f of args.findings) {
    if (!f.ruleId) continue;
    out.push({
      event_type: 'scan.rule_match',
      severity: normalizeSeverity(typeof f.severity === 'string' ? f.severity : undefined),
      rule_id: f.ruleId,
      target: args.target,
      ...(args.targetHash ? { target_hash: args.targetHash } : {}),
      payload_summary: (typeof f.title === 'string' ? f.title : `${f.ruleId} match`).slice(0, 200),
      metadata: {
        skill_name: args.skillName ?? undefined,
      },
    });
  }

  // One summary event per scan run (lets the dashboard show "scans/day" even
  // when findings are zero).
  out.push({
    event_type: 'scan.completed',
    severity: 'info',
    target: args.target,
    ...(args.targetHash ? { target_hash: args.targetHash } : {}),
    payload_summary: `Scan completed — risk=${args.riskLevel}, score=${args.riskScore}, findings=${args.findings.length}`,
    metadata: {
      risk_level: args.riskLevel,
      risk_score: args.riskScore,
      findings_count: args.findings.length,
      skill_name: args.skillName ?? undefined,
    },
  });

  return out;
}
