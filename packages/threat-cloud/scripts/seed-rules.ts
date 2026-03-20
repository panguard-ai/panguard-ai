#!/usr/bin/env npx tsx
/**
 * Seed rules into Threat Cloud database via HTTP API
 *
 * Reads ATR rule files from disk and uploads them
 * to a running Threat Cloud server via POST /api/rules (batch).
 *
 * Usage:
 *   npx tsx scripts/seed-rules.ts [--endpoint URL] [--batch-size N] [--dry-run]
 *
 * Defaults:
 *   --endpoint  https://tc.panguard.ai  (or TC_ENDPOINT env)
 *   --batch-size 200
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface SeedConfig {
  endpoint: string;
  batchSize: number;
  dryRun: boolean;
  atrDir: string;
  adminApiKey?: string;
}

function parseArgs(): SeedConfig {
  const args = process.argv.slice(2);
  const config: SeedConfig = {
    endpoint: process.env['TC_ENDPOINT'] ?? 'https://tc.panguard.ai',
    batchSize: 200,
    dryRun: false,
    atrDir: resolve(process.env['ATR_DIR'] ?? '/Users/user/Downloads/agent-threat-rules/rules'),
    adminApiKey: process.env['TC_ADMIN_API_KEY'],
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--endpoint':
        config.endpoint = args[++i]!;
        break;
      case '--batch-size':
        config.batchSize = Number(args[++i]);
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--atr-dir':
        config.atrDir = resolve(args[++i]!);
        break;
      case '--admin-api-key':
        config.adminApiKey = args[++i];
        break;
    }
  }

  return config;
}

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

function findFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  function walk(d: string): void {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(d, entry);
      try {
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
        } else if (extensions.some((ext) => entry.endsWith(ext))) {
          results.push(full);
        }
      } catch {
        // skip inaccessible files
      }
    }
  }

  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Rule preparation
// ---------------------------------------------------------------------------

interface RulePayload {
  ruleId: string;
  ruleContent: string;
  publishedAt: string;
  source: string;
}

function fileToRuleId(filePath: string, source: string): string {
  const name = basename(filePath, extname(filePath));
  return `${source}:${name}`;
}

function prepareATRRules(dir: string): RulePayload[] {
  const files = findFiles(dir, ['.yml', '.yaml']);
  const now = new Date().toISOString();
  return files.map((f) => ({
    ruleId: fileToRuleId(f, 'atr'),
    ruleContent: readFileSync(f, 'utf-8'),
    publishedAt: now,
    source: 'atr',
  }));
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

async function uploadBatch(
  endpoint: string,
  rules: RulePayload[],
  adminApiKey?: string
): Promise<number> {
  const url = `${endpoint}/api/rules`;
  const body = JSON.stringify({ rules });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminApiKey) {
    headers['Authorization'] = `Bearer ${adminApiKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { ok: boolean; data?: { count: number } };
  return data.data?.count ?? rules.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const config = parseArgs();

  console.log('=== Threat Cloud Rule Seeder ===');
  console.log(`Endpoint:    ${config.endpoint}`);
  console.log(`Batch size:  ${config.batchSize}`);
  console.log(`Dry run:     ${config.dryRun}`);
  console.log(`ATR dir:     ${config.atrDir}`);
  console.log('');

  // Prepare all rules
  console.log('Scanning rule files...');

  const atrRules = prepareATRRules(config.atrDir);
  console.log(`  ATR:   ${atrRules.length} rules`);

  const allRules = [...atrRules];
  console.log(`  Total: ${allRules.length} rules`);
  console.log('');

  if (config.dryRun) {
    console.log('[DRY RUN] Would upload these rules. Exiting.');
    return;
  }

  // Upload in batches
  let uploaded = 0;
  const total = allRules.length;
  const batches = Math.ceil(total / config.batchSize);

  console.log(`Uploading ${total} rules in ${batches} batches...`);

  for (let i = 0; i < total; i += config.batchSize) {
    const batch = allRules.slice(i, i + config.batchSize);
    const batchNum = Math.floor(i / config.batchSize) + 1;

    try {
      const count = await uploadBatch(config.endpoint, batch, config.adminApiKey);
      uploaded += count;
      const pct = ((uploaded / total) * 100).toFixed(1);
      process.stdout.write(
        `  Batch ${batchNum}/${batches}: ${count} rules uploaded (${pct}% total)\n`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Batch ${batchNum}/${batches}: FAILED - ${msg}`);
      // Continue with next batch
    }
  }

  console.log('');
  console.log(`Done! ${uploaded}/${total} rules uploaded to ${config.endpoint}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
