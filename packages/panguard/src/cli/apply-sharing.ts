/**
 * Make a sharing change reach a running Guard.
 *
 * `pga config set telemetry|threat-cloud` only writes config.json; a running
 * daemon keeps the launch-time config. So after the write:
 *   - an installed always-on service is restarted (it re-reads the config);
 *   - a daemon started by hand gets SIGHUP when sharing was turned OFF, which
 *     makes it re-read the config and stop sharing at once;
 *   - turning sharing ON in a hand-started daemon needs `pga guard restart`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ApplyOutcome = 'service-restarted' | 'signalled' | 'restart-needed' | 'no-daemon';

export interface ApplyDeps {
  readonly serviceInstalled: () => boolean;
  readonly restartService: () => boolean;
  readonly daemonPid: () => number | null;
  readonly signal: (pid: number) => boolean;
  readonly platform: NodeJS.Platform;
}

function readLivePid(): number | null {
  try {
    const pidPath = join(homedir(), '.panguard-guard', 'panguard-guard.pid');
    if (!existsSync(pidPath)) return null;
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    if (!Number.isInteger(pid) || pid <= 0) return null;
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

async function defaultDeps(): Promise<ApplyDeps> {
  const persist = await import('./commands/persist.js');
  return {
    serviceInstalled: persist.isPersistentServiceInstalled,
    restartService: persist.restartPersistentService,
    daemonPid: readLivePid,
    signal: (pid) => {
      try {
        process.kill(pid, 'SIGHUP');
        return true;
      } catch {
        return false;
      }
    },
    platform: process.platform,
  };
}

export async function applySharingToRunningGuard(
  enabled: boolean,
  deps?: ApplyDeps
): Promise<ApplyOutcome> {
  const d = deps ?? (await defaultDeps());
  if (d.serviceInstalled() && d.restartService()) return 'service-restarted';
  const pid = d.daemonPid();
  if (pid === null) return 'no-daemon';
  if (!enabled && d.platform !== 'win32' && d.signal(pid)) return 'signalled';
  return 'restart-needed';
}

export function describeOutcome(outcome: ApplyOutcome): string {
  switch (outcome) {
    case 'service-restarted':
      return 'The always-on Guard service was restarted and now uses this setting.';
    case 'signalled':
      return 'The running Guard stopped sharing now.';
    case 'restart-needed':
      return 'Guard is running with the old setting. Apply it now: pga guard restart';
    case 'no-daemon':
      return 'Guard is not running; the setting applies the next time it starts.';
  }
}
