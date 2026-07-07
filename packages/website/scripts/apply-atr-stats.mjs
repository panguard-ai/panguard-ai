#!/usr/bin/env node
/**
 * Reads upstream stats.json from agent-threat-rules and rewrites the
 * shared numeric/version fields in packages/website/src/lib/stats.ts.
 *
 * Touches only fields whose ground truth lives in the upstream repo.
 * Marketing-only fields (cliVersion, products, platform metadata) are
 * preserved.
 *
 * Defensive against schema drift: every replacement that depends on an
 * upstream field is gated by `has(...)`. Missing fields are reported and
 * skipped (not replaced) instead of throwing. Lets the workflow keep
 * making partial-but-safe updates while ATR's stats.json schema evolves.
 *
 * Usage: node apply-atr-stats.mjs <upstream-stats.json> <stats.ts>
 *
 * Upstream schema as of ATR 3.0.0 (post measurement-layer rewrite):
 *   {
 *     version, generatedAt,
 *     rules: { total, categories, byCategory },
 *     ecosystem: { skillsScanned, skillsFlagged },
 *     benchmark: { pintRecall, pintPrecision },        // legacy flat
 *     benchmarks: [ {source, source_version, samples, recall, ...}, ... ],
 *     benchmarks_generated_at
 *   }
 *
 * Older fields the previous version of this script expected
 * (ruleCount.{stable,experimental,draft}, distribution.{npm,githubStars},
 *  adoption.{production[],externalPRMergesTotal,...},
 *  benchmarks.skill, lastUpdated) are not present in the new ATR
 * stats.json. Those replacements now no-op with a logged warning;
 * stats.ts retains whatever value it had previously (likely curated
 * manually). If you need those auto-synced again, either extend ATR's
 * stats.json upstream or compute them locally in this script.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , statsJsonPath, statsTsPath] = process.argv;
if (!statsJsonPath || !statsTsPath) {
  console.error('usage: apply-atr-stats.mjs <stats.json> <stats.ts>');
  process.exit(64);
}

const upstream = JSON.parse(readFileSync(statsJsonPath, 'utf8'));
let src = readFileSync(statsTsPath, 'utf8');

/** Safe path access. Returns undefined if any segment is missing. */
function get(obj, path) {
  let cur = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

/** Find the benchmark entry for a given source in the new benchmarks[] array. */
function findBenchmark(source) {
  const list = Array.isArray(upstream.benchmarks) ? upstream.benchmarks : [];
  return list.find((b) => b && b.source === source);
}

/** Format a number with underscore thousands separators (e.g. 23_000). */
function thousandsUnderscore(n) {
  return String(n).replace(/(\d)(?=(\d{3})+$)/g, '$1_');
}

const ruleTotal = get(upstream, 'rules.total');
const pintBench = findBenchmark('pint');
const skillBench = findBenchmark('skill-benchmark');

/** Convert an upstream fraction (0-1) to a stats.ts percentage (0-100). */
const pct = (frac) => (typeof frac === 'number' ? +(frac * 100).toFixed(2) : 0);

const candidates = [
  {
    re: /atrVersion:\s*'[^']+'/,
    val: () => `atrVersion: '${upstream.version}'`,
    needs: 'version',
    have: typeof upstream.version === 'string',
  },
  {
    re: /atrRules:\s*\d+/,
    val: () => `atrRules: ${ruleTotal}`,
    needs: 'rules.total',
    have: typeof ruleTotal === 'number',
  },
  {
    re: /totalRules:\s*\d+/,
    val: () => `totalRules: ${ruleTotal}`,
    needs: 'rules.total',
    have: typeof ruleTotal === 'number',
  },
  {
    re: /totalRulesDisplay:\s*'[^']+'\s*as\s*const/,
    val: () => `totalRulesDisplay: '${ruleTotal}' as const`,
    needs: 'rules.total',
    have: typeof ruleTotal === 'number',
  },
  {
    re: /atrRulesDisplay:\s*'[^']+'\s*as\s*const/,
    val: () => `atrRulesDisplay: '${ruleTotal}' as const`,
    needs: 'rules.total',
    have: typeof ruleTotal === 'number',
  },
  // Fields ATR no longer ships in stats.json — declared so we can log a
  // single "skipped" message for each rather than silently dropping them.
  { re: /atrStableRules:\s*\d+/, val: () => '', needs: 'ruleCount.stable', have: false },
  {
    re: /atrExperimentalRules:\s*\d+/,
    val: () => '',
    needs: 'ruleCount.experimental',
    have: false,
  },
  { re: /atrDraftRules:\s*\d+/, val: () => '', needs: 'ruleCount.draft', have: false },
  {
    re: /npmDownloads30d:\s*[\d_]+/,
    val: () =>
      `npmDownloads30d: ${thousandsUnderscore(get(upstream, 'distribution.npm.downloads30d'))}`,
    needs: 'distribution.npm.downloads30d',
    have: typeof get(upstream, 'distribution.npm.downloads30d') === 'number',
  },
  {
    re: /ciscoRulesMerged:\s*\d+/,
    val: () => {
      const list = get(upstream, 'adoption.production') ?? [];
      const cisco = list.find((p) => p && typeof p.org === 'string' && p.org.startsWith('Cisco'));
      return `ciscoRulesMerged: ${cisco?.rulesShipped ?? 0}`;
    },
    needs: 'adoption.production[Cisco]',
    have: Array.isArray(get(upstream, 'adoption.production')),
  },
  {
    re: /microsoftRulesMerged:\s*\d+/,
    val: () => {
      const list = get(upstream, 'adoption.production') ?? [];
      const ms = list.find(
        (p) => p && typeof p.org === 'string' && p.org.startsWith('Microsoft Agent')
      );
      return `microsoftRulesMerged: ${ms?.rulesShipped ?? 0}`;
    },
    needs: 'adoption.production[Microsoft]',
    have: Array.isArray(get(upstream, 'adoption.production')),
  },
  {
    re: /externalPRMerges:\s*\d+/,
    val: () => `externalPRMerges: ${get(upstream, 'adoption.externalPRMergesTotal')}`,
    needs: 'adoption.externalPRMergesTotal',
    have: typeof get(upstream, 'adoption.externalPRMergesTotal') === 'number',
  },
  {
    re: /externalOrgs:\s*\d+/,
    val: () => `externalOrgs: ${get(upstream, 'adoption.externalOrgsMerged')}`,
    needs: 'adoption.externalOrgsMerged',
    have: typeof get(upstream, 'adoption.externalOrgsMerged') === 'number',
  },
  {
    re: /tier1Institutions:\s*\d+/,
    val: () => `tier1Institutions: ${get(upstream, 'adoption.tier1Institutions')}`,
    needs: 'adoption.tier1Institutions',
    have: typeof get(upstream, 'adoption.tier1Institutions') === 'number',
  },
  {
    re: /standardsBodyMerges:\s*\d+/,
    val: () => `standardsBodyMerges: ${get(upstream, 'adoption.standardsBodyMerges')}`,
    needs: 'adoption.standardsBodyMerges',
    have: typeof get(upstream, 'adoption.standardsBodyMerges') === 'number',
  },
  {
    re: /githubStars:\s*\d+/,
    val: () => `githubStars: ${get(upstream, 'distribution.githubStars')}`,
    needs: 'distribution.githubStars',
    have: typeof get(upstream, 'distribution.githubStars') === 'number',
  },
  {
    re: /lastUpdated:\s*'[^']+'/,
    val: () =>
      `lastUpdated: '${upstream.lastUpdated ?? upstream.generatedAt ?? upstream.benchmarks_generated_at ?? ''}'`,
    needs: 'lastUpdated (fallback generatedAt)',
    have:
      typeof upstream.lastUpdated === 'string' ||
      typeof upstream.generatedAt === 'string' ||
      typeof upstream.benchmarks_generated_at === 'string',
  },
  // Benchmark blocks read from the new benchmarks[] array. Upstream values are
  // fractions (0-1); stats.ts stores PERCENTAGES (0-100) for a single unit
  // across the site, so convert here.
  {
    re: /pint:\s*\{\s*recall:\s*[\d.]+,\s*precision:\s*[\d.]+,\s*fp:\s*[\d.]+,\s*samples:\s*[\d_]+\s*\}/,
    val: () =>
      `pint: { recall: ${pct(pintBench.recall)}, precision: ${pct(pintBench.precision)}, fp: ${pct(pintBench.fp_rate)}, samples: ${pintBench.samples} }`,
    needs: 'benchmarks[source=pint]',
    have: !!pintBench,
  },
  {
    re: /skill:\s*\{\s*recall:\s*[\d.]+,\s*precision:\s*[\d.]+,\s*fp:\s*[\d.]+,\s*samples:\s*[\d_]+\s*\}/,
    val: () =>
      `skill: { recall: ${pct(skillBench.recall)}, precision: ${pct(skillBench.precision)}, fp: ${pct(skillBench.fp_rate)}, samples: ${skillBench.samples} }`,
    needs: 'benchmarks[source=skill-benchmark]',
    have: !!skillBench,
  },
];

let touched = 0;
const skipped = [];
for (const c of candidates) {
  if (!c.have) {
    skipped.push(c.needs);
    continue;
  }
  const before = src;
  src = src.replace(c.re, c.val());
  if (src !== before) touched++;
}

writeFileSync(statsTsPath, src);
console.log(`apply-atr-stats: applied ${touched} replacements to ${statsTsPath}`);
if (skipped.length > 0) {
  console.warn(
    `apply-atr-stats: skipped ${skipped.length} field(s) not present in upstream stats.json:`
  );
  for (const s of skipped) console.warn(`  - ${s}`);
  console.warn(
    'These stats.ts values were left as-is. To re-enable auto-sync for them, ' +
      'either extend ATR data/stats.json upstream or compute them locally in this script.'
  );
}
