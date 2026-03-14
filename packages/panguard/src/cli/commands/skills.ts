/**
 * panguard skills - Manage and view skill whitelist/blacklist status
 * panguard skills - 管理和查看技能白名單/黑名單狀態
 */

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { c, symbols, table, divider } from '@panguard-ai/core';
import type { TableColumn } from '@panguard-ai/core';

const DEFAULT_DATA_DIR = join(
  process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
  '.panguard-guard'
);

interface WhitelistedSkill {
  name: string;
  normalizedName: string;
  source: 'static' | 'fingerprint' | 'community' | 'manual';
  addedAt: string;
  fingerprintHash?: string;
  reason?: string;
}

interface WhitelistData {
  whitelist?: WhitelistedSkill[];
  revoked?: string[];
}

function loadWhitelist(dataDir: string): WhitelistData {
  const filePath = join(dataDir, 'skill-whitelist.json');
  if (!existsSync(filePath)) return { whitelist: [], revoked: [] };

  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as WhitelistData;
  } catch {
    return { whitelist: [], revoked: [] };
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'static':
      return c.blue('setup');
    case 'fingerprint':
      return c.green('auto');
    case 'community':
      return c.cyan('community');
    case 'manual':
      return c.yellow('manual');
    default:
      return c.dim(source);
  }
}

export function skillsCommand(): Command {
  const cmd = new Command('skills').description(
    'Manage skill whitelist and trust status / 管理技能白名單和信任狀態'
  );

  cmd
    .command('list')
    .alias('ls')
    .description('List all skills and their trust status / 列出所有技能及其信任狀態')
    .option('--data-dir <path>', 'Guard data directory', DEFAULT_DATA_DIR)
    .option('--json', 'Output as JSON', false)
    .action((options: { dataDir: string; json: boolean }) => {
      const data = loadWhitelist(options.dataDir);
      const whitelist = data.whitelist ?? [];
      const revokedSet = new Set(data.revoked ?? []);

      if (options.json) {
        const output = whitelist.map((s) => ({
          name: s.name,
          source: s.source,
          status: revokedSet.has(s.normalizedName) ? 'revoked' : 'trusted',
          addedAt: s.addedAt,
          fingerprintHash: s.fingerprintHash ?? null,
          reason: s.reason ?? null,
        }));
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      if (whitelist.length === 0) {
        console.log();
        console.log(
          c.dim(
            `  ${symbols.info} No skills in whitelist. Run ${c.bold('panguard setup')} to scan and whitelist skills.`
          )
        );
        console.log();
        return;
      }

      // Stats
      const active = whitelist.filter((s) => !revokedSet.has(s.normalizedName));
      const revoked = whitelist.filter((s) => revokedSet.has(s.normalizedName));
      const bySource: Record<string, number> = {};
      for (const s of active) {
        bySource[s.source] = (bySource[s.source] ?? 0) + 1;
      }

      console.log();
      divider('Skill Trust Status');
      console.log();

      // Summary
      const parts: string[] = [c.green(`${active.length} trusted`)];
      if (revoked.length > 0) parts.push(c.red(`${revoked.length} revoked`));
      console.log(`  ${parts.join('  |  ')}`);

      // Source breakdown
      const sourceBreakdown = Object.entries(bySource)
        .map(([src, count]) => `${sourceLabel(src)} ${count}`)
        .join('  ');
      if (sourceBreakdown) {
        console.log(`  Sources: ${sourceBreakdown}`);
      }
      console.log();

      // Table
      const columns: TableColumn[] = [
        { header: '', key: 'icon', width: 4 },
        { header: 'Skill', key: 'name', width: 35 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Source', key: 'source', width: 12 },
        { header: 'Added', key: 'added', width: 12 },
      ];

      const rows = whitelist.map((s) => {
        const isRevoked = revokedSet.has(s.normalizedName);
        return {
          icon: isRevoked ? c.red(symbols.fail) : c.green(symbols.pass),
          name: isRevoked ? c.dim(s.name) : s.name,
          status: isRevoked ? c.red('REVOKED') : c.green('TRUSTED'),
          source: sourceLabel(s.source),
          added: s.addedAt ? new Date(s.addedAt).toLocaleDateString() : '-',
        };
      });

      console.log(table(columns, rows));
      console.log();
    });

  cmd
    .command('stats')
    .description('Show whitelist statistics / 顯示白名單統計')
    .option('--data-dir <path>', 'Guard data directory', DEFAULT_DATA_DIR)
    .action((options: { dataDir: string }) => {
      const data = loadWhitelist(options.dataDir);
      const whitelist = data.whitelist ?? [];
      const revokedSet = new Set(data.revoked ?? []);
      const active = whitelist.filter((s) => !revokedSet.has(s.normalizedName));

      const bySource: Record<string, number> = {
        static: 0,
        fingerprint: 0,
        community: 0,
        manual: 0,
      };
      for (const s of active) {
        bySource[s.source] = (bySource[s.source] ?? 0) + 1;
      }

      console.log();
      console.log(c.bold('  Skill Whitelist Stats'));
      console.log();
      console.log(`  Total entries:  ${whitelist.length}`);
      console.log(`  Active:         ${c.green(String(active.length))}`);
      console.log(`  Revoked:        ${c.red(String(revokedSet.size))}`);
      console.log();
      console.log(`  By source:`);
      console.log(`    Setup:        ${bySource['static']}`);
      console.log(`    Auto (fp):    ${bySource['fingerprint']}`);
      console.log(`    Community:    ${bySource['community']}`);
      console.log(`    Manual:       ${bySource['manual']}`);
      console.log();
    });

  return cmd;
}
