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

  it('a scan that did NOT look at a skill keeps that skill\'s prior flag', () => {
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
    const names = readFlaggedSkills(d).map((f) => f.name).sort();
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
