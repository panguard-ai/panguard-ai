/**
 * Lightweight Guard config reader/writer for CLI commands.
 * Does not import the full Guard engine — only reads/writes ~/.panguard-guard/config.json.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const GUARD_CONFIG_DIR = join(homedir(), '.panguard-guard');
const GUARD_CONFIG_PATH = join(GUARD_CONFIG_DIR, 'config.json');

/** Subset of GuardConfig fields relevant to CLI config commands */
export interface GuardConfigSubset {
  telemetryEnabled?: boolean;
  threatCloudUploadEnabled?: boolean;
  mode?: string;
  dashboardEnabled?: boolean;
  dashboardPort?: number;
  [key: string]: unknown;
}

/** Load guard config from ~/.panguard-guard/config.json */
export function loadGuardConfig(): GuardConfigSubset {
  if (!existsSync(GUARD_CONFIG_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(GUARD_CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as GuardConfigSubset;
  } catch {
    return {};
  }
}

/**
 * Write updated guard config to ~/.panguard-guard/config.json AND re-seal the
 * integrity manifest, so a legitimate CLI write (telemetry opt-in via `pga up`,
 * `pga config set …`) does not later read as "config tampered" on `pga doctor`.
 *
 * The file write is done here directly (0o600 + chmod), keeping the exact on-disk
 * behaviour CLI callers rely on. We then re-seal the integrity manifest via the
 * guard's resealConfigManifest(), which uses the same self-state logic the daemon
 * uses — a plain write left the manifest stale and made the next `pga doctor`
 * falsely report "config tampered". The re-seal is best-effort: it must never
 * fail the write, and if the guard module can't be loaded the write still lands
 * (the manifest simply refreshes on the next daemon-side save).
 */
export async function updateGuardConfig(config: GuardConfigSubset): Promise<void> {
  // 0o700 dir + 0o600 file: the config can carry an API key and notification
  // webhooks — never world/group-readable on shared machines.
  if (!existsSync(GUARD_CONFIG_DIR)) {
    mkdirSync(GUARD_CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(GUARD_CONFIG_PATH, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  try {
    chmodSync(GUARD_CONFIG_PATH, 0o600);
  } catch {
    /* best effort — platforms without POSIX permissions */
  }
  // Re-seal so this legitimate write re-establishes trust instead of tripping the
  // tamper check on the next start / `pga doctor`.
  try {
    const { resealConfigManifest } = await import('@panguard-ai/panguard-guard');
    resealConfigManifest(config as unknown as Record<string, unknown>, GUARD_CONFIG_DIR);
  } catch {
    /* guard module unavailable — write already landed; manifest refreshes later */
  }
}
