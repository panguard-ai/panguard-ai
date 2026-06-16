/**
 * Reboot persistence for the Guard daemon (macOS launchd).
 *
 * `pga up` starts a background daemon, but a security tool must survive reboot
 * like an antivirus does. On macOS we install a user-level LaunchAgent that runs
 * the PROVEN-working command (`pga guard --watch`) with RunAtLoad + KeepAlive —
 * so protection starts at login and respawns on crash, with NO sudo. On Linux
 * the system service needs elevation, so we don't auto-install there; the caller
 * keeps the honest "run pga guard install" hint.
 *
 * @module @panguard-ai/panguard/cli/commands/persist
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { execFile } from 'node:child_process';

/** launchd label — matches the proven installed service so installs are idempotent. */
const SERVICE_LABEL = 'com.panguard.panguard-guard';
const DATA_DIR = join(homedir(), '.panguard-guard');

function plistPath(): string {
  return join(homedir(), 'Library', 'LaunchAgents', `${SERVICE_LABEL}.plist`);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the launchd plist that runs the Guard under launchd supervision.
 * Replicates the proven service command `pga guard --watch` (the foreground
 * daemon), RunAtLoad + KeepAlive = start at login + respawn on crash. Pure +
 * exported so a test can pin the exact bytes we write (a wrong plist = silent
 * loss of protection on the next reboot).
 */
export function buildGuardPlist(node: string, script: string, dataDir = DATA_DIR): string {
  const argv = [node, script, 'guard', '--watch'];
  const programArgs = argv.map((a) => `    <string>${xmlEscape(a)}</string>`).join('\n');
  // launchd hands a process a minimal PATH; give the daemon the interpreter's
  // own dir plus standard locations so it can spawn npx/node for TC sync.
  const path = [dirname(node), '/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'].join(':');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${programArgs}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xmlEscape(path)}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(join(dataDir, 'panguard-guard.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(join(dataDir, 'panguard-guard-error.log'))}</string>
</dict>
</plist>`;
}

export type PersistResult = 'installed' | 'already' | 'failed' | 'unsupported';

/**
 * Install (or ensure loaded) the reboot-surviving Guard service. macOS only
 * (user LaunchAgent, no sudo). Idempotent: if our plist already exists we don't
 * rewrite it, but we still `launchctl load` (harmless if already loaded) so a
 * present-but-unloaded service is brought up. The service itself runs the
 * daemon — callers MUST NOT also spawn an ephemeral one (two daemons would fight
 * over the dashboard port). Never throws: a persistence failure must not break
 * `pga up`.
 */
export function ensurePersistentService(): PersistResult {
  if (platform() !== 'darwin') return 'unsupported';
  try {
    const p = plistPath();
    const node = process.execPath;
    const script = process.argv[1];
    if (!script) return 'failed';
    const wasNew = !existsSync(p);
    if (wasNew) {
      mkdirSync(dirname(p), { recursive: true });
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(p, buildGuardPlist(node, script), 'utf-8');
    }
    // Load it (starts the daemon now via RunAtLoad). Best-effort + async: the
    // plist is on disk regardless, so it will start at next login even if this
    // load is a no-op or errors (e.g. already loaded).
    execFile('/bin/launchctl', ['load', p], () => {});
    return wasNew ? 'installed' : 'already';
  } catch {
    return 'failed';
  }
}
