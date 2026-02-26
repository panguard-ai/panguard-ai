/**
 * panguard threat - Threat intelligence API management
 * panguard threat - 威脅情報 API 管理
 */

import { Command } from 'commander';
import { ThreatCloudServer } from '@openclaw/threat-cloud';
import type { ServerConfig } from '@openclaw/threat-cloud';
import { c, spinner, statusPanel, symbols } from '@openclaw/core';
import { withAuth } from '../auth-guard.js';

export function threatCommand(): Command {
  const cmd = new Command('threat')
    .description('Threat intelligence API management / \u5A01\u8105\u60C5\u5831 API \u7BA1\u7406');

  cmd.command('start')
    .description('Start the Threat Cloud API server / \u555F\u52D5\u5A01\u8105\u96F2 API \u4F3A\u670D\u5668')
    .option('--port <number>', 'Listen port / \u76E3\u807D\u57E0', '8080')
    .option('--host <string>', 'Listen host / \u76E3\u807D\u4E3B\u6A5F', '127.0.0.1')
    .option('--db <path>', 'SQLite database path / \u8CC7\u6599\u5EAB\u8DEF\u5F91', './threat-cloud.db')
    .action(withAuth('enterprise', async (opts: { port: string; host: string; db: string }) => {
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
    }));

  return cmd;
}
