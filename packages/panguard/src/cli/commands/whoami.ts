/**
 * `panguard whoami` - All features available without login
 * `panguard whoami` - 所有功能無需登入即可使用
 *
 * @module @panguard-ai/panguard/cli/commands/whoami
 */

import { Command } from 'commander';

export function whoamiCommand(): Command {
  return new Command('whoami')
    .description('Show current user info / 顯示目前用戶資訊')
    .option('--json', 'Output as JSON')
    .option('--lang <language>', 'Language override')
    .action(async (opts: { json?: boolean; lang?: string }) => {
      if (opts.json) {
        console.log(JSON.stringify({ authenticated: true, tier: 'community', note: 'All features available (no login required)' }, null, 2));
        return;
      }
      console.log('');
      console.log('  All features available (no login required).');
      console.log('  所有功能皆可使用（無需登入）。');
      console.log('');
      console.log('  Panguard AI is free and open source.');
      console.log('  Visit https://github.com/panguard-ai/panguard-ai for more info.');
      console.log('');
    });
}
