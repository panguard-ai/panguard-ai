/**
 * `panguard upgrade` - Update Panguard CLI to the latest version
 * `panguard upgrade` - 更新 Panguard CLI 至最新版本
 *
 * @module @panguard-ai/panguard/cli/commands/upgrade
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { PANGUARD_VERSION } from '../../index.js';

// Upgrade the top-level `panguard` package the README install uses — it owns the
// `pga`/`panguard` bins. Upgrading the @panguard-ai/panguard dependency directly
// installs a SECOND competing global package and leaves the wrapper stale.
const INSTALL_CMD = 'npm install -g panguard@latest';

export function upgradeCommand(): Command {
  const cmd = new Command('upgrade')
    .description('Update Panguard CLI to the latest version')
    .action(async () => {
      const before = PANGUARD_VERSION;
      console.log('Checking for updates...');
      try {
        execSync(INSTALL_CMD, { stdio: 'inherit' });
      } catch {
        console.error(`Update failed. Try manually: ${INSTALL_CMD}`);
        process.exitCode = 1;
        return;
      }
      // Verify by asking the freshly-installed binary its version in a NEW process
      // (this process still runs the old build), instead of claiming success blindly.
      let after: string | null = null;
      try {
        after = execSync('pga --version', { encoding: 'utf-8' }).trim();
      } catch {
        /* version probe failed — report neutrally below */
      }
      if (after && before && after === before) {
        console.log(`Already on the latest version (${after}).`);
      } else if (after) {
        console.log(`Panguard updated${before ? ` from ${before}` : ''} to ${after}.`);
      } else {
        console.log('Update installed. Run "pga --version" to confirm.');
      }
    });

  return cmd;
}
