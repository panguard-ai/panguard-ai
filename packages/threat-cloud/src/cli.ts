#!/usr/bin/env node
/**
 * Threat Cloud CLI entry point
 * 威脅雲 CLI 入口點
 *
 * Usage: threat-cloud [--port 8080] [--host 0.0.0.0] [--db ./data/threats.db]
 */

import { ThreatCloudServer } from './server.js';
import type { ServerConfig } from './types.js';

const MIN_API_KEY_LENGTH = 32;

function parseArgs(args: string[]): Partial<ServerConfig> & { backupDir?: string } {
  const config: Partial<ServerConfig> & { backupDir?: string } = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port': {
        const port = Number(args[++i]);
        if (isNaN(port) || port < 1 || port > 65535) {
          console.error(`Error: Invalid port number. Must be 1-65535.`);
          process.exit(1);
        }
        config.port = port;
        break;
      }
      case '--host':
        config.host = args[++i];
        break;
      case '--db':
        config.dbPath = args[++i];
        break;
      case '--backup-dir':
        config.backupDir = args[++i];
        break;
      case '--api-key': {
        const keys = (args[++i] ?? '').split(',').filter(Boolean);
        const weak = keys.filter((k) => k.length < MIN_API_KEY_LENGTH);
        if (weak.length > 0) {
          console.error(
            `Error: API keys must be at least ${MIN_API_KEY_LENGTH} characters. ` +
              `Generate with: openssl rand -hex 32`
          );
          process.exit(1);
        }
        config.apiKeyRequired = true;
        config.apiKeys = keys;
        break;
      }
      case '--help':
        console.log(`
Threat Cloud Server - Collective Threat Intelligence Backend

Usage: threat-cloud [options]

Options:
  --port <number>      Listen port (default: 8080, range: 1-65535)
  --host <string>      Listen host (default: 127.0.0.1)
  --db <path>          SQLite database path (default: ./threat-cloud.db)
  --api-key <keys>     Comma-separated API keys (min ${MIN_API_KEY_LENGTH} chars each)
  --backup-dir <path>  Backup directory (default: ./backups)
  --help               Show this help

Generate API key:
  openssl rand -hex 32
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

  // Validate env API keys length in production
  if (process.env['NODE_ENV'] === 'production' && envApiKeys.length === 0) {
    console.error('Error: TC_API_KEYS is required in production mode.');
    console.error('Generate with: openssl rand -hex 32');
    process.exit(1);
  }

  const weakEnvKeys = envApiKeys.filter((k) => k.length < MIN_API_KEY_LENGTH);
  if (weakEnvKeys.length > 0) {
    console.warn(
      `WARNING: ${weakEnvKeys.length} API key(s) shorter than ${MIN_API_KEY_LENGTH} chars. ` +
        `Generate stronger keys with: openssl rand -hex 32`
    );
  }

  const config: ServerConfig = {
    port: args.port ?? Number(process.env['TC_PORT'] ?? '8080'),
    host: args.host ?? process.env['TC_HOST'] ?? '127.0.0.1',
    dbPath: args.dbPath ?? process.env['TC_DB_PATH'] ?? './threat-cloud.db',
    apiKeyRequired: args.apiKeyRequired ?? envApiKeys.length > 0,
    apiKeys: args.apiKeys ?? envApiKeys,
    rateLimitPerMinute: 120,
  };

  const backupDir = args.backupDir ?? process.env['TC_BACKUP_DIR'] ?? './backups';

  const server = new ThreatCloudServer(config);

  const shutdown = async () => {
    console.log('\nShutting down Threat Cloud server...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  await server.start();

  // Schedule daily backup (3am UTC by default)
  const runBackup = () => {
    const dest = server.getScheduler().runBackup(backupDir);
    if (dest) {
      console.log(`[Backup] Database backed up to ${dest}`);
    } else {
      console.error('[Backup] Database backup failed');
    }
  };

  // Initial backup on startup
  runBackup();

  // Daily backup interval
  setInterval(runBackup, 24 * 60 * 60 * 1000);
}

void main();
