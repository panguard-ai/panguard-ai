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
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from '@panguard-ai/core';
import { AgentsStore } from './agents-store.js';
import { OperatorStore } from './operators-store.js';
import { EnrollmentTokenStore } from './enrollment-store.js';
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
      '  panguard-manager init [--data-dir ~/.panguard-manager] [--admin-username admin]',
      '  panguard-manager agents list [--data-dir ~/.panguard-manager]',
      '  panguard-manager enroll-token issue [--ttl-hours 24] [--description "fleet-a"] [--data-dir ~/.panguard-manager]',
      '  panguard-manager enroll-token list [--data-dir ~/.panguard-manager]',
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

  const dbPath = AgentsStore.defaultDbPath(dataDir);
  const migrated = AgentsStore.migrateLegacyJson(dbPath);
  if (migrated.imported > 0 && migrated.archivedTo) {
    process.stdout.write(
      `Migrated ${migrated.imported} agents from agents.json → SQLite. Archived JSON at ${migrated.archivedTo}\n`
    );
  }
  const registry = new AgentsStore({ dbPath });
  const operators = new OperatorStore({ db: registry.getRawDb() });
  const enrollment = new EnrollmentTokenStore({ db: registry.getRawDb() });
  if (operators.listOperators().length === 0) {
    process.stderr.write(
      `\nNo operator accounts exist. Run 'panguard-manager init' first to bootstrap an admin.\n`
    );
    registry.close();
    process.exit(2);
  }
  const aggregator = new FleetAggregator();
  aggregator.hydrateFromRegistry(registry.list());

  const server = new ManagerServer({
    port,
    host,
    registry,
    aggregator,
    operators,
    enrollment,
  });
  await server.start();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    await server.stop();
    registry.close();
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
  const dbFile = AgentsStore.defaultDbPath(dataDir);

  // Open the store so migrations apply, then bootstrap an initial admin
  // operator if none exist. Random password printed ONCE — operator must
  // capture it or use `panguard-manager passwd` later to rotate.
  const store = new AgentsStore({ dbPath: dbFile });
  let adminCredentials: { username: string; password: string } | null = null;
  try {
    const ops = new OperatorStore({ db: store.getRawDb() });
    if (ops.listOperators().length === 0) {
      const username = typeof flags['admin-username'] === 'string'
        ? (flags['admin-username'] as string)
        : 'admin';
      const password = randomBytes(18).toString('base64url'); // 24 chars
      ops.createOperator({ username, password, role: 'admin' });
      adminCredentials = { username, password };
    }
  } finally {
    store.close();
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
      `  database: ${dbFile}\n`
  );
  if (adminCredentials) {
    process.stdout.write(
      `\n` +
        `==================================================\n` +
        `  INITIAL ADMIN CREDENTIALS — STORE THESE NOW\n` +
        `--------------------------------------------------\n` +
        `  username: ${adminCredentials.username}\n` +
        `  password: ${adminCredentials.password}\n` +
        `==================================================\n` +
        `These are shown only once. Rotate with 'panguard-manager passwd' after first login.\n`
    );
  } else {
    process.stdout.write(`Admin operator already exists; skipping bootstrap.\n`);
  }
  process.stdout.write(`\nRun: panguard-manager serve --data-dir ${dataDir}\n`);
}

function cmdAgentsList(flags: Readonly<Record<string, string | boolean>>): void {
  const dataDir = resolveDataDir(flags);
  const dbPath = AgentsStore.defaultDbPath(dataDir);
  AgentsStore.migrateLegacyJson(dbPath);
  const registry = new AgentsStore({ dbPath });
  try {
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
  } finally {
    registry.close();
  }
}

function cmdEnrollTokenIssue(flags: Readonly<Record<string, string | boolean>>): void {
  const dataDir = resolveDataDir(flags);
  const dbPath = AgentsStore.defaultDbPath(dataDir);
  const ttlHoursRaw = flags['ttl-hours'];
  const ttlHours = typeof ttlHoursRaw === 'string' ? Number.parseInt(ttlHoursRaw, 10) : 24;
  if (!Number.isInteger(ttlHours) || ttlHours <= 0 || ttlHours > 24 * 365) {
    process.stderr.write(`invalid --ttl-hours: ${String(ttlHoursRaw)}\n`);
    process.exit(2);
  }
  const description = typeof flags['description'] === 'string' ? flags['description'] : undefined;

  const store = new AgentsStore({ dbPath });
  try {
    const operators = new OperatorStore({ db: store.getRawDb() });
    const enrollment = new EnrollmentTokenStore({ db: store.getRawDb() });
    const admins = operators.listOperators().filter((o) => o.role === 'admin' && !o.disabled);
    if (admins.length === 0) {
      process.stderr.write(
        `No admin operator exists. Run 'panguard-manager init' first.\n`
      );
      process.exit(2);
    }
    const adminId = admins[0]?.id;
    if (adminId === undefined) {
      process.stderr.write('no admin operator found (unreachable)\n');
      process.exit(2);
    }
    const result = enrollment.issue({
      createdByOperatorId: adminId,
      ttlMs: ttlHours * 60 * 60 * 1000,
      ...(description ? { description } : {}),
    });
    process.stdout.write(
      `\nEnrollment token issued — share with the Guard installer:\n` +
        `  token:      ${result.token}\n` +
        `  expires_at: ${result.expires_at}\n` +
        (description ? `  description: ${description}\n` : '') +
        `\nGuard registration command:\n` +
        `  PANGUARD_ENROLLMENT_TOKEN='${result.token}' panguard-guard install --manager-url <manager-url>\n`
    );
  } finally {
    store.close();
  }
}

function cmdEnrollTokenList(flags: Readonly<Record<string, string | boolean>>): void {
  const dataDir = resolveDataDir(flags);
  const dbPath = AgentsStore.defaultDbPath(dataDir);
  const store = new AgentsStore({ dbPath });
  try {
    const enrollment = new EnrollmentTokenStore({ db: store.getRawDb() });
    const tokens = enrollment.listAll();
    if (tokens.length === 0) {
      process.stdout.write('No enrollment tokens issued.\n');
      return;
    }
    process.stdout.write(`${tokens.length} enrollment token(s):\n`);
    for (const t of tokens) {
      const status = t.revoked
        ? 'revoked'
        : t.used_at
          ? `used by ${t.used_by_agent_id ?? '<unknown>'}`
          : Date.parse(t.expires_at) < Date.now()
            ? 'expired'
            : 'active';
      process.stdout.write(
        `  ${t.created_at}  expires=${t.expires_at}  status=${status}` +
          (t.description ? `  description=${t.description}` : '') +
          '\n'
      );
    }
  } finally {
    store.close();
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
    case 'enroll-token':
      if (args.subcommand === 'issue') {
        cmdEnrollTokenIssue(args.flags);
        return;
      }
      if (args.subcommand === 'list') {
        cmdEnrollTokenList(args.flags);
        return;
      }
      process.stderr.write(`unknown enroll-token subcommand: ${String(args.subcommand)}\n`);
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
