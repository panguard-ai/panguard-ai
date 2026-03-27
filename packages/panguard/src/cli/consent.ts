/**
 * Telemetry consent — opt-in first-run prompt.
 *
 * Telemetry is OFF by default. On first scan, we ask the user
 * if they want to help improve PanGuard by sharing anonymous usage stats.
 *
 * TC Protection (threat intel sync) is separate and ON by default.
 */

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { c, symbols } from '@panguard-ai/core';
import { loadGuardConfig, updateGuardConfig } from './guard-config.js';

const GUARD_CONFIG_DIR = join(homedir(), '.panguard-guard');
const CONSENT_MARKER = join(GUARD_CONFIG_DIR, '.telemetry-prompted');

/** Check if consent has already been asked */
export function hasConsentBeenAsked(): boolean {
  return existsSync(CONSENT_MARKER);
}

/** Mark consent as asked (regardless of answer) */
function markConsentAsked(): void {
  try {
    if (!existsSync(GUARD_CONFIG_DIR)) {
      mkdirSync(GUARD_CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONSENT_MARKER, new Date().toISOString(), 'utf-8');
  } catch {
    // If we can't write the marker, we'll ask again next time — not a blocker
  }
}

/**
 * Ask the user for telemetry consent (opt-in).
 * Returns true if the user opted in, false otherwise.
 *
 * In non-interactive mode (no TTY), defaults to OFF and marks as asked.
 */
export async function askTelemetryConsent(): Promise<boolean> {
  // Non-interactive: default OFF, don't block
  if (!process.stdin.isTTY) {
    markConsentAsked();
    return false;
  }

  console.log('');
  console.log(`  ${symbols.info} ${c.bold('Help improve PanGuard?')}`);
  console.log('');
  console.log(`  ${c.dim('Share anonymous usage stats (scan count, platform, findings count).')}`);
  console.log(`  ${c.dim('No IP, no user ID, no skill names, no machine fingerprint.')}`);
  console.log(`  ${c.dim('Change anytime: panguard config set telemetry false')}`);
  console.log('');

  const answer = await promptYesNo('  Enable anonymous telemetry? [y/N] ');

  const config = loadGuardConfig();
  updateGuardConfig({ ...config, telemetryEnabled: answer });
  markConsentAsked();

  if (answer) {
    console.log(`  ${c.safe('Telemetry enabled. Thank you!')}`);
  } else {
    console.log(`  ${c.dim('No problem. Telemetry stays off.')}`);
  }
  console.log('');

  return answer;
}

/** Simple yes/no prompt. Returns true for y/yes, false for anything else. */
function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Check and ask for telemetry consent if not yet asked.
 * Call this at the start of scan/setup commands.
 * Returns the current telemetryEnabled value.
 */
export async function ensureTelemetryConsent(): Promise<boolean> {
  if (!hasConsentBeenAsked()) {
    return askTelemetryConsent();
  }
  // Already asked — return current setting
  const config = loadGuardConfig();
  return config.telemetryEnabled === true;
}
