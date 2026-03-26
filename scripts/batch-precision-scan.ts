#!/usr/bin/env npx tsx
/**
 * Batch Precision Scan — Validate scan-core false positive rate
 *
 * Fetches SKILL.md/README.md from GitHub for npm MCP packages,
 * runs scan-core (same engine as CLI + website), and outputs results.
 *
 * This validates that the same scan logic users see in `pga audit`
 * and on panguard.ai/scan produces acceptable false positive rates.
 *
 * Usage:
 *   npx tsx scripts/batch-precision-scan.ts [--limit 100] [--offset 0] [--output data/precision-scan.json]
 *
 * Requires: mcp-registry-v2.json in ATR repo root (or --registry path)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegistryEntry {
  name: string;
  npmPackage?: string;
  url?: string;
  source?: string;
  github?: string;
}

interface PrecisionResult {
  package: string;
  url: string;
  fetchedFrom: string | null;
  riskScore: number;
  riskLevel: string;
  findingCount: number;
  findings: Array<{ id: string; severity: string; title: string; category: string }>;
  atrRulesEvaluated: number;
  atrPatternsMatched: number;
  contentHash: string;
  durationMs: number;
  scannedAt: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// GitHub fetch (same logic as website route.ts and CLI audit.ts)
// ---------------------------------------------------------------------------

function parseGitHubUrl(
  url: string
): { owner: string; repo: string; branch: string; basePath: string } | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!u.hostname.includes('github.com')) return null;

    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2) return null;

    const owner = parts[0] ?? '';
    const repo = (parts[1] ?? '').replace(/\.git$/, '');
    if (!owner || !repo) return null;

    let branch = 'main';
    let basePath = '';

    if (parts.length > 3 && (parts[2] === 'tree' || parts[2] === 'blob')) {
      branch = parts[3] ?? 'main';
      basePath = parts.slice(4).join('/');
    }

    return { owner, repo, branch, basePath };
  } catch {
    return null;
  }
}

async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchSkillContent(
  owner: string,
  repo: string,
  branch: string,
  basePath: string
): Promise<{ content: string; source: string } | null> {
  const candidates = basePath
    ? [`${basePath}/SKILL.md`, `${basePath}/skill.md`, 'SKILL.md', 'skill.md']
    : ['SKILL.md', 'skill.md', 'src/SKILL.md'];

  for (const candidate of candidates) {
    const content = await fetchRawFile(owner, repo, branch, candidate);
    if (content) return { content, source: candidate };
  }

  // Fallback: README.md
  const readme = await fetchRawFile(owner, repo, branch, 'README.md');
  if (readme) return { content: readme, source: 'README.md' };

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Get GitHub URL: from registry, or lookup via npm API
// ---------------------------------------------------------------------------

function getGitHubUrl(entry: RegistryEntry): string | null {
  if (entry.github) return entry.github;
  if (entry.url?.includes('github.com')) return entry.url;
  return null;
}

/** Fetch GitHub repo URL from npm registry for a package */
async function lookupNpmGitHub(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { repository?: { url?: string }; homepage?: string };
    const repoUrl = data.repository?.url ?? '';
    // Extract GitHub URL from git+https://github.com/... or git://github.com/...
    const match = repoUrl.match(/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
    if (match) return `https://github.com/${match[1]}`;
    // Try homepage
    if (data.homepage?.includes('github.com')) return data.homepage;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string, def: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? (args[idx + 1] ?? def) : def;
  };

  const limit = parseInt(getArg('--limit', '100'), 10);
  const offset = parseInt(getArg('--offset', '0'), 10);
  const outputPath = resolve(getArg('--output', 'data/precision-scan.json'));
  const registryPath = resolve(
    getArg('--registry', '/Users/user/Downloads/agent-threat-rules/mcp-registry-v2.json')
  );

  // Load registry
  if (!existsSync(registryPath)) {
    console.error(`Registry not found: ${registryPath}`);
    process.exit(1);
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
  const entries: RegistryEntry[] = registry.entries ?? [];

  // Get all npm entries (will lookup GitHub URLs on-the-fly)
  const npmEntries = entries
    .filter((e) => e.npmPackage)
    .map((e) => ({
      name: e.npmPackage!,
      url: getGitHubUrl(e), // may be null for npm-only entries
    }));

  const batch = npmEntries.slice(offset, offset + limit);

  console.log(`\n  Batch Precision Scan (scan-core engine)`);
  console.log(`  Registry: ${entries.length} total, ${npmEntries.length} npm entries`);
  console.log(`  Scanning: ${batch.length} packages (offset: ${offset}, limit: ${limit})`);

  // Import scan-core
  const scanCorePath = resolve(__dirname, '../packages/scan-core/src/index.ts');
  let scanContent: (content: string, options?: Record<string, unknown>) => Record<string, unknown>;
  let contentHash: (content: string) => string;
  let compileRules: (rules: unknown[]) => unknown[];

  try {
    const scanCore = await import('@panguard-ai/scan-core');
    scanContent = scanCore.scanContent;
    contentHash = scanCore.contentHash;
    compileRules = scanCore.compileRules;
  } catch {
    // Fallback: try relative import
    const scanCore = await import('../packages/scan-core/src/index.js');
    scanContent = scanCore.scanContent;
    contentHash = scanCore.contentHash;
    compileRules = scanCore.compileRules;
  }

  // Load bundled ATR rules
  let atrRules: unknown[] = [];
  const rulesPath = resolve(__dirname, '../packages/website/src/lib/atr-rules-compiled.json');
  if (existsSync(rulesPath)) {
    const raw = JSON.parse(readFileSync(rulesPath, 'utf-8'));
    atrRules = compileRules(Array.isArray(raw) ? raw : []);
    console.log(`  ATR rules: ${atrRules.length}`);
  } else {
    console.log(`  ATR rules: (none found at ${rulesPath})`);
  }

  console.log(`  Output: ${outputPath}\n`);

  const results: PrecisionResult[] = [];
  let fetched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const pkg = batch[i]!;
    const pct = Math.round(((i + 1) / batch.length) * 100);
    process.stdout.write(`\r  [${pct}%] ${i + 1}/${batch.length}: ${pkg.name}`.padEnd(80));

    // Resolve GitHub URL (from registry or npm API lookup)
    let gitUrl = pkg.url;
    if (!gitUrl) {
      gitUrl = await lookupNpmGitHub(pkg.name);
    }

    const parsed = gitUrl ? parseGitHubUrl(gitUrl) : null;
    if (!parsed) {
      results.push({
        package: pkg.name,
        url: gitUrl ?? pkg.name,
        fetchedFrom: null,
        riskScore: -1,
        riskLevel: 'NO_GITHUB',
        findingCount: 0,
        findings: [],
        atrRulesEvaluated: 0,
        atrPatternsMatched: 0,
        contentHash: '',
        durationMs: 0,
        scannedAt: new Date().toISOString(),
        error: 'No GitHub URL found',
      });
      errors++;
      continue;
    }

    try {
      const skill = await fetchSkillContent(
        parsed.owner,
        parsed.repo,
        parsed.branch,
        parsed.basePath
      );

      if (!skill) {
        results.push({
          package: pkg.name,
          url: gitUrl ?? pkg.name,
          fetchedFrom: null,
          riskScore: -1,
          riskLevel: 'NOT_FOUND',
          findingCount: 0,
          findings: [],
          atrRulesEvaluated: 0,
          atrPatternsMatched: 0,
          contentHash: '',
          durationMs: 0,
          scannedAt: new Date().toISOString(),
          error: 'SKILL.md/README.md not found',
        });
        notFound++;
        continue;
      }

      fetched++;
      const isReadme = skill.source.toLowerCase().includes('readme');
      const cHash = contentHash(skill.content);

      const result = scanContent(skill.content, {
        sourceType: isReadme ? 'documentation' : 'skill',
        atrRules,
        skillName: pkg.name,
      }) as {
        riskScore: number;
        riskLevel: string;
        findings: Array<{ id: string; severity: string; title: string; category: string }>;
        atrRulesEvaluated: number;
        atrPatternsMatched: number;
        durationMs: number;
      };

      results.push({
        package: pkg.name,
        url: gitUrl ?? pkg.name,
        fetchedFrom: `${parsed.owner}/${parsed.repo}/${skill.source}`,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        findingCount: result.findings.length,
        findings: result.findings.slice(0, 10).map((f) => ({
          id: f.id,
          severity: f.severity,
          title: f.title,
          category: f.category,
        })),
        atrRulesEvaluated: result.atrRulesEvaluated,
        atrPatternsMatched: result.atrPatternsMatched,
        contentHash: cHash,
        durationMs: result.durationMs,
        scannedAt: new Date().toISOString(),
      });
    } catch (err) {
      results.push({
        package: pkg.name,
        url: gitUrl ?? pkg.name,
        fetchedFrom: null,
        riskScore: -1,
        riskLevel: 'ERROR',
        findingCount: 0,
        findings: [],
        atrRulesEvaluated: 0,
        atrPatternsMatched: 0,
        contentHash: '',
        durationMs: 0,
        scannedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
      errors++;
    }

    // Rate limit: avoid hammering GitHub
    if (i % 10 === 9) await sleep(1000);
  }

  process.stdout.write('\r'.padEnd(80) + '\r');

  // Summary
  const byLevel: Record<string, number> = {};
  for (const r of results) byLevel[r.riskLevel] = (byLevel[r.riskLevel] ?? 0) + 1;

  const flagged = results.filter((r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH');
  const medium = results.filter((r) => r.riskLevel === 'MEDIUM');
  const clean = results.filter(
    (r) =>
      r.riskLevel === 'LOW' ||
      (r.riskScore === 0 && r.riskLevel !== 'ERROR' && r.riskLevel !== 'NOT_FOUND')
  );

  console.log('\n  ══════════════════════════════════════════════════');
  console.log('  PRECISION SCAN RESULTS (scan-core engine)');
  console.log('  ══════════════════════════════════════════════════');
  console.log(`  Total attempted: ${batch.length}`);
  console.log(`  Content fetched: ${fetched}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`  Errors: ${errors}`);
  console.log();
  console.log('  Risk Distribution:');
  for (const [level, count] of Object.entries(byLevel).sort())
    console.log(`    ${level}: ${count}`);

  // Precision analysis
  const scannedResults = results.filter((r) => r.riskScore >= 0);
  if (scannedResults.length > 0) {
    const fpRate =
      scannedResults.length > 0
        ? (((flagged.length + medium.length) / scannedResults.length) * 100).toFixed(1)
        : '0.0';
    console.log();
    console.log(
      `  Flagged (HIGH/CRITICAL): ${flagged.length} (${((flagged.length / scannedResults.length) * 100).toFixed(1)}%)`
    );
    console.log(`  Medium: ${medium.length}`);
    console.log(`  Clean/Low: ${clean.length}`);
    console.log(`  Flag rate (HIGH+CRITICAL+MEDIUM): ${fpRate}%`);
  }

  if (flagged.length > 0) {
    console.log('\n  FLAGGED PACKAGES (review for false positives):');
    for (const r of flagged.slice(0, 20)) {
      console.log(`\n  [${r.riskLevel}] ${r.package} (score: ${r.riskScore})`);
      console.log(`    Source: ${r.fetchedFrom}`);
      for (const f of r.findings.slice(0, 3)) console.log(`    - [${f.severity}] ${f.title}`);
    }
    if (flagged.length > 20)
      console.log(`\n  ... and ${flagged.length - 20} more flagged packages`);
  }

  // Save results
  const report = {
    scanEngine: 'scan-core',
    scanDate: new Date().toISOString(),
    total: batch.length,
    fetched,
    notFound,
    errors,
    summary: byLevel,
    flaggedCount: flagged.length,
    mediumCount: medium.length,
    cleanCount: clean.length,
    flagRate:
      scannedResults.length > 0
        ? ((flagged.length + medium.length) / scannedResults.length) * 100
        : 0,
    results,
  };

  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n  Saved: ${outputPath}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
