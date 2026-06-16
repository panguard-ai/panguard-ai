/**
 * Telemetry consent — first-run collective-defense disclosure.
 *
 * Collective-defense sharing is OPT-IN and defaults to OFF. On first interactive
 * run we disclose what would be shared (matched rule ID, a one-way payload hash,
 * source type — never prompts/code/data, no IP, no hostname, a random install ID)
 * and ask the user to turn it ON; pressing Enter declines. Raw samples are never
 * sent. Non-interactive (CI) stays OFF until explicitly enabled. Nothing leaves
 * the machine unless the user explicitly opts in (gates are `=== true`).
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
  // Non-interactive (CI / headless): we cannot show the disclosure, so stay
  // fully OFF — set both flags explicitly false (not just unset) so the guard's
  // upload gate blocks. Opt in by setting the flags in config for headless use.
  if (!process.stdin.isTTY) {
    const config = loadGuardConfig();
    updateGuardConfig({ ...config, telemetryEnabled: false, threatCloudUploadEnabled: false });
    markConsentAsked();
    return false;
  }

  console.log('');
  console.log(`  ${symbols.info} ${c.bold('Collective defense (optional, off by default)')}`);
  console.log('');
  console.log(`  ${c.dim('If you turn this on, then when PanGuard catches an attack it shares an')}`);
  console.log(`  ${c.dim('anonymized signature — the matched rule ID, a one-way hash of the')}`);
  console.log(`  ${c.dim('payload, and the source type — so new attacks become rules that')}`);
  console.log(`  ${c.dim('protect everyone.')}`);
  console.log('');
  console.log(
    `  ${c.dim('Never your prompts, code, or data. No IP address. No hostname. A random')}`
  );
  console.log(`  ${c.dim('install ID only. Raw samples are never sent.')}`);
  console.log(`  ${c.dim('Stays off unless you opt in. Turn on later: pga config set telemetry true')}`);
  console.log('');

  // Opt-in: default is NO. Pressing Enter declines (default OFF).
  const answer = await promptYesNo('  Share anonymized threat signatures? [y/N] ', false);

  const config = loadGuardConfig();
  updateGuardConfig({ ...config, telemetryEnabled: answer, threatCloudUploadEnabled: answer });
  markConsentAsked();

  if (answer) {
    console.log(`  ${c.safe('Thank you — you are helping defend the commons.')}`);
  } else {
    console.log(`  ${c.dim('No problem. Nothing leaves your machine.')}`);
  }
  console.log('');

  return answer;
}

/**
 * Simple yes/no prompt. Empty input (Enter) returns `defaultYes`; otherwise true
 * only for y/yes. For opt-in consent pass `defaultYes = false` so a bare Enter
 * declines and nothing is shared.
 */
function promptYesNo(question: string, defaultYes = false): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === '') {
        resolve(defaultYes);
        return;
      }
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
