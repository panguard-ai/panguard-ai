/**
 * `pga guard trust-updates` — arm auto-pulled detection rules.
 *
 * Gap A slice 2. Background auto-update keeps a fresh, integrity-verified rule
 * bundle staged on disk, but a FRESH rule only ADVISES (never blocks) until the
 * user explicitly trusts it here. This is the one-time consent that lets new
 * rules gain BLOCK power — the deliberate guard against a fresh false-positive
 * rule silently walling off the user's tools (the 2026-06 FP scar).
 *
 * It writes `autoUpdateTrustedVersion` to whichever config file the daemon
 * actually reads (guard-specific if present, else the master config) so the
 * setting takes effect without orphaning other config.
 *
 * @module @panguard-ai/panguard/cli/commands/trust-updates
 */

import { createInterface } from 'node:readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { c } from '@panguard-ai/core';
import { ProxyEvaluator } from '@panguard-ai/panguard-mcp-proxy/evaluator';
import {
  readAutoUpdateSettings,
  resolveStagedAutoRules,
} from '@panguard-ai/panguard-guard/auto-rules';

const GUARD_CONFIG_PATH = join(homedir(), '.panguard-guard', 'config.json');
const MASTER_CONFIG_PATH = join(homedir(), '.panguard', 'config.json');

function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const n = answer.trim().toLowerCase();
      resolve(n === 'y' || n === 'yes');
    });
  });
}

/**
 * Persist autoUpdateTrustedVersion to the config file the daemon reads
 * (guard-specific if it exists, else master, else create guard-specific).
 * loadConfig() reads one file OR the other — never merged — so writing to the
 * authoritative path preserves the rest of the config. Returns the path written.
 */
function persistTrustedVersion(version: string): string {
  const path = existsSync(GUARD_CONFIG_PATH)
    ? GUARD_CONFIG_PATH
    : existsSync(MASTER_CONFIG_PATH)
      ? MASTER_CONFIG_PATH
      : GUARD_CONFIG_PATH;
  let cfg: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      cfg = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
    } catch {
      cfg = {};
    }
  }
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  // Atomic write: the config can carry secrets (threatCloudApiKey, notification
  // creds). A non-atomic rewrite interrupted mid-flight would truncate it and
  // silently demote the daemon to report-only on next start. Write a sibling
  // temp file (0o600) then rename over the target — rename is atomic on POSIX.
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify({ ...cfg, autoUpdateTrustedVersion: version }, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  try {
    chmodSync(tmp, 0o600);
  } catch {
    /* best effort — platforms without POSIX perms */
  }
  renameSync(tmp, path);
  return path;
}

export async function runTrustUpdates(opts: { yes?: boolean }): Promise<void> {
  const s = readAutoUpdateSettings();
  if (!s.autoUpdateRules) {
    console.log(
      c.dim(
        'Auto-update is not enabled. Turn on `autoUpdateRules` to receive background rule updates first.'
      )
    );
    return;
  }

  const staged = resolveStagedAutoRules(s.dataDir, s.autoUpdateTrustedVersion);
  if (!staged) {
    console.log(c.dim('No auto-pulled rule bundle has been staged yet — nothing to trust.'));
    return;
  }
  if (!staged.adviseOnly) {
    console.log(
      c.sage(
        `Already trusting agent-threat-rules@${staged.version} to enforce. Nothing new to arm.`
      )
    );
    return;
  }

  // Count the fresh rules that would newly gain block power (ids not bundled).
  let fresh = 0;
  try {
    const ev = new ProxyEvaluator();
    await ev.loadRules();
    fresh = await ev.loadAutoRules(staged.dir, { adviseOnly: true });
  } catch {
    /* the count is advisory; proceed even if it cannot be computed */
  }

  console.log('');
  console.log(c.sage(`Trust auto-pulled rules — agent-threat-rules@${staged.version}`));
  console.log(
    `  ${fresh} newly-added rule(s) are currently DETECT-only (they advise, never block).`
  );
  console.log('  Trusting this version lets them BLOCK tool calls, like the rules that shipped');
  console.log(
    '  with your install. Auto-pulled rules are integrity-verified from npm before staging.'
  );
  console.log('');

  if (!opts.yes) {
    const ok = await promptYesNo('  Trust and arm these rules? [y/N] ');
    if (!ok) {
      console.log(c.dim('  Left as advise-only. No change.'));
      return;
    }
  }

  const path = persistTrustedVersion(staged.version);
  console.log(
    c.sage(
      `  Trusted agent-threat-rules@${staged.version}. New rules enforce on the next tool call / guard restart.`
    )
  );
  console.log(c.dim(`  (wrote autoUpdateTrustedVersion → ${path})`));
}
