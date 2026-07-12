#!/usr/bin/env node
/**
 * Stamp the CURRENT-version references in docs-site/ to a given version so the
 * Mintlify docs never lag behind an npm release (they were stuck at 1.8.5 while
 * npm shipped 1.8.6 / 1.8.7).
 *
 * Rewrites ONLY current-version strings in non-changelog .mdx files. Changelog
 * entries are historical and must keep their shipped versions, so files whose
 * path contains "changelog" are skipped. Each rewrite is anchored to a version
 * context (released / 已發布 / (latest) / Doctor v / 內建) so it never touches
 * the ATR version (ATR v3.5.x) or any unrelated number. Idempotent.
 *
 * Usage: node scripts/sync-docs-version.mjs <version>   e.g. 1.8.7
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const VER = process.argv[2];
if (!VER || !/^\d+\.\d+\.\d+$/.test(VER)) {
  console.error('usage: sync-docs-version.mjs <semver>  (e.g. 1.8.7)');
  process.exit(64);
}

const ROOT = 'docs-site';

const RULES = [
  [/\*\*v\d+\.\d+\.\d+ released\*\*/g, `**v${VER} released**`],
  [/\*\*v\d+\.\d+\.\d+ 已發布/g, `**v${VER} 已發布`],
  [/version \d+\.\d+\.\d+ \(latest\)/g, `version ${VER} (latest)`],
  [/Panguard Doctor v\d+\.\d+\.\d+/g, `Panguard Doctor v${VER}`],
  [/v\d+\.\d+\.\d+ 內建/g, `v${VER} 內建`],
];

// installation.mdx shows the bare `pga --version` output on its own line.
const BARE_VERSION_LINE = /^\d+\.\d+\.\d+[ \t]*$/gm;
const BARE_VERSION_FILES = new Set(['installation.mdx', join('zh-Hant', 'installation.mdx')]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.mdx') && !full.includes('changelog')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const rel = file.slice(ROOT.length + 1);
  const before = readFileSync(file, 'utf8');
  let src = before;
  for (const [re, to] of RULES) src = src.replace(re, to);
  if (BARE_VERSION_FILES.has(rel)) src = src.replace(BARE_VERSION_LINE, VER);
  if (src !== before) {
    writeFileSync(file, src);
    changed++;
    console.log(`  stamped ${rel}`);
  }
}
console.log(`sync-docs-version: ${changed} file(s) stamped to v${VER}`);
