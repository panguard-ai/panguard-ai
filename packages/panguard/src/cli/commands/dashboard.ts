/**
 * panguard dashboard - Start the web dashboard
 * panguard dashboard - 啟動 Web 儀表板
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { c, spinner, statusPanel, symbols, banner } from '@openclaw/core';
import { PanguardDashboardServer } from '../../server/index.js';

export function dashboardCommand(): Command {
  return new Command('dashboard')
    .description('Start the dashboard web UI / 啟動儀表板 Web 介面')
    .option('--port <number>', 'Server port / 伺服器埠', '3000')
    .option('--no-open', 'Do not auto-open browser / 不自動開啟瀏覽器')
    .action(async (opts: { port: string; open: boolean }) => {
      const port = parseInt(opts.port, 10);

      console.log(banner());

      // Find the web dist path (relative to this file's compiled location)
      // packages/panguard/dist/cli/commands/dashboard.js → packages/web/dist
      const webDistPath = resolve(import.meta.dirname, '../../../../web/dist');

      if (!existsSync(resolve(webDistPath, 'index.html'))) {
        console.log(`  ${symbols.fail} Web frontend not built.`);
        console.log(`  Run ${c.sage('pnpm build')} first to build all packages.`);
        console.log('');
        process.exit(1);
      }

      const sp = spinner('Starting Panguard Dashboard...');
      const server = new PanguardDashboardServer(port, webDistPath);
      await server.start();
      sp.succeed('Dashboard started');

      const url = `http://localhost:${port}`;
      console.log(statusPanel('PANGUARD AI Dashboard', [
        { label: 'Dashboard', value: c.underline(`${url}/dashboard`) },
        { label: 'Website', value: c.underline(url) },
        { label: 'API', value: c.sage(`${url}/api/status`) },
      ]));

      console.log(c.dim('  Press Ctrl+C to stop'));
      console.log('');

      // Auto-open browser
      if (opts.open) {
        const { exec } = await import('node:child_process');
        const openCmd = process.platform === 'darwin' ? 'open'
          : process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCmd} ${url}/dashboard`);
      }

      // Graceful shutdown
      const shutdown = async () => {
        console.log(`\n  ${symbols.info} Shutting down dashboard...`);
        await server.stop();
        process.exit(0);
      };

      process.on('SIGINT', () => void shutdown());
      process.on('SIGTERM', () => void shutdown());

      // Keep process alive
      await new Promise(() => {});
    });
}
