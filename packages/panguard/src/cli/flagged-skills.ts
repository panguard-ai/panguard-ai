/**
 * Durable store of skills a scan flagged as dangerous.
 *
 * Before this, only SAFE skills were recorded (skill-whitelist.json); a scan
 * that found a CRITICAL skill printed it and moved on, persisting nothing. So
 * `pga status` showed a just-flagged malicious skill as "UNKNOWN" (counted under
 * "unscanned") and `pga doctor` reported "No scan result found" — both understating
 * a known danger. This store is the missing durable verdict that status/doctor read.
 *
 * The file lives next to the whitelist at ~/.panguard-guard/flagged-skills.json and
 * holds the LATEST verdict per scanned skill: re-scanning a skill overwrites (or
 * clears) its entry, so a fixed/removed skill naturally drops out.
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface FlaggedSkill {
  name: string;
  normalizedName: string;
  platform: string;
  riskLevel: RiskLevel;
  scannedAt: string;
}

interface FlaggedStore {
  lastScanAt: string | null;
  flagged: FlaggedSkill[];
}

const EMPTY: FlaggedStore = { lastScanAt: null, flagged: [] };

/** Default data dir, matching status.ts / the guard (~/.panguard-guard). */
export function defaultDataDir(): string {
  return join(homedir(), '.panguard-guard');
}

export function flaggedSkillsPath(dataDir: string = defaultDataDir()): string {
  return join(dataDir, 'flagged-skills.json');
}

const norm = (name: string): string => name.trim().toLowerCase();

/** Read the store, tolerating an absent or corrupt file (returns EMPTY). */
export function readFlaggedStore(dataDir: string = defaultDataDir()): FlaggedStore {
  const path = flaggedSkillsPath(dataDir);
  if (!existsSync(path)) return EMPTY;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<FlaggedStore>;
    const flagged = Array.isArray(parsed.flagged)
      ? parsed.flagged.filter(
          (f): f is FlaggedSkill =>
            !!f && typeof f.name === 'string' && typeof f.riskLevel === 'string'
        )
      : [];
    return {
      lastScanAt: typeof parsed.lastScanAt === 'string' ? parsed.lastScanAt : null,
      flagged,
    };
  } catch {
    return EMPTY;
  }
}

/** Convenience: just the flagged list. */
export function readFlaggedSkills(dataDir: string = defaultDataDir()): FlaggedSkill[] {
  return readFlaggedStore(dataDir).flagged;
}

/** The most recent scan timestamp, or null if no scan has ever run. */
export function lastScanAt(dataDir: string = defaultDataDir()): string | null {
  return readFlaggedStore(dataDir).lastScanAt;
}

/**
 * Record the outcome of a scan. `scannedNames` is every skill the scan looked at;
 * `flagged` is the subset that came back dangerous. The scan is AUTHORITATIVE for
 * everything it looked at: any prior flag for a scanned-but-now-clean skill is
 * dropped, and the new flags are upserted. Skills NOT in this scan keep their prior
 * verdict. Immutable: builds a new store, never mutates the old one. Best-effort —
 * a write failure never breaks the scan.
 */
export function recordScanResults(
  opts: {
    scannedNames: readonly string[];
    flagged: readonly Omit<FlaggedSkill, 'normalizedName' | 'scannedAt'>[];
    scannedAt: string;
    dataDir?: string;
  }
): void {
  const dataDir = opts.dataDir ?? defaultDataDir();
  try {
    const prev = readFlaggedStore(dataDir);
    const scannedSet = new Set(opts.scannedNames.map(norm));
    // Keep prior flags only for skills this scan did NOT look at.
    const kept = prev.flagged.filter((f) => !scannedSet.has(f.normalizedName));
    const fresh: FlaggedSkill[] = opts.flagged.map((f) => ({
      name: f.name,
      normalizedName: norm(f.name),
      platform: f.platform,
      riskLevel: f.riskLevel,
      scannedAt: opts.scannedAt,
    }));
    // Dedupe by normalizedName (a fresh flag wins over any survivor collision).
    const byName = new Map<string, FlaggedSkill>();
    for (const f of kept) byName.set(f.normalizedName, f);
    for (const f of fresh) byName.set(f.normalizedName, f);
    const next: FlaggedStore = {
      lastScanAt: opts.scannedAt,
      flagged: [...byName.values()],
    };
    const path = flaggedSkillsPath(dataDir);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const tmp = `${path}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(tmp, path);
  } catch {
    /* best-effort: never let telemetry-of-record break a scan */
  }
}

/** Drop a skill's flag by name (e.g. it was removed or the user cleared it). */
export function clearFlaggedSkill(name: string, dataDir: string = defaultDataDir()): void {
  try {
    const prev = readFlaggedStore(dataDir);
    const target = norm(name);
    const flagged = prev.flagged.filter((f) => f.normalizedName !== target);
    if (flagged.length === prev.flagged.length) return; // nothing to change
    const next: FlaggedStore = { lastScanAt: prev.lastScanAt, flagged };
    const path = flaggedSkillsPath(dataDir);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const tmp = `${path}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(tmp, path);
  } catch {
    /* best-effort */
  }
}
