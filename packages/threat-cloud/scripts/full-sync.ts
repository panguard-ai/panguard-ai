/**
 * Full Sync: Pull from all 10 threat intel sources
 * Run: npx tsx packages/threat-cloud/scripts/full-sync.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ThreatIntelPipeline } from '../src/threat-intel/pipeline.js';

const DATA_DIR = './packages/threat-cloud/data/threat-intel';
const RECORDS_FILE = join(DATA_DIR, 'records.json');
const STATS_FILE = join(DATA_DIR, 'sync-stats.json');

async function run() {
  console.log('=== Panguard Full Threat Intel Sync ===\n');
  console.log(`Sources: NVD, CISA KEV, MITRE ATT&CK, URLhaus, MalwareBazaar,`);
  console.log(`         ThreatFox, OSV.dev, GitHub Advisory, AlienVault OTX, ExploitDB\n`);

  const pipeline = new ThreatIntelPipeline({
    maxRecordsPerSource: 200,
    minValidationScore: 70,
    parallel: false, // sequential to respect rate limits
  });

  console.log('Starting sync (sequential to respect rate limits)...\n');

  const result = await pipeline.run();

  // Print per-source stats
  console.log('\n--- Per-Source Results ---');
  for (const s of result.stats) {
    const status = s.errors.length > 0 ? `ERROR: ${s.errors[0]}` : 'OK';
    console.log(`  ${s.source.padEnd(18)} fetched:${String(s.fetched).padStart(5)}  valid:${String(s.validated).padStart(5)}  rejected:${String(s.rejected).padStart(4)}  ${Math.round(s.durationMs / 1000)}s  ${status}`);
  }

  // Save results
  mkdirSync(DATA_DIR, { recursive: true });

  const recordsSummary = result.records.map(r => ({
    id: r.id,
    source: r.source,
    type: r.type,
    title: r.title,
    severity: r.severity,
    cvssScore: r.cvssScore,
    cveIds: r.cveIds,
    cweIds: r.cweIds,
    mitreTechniques: r.mitreTechniques,
    indicatorCount: r.indicators.length,
    publishedAt: r.publishedAt,
    validationScore: r.validation.score,
  }));

  writeFileSync(RECORDS_FILE, JSON.stringify(recordsSummary, null, 2));

  const stats = {
    syncAt: new Date().toISOString(),
    totalRecords: result.records.length,
    totalDurationMs: result.durationMs,
    perSource: result.stats,
    byType: {
      vulnerability: result.records.filter(r => r.type === 'vulnerability').length,
      ioc: result.records.filter(r => r.type === 'ioc').length,
      technique: result.records.filter(r => r.type === 'technique').length,
      exploit: result.records.filter(r => r.type === 'exploit').length,
      malware: result.records.filter(r => r.type === 'malware').length,
    },
    bySeverity: {
      critical: result.records.filter(r => r.severity === 'critical').length,
      high: result.records.filter(r => r.severity === 'high').length,
      medium: result.records.filter(r => r.severity === 'medium').length,
      low: result.records.filter(r => r.severity === 'low').length,
      none: result.records.filter(r => r.severity === 'none').length,
    },
  };

  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total records:      ${result.records.length}`);
  console.log(`  Vulnerabilities:  ${stats.byType.vulnerability}`);
  console.log(`  IOCs:             ${stats.byType.ioc}`);
  console.log(`  Techniques:       ${stats.byType.technique}`);
  console.log(`  Exploits:         ${stats.byType.exploit}`);
  console.log(`  Malware:          ${stats.byType.malware}`);
  console.log(`Duration:           ${Math.round(result.durationMs / 1000)}s`);
  console.log(`Data saved to:      ${DATA_DIR}/`);
}

run().catch(console.error);
