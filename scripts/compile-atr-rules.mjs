/**
 * Compile ATR YAML rule files into atr-rules-compiled.json for the website.
 *
 * Reads all .yaml files from packages/atr/rules/**\/*.yaml,
 * extracts id, title, severity, category, and detection patterns,
 * and writes the result to packages/website/src/lib/atr-rules-compiled.json.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');

const ROOT = resolve(import.meta.url.replace('file://', ''), '..', '..');
// Rules come from agent-threat-rules npm package (not forked packages/atr/rules)
const RULES_DIR = join(ROOT, 'node_modules', 'agent-threat-rules', 'rules');
const OUTPUT = join(ROOT, 'packages', 'website', 'src', 'lib', 'atr-rules-compiled.json');

/** Recursively collect all .yaml files under a directory */
function collectYamlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectYamlFiles(full));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      results.push(full);
    }
  }
  return results;
}

/** Extract patterns from a parsed YAML rule */
function extractPatterns(doc) {
  const conditions = doc?.detection?.conditions;
  if (!Array.isArray(conditions)) return [];
  return conditions.map((c) => ({
    field: c.field || 'content',
    pattern: c.value || '',
    ...(c.description ? { desc: c.description } : {}),
  }));
}

const files = collectYamlFiles(RULES_DIR).sort();
console.log(`Found ${files.length} YAML rule files`);

const compiled = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const doc = yaml.load(raw);
  if (!doc || !doc.id) {
    console.warn(`  SKIP (no id): ${file}`);
    continue;
  }
  const category = doc.tags?.category || '';
  const scanTarget = doc.tags?.scan_target || null; // mcp | skill | runtime | null (both)
  const ruleVersion = doc.rule_version || 1;
  const patterns = extractPatterns(doc);
  compiled.push({
    id: doc.id,
    title: doc.title || '',
    severity: doc.severity || 'medium',
    category,
    scan_target: scanTarget,
    rule_version: ruleVersion,
    patterns,
  });
}

// Sort by id for stable output
compiled.sort((a, b) => a.id.localeCompare(b.id));

// Escape non-ASCII to \uXXXX — webpack/Next.js mangles raw CJK in JSON imports
const jsonStr = JSON.stringify(compiled, null, 2).replace(
  /[\u0080-\uffff]/g,
  (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'),
);
writeFileSync(OUTPUT, jsonStr + '\n');

let totalPatterns = 0;
for (const r of compiled) totalPatterns += r.patterns.length;

console.log(`Compiled ${compiled.length} rules with ${totalPatterns} total patterns`);
console.log(`Written to ${OUTPUT}`);
