#!/usr/bin/env node
/**
 * Reads upstream stats.json from agent-threat-rules and rewrites the
 * shared numeric/version fields in packages/website/src/lib/stats.ts.
 *
 * Touches only fields whose ground truth lives in the upstream repo.
 * Marketing-only fields (cliVersion, products, platform metadata) are
 * preserved.
 *
 * Usage: node apply-atr-stats.mjs <upstream-stats.json> <stats.ts>
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , statsJsonPath, statsTsPath] = process.argv;
if (!statsJsonPath || !statsTsPath) {
  console.error('usage: apply-atr-stats.mjs <stats.json> <stats.ts>');
  process.exit(64);
}

const upstream = JSON.parse(readFileSync(statsJsonPath, 'utf8'));
let src = readFileSync(statsTsPath, 'utf8');

const replacements = [
  { re: /atrVersion:\s*'[^']+'/, val: `atrVersion: '${upstream.version}'` },
  { re: /atrRules:\s*\d+/, val: `atrRules: ${upstream.ruleCount.total}` },
  { re: /atrStableRules:\s*\d+/, val: `atrStableRules: ${upstream.ruleCount.stable}` },
  {
    re: /atrExperimentalRules:\s*\d+/,
    val: `atrExperimentalRules: ${upstream.ruleCount.experimental}`,
  },
  { re: /atrDraftRules:\s*\d+/, val: `atrDraftRules: ${upstream.ruleCount.draft}` },
  { re: /totalRules:\s*\d+/, val: `totalRules: ${upstream.ruleCount.total}` },
  {
    re: /totalRulesDisplay:\s*'[^']+'\s*as\s*const/,
    val: `totalRulesDisplay: '${upstream.ruleCount.total}' as const`,
  },
  {
    re: /atrRulesDisplay:\s*'[^']+'\s*as\s*const/,
    val: `atrRulesDisplay: '${upstream.ruleCount.total}' as const`,
  },
  {
    re: /npmDownloads30d:\s*[\d_]+/,
    val: `npmDownloads30d: ${upstream.distribution.npm.downloads30d.toString().replace(/(\d)(?=(\d{3})+$)/g, '$1_')}`,
  },
  {
    re: /ciscoRulesMerged:\s*\d+/,
    val: `ciscoRulesMerged: ${upstream.adoption.production.find((p) => p.org.startsWith('Cisco'))?.rulesShipped ?? 419}`,
  },
  {
    re: /microsoftRulesMerged:\s*\d+/,
    val: `microsoftRulesMerged: ${upstream.adoption.production.find((p) => p.org.startsWith('Microsoft Agent'))?.rulesShipped ?? 287}`,
  },
  {
    re: /externalPRMerges:\s*\d+/,
    val: `externalPRMerges: ${upstream.adoption.externalPRMergesTotal}`,
  },
  { re: /externalOrgs:\s*\d+/, val: `externalOrgs: ${upstream.adoption.externalOrgsMerged}` },
  {
    re: /tier1Institutions:\s*\d+/,
    val: `tier1Institutions: ${upstream.adoption.tier1Institutions}`,
  },
  {
    re: /standardsBodyMerges:\s*\d+/,
    val: `standardsBodyMerges: ${upstream.adoption.standardsBodyMerges}`,
  },
  { re: /githubStars:\s*\d+/, val: `githubStars: ${upstream.distribution.githubStars}` },
  { re: /lastUpdated:\s*'[^']+'/, val: `lastUpdated: '${upstream.lastUpdated}'` },
  // benchmark block
  {
    re: /pint:\s*\{\s*recall:\s*[\d.]+,\s*precision:\s*[\d.]+,\s*fp:\s*[\d.]+,\s*samples:\s*[\d_]+\s*\}/,
    val: `pint: { recall: ${upstream.benchmarks.pint.recall}, precision: ${upstream.benchmarks.pint.precision}, fp: ${upstream.benchmarks.pint.fpRate}, samples: ${upstream.benchmarks.pint.samples} }`,
  },
  {
    re: /skill:\s*\{\s*recall:\s*[\d.]+,\s*precision:\s*[\d.]+,\s*fp:\s*[\d.]+,\s*samples:\s*[\d_]+\s*\}/,
    val: `skill: { recall: ${upstream.benchmarks.skill.recall}, precision: ${upstream.benchmarks.skill.precision}, fp: ${upstream.benchmarks.skill.fpRate}, samples: ${upstream.benchmarks.skill.samples} }`,
  },
];

let touched = 0;
for (const { re, val } of replacements) {
  const before = src;
  src = src.replace(re, val);
  if (src !== before) touched++;
}

writeFileSync(statsTsPath, src);
console.log(`apply-atr-stats: applied ${touched} replacements to ${statsTsPath}`);
