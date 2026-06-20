#!/usr/bin/env node
/**
 * Threat Cloud CLI entry point
 * 威脅雲 CLI 入口點
 *
 * Usage: threat-cloud serve [--port 8080] [--host 0.0.0.0] [--db ./data/threats.db]
 *
 * NOTE: the HTTP server (which runs DB migrations, binds a TCP port, and
 * exposes the on-disk config path + loaded rule IDs) only ever starts under
 * the explicit `serve` subcommand. A bare invocation, `--version`/`--help`, or
 * an unknown flag is inert — it must NEVER boot a daemon or run migrations.
 */

import { createRequire } from 'node:module';
import { ThreatCloudServer } from './server.js';
import type { ServerConfig } from './types.js';

function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

const HELP_TEXT = `
Threat Cloud Server - Collective Threat Intelligence Backend

Usage: threat-cloud serve [options]

Commands:
  serve             Start the Threat Cloud HTTP server

Options:
  --port <number>   Listen port (default: 8080)
  --host <string>   Listen host (default: 127.0.0.1)
  --db <path>       SQLite database path (default: ./threat-cloud.db)
  --api-key <keys>  Comma-separated API keys (DEPRECATED — use TC_API_KEYS env var)
  -v, --version     Show version
  -h, --help        Show this help

Secret configuration (environment variables only — never pass via CLI flags):
  TC_ADMIN_API_KEY     Admin key for write-protected endpoints
  TC_API_KEYS          Comma-separated API keys (preferred over --api-key)
  ANTHROPIC_API_KEY    Anthropic API key for LLM review of ATR proposals
`;

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
      case '--admin-api-key':
        // SECURITY: secrets must NEVER be passed via argv — argv is visible in
        // `ps aux` output to every local user, and shell history may persist
        // the value. The --admin-api-key in particular gates write endpoints
        // that can inject arbitrary ATR rules into Threat Cloud. These flags
        // are removed entirely; use the ANTHROPIC_API_KEY / TC_ADMIN_API_KEY
        // environment variables instead.
        process.stderr.write(
          `ERROR: ${args[i]} is no longer accepted — passing secrets via CLI\n` +
            '  flags exposes them in `ps aux` to any local user. Set the\n' +
            '  ANTHROPIC_API_KEY / TC_ADMIN_API_KEY environment variable instead.\n'
        );
        process.exit(2);
        break;
      case '-h':
      case '--help':
        console.log(HELP_TEXT);
        process.exit(0);
        break;
      case '-v':
      case '--version':
        console.log(getVersion());
        process.exit(0);
        break;
      default:
        if (args[i]?.startsWith('-')) {
          process.stderr.write(`Unknown option: ${args[i]}\n`);
          console.log(HELP_TEXT);
          process.exit(2);
        }
        break;
    }
  }
  return config;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  // Resolve version/help/no-arg BEFORE any server bootstrap. A version query
  // (or bare/flag invocation) must NEVER start the daemon, run migrations,
  // bind a port, or leak the config path + loaded rule IDs.
  if (command === undefined) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  if (command === '-v' || command === '--version') {
    console.log(getVersion());
    process.exit(0);
  }
  if (command === '-h' || command === '--help') {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  if (command !== 'serve') {
    process.stderr.write(`Unknown command: ${command}\n`);
    console.log(HELP_TEXT);
    process.exit(2);
  }

  // Only `threat-cloud serve` reaches the server bootstrap below.
  const args = parseArgs(argv.slice(1));

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
