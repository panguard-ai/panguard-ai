/**
 * `panguard login` - Authentication removed
 * `panguard login` - 驗證功能已移除
 *
 * All features are free and open source. No login required.
 *
 * @module @panguard-ai/panguard/cli/commands/login
 */

import { Command } from 'commander';

export function loginCommand(): Command {
  return new Command('login')
    .description('Authentication removed - all features are free')
    .action(async () => {
      console.log('');
      console.log('  Authentication removed. All features are free and open source.');
      console.log('  驗證功能已移除。所有功能皆免費開源。');
      console.log('');
      console.log('  Visit https://github.com/panguard-ai/panguard-ai for more info.');
      console.log('');
    });
}
