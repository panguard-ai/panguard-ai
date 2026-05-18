/**
 * ATR rule metadata loader.
 *
 * Loads rule YAMLs from the bundled `agent-threat-rules` npm package once
 * and caches by rule_id. Used by the /api/atr-rules/[id] route handler that
 * powers the event-row drill-down popover.
 *
 * Differentiation: PanGuard surfaces ATR rule_id + benchmark precision per
 * detection event. Competitor dashboards say "something flagged"; we cite
 * the rule with its provenance + academic numbers.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import yaml from 'js-yaml';

export interface AtrRuleMeta {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  maturity: string;
  author: string;
  date?: string;
  category?: string;
  references?: Record<string, string[]>;
  compliance?: Record<string, unknown>;
  rule_path: string; // relative path under rules/
  github_url: string;
}

let cache: Map<string, AtrRuleMeta> | null = null;
let loadingPromise: Promise<Map<string, AtrRuleMeta>> | null = null;

async function buildCache(): Promise<Map<string, AtrRuleMeta>> {
  const require = createRequire(import.meta.url);
  const atrPkgPath = require.resolve('agent-threat-rules/package.json');
  const rulesDir = join(dirname(atrPkgPath), 'rules');

  const m = new Map<string, AtrRuleMeta>();

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!ent.name.endsWith('.yaml')) continue;

      try {
        const content = await readFile(full, 'utf-8');
        const rule = yaml.load(content) as Record<string, unknown> | null;
        if (
          !rule ||
          typeof rule !== 'object' ||
          typeof rule.id !== 'string' ||
          !rule.id.startsWith('ATR-')
        ) {
          continue;
        }
        const relPath = full.slice(full.indexOf('/rules/') + 1);
        const tags = (rule.tags as Record<string, unknown> | undefined) ?? {};
        const meta: AtrRuleMeta = {
          id: rule.id,
          title: typeof rule.title === 'string' ? rule.title : '',
          description:
            typeof rule.description === 'string' ? rule.description : '',
          severity:
            typeof rule.severity === 'string' ? rule.severity : 'medium',
          status:
            typeof rule.status === 'string' ? rule.status : 'experimental',
          maturity:
            typeof rule.maturity === 'string'
              ? rule.maturity
              : 'experimental',
          author: typeof rule.author === 'string' ? rule.author : '',
          rule_path: relPath,
          github_url: `https://github.com/Agent-Threat-Rule/agent-threat-rules/blob/main/${relPath}`,
        };
        if (typeof rule.date === 'string') meta.date = rule.date;
        if (typeof tags.category === 'string') meta.category = tags.category;
        if (rule.references && typeof rule.references === 'object') {
          meta.references = rule.references as Record<string, string[]>;
        }
        if (rule.compliance && typeof rule.compliance === 'object') {
          meta.compliance = rule.compliance as Record<string, unknown>;
        }
        m.set(rule.id, meta);
      } catch {
        // Skip invalid YAML / unreadable file — don't crash the route.
      }
    }
  }

  await walk(rulesDir);
  return m;
}

export async function getRuleMeta(
  ruleId: string
): Promise<AtrRuleMeta | null> {
  if (cache) return cache.get(ruleId) ?? null;
  if (!loadingPromise) loadingPromise = buildCache();
  cache = await loadingPromise;
  return cache.get(ruleId) ?? null;
}

export async function getRuleCount(): Promise<number> {
  if (!cache) await getRuleMeta('__warmup__');
  return cache?.size ?? 0;
}
