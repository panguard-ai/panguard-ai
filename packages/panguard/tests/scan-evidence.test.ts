/**
 * `pga scan --all` must record WHICH rules fired, not just that a skill is bad.
 *
 * The ATR CLI reports matches as results[].matches[].rule; this path previously
 * kept only a bare HIGH verdict, which left `pga status` telling a `pga scan`
 * user to "re-scan to see which rules fire" — advice that could never come true.
 */
import { describe, it, expect } from 'vitest';
import { atrMatchesToEvidence } from '../src/cli/commands/scan.js';

const payload = (matches: unknown[]): string =>
  JSON.stringify({
    scan_type: 'skill',
    skills_scanned: 1,
    threats_detected: matches.length,
    rules_loaded: 768,
    results: [{ file: 'SKILL.md', content_hash: 'abc', matches }],
  });

describe('scan: extracting which rules fired', () => {
  it('recovers rule id, title and severity, worst first', () => {
    const out = atrMatchesToEvidence(
      payload([
        { rule: { id: 'ATR-2026-00066', title: 'Remote script execution', severity: 'high' } },
        { rule: { id: 'ATR-2026-00162', title: 'Credential access', severity: 'critical' } },
      ])
    );
    expect(out).toEqual([
      { ruleId: 'ATR-2026-00162', title: 'Credential access', severity: 'critical' },
      { ruleId: 'ATR-2026-00066', title: 'Remote script execution', severity: 'high' },
    ]);
  });

  it('never carries matchedPatterns, which hold the raw text that tripped the rule', () => {
    const MARKER = 'RAW-MATCHED-TEXT-MARKER';
    const out = atrMatchesToEvidence(
      payload([
        {
          rule: { id: 'ATR-2026-00113', title: 'Hardcoded credential', severity: 'critical' },
          matchedPatterns: [MARKER],
        },
      ])
    );
    expect(JSON.stringify(out)).not.toContain(MARKER);
    expect(out[0]?.ruleId).toBe('ATR-2026-00113');
  });

  it('deduplicates a rule that matched in several places', () => {
    const out = atrMatchesToEvidence(
      payload([
        { rule: { id: 'ATR-2026-00066', title: 'Remote script execution', severity: 'high' } },
        { rule: { id: 'ATR-2026-00066', title: 'Remote script execution', severity: 'high' } },
      ])
    );
    expect(out).toHaveLength(1);
  });

  it('returns nothing rather than throwing on unparseable or empty output', () => {
    expect(atrMatchesToEvidence('not json')).toEqual([]);
    expect(atrMatchesToEvidence(payload([]))).toEqual([]);
    expect(atrMatchesToEvidence(JSON.stringify({ threats_detected: 3 }))).toEqual([]);
  });
});
