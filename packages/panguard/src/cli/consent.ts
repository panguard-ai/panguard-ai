/**
 * Telemetry consent — first-run collective-defense disclosure.
 *
 * Collective-defense sharing is OPT-IN and defaults to OFF. On first interactive
 * run we explain BOTH the value (your blocked attacks become ATR rules that
 * protect everyone, and you get community rules back faster) and the privacy
 * guarantee (matched rule ID, a one-way payload hash, source type — never
 * prompts/code/file contents/keys, no IP, no hostname, a random install ID),
 * then ask the user to turn it ON; pressing Enter declines. This is an informed
 * invitation, not a nag or a pre-checked default. Raw samples are never sent.
 * Non-interactive (CI) stays OFF until explicitly enabled. Nothing leaves the
 * machine unless the user explicitly opts in (gates are `=== true`).
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

/**
 * Mark consent as asked (regardless of answer). Exported so a command that owns
 * its own consent prompt (e.g. `pga setup`'s Threat Cloud question) can record
 * that the user has already been asked — preventing the trailing
 * `ensureTelemetryConsent()` from re-prompting and overwriting the first answer.
 */
export function markConsentAsked(): void {
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
  console.log(`  ${c.dim('集體防禦（選用，預設關閉）')}`);
  console.log('');
  console.log(`  ${c.dim('Why turn it on: every attack PanGuard blocks on your machine can become')}`);
  console.log(`  ${c.dim('a new ATR rule that protects everyone — and you get those community')}`);
  console.log(`  ${c.dim('rules back faster. More sensors means faster detection for all of us.')}`);
  console.log(
    `  ${c.dim('開啟的理由：你這台機器擋下的每一次攻擊，都能變成一條新的 ATR 規則保護所有人，')}`
  );
  console.log(
    `  ${c.dim('而你也能更快收到社群回流的規則。感測器越多，大家的偵測都越快。')}`
  );
  console.log('');
  console.log(`  ${c.dim('What is shared: only the matched rule ID, a one-way hash of the payload,')}`);
  console.log(`  ${c.dim('and the source type. Never your prompts, code, file contents, keys, IP')}`);
  console.log(`  ${c.dim('address, or hostname. A random install ID only. Raw samples are never sent.')}`);
  console.log(
    `  ${c.dim('分享的內容：只有命中的規則 ID、payload 的單向雜湊、來源類型。絕不含你的')}`
  );
  console.log(
    `  ${c.dim('prompt、程式碼、檔案內容、金鑰、IP 或主機名。只有一組隨機安裝 ID，從不上傳原始樣本。')}`
  );
  console.log('');
  console.log(`  ${c.dim('Stays off unless you opt in. Change anytime: pga config set telemetry true/false')}`);
  console.log(`  ${c.dim('不開就維持關閉。隨時可改：pga config set telemetry true/false')}`);
  console.log('');

  // Opt-in: default is NO. Pressing Enter declines (default OFF).
  const answer = await promptYesNo(
    '  Join collective defense and share anonymized threat signatures? [y/N] ',
    false
  );

  const config = loadGuardConfig();
  updateGuardConfig({ ...config, telemetryEnabled: answer, threatCloudUploadEnabled: answer });
  markConsentAsked();

  if (answer) {
    console.log(`  ${c.safe('Thank you — you are helping defend the commons.')}`);
    console.log(`  ${c.dim('謝謝你 — 你正在幫忙守護整個社群。')}`);
  } else {
    console.log(`  ${c.dim('No problem. Nothing leaves your machine.')}`);
    console.log(`  ${c.dim('沒問題，不會有任何資料離開這台機器。')}`);
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
