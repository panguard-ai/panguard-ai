/**
 * panguard threat - Threat intelligence API management
 * panguard threat - 威脅情報 API 管理
 */

import { Command } from 'commander';
import { ThreatCloudServer } from '@openclaw/threat-cloud';
import type { ServerConfig } from '@openclaw/threat-cloud';
import { c, spinner, statusPanel, symbols } from '@openclaw/core';

export function threatCommand(): Command {
  const cmd = new Command('threat')
    .description('Threat intelligence API management / 威脅情報 API 管理');

  cmd.command('start')
    .description('Start the Threat Cloud API server / 啟動威脅雲 API 伺服器')
    .option('--port <number>', 'Listen port / 監聽埠', '8080')
    .option('--host <string>', 'Listen host / 監聽主機', '127.0.0.1')
    .option('--db <path>', 'SQLite database path / 資料庫路徑', './threat-cloud.db')
    .action(async (opts: { port: string; host: string; db: string }) => {
      const config: ServerConfig = {
        port: parseInt(opts.port, 10),
        host: opts.host,
        dbPath: opts.db,
        apiKeyRequired: false,
        apiKeys: [],
        rateLimitPerMinute: 120,
      };

      const sp = spinner('Starting Threat Cloud API server...');
      const server = new ThreatCloudServer(config);

      const shutdown = async () => {
        console.log(`\n  ${symbols.info} Shutting down Threat Cloud server...`);
        await server.stop();
        process.exit(0);
      };

      process.on('SIGINT', () => void shutdown());
      process.on('SIGTERM', () => void shutdown());

      await server.start();
      sp.succeed('Threat Cloud API server started');

      console.log(statusPanel('PANGUARD AI Threat Cloud', [
        { label: 'URL', value: c.underline(`http://${opts.host}:${opts.port}`) },
        { label: 'Health', value: c.sage(`http://${opts.host}:${opts.port}/health`) },
        { label: 'API', value: c.sage(`http://${opts.host}:${opts.port}/api/stats`) },
        { label: 'Database', value: c.dim(opts.db) },
      ]));

      console.log(c.dim('  Press Ctrl+C to stop'));
      console.log('');

      // Keep process alive
      await new Promise(() => {});
    });

  return cmd;
}
