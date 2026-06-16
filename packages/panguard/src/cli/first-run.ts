/**
 * First-run detection — durable, telemetry-independent.
 *
 * The flagship `pga up` and the bare `pga` interactive entry both need to know
 * "has this machine completed the welcome + interactive setup at least once?".
 *
 * Previously each command answered that question with a marker that was wrong:
 *   - `pga up` keyed off ~/.panguard/activated, which is ONLY written by the
 *     opt-in Threat Cloud activation ping. A user who declines telemetry (the
 *     default) never gets that file, so EVERY `pga up` re-ran the full
 *     "Welcome to PanGuard AI!" + interactive setup.
 *   - bare `pga` keyed off ~/.panguard/config.json, which is never written —
 *     `pga setup` saves its config to ~/.panguard-guard/config.json — so the
 *     setup wizard re-triggered on every bare invocation even after setup.
 *
 * The fix is a single dedicated marker, ~/.panguard/.initialized (0o600),
 * written once after the first successful run and consulted by BOTH commands.
 * It is independent of telemetry consent and of any config file location.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** The PanGuard CLI state directory (NOT the Guard daemon's ~/.panguard-guard). */
const PANGUARD_DIR = join(homedir(), '.panguard');

/** Durable first-run marker. Presence => welcome + setup already completed. */
const INITIALIZED_MARKER = join(PANGUARD_DIR, '.initialized');

/**
 * Whether this is the machine's first run (no durable marker yet). Returns true
 * on any read uncertainty only when the marker is genuinely absent — a present
 * marker always means "not first run".
 */
export function isFirstRun(): boolean {
  return !existsSync(INITIALIZED_MARKER);
}

/**
 * Record that the first run has completed so subsequent `pga up` / bare `pga`
 * skip the welcome + interactive setup and go straight to the normal flow.
 *
 * Idempotent and best-effort: creates ~/.panguard (0o700) if missing and writes
 * the marker (0o600). A write failure is swallowed — we would simply re-detect
 * first-run next time rather than crash a security tool's happy path.
 */
export function markInitialized(): void {
  try {
    if (!existsSync(PANGUARD_DIR)) {
      mkdirSync(PANGUARD_DIR, { recursive: true, mode: 0o700 });
    }
    if (!existsSync(INITIALIZED_MARKER)) {
      writeFileSync(INITIALIZED_MARKER, new Date().toISOString(), {
        encoding: 'utf-8',
        mode: 0o600,
      });
    }
  } catch {
    /* best-effort: re-detect first-run next time rather than fail the run */
  }
}
