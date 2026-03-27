#!/usr/bin/env npx tsx
/**
 * Push scan results to Threat Cloud:
 * - CRITICAL/HIGH → blacklist + ATR proposals
 * - LOW/clean → whitelist
 * - Optional: LLM analysis to crystallize findings into rule proposals
 *
 * Usage: npx tsx scripts/push-to-threat-cloud.ts --input FILE --tc-url URL [--llm] [--auto-propose]
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const getArg = (flag: string, def: string) => {
  const idx = args.indexOf(flag);
  return idx >= 0 ? (args[idx + 1] ?? def) : def;
};
const hasFlag = (flag: string) => args.includes(flag);

const inputPath = getArg('--input', '');
const tcUrl = getArg('--tc-url', 'https://tc.panguard.ai');
const useLlm = hasFlag('--llm');
const autoPropose = hasFlag('--auto-propose');

if (!inputPath) {
  console.error(
    'Usage: npx tsx push-to-threat-cloud.ts --input FILE --tc-url URL [--llm] [--auto-propose]'
  );
  process.exit(1);
}

interface ScanResult {
  author: string;
  name: string;
  downloads: number;
  riskScore: number;
  riskLevel: string;
  findingCount: number;
  findings: Array<{ id: string; severity: string; title: string; category: string }>;
}

async function pushToTC(results: ScanResult[]): Promise<{
  threats: number;
  whitelist: number;
  proposals: number;
}> {
  let threats = 0;
  let whitelist = 0;
  let proposals = 0;

  for (const r of results) {
    if (r.riskScore < 0) continue;

    const skillName = `${r.author}/${r.name}`;

    if (r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH') {
      // Submit as threat
      try {
        await fetch(`${tcUrl}/api/skill-threats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skillHash: createHash('sha256').update(skillName).digest('hex').slice(0, 16),
            skillName,
            riskScore: r.riskScore,
            riskLevel: r.riskLevel,
            findingSummaries: r.findings.map((f) => f.id).join(','),
            clientId: 'bulk-pipeline',
          }),
          signal: AbortSignal.timeout(5000),
        });
        threats++;
      } catch {
        /* best effort */
      }

      // Auto-propose ATR rules for CRITICAL
      if (autoPropose && r.riskLevel === 'CRITICAL' && r.findings.length > 0) {
        try {
          const ruleContent = `title: "Auto-detected: ${r.findings[0].title}"\nid: ATR-2026-DRAFT-${Date.now().toString(36)}\nseverity: ${r.findings[0].severity}\nsource_skill: "${skillName}"\ndetection:\n  conditions:\n    - field: content\n      operator: regex\n      value: "TODO-manual-review"\n  condition: any`;
          await fetch(`${tcUrl}/api/atr-proposals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patternHash: createHash('sha256').update(ruleContent).digest('hex').slice(0, 16),
              ruleContent,
              llmProvider: 'bulk-pipeline',
              llmModel: 'none',
              selfReviewVerdict: 'needs-human-review',
            }),
            signal: AbortSignal.timeout(5000),
          });
          proposals++;
        } catch {
          /* best effort */
        }
      }
    } else if (r.riskLevel === 'LOW' && r.riskScore <= 5) {
      // Report as safe
      try {
        await fetch(`${tcUrl}/api/skill-whitelist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillName }),
          signal: AbortSignal.timeout(3000),
        });
        whitelist++;
      } catch {
        /* best effort */
      }
    }

    // Usage counter
    void fetch(`${tcUrl}/api/usage`, {
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

  return { threats, whitelist, proposals };
}

async function main() {
  const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const results: ScanResult[] = data.results || data;

  console.log(`Pushing ${results.length} results to ${tcUrl}`);
  if (useLlm) console.log('LLM analysis: enabled (not implemented yet — manual review)');
  if (autoPropose) console.log('Auto-propose: enabled');

  const stats = await pushToTC(results);
  console.log(
    `Done: ${stats.threats} threats, ${stats.whitelist} whitelist, ${stats.proposals} proposals`
  );
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
