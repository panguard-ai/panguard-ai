/**
 * Lightweight Guard config reader/writer for CLI commands.
 * Does not import the full Guard engine — only reads/writes ~/.panguard-guard/config.json.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
  if (!existsSync(GUARD_CONFIG_DIR)) {
    mkdirSync(GUARD_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(GUARD_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
