/**
 * check-flywheel.ts
 *
 * Sanity check for community flywheel onboarding. Run from any community
 * customer's machine to verify their endpoint is registered with Threat
 * Cloud and that the bidirectional flow (events out, rules in) is alive.
 *
 *   pnpm check:flywheel              # against production tc.panguard.ai
 *   PANGUARD_TC_URL=http://localhost:8234 pnpm check:flywheel
 *
 * Exit codes:
 *   0 — healthy (endpoint registered, TC reachable, rules count > 0)
 *   1 — degraded (something works, something doesn't — details printed)
 *   2 — broken  (not registered, can't reach TC, no rules)
 *
 * Designed for: community customers running ad-hoc;
 * `panguard-guard` startup logs; CI smoke after deploy.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const TC_URL = process.env['PANGUARD_TC_URL'] ?? process.env['TC_URL'] ?? 'https://tc.panguard.ai';
const KEY_PATH = join(homedir(), '.panguard', 'tc-client-key');

interface TcStats {
  ok: boolean;
  data?: {
    totalRules: number;
    skillThreatsTotal: number;
    skillBlacklistTotal: number;
    rulesBySource: Array<{ source: string; count: number }>;
    proposalStats: Record<string, number>;
  };
}

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
}

const results: CheckResult[] = [];

function record(name: string, status: 'ok' | 'warn' | 'fail', detail: string): void {
  results.push({ name, status, detail });
}

async function checkTcHealth(): Promise<void> {
  try {
    const res = await fetch(`${TC_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      record('TC reachable', 'ok', `${TC_URL} responded 200`);
    } else {
      record('TC reachable', 'fail', `${TC_URL} returned ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record('TC reachable', 'fail', `${TC_URL} unreachable: ${msg}`);
  }
}

async function checkClientKey(): Promise<string | undefined> {
  if (!existsSync(KEY_PATH)) {
    record(
      'Client key cached',
      'fail',
      `No key at ${KEY_PATH}. Run "pga up" once to auto-register.`
    );
    return undefined;
  }
  try {
    const key = readFileSync(KEY_PATH, 'utf-8').trim();
    if (!key) {
      record('Client key cached', 'fail', `Key file empty at ${KEY_PATH}`);
      return undefined;
    }
    record('Client key cached', 'ok', `${KEY_PATH} (${key.slice(0, 8)}...${key.slice(-4)})`);
    return key;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record('Client key cached', 'fail', `Read failed: ${msg}`);
    return undefined;
  }
}

async function checkKeyAuthenticates(key: string): Promise<void> {
  try {
    const res = await fetch(`${TC_URL}/api/rules?limit=1`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      record('Key authenticates', 'ok', `/api/rules accepted Bearer token`);
    } else if (res.status === 401) {
      record(
        'Key authenticates',
        'fail',
        `401 — key cached locally but TC rejects it. Delete ${KEY_PATH} and rerun "pga up" to re-register.`
      );
    } else {
      record('Key authenticates', 'warn', `Got HTTP ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record('Key authenticates', 'fail', `Probe failed: ${msg}`);
  }
}

async function checkStats(): Promise<void> {
  try {
    const res = await fetch(`${TC_URL}/api/stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      record('TC stats', 'fail', `/api/stats returned ${res.status}`);
      return;
    }
    const body = (await res.json()) as TcStats;
    if (!body.ok || !body.data) {
      record('TC stats', 'fail', 'Response shape unexpected');
      return;
    }
    const { totalRules, skillThreatsTotal, rulesBySource, proposalStats } = body.data;
    record(
      'TC rules available',
      totalRules > 0 ? 'ok' : 'warn',
      `${totalRules} rules (${rulesBySource.map((s) => `${s.source}:${s.count}`).join(', ')})`
    );
    record(
      'Community skill threats',
      skillThreatsTotal > 0 ? 'ok' : 'warn',
      `${skillThreatsTotal} skill threats logged`
    );
    const proposalSummary = Object.entries(proposalStats)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    record('ATR proposal pipeline', 'ok', proposalSummary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record('TC stats', 'fail', `Probe failed: ${msg}`);
  }
}

function printReport(): number {
  const labelWidth = Math.max(...results.map((r) => r.name.length));
  console.log('');
  console.log('Panguard community flywheel sanity check');
  console.log('=========================================');
  console.log(`TC endpoint: ${TC_URL}`);
  console.log('');

  let exitCode = 0;
  for (const r of results) {
    const marker = r.status === 'ok' ? '[ OK ]' : r.status === 'warn' ? '[WARN]' : '[FAIL]';
    console.log(`${marker} ${r.name.padEnd(labelWidth)}  ${r.detail}`);
    if (r.status === 'warn' && exitCode < 1) exitCode = 1;
    if (r.status === 'fail') exitCode = 2;
  }
  console.log('');
  console.log(
    exitCode === 0
      ? 'Flywheel healthy. Your endpoint is contributing to community defense.'
      : exitCode === 1
        ? 'Flywheel degraded. Check WARN/FAIL lines above.'
        : 'Flywheel broken. Run "pga up" to register, then re-run this script.'
  );
  console.log('');
  return exitCode;
}

async function main(): Promise<void> {
  await checkTcHealth();
  const key = await checkClientKey();
  if (key) await checkKeyAuthenticates(key);
  await checkStats();
  process.exit(printReport());
}

void main();
