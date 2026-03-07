/**
 * Bulk fetch: Pull all disclosed reports and generate Sigma rules
 * Run: npx tsx packages/threat-cloud/scripts/bulk-fetch.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HackerOneAdapter } from '../src/threat-intel/hackerone-adapter.js';
import { AttackExtractor } from '../src/threat-intel/attack-extractor.js';
import { SigmaRuleGenerator } from '../src/threat-intel/sigma-rule-generator.js';
import { YaraRuleGenerator } from '../src/threat-intel/yara-rule-generator.js';
import { RuleValidator } from '../src/threat-intel/rule-validator.js';
import type { StoredReport, GeneratedRule, GeneratedYaraRule } from '../src/threat-intel/types.js';

const RULES_DIR = './config/sigma-rules/auto-generated';
const META_FILE = join(RULES_DIR, '.meta.json');

async function run() {
  console.log('=== Panguard Bulk Threat Intel Fetch ===\n');

  // Fetch with generous limits - get as many disclosed reports as possible
  const adapter = new HackerOneAdapter({
    maxReports: 200,
    minSeverity: 'low',
    rateLimitPerMinute: 10,
  });

  console.log('Fetching HackerOne Hacktivity (up to 200 reports, pages of 25)...');
  console.log('This may take a few minutes due to rate limiting.\n');

  const reports = await adapter.fetchReports();
  console.log(`Fetched ${reports.length} disclosed reports\n`);

  if (reports.length === 0) {
    console.log('No disclosed reports found.');
    return;
  }

  // Print report summary
  console.log('Reports found:');
  for (const r of reports) {
    console.log(`  [${r.severity.toUpperCase()}] ${r.title}`);
    console.log(`    CWE: ${r.cweId ?? r.cweName ?? 'N/A'} | Program: ${r.programName ?? 'N/A'} | CVEs: ${r.cveIds.join(', ') || 'N/A'}`);
  }
  console.log('');

  // Generate rules
  const extractor = new AttackExtractor({ minConfidence: 20 });
  const sigmaGenerator = new SigmaRuleGenerator();
  const yaraGenerator = new YaraRuleGenerator();
  const validator = new RuleValidator();
  const allRules: GeneratedRule[] = [];
  const allYaraRules: GeneratedYaraRule[] = [];
  const allReports: StoredReport[] = [];

  mkdirSync(RULES_DIR, { recursive: true });

  for (const report of reports) {
    allReports.push(report);
    const patterns = extractor.extractHeuristic(report);
    const extraction = {
      reportId: report.id,
      reportTitle: report.title,
      reportUrl: report.url,
      patterns,
      extractedAt: new Date().toISOString(),
      model: 'heuristic',
    };

    // Sigma rules
    const sigmaRules = sigmaGenerator.generate(extraction);
    for (const rule of sigmaRules) {
      const v = validator.validate(rule);
      if (!v.valid || v.isDuplicate) continue;

      const filename = `${rule.attackType.toLowerCase().replace(/\s+/g, '-')}-${rule.id.slice(0, 8)}.yml`;
      writeFileSync(join(RULES_DIR, filename), rule.yamlContent);
      allRules.push(rule);
      console.log(`  Sigma: ${filename} (${rule.attackType}, confidence: ${rule.confidence}%)`);
    }

    // YARA rules
    const yaraRules = yaraGenerator.generate(extraction);
    for (const rule of yaraRules) {
      const filename = `${rule.attackType.toLowerCase().replace(/\s+/g, '-')}-${rule.id}.yar`;
      writeFileSync(join(RULES_DIR, filename), rule.ruleContent);
      allYaraRules.push(rule);
      console.log(`  YARA:  ${filename} (${rule.attackType}, confidence: ${rule.confidence}%)`);
    }
  }

  // Save metadata
  const meta = {
    lastSyncAt: new Date().toISOString(),
    reports: allReports,
    sigmaRules: allRules,
    yaraRules: allYaraRules,
  };
  writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

  // Summary
  const experimental = allRules.filter(r => r.status === 'experimental').length;
  const draft = allRules.filter(r => r.status === 'draft').length;

  console.log('\n=== Summary ===');
  console.log(`Reports fetched:    ${reports.length}`);
  console.log(`Sigma rules:        ${allRules.length}`);
  console.log(`  Experimental:     ${experimental}`);
  console.log(`  Draft:            ${draft}`);
  console.log(`YARA rules:         ${allYaraRules.length}`);
  console.log(`Rules saved to:     ${RULES_DIR}/`);
  console.log(`Metadata saved to:  ${META_FILE}`);
}

run().catch(console.error);
