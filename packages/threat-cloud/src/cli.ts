#!/usr/bin/env node
/**
 * Threat Cloud CLI entry point
 * 威脅雲 CLI 入口點
 *
 * Usage: threat-cloud [--port 8080] [--host 0.0.0.0] [--db ./data/threats.db]
 */

import { ThreatCloudServer } from './server.js';
import type { ServerConfig } from './types.js';

function parseArgs(args: string[]): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        config.port = Number(args[++i]);
        break;
      case '--host':
        config.host = args[++i];
        break;
      case '--db':
        config.dbPath = args[++i];
        break;
      case '--api-key':
        config.apiKeyRequired = true;
        config.apiKeys = (args[++i] ?? '').split(',');
        break;
      case '--help':
        console.log(`
Threat Cloud Server - Collective Threat Intelligence Backend

Usage: threat-cloud [options]

Options:
  --port <number>      Listen port (default: 8080)
  --host <string>      Listen host (default: 127.0.0.1)
  --db <path>          SQLite database path (default: ./threat-cloud.db)
  --api-key <keys>     Comma-separated API keys (enables auth)
  --help               Show this help
`);
        process.exit(0);
    }
  }
  return config;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Environment variables override defaults; CLI args override env
  const envApiKeys = process.env['TC_API_KEYS']?.split(',').filter(Boolean) ?? [];

  const config: ServerConfig = {
    port: args.port ?? Number(process.env['TC_PORT'] ?? '8080'),
    host: args.host ?? process.env['TC_HOST'] ?? '127.0.0.1',
    dbPath: args.dbPath ?? process.env['TC_DB_PATH'] ?? './threat-cloud.db',
    apiKeyRequired: args.apiKeyRequired ?? envApiKeys.length > 0,
    apiKeys: args.apiKeys ?? envApiKeys,
    rateLimitPerMinute: 120,
  };

  const server = new ThreatCloudServer(config);

  const shutdown = async () => {
    console.log('\nShutting down Threat Cloud server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await server.start();
}

void main();
