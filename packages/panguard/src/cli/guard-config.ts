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

/** Write updated guard config to ~/.panguard-guard/config.json */
export function updateGuardConfig(config: GuardConfigSubset): void {
  // 0o700 dir + 0o600 file: the config can carry threatCloudApiKey and
  // notification secrets — never world/group-readable on shared machines.
  if (!existsSync(GUARD_CONFIG_DIR)) {
    mkdirSync(GUARD_CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(GUARD_CONFIG_PATH, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
  // chmod even if the file already existed, to tighten a loosely-created file.
  try {
    chmodSync(GUARD_CONFIG_PATH, 0o600);
  } catch {
    /* best effort — platforms without POSIX permissions */
  }
}
