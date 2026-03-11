#!/usr/bin/env node
/**
 * Bundle rules into the panguard-guard package for npm distribution.
 * Copies sigma-rules and yara-rules from monorepo config/ into bundled-rules/.
 * This ensures `npm install @panguard-ai/panguard-guard` ships with all rules.
 */

import { cpSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const monorepoRoot = join(pkgRoot, '..', '..');

const DEST = join(pkgRoot, 'bundled-rules');

const SOURCES = [
  { src: join(monorepoRoot, 'config', 'sigma-rules'), dest: join(DEST, 'sigma-rules') },
  { src: join(monorepoRoot, 'config', 'yara-rules'), dest: join(DEST, 'yara-rules') },
];

function countFiles(dir, exts) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.some(ext => entry.endsWith(ext))) count++;
    }
  }
  walk(dir);
  return count;
}

console.log('[bundle-rules] Bundling detection rules...');

for (const { src, dest } of SOURCES) {
  if (!existsSync(src)) {
    console.log(`  SKIP: ${src} (not found)`);
    continue;
  }

  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });

  const name = src.split('/').pop();
  const exts = name === 'sigma-rules' ? ['.yml', '.yaml'] : ['.yar', '.yara'];
  const count = countFiles(dest, exts);
  console.log(`  ${name}: ${count} rules bundled`);
}

console.log('[bundle-rules] Done.');
