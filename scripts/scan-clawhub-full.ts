#!/usr/bin/env npx tsx
/**
 * Full ClawHub scan — batches of 500, checkpoints, dedup, TC push, no stopping.
 *
 * Usage: npx tsx scripts/scan-clawhub-full.ts [--start 1000] [--batch 500]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const DOWNLOAD_API = 'https://wry-manatee-359.convex.site/api/v1/download';
const TC_ENDPOINT = 'https://tc.panguard.ai';
const OUTPUT_DIR = '/Users/user/Downloads/agent-threat-rules/data/clawhub-scan';
const REGISTRY_PATH = join(OUTPUT_DIR, 'clawhub-registry.json');

const args = process.argv.slice(2);
const startIdx = parseInt(args.find((a) => a.startsWith('--start='))?.split('=')[1] || '1000');
const batchSize = parseInt(args.find((a) => a.startsWith('--batch='))?.split('=')[1] || '500');

interface Result {
  author: string;
  name: string;
  downloads: number;
  riskScore: number;
  riskLevel: string;
  findingCount: number;
  findings: Array<{ id: string; severity: string; title: string; category: string }>;
  scannedAt: string;
  error?: string;
}

async function downloadAndScan(
  slug: string,
  scanFn: any,
  rules: any,
  author: string,
  downloads: number
): Promise<Result> {
  const workDir = '/tmp/clawhub-scan-work';
  if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  try {
    const res = await fetch(`${DOWNLOAD_API}?slug=${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return mkResult(author, slug, downloads, -1, 'NO_CONTENT', 'Download failed');
    writeFileSync(join(workDir, 's.zip'), Buffer.from(await res.arrayBuffer()));
    mkdirSync(join(workDir, 'ex'), { recursive: true });
    try {
      execSync(`unzip -q -o "${join(workDir, 's.zip')}" -d "${join(workDir, 'ex')}" 2>/dev/null`, {
        timeout: 5000,
      });
    } catch {
      return mkResult(author, slug, downloads, -1, 'NO_CONTENT', 'Unzip failed');
    }
    const skillMd = join(workDir, 'ex', 'SKILL.md');
    if (!existsSync(skillMd))
      return mkResult(author, slug, downloads, -1, 'NO_CONTENT', 'No SKILL.md');
    const content = readFileSync(skillMd, 'utf-8');
    const r = scanFn(content, {
      sourceType: 'skill',
      atrRules: rules,
      skillName: `${author}/${slug}`,
    });
    return {
      author,
      name: slug,
      downloads,
      riskScore: r.riskScore,
      riskLevel: r.riskLevel,
      findingCount: r.findings.length,
      findings: r.findings.slice(0, 8).map((f: any) => ({
        id: f.id,
        severity: f.severity,
        title: f.title,
        category: f.category || 'atr',
      })),
      scannedAt: new Date().toISOString(),
    };
  } catch (err) {
    return mkResult(author, slug, downloads, -1, 'ERROR', String(err));
  } finally {
    if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  }
}

function mkResult(
  author: string,
  name: string,
  downloads: number,
  score: number,
  level: string,
  error: string
): Result {
  return {
    author,
    name,
    downloads,
    riskScore: score,
    riskLevel: level,
    findingCount: 0,
    findings: [],
    scannedAt: new Date().toISOString(),
    error,
  };
}

async function pushBatchToTC(results: Result[]): Promise<{ threats: number; whitelist: number }> {
  let threats = 0;
  let whitelist = 0;
  for (const r of results) {
    if (r.riskScore < 0) continue;
    const skillName = `${r.author}/${r.name}`;
    const hash = createHash('sha256').update(skillName).digest('hex').slice(0, 16);

    if (r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH') {
      void fetch(`${TC_ENDPOINT}/api/skill-threats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillHash: hash,
          skillName,
          riskScore: r.riskScore,
          riskLevel: r.riskLevel,
          findingSummaries: r.findings.map((f) => f.id).join(','),
          clientId: 'bulk-pipeline',
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
      threats++;
    } else if (r.riskLevel === 'LOW') {
      void fetch(`${TC_ENDPOINT}/api/skill-whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
      whitelist++;
    }

    void fetch(`${TC_ENDPOINT}/api/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'scan',
        source: 'bulk-pipeline',
        metadata: { skill: skillName, risk: r.riskLevel },
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }
  // Let fire-and-forget complete
  await new Promise((r) => setTimeout(r, 2000));
  return { threats, whitelist };
}

async function main() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  const total = registry.length;

  // Load existing results for dedup
  const existingPath = join(OUTPUT_DIR, 'scan-1000.json');
  let allResults: Result[] = [];
  if (existsSync(existingPath)) {
    allResults = JSON.parse(readFileSync(existingPath, 'utf-8')).results || [];
  }
  const scannedSlugs = new Set(allResults.map((r: Result) => r.name));

  const { scanContent, compileRules } = await import('@panguard-ai/scan-core');
  const atrRules = compileRules(
    JSON.parse(
      readFileSync(join(process.cwd(), 'packages/website/src/lib/atr-rules-compiled.json'), 'utf-8')
    )
  );

  console.log(`\nFull ClawHub Scan`);
  console.log(
    `Registry: ${total} | Already scanned: ${scannedSlugs.size} | Starting at: ${startIdx}`
  );
  console.log(`Batch size: ${batchSize} | ATR rules: ${atrRules.length}\n`);

  const byLevel: Record<string, number> = {};
  for (const r of allResults)
    if (r.riskScore >= 0) byLevel[r.riskLevel] = (byLevel[r.riskLevel] || 0) + 1;

  let totalThreats = 0;
  let totalWhitelist = 0;
  let batchNum = 0;

  for (let i = startIdx; i < total; i += batchSize) {
    batchNum++;
    const batch = registry.slice(i, i + batchSize);
    const batchResults: Result[] = [];

    for (let j = 0; j < batch.length; j++) {
      const s = batch[j];
      if (scannedSlugs.has(s.name)) continue;

      const pct = Math.round(((i + j + 1) / total) * 100);
      process.stdout.write(`\r  [${pct}%] ${i + j + 1}/${total}: ${s.author}/${s.name}`.padEnd(80));

      const result = await downloadAndScan(s.name, scanContent, atrRules, s.author, s.downloads);
      batchResults.push(result);
      allResults.push(result);
      scannedSlugs.add(s.name);

      if (result.riskScore >= 0) {
        byLevel[result.riskLevel] = (byLevel[result.riskLevel] || 0) + 1;
      }

      // Gentle rate limit
      if (j % 30 === 29) await new Promise((r) => setTimeout(r, 300));
    }

    // Checkpoint
    const checkpointPath = join(OUTPUT_DIR, `scan-checkpoint-${i}.json`);
    writeFileSync(
      checkpointPath,
      JSON.stringify(
        {
          scanDate: new Date().toISOString(),
          batch: batchNum,
          startIdx: i,
          scannedSoFar: allResults.length,
          summary: byLevel,
          results: batchResults,
        },
        null,
        2
      )
    );

    // TC push
    const tcStats = await pushBatchToTC(batchResults);
    totalThreats += tcStats.threats;
    totalWhitelist += tcStats.whitelist;

    // Batch summary
    const batchScanned = batchResults.filter((r) => r.riskScore >= 0);
    const batchByLevel: Record<string, number> = {};
    for (const r of batchScanned) batchByLevel[r.riskLevel] = (batchByLevel[r.riskLevel] || 0) + 1;

    process.stdout.write('\r'.padEnd(80) + '\r');
    console.log(
      `  Batch ${batchNum} (${i}-${i + batch.length}): ${batchResults.length} new, ${batchScanned.length} scanned | ${JSON.stringify(batchByLevel)} | TC: ${tcStats.threats}T ${tcStats.whitelist}W`
    );

    // Force GC hint
    if (global.gc) global.gc();
  }

  // Final merge
  const finalPath = join(OUTPUT_DIR, 'scan-full.json');
  const finalData = {
    scanDate: new Date().toISOString(),
    engine: 'ATR scan-core v1.4.0',
    atrRules: atrRules.length,
    total: allResults.length,
    summary: byLevel,
    tcPushed: { threats: totalThreats, whitelist: totalWhitelist },
    results: allResults,
  };
  writeFileSync(finalPath, JSON.stringify(finalData, null, 2));

  process.stdout.write('\n');
  console.log('══════════════════════════════════════════');
  console.log('FULL SCAN COMPLETE');
  console.log('══════════════════════════════════════════');
  console.log(`Total scanned: ${allResults.length}`);
  console.log(`With content: ${allResults.filter((r) => r.riskScore >= 0).length}`);
  console.log(`No content: ${allResults.filter((r) => r.riskScore < 0).length}`);
  console.log(`Distribution: ${JSON.stringify(byLevel)}`);
  console.log(`TC pushed: ${totalThreats} threats, ${totalWhitelist} whitelist`);
  console.log(`Output: ${finalPath}`);
  const sizeMB = (Buffer.byteLength(JSON.stringify(finalData)) / 1024 / 1024).toFixed(1);
  console.log(`File size: ${sizeMB} MB`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
