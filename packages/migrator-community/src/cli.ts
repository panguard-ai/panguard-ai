#!/usr/bin/env node
/**
 * panguard-migrate — community CLI.
 *
 * Convert Sigma/YARA detection rules to ATR YAML without LLM enrichment.
 * For enrichment + EU AI Act evidence pack + activation demo, see the
 * enterprise edition at panguard.ai/migrator.
 *
 * Usage:
 *   panguard-migrate --input ./rules --output ./atr-out
 *   panguard-migrate --input rule.yml --output atr.yaml
 */

import { Command } from 'commander';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import yaml from 'js-yaml';
import { convertSigma, convertYara } from './index.js';
import type { SigmaRule } from './parsers/sigma/types.js';

function detectSource(filename: string): 'sigma' | 'yara' | null {
  const ext = extname(filename).toLowerCase();
  if (ext === '.yml' || ext === '.yaml') return 'sigma';
  if (ext === '.yar' || ext === '.yara') return 'yara';
  return null;
}

async function listInputFiles(input: string): Promise<string[]> {
  if (!existsSync(input)) throw new Error(`input not found: ${input}`);
  const stat = await (await import('node:fs/promises')).stat(input);
  if (stat.isFile()) return [input];
  const entries = await readdir(input, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && detectSource(e.name) !== null)
    .map((e) => join(input, e.name))
    .sort();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const program = new Command();
program
  .name('panguard-migrate')
  .description('Convert Sigma/YARA detection rules to ATR YAML (community edition)')
  .requiredOption('-i, --input <path>', 'input file or directory of Sigma/YARA rules')
  .requiredOption('-o, --output <path>', 'output directory (or file path for single-file input)')
  .action(async (opts: { input: string; output: string }) => {
    const log = (msg: string) => console.error(`[migrate] ${msg}`);
    const files = await listInputFiles(opts.input);
    log(`Found ${files.length} input file(s)`);

    const stat = await (await import('node:fs/promises')).stat(opts.input);
    const isSingle = stat.isFile();
    if (!isSingle) await mkdir(opts.output, { recursive: true });

    const used = new Set<string>();
    let converted = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const path = files[i]!;
      const filename = basename(path);
      const tag = `[${String(i + 1).padStart(2, '0')}/${files.length}]`;
      const sourceKind = detectSource(filename) ?? 'sigma';

      try {
        const content = await readFile(path, 'utf-8');
        const result =
          sourceKind === 'sigma'
            ? await convertSigma(yaml.load(content) as SigmaRule, { used })
            : await convertYara(content, { used });

        if (result.outcome === 'converted' && result.atr !== null) {
          converted += 1;
          const outPath = isSingle
            ? opts.output
            : join(opts.output, `${result.atr.id}-${slug(result.atr.title)}.yaml`);
          await writeFile(
            outPath,
            yaml.dump(result.atr, { noRefs: true, lineWidth: 120 }),
            'utf-8'
          );
          log(`${tag} OK    ${filename} → ${result.atr.id}`);
        } else if (result.outcome === 'skipped') {
          skipped += 1;
          log(`${tag} SKIP  ${filename} — ${result.skipReason ?? '(no reason)'}`);
        } else {
          failed += 1;
          log(`${tag} FAIL  ${filename} — ${result.errors.join('; ')}`);
        }
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        log(`${tag} ERROR ${filename} — ${msg}`);
      }
    }

    log('=== Summary ===');
    log(`  Converted: ${converted}`);
    log(`  Skipped:   ${skipped}`);
    log(`  Failed:    ${failed}`);
    log('');
    log('Note: community edition produces schema-valid ATR YAML without LLM');
    log('enrichment. For 5-framework compliance metadata, EU AI Act audit pack,');
    log('and activation demo, see panguard.ai/migrator (enterprise edition).');

    if (failed > 0) process.exitCode = 1;
    else if (converted === 0) process.exitCode = 2;
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
