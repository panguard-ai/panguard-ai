#!/usr/bin/env node
/**
 * PanGuard Manager CLI
 *
 * Subcommands:
 *   serve [--port 8090] [--host 0.0.0.0] [--data-dir DIR]
 *   init [--data-dir DIR]
 *   agents list [--data-dir DIR]
 *
 * @module @panguard-ai/panguard-manager/cli
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import { AgentsRegistry } from './agents-registry.js';
import { FleetAggregator } from './aggregator.js';
import { ManagerServer } from './server.js';

const logger = createLogger('panguard-manager:cli');

interface ParsedArgs {
  readonly command: string;
  readonly subcommand?: string;
  readonly flags: Readonly<Record<string, string | boolean>>;
}

/** Minimal flag parser: --key value or --flag / 最小化的旗標解析器 */
function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return {
    command: positional[0] ?? '',
    subcommand: positional[1],
    flags,
  };
}

function defaultDataDir(): string {
  return join(homedir(), '.panguard-manager');
}

function resolveDataDir(flags: Readonly<Record<string, string | boolean>>): string {
  const v = flags['data-dir'];
  return typeof v === 'string' ? v : defaultDataDir();
}

function ensureDataDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true, mode: 0o700 });
  }
}

function printHelp(): void {
  process.stdout.write(
    [
      'PanGuard Manager — self-hosted fleet aggregator',
      '',
      'Usage:',
      '  panguard-manager serve [--port 8090] [--host 0.0.0.0] [--data-dir ~/.panguard-manager]',
      '  panguard-manager init [--data-dir ~/.panguard-manager]',
      '  panguard-manager agents list [--data-dir ~/.panguard-manager]',
      '',
    ].join('\n')
  );
}

async function cmdServe(flags: Readonly<Record<string, string | boolean>>): Promise<void> {
  const portRaw = flags['port'];
  const port = typeof portRaw === 'string' ? Number.parseInt(portRaw, 10) : 8090;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`invalid port: ${String(portRaw)}`);
  }
  const host = typeof flags['host'] === 'string' ? flags['host'] : '0.0.0.0';
  const dataDir = resolveDataDir(flags);
  ensureDataDir(dataDir);

  const registry = new AgentsRegistry({
    filePath: AgentsRegistry.defaultFilePath(dataDir),
  });
  const aggregator = new FleetAggregator();
  aggregator.hydrateFromRegistry(registry.list());

  const server = new ManagerServer({ port, host, registry, aggregator });
  await server.start();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

function cmdInit(flags: Readonly<Record<string, string | boolean>>): void {
  const dataDir = resolveDataDir(flags);
  ensureDataDir(dataDir);
  const agentsFile = AgentsRegistry.defaultFilePath(dataDir);
  if (!existsSync(agentsFile)) {
    writeFileSync(
      agentsFile,
      JSON.stringify({ version: 1, updated_at: new Date().toISOString(), agents: [] }, null, 2),
      { mode: 0o600 }
    );
  }
  const configFile = join(dataDir, 'config.json');
  if (!existsSync(configFile)) {
    writeFileSync(
      configFile,
      JSON.stringify(
        { port: 8090, host: '0.0.0.0', created_at: new Date().toISOString() },
        null,
        2
      ),
      { mode: 0o600 }
    );
  }
  process.stdout.write(
    `PanGuard Manager initialised at ${dataDir}\n` +
      `  config: ${configFile}\n` +
      `  agents: ${agentsFile}\n` +
      `Run: panguard-manager serve --data-dir ${dataDir}\n`
  );
}

function cmdAgentsList(flags: Readonly<Record<string, string | boolean>>): void {
  const dataDir = resolveDataDir(flags);
  const registry = new AgentsRegistry({
    filePath: AgentsRegistry.defaultFilePath(dataDir),
  });
  const records = registry.listAll();
  if (records.length === 0) {
    process.stdout.write('No agents registered.\n');
    return;
  }
  process.stdout.write(`${records.length} agent(s) registered (data-dir=${dataDir}):\n`);
  for (const r of records) {
    const state = r.revoked ? 'revoked' : 'active';
    const last = r.last_seen ?? 'never';
    process.stdout.write(
      `  ${r.agent_id}  ${r.hostname.padEnd(28)}  os=${r.os_type.padEnd(8)}  ${state}  last_seen=${last}\n`
    );
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.command === '' || args.command === 'help' || args.flags['help'] === true) {
    printHelp();
    return;
  }

  switch (args.command) {
    case 'serve':
      await cmdServe(args.flags);
      return;
    case 'init':
      cmdInit(args.flags);
      return;
    case 'agents':
      if (args.subcommand === 'list') {
        cmdAgentsList(args.flags);
        return;
      }
      process.stderr.write(`unknown agents subcommand: ${String(args.subcommand)}\n`);
      printHelp();
      process.exit(2);
      return;
    default:
      process.stderr.write(`unknown command: ${args.command}\n`);
      printHelp();
      process.exit(2);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`panguard-manager: ${msg}\n`);
  process.exit(1);
});
