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
import { execFile, execFileSync } from 'node:child_process';

/**
 * launchd label — matches the proven installed service so installs are idempotent.
 * Exported as the SINGLE SOURCE OF TRUTH for the plist name: doctor / self-removal
 * checks must derive the path from this, never hard-code it (a drift = a service
 * health check that reads the wrong file and always reports "not installed").
 */
export const SERVICE_LABEL = 'com.panguard.panguard-guard';
/** The LaunchAgent plist basename derived from the label. */
export const SERVICE_PLIST_BASENAME = `${SERVICE_LABEL}.plist`;
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
  // Pin HOME explicitly. launchd normally sets HOME for a GUI agent, but making
  // it explicit guarantees the daemon's ~/.panguard-guard (dashboard token,
  // config, logs) resolves to the SAME dir the installing CLI reads — so
  // `pga up`/`pga status` always find the launch token instead of falsely
  // reporting "Dashboard not available / Guard not running".
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
    <key>HOME</key>
    <string>${xmlEscape(dirname(dataDir))}</string>
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
/** Whether the reboot-surviving LaunchAgent is installed (macOS only). */
export function isPersistentServiceInstalled(): boolean {
  return platform() === 'darwin' && existsSync(plistPath());
}

/**
 * Restart the reboot-surviving Guard service IN PLACE. For a launchd KeepAlive
 * service a plain "stop then start" is wrong: launchd respawns the daemon between
 * the two steps, so `start` sees the relaunched process and prints the misleading
 * "PanguardGuard is already running" — the daemon does restart, but the CLI
 * reports as if nothing happened. `launchctl kickstart -k` kills and restarts the
 * job atomically. Returns true if a service restart was issued (caller should NOT
 * also stop+start), false if there is no service to restart. Never throws.
 */
export function restartPersistentService(): boolean {
  if (platform() !== 'darwin') return false;
  try {
    if (!existsSync(plistPath())) return false;
    const uid = typeof process.getuid === 'function' ? process.getuid() : null;
    if (uid === null) return false;
    // -k: kill the running instance first, then (re)start it. Synchronous so the
    // caller can then poll for the fresh daemon + dashboard token.
    execFileSync('/bin/launchctl', ['kickstart', '-k', `gui/${uid}/${SERVICE_LABEL}`], {
      stdio: 'ignore',
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

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
