/**
 * auto-rules.ts — the advise-vs-enforce resolver for Gap A auto-pulled rules.
 *
 * Deliberately self-contained (node builtins only, no logger, no engine, no
 * heavy deps) so the per-tool-call hook can import it via the
 * `@panguard-ai/panguard-guard/auto-rules` subpath WITHOUT pulling in the whole
 * daemon module graph. This is the single source of the "which staged bundle,
 * and is it trusted to enforce?" decision, consumed by both the tool-call hook
 * and rule-sync.
 *
 * @module @panguard-ai/panguard-guard/auto-rules
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Default guard data dir (mirrors config.ts DEFAULT_DATA_DIR without importing it). */
const DEFAULT_DATA_DIR = join(homedir(), '.panguard-guard');
const MASTER_CONFIG_PATH = join(homedir(), '.panguard', 'config.json');

/** Compare dotted version strings; true iff `a` is strictly newer than `b`. */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** A staged, integrity-verified auto-pulled rule bundle and its trust status. */
export interface StagedAutoRules {
  /** Directory of extracted rule YAMLs (`<dataDir>/auto-rules/<version>/`). */
  readonly dir: string;
  /** The staged bundle version. */
  readonly version: string;
  /**
   * True when this bundle is NEWER than the trusted version (or nothing is
   * trusted yet) — its rules DETECT/advise but must NOT block. False only when
   * `version <= trustedVersion`, i.e. the user has trusted it to enforce.
   */
  readonly adviseOnly: boolean;
}

/**
 * Find the newest auto-pulled rule bundle that pullRuleUpdate has staged on
 * disk, and decide whether it is trusted to ENFORCE. A staged bundle may
 * hard-deny ONLY when its version is `<= trustedVersion`; otherwise it is
 * advise-only. Returns null when nothing is staged. Pure filesystem read —
 * never throws.
 */
export function resolveStagedAutoRules(
  dataDir: string,
  trustedVersion: string | null | undefined
): StagedAutoRules | null {
  try {
    const base = join(dataDir, 'auto-rules');
    if (!existsSync(base)) return null;
    // Only dotted-numeric version dirs (pullRuleUpdate names them by version).
    const versions = readdirSync(base).filter(
      (name) => /^\d+\.\d+\.\d+/.test(name) && statSync(join(base, name)).isDirectory()
    );
    if (versions.length === 0) return null;
    // Pick the newest staged version.
    let latest = versions[0]!;
    for (const v of versions) if (isNewerVersion(v, latest)) latest = v;
    // adviseOnly unless the user has trusted a version >= this one.
    const adviseOnly = !trustedVersion || isNewerVersion(latest, trustedVersion);
    return { dir: join(base, latest), version: latest, adviseOnly };
  } catch {
    return null;
  }
}

/** The subset of guard config the auto-rules path needs, read cheaply. */
export interface AutoUpdateSettings {
  readonly autoUpdateRules: boolean;
  readonly autoUpdateTrustedVersion: string | null;
  readonly dataDir: string;
}

/**
 * Read just the auto-update settings from the guard config JSON directly (no
 * zod, no full loadConfig — those live in the heavy index). Best-effort: any
 * problem yields the safest defaults (auto-update off, nothing trusted). Checks
 * the guard-specific config first, then the master config.
 */
export function readAutoUpdateSettings(): AutoUpdateSettings {
  const safe: AutoUpdateSettings = {
    autoUpdateRules: false,
    autoUpdateTrustedVersion: null,
    dataDir: DEFAULT_DATA_DIR,
  };
  // Mirror loadConfig precedence: the FIRST existing file is authoritative
  // (guard-specific, then master) — the two are never merged. Critically, if
  // the authoritative file EXISTS but is corrupt, fail SAFE (safest defaults) —
  // do NOT fall through to a more-permissive file, or a corrupted guard config
  // that meant to DISABLE auto-update could be silently overridden by an older
  // enabling master config.
  for (const path of [join(DEFAULT_DATA_DIR, 'config.json'), MASTER_CONFIG_PATH]) {
    if (!existsSync(path)) continue; // absent → try the next candidate
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as {
        autoUpdateRules?: unknown;
        autoUpdateTrustedVersion?: unknown;
        dataDir?: unknown;
      };
      return {
        autoUpdateRules: raw.autoUpdateRules === true,
        autoUpdateTrustedVersion:
          typeof raw.autoUpdateTrustedVersion === 'string' ? raw.autoUpdateTrustedVersion : null,
        dataDir: typeof raw.dataDir === 'string' ? raw.dataDir : DEFAULT_DATA_DIR,
      };
    } catch {
      // Authoritative file present but unparseable → safest defaults, full stop.
      return safe;
    }
  }
  return safe;
}
