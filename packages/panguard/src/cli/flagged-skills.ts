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

/**
 * WHY a skill was flagged: which rule fired, and how bad it is.
 *
 * Deliberately carries NO matched text. An auditor finding's `snippet` — and,
 * for ATR findings, its `location` ("Matched: <raw text that tripped the rule>")
 * — hold the source that matched, so a credential rule hands over the credential
 * itself. This file persists to disk indefinitely, so neither is stored. Showing
 * a user the matching line in their OWN file is legitimate and still happens, on
 * the live path: `pga audit <path> --verbose` re-scans and prints it to stdout,
 * where it is never written down.
 *
 * What remains is enough to triage: the rule id is a public YAML file, so the
 * user can go read it and disagree.
 */
export interface FlaggedEvidence {
  /** ATR rule id, e.g. ATR-2026-00162 — readable at agentthreatrule.org. */
  ruleId?: string;
  title: string;
  severity: string;
}

export interface FlaggedSkill {
  name: string;
  normalizedName: string;
  platform: string;
  riskLevel: RiskLevel;
  scannedAt: string;
  /** Absent on entries written before the evidence layer existed. */
  evidence?: readonly FlaggedEvidence[];
}

/** Cap per skill: enough to explain a verdict, not enough to bloat the store. */
const MAX_EVIDENCE = 5;

/**
 * Copy ONLY the known evidence fields onto a fresh object.
 *
 * Callers hand us raw auditor findings, which carry `snippet` and `location` —
 * both of which embed matched source. Allow-listing (rather than deleting known
 * bad keys) is what keeps that off disk: a field the auditor grows later is
 * excluded by default instead of leaking until someone notices. Findings with no
 * title are dropped; an untitled row explains nothing.
 */
function sanitizeEvidence(input: unknown): FlaggedEvidence[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: FlaggedEvidence[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const f = raw as Record<string, unknown>;
    if (typeof f['title'] !== 'string' || typeof f['severity'] !== 'string') continue;
    out.push({
      ...(typeof f['ruleId'] === 'string' ? { ruleId: f['ruleId'] } : {}),
      title: f['title'],
      severity: f['severity'],
    });
    if (out.length >= MAX_EVIDENCE) break;
  }
  return out.length > 0 ? out : undefined;
}

interface FlaggedStore {
  lastScanAt: string | null;
  flagged: FlaggedSkill[];
}

const EMPTY: FlaggedStore = { lastScanAt: null, flagged: [] };

/** New object without `evidence` — keeps the field absent rather than undefined. */
function omitEvidence(f: FlaggedSkill): FlaggedSkill {
  const { evidence: _evidence, ...rest } = f;
  return rest;
}

/** Worst first, so the MAX_EVIDENCE cap keeps the findings that matter. */
const SEVERITY_ORDER: readonly string[] = ['critical', 'high', 'medium', 'low', 'info'];

/**
 * The skill auditor namespaces ATR findings as `atr-<ATR rule id>`. Recover the
 * bare rule id so the UI can point at a public YAML file; non-ATR checks (code
 * scan, secrets) have no rule id and get none.
 */
function atrRuleId(findingId: unknown): string | undefined {
  if (typeof findingId !== 'string') return undefined;
  const m = /^atr-(ATR-[\w-]+)$/i.exec(findingId);
  return m?.[1];
}

/**
 * Shape auditor findings into storable evidence: worst-severity first, rule id
 * recovered, and every matched-source field (location, snippet) left behind.
 * Producers (`pga up`, `pga setup`) call this so the mapping lives in one place.
 */
export function toEvidence(
  findings: readonly { id?: unknown; title?: unknown; severity?: unknown }[]
): FlaggedEvidence[] {
  return [...findings]
    .filter((f) => typeof f.title === 'string' && typeof f.severity === 'string')
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(String(a.severity)) - SEVERITY_ORDER.indexOf(String(b.severity))
    )
    .map((f) => ({
      ...(atrRuleId(f.id) ? { ruleId: atrRuleId(f.id) } : {}),
      title: String(f.title),
      severity: String(f.severity),
    }));
}

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
      ? parsed.flagged
          .filter(
            (f): f is FlaggedSkill =>
              !!f && typeof f.name === 'string' && typeof f.riskLevel === 'string'
          )
          // Re-sanitize on READ too: the file is user-writable, and an entry
          // hand-edited to carry a snippet must not resurface in the UI.
          .map((f) => {
            const evidence = sanitizeEvidence(f.evidence);
            return evidence ? { ...f, evidence } : omitEvidence(f);
          })
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
export function recordScanResults(opts: {
  scannedNames: readonly string[];
  flagged: readonly (Omit<FlaggedSkill, 'normalizedName' | 'scannedAt' | 'evidence'> & {
    /** Auditor findings; allow-listed before write (no snippet reaches disk). */
    evidence?: readonly FlaggedEvidence[];
  })[];
  scannedAt: string;
  dataDir?: string;
}): void {
  const dataDir = opts.dataDir ?? defaultDataDir();
  try {
    const prev = readFlaggedStore(dataDir);
    const scannedSet = new Set(opts.scannedNames.map(norm));
    // Keep prior flags only for skills this scan did NOT look at.
    const kept = prev.flagged.filter((f) => !scannedSet.has(f.normalizedName));
    const fresh: FlaggedSkill[] = opts.flagged.map((f) => {
      const evidence = sanitizeEvidence(f.evidence);
      return {
        name: f.name,
        normalizedName: norm(f.name),
        platform: f.platform,
        riskLevel: f.riskLevel,
        scannedAt: opts.scannedAt,
        ...(evidence ? { evidence } : {}),
      };
    });
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
