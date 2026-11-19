/**
 * Telemetry consent — first-run collective-defense disclosure.
 *
 * Collective-defense sharing is OPT-IN and defaults to OFF. On first interactive
 * run we explain what joining sends and downloads (field by field) and what is
 * never sent, then ask the user to turn it ON; pressing Enter declines. This is
 * an informed invitation, not a nag or a pre-checked default.
 * Non-interactive (CI) stays OFF until explicitly enabled. Nothing leaves the
 * machine unless the user explicitly opts in (gates are `=== true`).
 *
 * The disclosure lines live in COLLECTIVE_DEFENSE_LINES so every surface that
 * shows them (first run, `pga setup`, `pga config show --verbose`) prints the
 * same text. Keep them in step with the code: every sentence must be true.
 */

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { c, symbols } from '@panguard-ai/core';
import { isSharingEnabled, loadGuardConfig, updateGuardConfig } from './guard-config.js';

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

/** Exact text of the Collective Defense disclosure (one string per line). */
export const COLLECTIVE_DEFENSE_LINES: readonly string[] = [
  'Why join: every rule-matched attack you see can become a community rule. With',
  'the local AI layer on (free — pga guard setup-ai), PanGuard ALSO reports UNKNOWN',
  'suspicious behavior it can’t yet match to a rule, so novel attacks the AI flags',
  'can become new rules too. Reporting an unknown never blocks it.',
  '',
  'If you agree, PanGuard will:',
  '  1. Share minimal, ANONYMIZED threat signatures: the matched rule ID(s) (or',
  '     “none” for unknown threats), attack category + MITRE technique, a coarse',
  '     country region, and a truncated IP (last two octets zeroed). They are',
  '     END-TO-END ENCRYPTED on your machine: only the Threat Cloud backend can',
  '     read them, not the network or a relay.',
  '  2. Send these summaries over HTTPS (not sealed) when you audit skills or scan:',
  '       - the name of a skill or MCP server (its manifest/config name, never a',
  '         path), a hash of it (its SKILL.md, or its files, or the server name and',
  '         command shape — never its path), its risk level and score, and the rule',
  '         ID, category, severity and title of each finding;',
  '       - scan counts, your OS and CPU type, the PanGuard version and the list of',
  '         AI-agent platforms PanGuard set up (for example cursor, claude-code);',
  '       - on pga up, repeated until the server accepts it once: your terminal',
  '         program name, OS/CPU type, PanGuard version and Node version.',
  '  3. Download community lists every 5 minutes: IP and domain blocklists and the',
  '     community skill allow/block lists from Threat Cloud, plus public threat-',
  '     intel feeds from third parties (abuse.ch, and GreyNoise or AbuseIPDB if',
  '     you set their keys). Those servers see your IP address.',
  '  4. Turn on the rule-proposal drafter. In two calls (draft, then review) it',
  '     sends the AI model you configured (a cloud provider if you set an API key,',
  '     otherwise a local model) up to five event descriptions of up to 200',
  '     characters each, the analysis and evidence text built from them (up to',
  '     three notes of 500 characters and five of 200), event counts and the',
  '     time range, and then the rule it drafted.',
  '',
  'Separate from sharing: if you have run pga login, every pga audit also sends to',
  'your workspace at app.panguard.ai, whether or not you joined: the rule ID,',
  'severity and title of each finding, the risk level and score, the skill name,',
  'the target’s base name (or its remote identifier), a hash of the target, a',
  'one-way hashed machine ID, your OS and the PanGuard version. The events are',
  'tied to your workspace. pga logout stops it.',
  '',
  'Also separate from sharing: pga scan in full mode looks up the names (and',
  'versions, when detected) of services listening on this machine on the NIST NVD',
  'vulnerability database (services.nvd.nist.gov).',
  '',
  'Detection rules do NOT update by themselves: they change only when you run',
  'pga upgrade. Whether or not you join, there are two daily version checks: the',
  'CLI’s own and the rules’, both plain lookups on the npm registry (npm sees',
  'your IP address). pga config set update-check false turns both off, and',
  'PANGUARD_NO_UPDATE_CHECK=1 overrides it.',
  '',
  'NEVER shared: your prompts, code, file contents, secrets, file paths, hostname,',
  'or username. Raw samples are never sent. The names of tools your agents call at',
  'runtime are never uploaded. Detection-rule proposals drafted from what PanGuard',
  'finds stay on this machine (~/.panguard/proposals) until you submit one',
  'yourself with pga proposals submit. A stable random install ID links your own',
  'submissions (pseudonymous, not fully anonymous).',
  '',
  'Turn off anytime: pga config set threat-cloud false stops every upload and',
  'download in 1 to 4 (pga config set telemetry false does the same). It restarts',
  'an installed always-on Guard service, and stops a Guard that is running now;',
  'turning sharing ON in a Guard you started by hand needs pga guard restart.',
];

