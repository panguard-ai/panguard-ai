/**
 * `panguard upgrade` - Update Panguard CLI to the latest version
 * `panguard upgrade` - 更新 Panguard CLI 至最新版本
 *
 * @module @panguard-ai/panguard/cli/commands/upgrade
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';

export function upgradeCommand(): Command {
  const cmd = new Command('upgrade')
    .description('Update Panguard CLI to the latest version')
    .action(async () => {
      console.log('Checking for updates...');
      try {
        execSync('npm install -g @panguard-ai/panguard@latest', {
          stdio: 'inherit',
        });
        console.log('Panguard has been updated to the latest version.');
      } catch {
        console.error('Update failed. Try manually: npm install -g @panguard-ai/panguard@latest');
      }
    });

  return cmd;
}
