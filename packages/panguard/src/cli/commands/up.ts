/**
 * panguard up - One-command start for protection + dashboard
 * pg up - 一行指令啟動防護 + 儀表板
 *
 * The simplest way to get Panguard running. Two characters: pg up.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { execFile } from 'node:child_process';
import { Command } from 'commander';
import { runCLI } from '@panguard-ai/panguard-guard';
import { c, header } from '@panguard-ai/core';

const DASHBOARD_URL = 'http://127.0.0.1:3100';

/** Open URL in default browser (cross-platform) */
function openBrowser(url: string): void {
  const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';
  execFile(cmd, [url], () => {});
}

/** Check if Guard is already running via PID file */
function isGuardRunning(): boolean {
  const pidPath = join(homedir(), '.panguard-guard', 'panguard-guard.pid');
  if (!existsSync(pidPath)) return false;
  try {
    const pid = parseInt(readFileSync(pidPath, 'utf-8').trim(), 10);
    process.kill(pid, 0); // signal 0 = check if alive
    return true;
  } catch {
    return false;
  }
}

export function upCommand(): Command {
  return new Command('up')
    .description('Start protection + dashboard (shortcut) / 啟動防護 + 儀表板（快捷指令）')
    .option('--no-dashboard', 'Skip TUI dashboard / 不啟動儀表板')
    .option('--verbose', 'Verbose output / 詳細輸出', false)
    .action(async (opts: { dashboard: boolean; verbose: boolean }) => {
      // Check both config locations — setup writes to either depending on flow
      const configPath1 = join(homedir(), '.panguard', 'config.json');
      const configPath2 = join(homedir(), '.panguard-guard', 'config.json');
      const isFirstRun = !existsSync(configPath1) && !existsSync(configPath2);

      if (isFirstRun) {
        console.log(c.sage('\n  First time? Running setup first...\n'));
        const { execFileSync } = await import('node:child_process');
        try {
          execFileSync(process.execPath, [process.argv[1] ?? 'panguard', 'setup'], {
            stdio: 'inherit',
          });
        } catch {
          // Setup may exit with non-zero, continue anyway
        }
      }

      // If Guard is already running, just open dashboard and exit
      if (isGuardRunning()) {
        console.log(c.sage('\n  Panguard Guard is already running.'));
        if (opts.dashboard) {
          console.log(c.sage(`  Opening dashboard: ${DASHBOARD_URL}\n`));
          openBrowser(DASHBOARD_URL);
        }
        return;
      }

      header('Starting Panguard AI Protection');

      // Always open dashboard when Guard starts
      if (opts.dashboard) {
        setTimeout(() => openBrowser(DASHBOARD_URL), 2000);
      }

      const args = ['start'];
      if (opts.dashboard) args.push('--dashboard');
      if (opts.verbose) args.push('--verbose');

      await runCLI(args);
    });
}