/**
 * Print the full what's-shared / never-shared Collective Defense disclosure.
 * Shared by the first-run consent prompt, `pga setup` AND `pga config show
 * --verbose` / `pga tc --explain`, so a user who wants to re-read what they
 * agreed to months later sees the exact same copy.
 *
 * The "END-TO-END ENCRYPTED" line covers the threat signatures only (the
 * /api/threats upload) and is stated as unconditional fact because it IS one:
 * postThreats() (packages/panguard-guard/src/threat-cloud/index.ts) throws and
 * refuses to upload rather than falling back to plaintext-over-TLS when sealing
 * is unavailable. Never soften this without re-verifying that invariant.
 */
export function printCollectiveDefenseDisclosure(): void {
  console.log('');
  console.log(
    `  ${symbols.info} ${c.bold('Join Collective Defense (your choice, reversible anytime)')}`
  );
  console.log('');
  for (const line of COLLECTIVE_DEFENSE_LINES) {
    console.log(line === '' ? '' : `  ${c.dim(line)}`);
  }
  console.log('');
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
    await updateGuardConfig({
      ...config,
      telemetryEnabled: false,
      threatCloudUploadEnabled: false,
      threatCloudRuleSyncEnabled: false,
    });
    markConsentAsked();
    return false;
  }

  printCollectiveDefenseDisclosure();

  // Opt-in: default is NO. Pressing Enter declines (default OFF).
  const answer = await promptYesNo('  Agree and join Collective Defense? [y/N] ', false);

  const config = loadGuardConfig();
  // A single "I agree" wires the whole loop: contribute (upload) AND receive
  // (rule sync). Declining leaves every flag off — nothing connects, nothing syncs.
  await updateGuardConfig({
    ...config,
    telemetryEnabled: answer,
    threatCloudUploadEnabled: answer,
    threatCloudRuleSyncEnabled: answer,
  });
  markConsentAsked();

  if (answer) {
    console.log(`  ${c.safe('Connected to Threat Cloud. You are defending the commons.')}`);
  } else {
    console.log(`  ${c.dim('No problem. Nothing connects and nothing leaves your machine.')}`);
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
 * Non-interactive read: has the user explicitly opted in to Threat Cloud upload?
 *
 * Use this on one-off code paths (e.g. `pga scan <path>`) that must NEVER trigger
 * an outbound upload — or an interactive prompt — but still need to honour a prior
 * opt-in. Defaults to FALSE (no upload) when config is absent or unreadable, so the
 * privacy guarantee holds by default. Gate is `=== true`, matching the guard's
 * upload gate.
 */
export function isThreatCloudUploadEnabled(): boolean {
  try {
    return isSharingEnabled(loadGuardConfig());
  } catch {
    return false;
  }
}

/**
 * Check and ask for telemetry consent if not yet asked.
 * Call this at the start of scan/setup commands.
 * Returns whether sharing is on (the single predicate, isSharingEnabled).
 */
export async function ensureTelemetryConsent(): Promise<boolean> {
  if (!hasConsentBeenAsked()) {
    return askTelemetryConsent();
  }
  // Already asked — return current setting
  return isSharingEnabled(loadGuardConfig());
}
