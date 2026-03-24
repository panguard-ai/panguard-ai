/**
 * panguard up - One-command start for protection + dashboard
 * pg up - 一行指令啟動防護 + 儀表板
 *
 * The simplest way to get Panguard running. Two characters: pg up.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Command } from 'commander';
import { runCLI } from '@panguard-ai/panguard-guard';
import { c, header } from '@panguard-ai/core';

export function upCommand(): Command {
  return new Command('up')
    .description('Start protection + dashboard (shortcut) / 啟動防護 + 儀表板（快捷指令）')
    .option('--no-dashboard', 'Skip TUI dashboard / 不啟動儀表板')
    .option('--verbose', 'Verbose output / 詳細輸出', false)
    .action(async (opts: { dashboard: boolean; verbose: boolean }) => {
      const configPath = join(homedir(), '.panguard', 'config.json');
      const isFirstRun = !existsSync(configPath);

      if (isFirstRun) {
        console.log(c.sage('\n  First time? Running setup first...\n'));
        // Import and run setup dynamically to avoid circular deps
        const { execFileSync } = await import('node:child_process');
        try {
          execFileSync(process.execPath, [process.argv[1] ?? 'panguard', 'setup'], {
            stdio: 'inherit',
          });
        } catch {
          // Setup may exit with non-zero, continue anyway
        }
      }

      header('Starting Panguard AI Protection');

      const args = ['start'];
      if (opts.dashboard) args.push('--dashboard');
      if (opts.verbose) args.push('--verbose');

      await runCLI(args);
    });
}
