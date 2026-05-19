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
        process.stderr.write(
          '[DEPRECATION WARNING] --api-key CLI flag is deprecated and will be removed in a future release.\n' +
            '  Use the TC_API_KEYS environment variable instead.\n'
        );
        config.apiKeyRequired = true;
        config.apiKeys = (args[++i] ?? '').split(',');
        break;
      case '--anthropic-api-key':
        process.stderr.write(
          '[REMOVED] --anthropic-api-key CLI flag is no longer accepted.\n' +
            '  Set the ANTHROPIC_API_KEY environment variable instead.\n'
        );
        process.exit(1);
        break;
      case '--admin-api-key':
        process.stderr.write(
          '[REMOVED] --admin-api-key CLI flag is no longer accepted.\n' +
            '  Set the TC_ADMIN_API_KEY environment variable instead.\n' +
            '  Passing secrets via CLI flags exposes them in `ps aux` output.\n'
        );
        process.exit(1);
        break;
      case '--help':
        console.log(`
Threat Cloud Server - Collective Threat Intelligence Backend

Usage: threat-cloud [options]

Options:
  --port <number>   Listen port (default: 8080)
  --host <string>   Listen host (default: 127.0.0.1)
  --db <path>       SQLite database path (default: ./threat-cloud.db)
  --api-key <keys>  Comma-separated API keys (DEPRECATED — use TC_API_KEYS env var)
  --help            Show this help

Secret configuration (environment variables only — never pass via CLI flags):
  TC_ADMIN_API_KEY     Admin key for write-protected endpoints
  TC_API_KEYS          Comma-separated API keys (preferred over --api-key)
  ANTHROPIC_API_KEY    Anthropic API key for LLM review of ATR proposals
`);
        process.exit(0);
    }
  }
  return config;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Fail-closed: API key enforcement is ON by default.
  // To disable (local development only), set TC_API_KEY_REQUIRED=false explicitly.
  const apiKeyRequiredEnv = process.env['TC_API_KEY_REQUIRED'];
  let apiKeyRequired: boolean;
  if (args.apiKeyRequired === true) {
    // --api-key flag was provided; honour its implied true
    apiKeyRequired = true;
  } else if (apiKeyRequiredEnv !== undefined) {
    apiKeyRequired = apiKeyRequiredEnv.toLowerCase() !== 'false';
  } else {
    // Default: fail-closed (require auth)
    apiKeyRequired = true;
  }

  if (!apiKeyRequired) {
    process.stderr.write(
      'WARNING: API key requirement is DISABLED. This is dangerous outside local development.\n'
    );
  }

  const config: ServerConfig = {
    port: args.port ?? Number(process.env['PORT'] ?? '8080'),
    host: args.host ?? process.env['TC_HOST'] ?? process.env['HOST'] ?? '127.0.0.1',
    dbPath:
      args.dbPath ?? process.env['TC_DB_PATH'] ?? process.env['DB_PATH'] ?? './threat-cloud.db',
    apiKeyRequired,
    apiKeys: args.apiKeys ?? process.env['TC_API_KEYS']?.split(',') ?? [],
    rateLimitPerMinute: Number(process.env['TC_RATE_LIMIT'] ?? '120'),
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
    adminApiKey: process.env['TC_ADMIN_API_KEY'],
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
