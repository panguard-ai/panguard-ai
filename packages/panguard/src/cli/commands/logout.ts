/**
 * `panguard logout` - Authentication removed
 * `panguard logout` - 驗證功能已移除
 *
 * All features are free and open source. No login required.
 *
 * @module @panguard-ai/panguard/cli/commands/logout
 */

import { Command } from 'commander';

export function logoutCommand(): Command {
  return new Command('logout')
    .description('Authentication removed - all features are free / 驗證已移除 - 所有功能免費')
    .action(async () => {
      console.log('');
      console.log('  Authentication removed. All features are free and open source.');
      console.log('  驗證功能已移除。所有功能皆免費開源。');
      console.log('');
    });
}
