/**
 * Dynamic ATR rule count for onboarding copy.
 * 動態 ATR 規則數(供 onboarding 文案使用)
 *
 * The community UX requires the rule count to reflect the live ruleset,
 * never a hardcoded number (DESIGN-community-ux 情境 1: "規則數動態,別寫死").
 *
 * Resolution order (truthful, lightweight — no engine import):
 *   1. Threat Cloud cache `uniqueRulesCount` — the live synced count, the same
 *      source `pga up` reads. Reflects rules actually loaded by Guard.
 *   2. Bundled rule YAMLs in the `agent-threat-rules` package — the real shipped
 *      count, resolved by walking up from this module (mirrors report.ts).
 *   3. `null` — neither available; callers omit the number rather than lie.
 *
 * @module @panguard-ai/panguard/init/rule-count
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Threat Cloud cache written by Guard once it syncs the live ruleset. */
function ruleCountFromTcCache(): number | null {
  try {
    const cachePath = join(homedir(), '.panguard-guard', 'threat-cloud-cache.json');
    if (!existsSync(cachePath)) return null;
    const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as {
      uniqueRulesCount?: number;
    };
    if (typeof cache.uniqueRulesCount === 'number' && cache.uniqueRulesCount > 0) {
      return cache.uniqueRulesCount;
    }
  } catch {
    /* fall through to bundled count */
  }
  return null;
}

/**
 * Locate the bundled `agent-threat-rules/rules` directory.
 * Walks up from this module's own directory, mirroring report.ts so it works
 * regardless of the customer's cwd (incl. global installs and pnpm layouts).
 */
function findBundledRulesDir(): string | null {
  const envDir = process.env['PANGUARD_ATR_RULES_DIR'];
  if (envDir && existsSync(envDir) && statSync(envDir).isDirectory()) {
    return envDir;
  }
  try {
    let dir = dirname(fileURLToPath(import.meta.url));
    while (dir !== sep && dir.length > 0) {
      const candidate = join(dir, 'node_modules', 'agent-threat-rules', 'rules');
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        return candidate;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Count rule YAML files under a directory tree. */
function countYamlFiles(dir: string): number {
  let count = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      count += countYamlFiles(full);
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      count += 1;
    }
  }
  return count;
}

/** Count of bundled rules shipped with the installed `agent-threat-rules`. */
function ruleCountFromBundle(): number | null {
  const rulesDir = findBundledRulesDir();
  if (!rulesDir) return null;
  const count = countYamlFiles(rulesDir);
  return count > 0 ? count : null;
}

/**
 * Resolve the current ATR rule count for onboarding copy.
 * Returns `null` only when no truthful source is available — callers should
 * phrase copy so the count can be gracefully omitted.
 */
export function getRuleCount(): number | null {
  return ruleCountFromTcCache() ?? ruleCountFromBundle();
}
