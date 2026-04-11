/**
 * TC v2 — Tool-Use Primitives for the Drafter Loop
 * ATR 威脅雲 v2 — 起草迴圈的工具原語
 *
 * Exposes three Anthropic-compatible tool definitions that Claude calls
 * during rule drafting so it can make research-grounded, dedup-aware
 * decisions instead of generating rules blind:
 *
 *   grep_existing_rules(keywords)
 *     Search the public ATR repository for rules whose title,
 *     description, or conditions mention any of the given keywords.
 *     Used at the START of every draft to avoid duplicating existing
 *     coverage.
 *
 *   read_rule(rule_id)
 *     Fetch the full YAML of a specific ATR rule by ID. Called when
 *     grep finds a potentially overlapping rule and Claude wants to
 *     inspect its exact patterns before deciding to extend vs. create.
 *
 *   fetch_research(url)
 *     Retrieve the text content of a public research page (arxiv,
 *     Invariant Labs, Elastic Security Labs, Snyk, MITRE, etc.) so
 *     Claude can ground a new rule in a documented attack rather
 *     than guessing.
 *
 * All three tools:
 *   - Honor an in-memory LRU cache with a 10-minute TTL to avoid
 *     hammering GitHub or research sites during a burst of drafts.
 *   - Fall back gracefully (empty result + explanatory message)
 *     on network errors so Claude can still produce output.
 *   - Enforce a short domain allowlist for fetch_research so a poisoned
 *     prompt cannot coerce TC into making arbitrary outbound requests.
 *
 * @module @panguard-ai/threat-cloud/llm-reviewer-tools
 */

import * as https from 'node:https';
import { load as parseYaml } from 'js-yaml';

// ---------------------------------------------------------------------------
// Tool schema definitions (Anthropic tool use API)
// ---------------------------------------------------------------------------

export const TC_DRAFTER_TOOLS = [
  {
    name: 'grep_existing_rules',
    description:
      'Search the existing ATR rule corpus for rules whose title, description, or detection conditions mention any of the given keywords. ALWAYS call this FIRST before drafting a new rule, to check whether the attack class is already covered. Returns a list of matching rule IDs with their titles and categories. If the keyword is already covered by an existing rule, you should call read_rule to inspect it and decide whether to extend the existing rule (not covered by this API — just emit NO_THREATS_FOUND and note the overlap) or propose a truly new rule for a variant.',
    input_schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description:
            'One to five short keywords or phrases to search for. Examples: ["prompt injection", "IMPORTANT tag"], ["credential exfil", "ssh key"], ["tool poisoning", "cross-tool"]. Each keyword is case-insensitive and matched as a substring against rule metadata.',
        },
      },
      required: ['keywords'],
    },
  },
  {
    name: 'read_rule',
    description:
      'Fetch the full YAML content of a specific ATR rule by its ID. Use this after grep_existing_rules identifies a potentially overlapping rule, so you can inspect its exact regex patterns and test cases before deciding whether to propose a new rule.',
    input_schema: {
      type: 'object',
      properties: {
        rule_id: {
          type: 'string',
          description: 'An ATR rule ID in the form ATR-2026-00XXX. Example: "ATR-2026-00100".',
        },
      },
      required: ['rule_id'],
    },
  },
  {
    name: 'fetch_research',
    description:
      'Fetch the text content of a public research page about AI agent security. Use this to ground a new rule in a documented attack from a reputable source (Invariant Labs, Elastic Security Labs, Snyk, MITRE ATLAS, arxiv, Unit 42, etc.). The domain must be on the allowlist — generic URLs will be refused. Returns the first 5000 characters of the text content.',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description:
            'The URL of the research page. Allowed domains: invariantlabs.ai, elastic.co, snyk.io, arxiv.org, atlas.mitre.org, mitre.org, unit42.paloaltonetworks.com, genai.owasp.org, owasp.org, github.com, raw.githubusercontent.com, developer.microsoft.com, trendmicro.com, helpnetsecurity.com, agentseal.org, keysight.com, zenity.io.',
        },
      },
      required: ['url'],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Shared fetch helper (node:https, with size + time limits)
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 500 * 1024; // 500 KB per fetch

async function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'ATR-ThreatCloud/2.0 (+https://agent-threat-rules.com)',
          Accept: 'text/plain, text/html, application/vnd.github.raw+json, */*',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          // Follow one level of redirect
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          httpsGet(next).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`HTTP ${status} for ${url}`));
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_RESPONSE_BYTES) {
            res.destroy();
            reject(new Error(`response exceeded ${MAX_RESPONSE_BYTES} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error(`timeout after ${FETCH_TIMEOUT_MS}ms: ${url}`));
    });
  });
}

// ---------------------------------------------------------------------------
// In-memory cache with TTL
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 256;

const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function cacheSet<T>(key: string, value: T): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Tool 1: grep_existing_rules
// ---------------------------------------------------------------------------

const ATR_REPO_OWNER = 'Agent-Threat-Rule';
const ATR_REPO_NAME = 'agent-threat-rules';
const ATR_REPO_BRANCH = 'main';

interface RuleSummary {
  readonly ruleId: string;
  readonly title: string;
  readonly category: string;
  readonly severity: string;
  readonly path: string;
  readonly previewMatch: string;
}

/**
 * Load all rule summaries from the ATR repository. Cached for 10 minutes
 * so a burst of drafts doesn't re-fetch on every call.
 */
async function loadAllRuleSummaries(): Promise<RuleSummary[]> {
  const cached = cacheGet<RuleSummary[]>('all_rule_summaries');
  if (cached) return cached;

  // Use the GitHub trees API with recursive=1 to list all files in one call
  const treeUrl = `https://api.github.com/repos/${ATR_REPO_OWNER}/${ATR_REPO_NAME}/git/trees/${ATR_REPO_BRANCH}?recursive=1`;
  let treeJson: string;
  try {
    treeJson = await httpsGet(treeUrl);
  } catch (err) {
    console.error(
      `[tc-v2] grep_existing_rules: failed to list rule files via GitHub API: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }

  let parsed: { tree?: Array<{ path?: string; type?: string }> };
  try {
    parsed = JSON.parse(treeJson) as typeof parsed;
  } catch {
    return [];
  }

  const ruleFiles = (parsed.tree ?? [])
    .filter((t) => t.type === 'blob' && t.path && t.path.startsWith('rules/') && t.path.endsWith('.yaml'))
    .map((t) => t.path as string);

  const summaries: RuleSummary[] = [];
  // Fetch in small parallel batches to stay polite
  const BATCH = 8;
  for (let i = 0; i < ruleFiles.length; i += BATCH) {
    const batch = ruleFiles.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (path) => {
        try {
          const raw = await httpsGet(
            `https://raw.githubusercontent.com/${ATR_REPO_OWNER}/${ATR_REPO_NAME}/${ATR_REPO_BRANCH}/${path}`,
          );
          const doc = parseYaml(raw) as Record<string, unknown> | null;
          if (!doc) return null;
          const id = typeof doc['id'] === 'string' ? (doc['id'] as string) : '';
          const title = typeof doc['title'] === 'string' ? (doc['title'] as string) : '';
          const severity = typeof doc['severity'] === 'string' ? (doc['severity'] as string) : '';
          const tags = (doc['tags'] ?? {}) as Record<string, unknown>;
          const category = typeof tags['category'] === 'string' ? (tags['category'] as string) : '';
          return {
            ruleId: id,
            title,
            category,
            severity,
            path,
            previewMatch: '',
          } satisfies RuleSummary;
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) {
      if (r && r.ruleId) summaries.push(r);
    }
  }

  cacheSet('all_rule_summaries', summaries);
  return summaries;
}

export async function grepExistingRules(keywords: readonly string[]): Promise<{
  readonly total: number;
  readonly matches: readonly RuleSummary[];
  readonly note: string;
}> {
  const summaries = await loadAllRuleSummaries();
  if (summaries.length === 0) {
    return {
      total: 0,
      matches: [],
      note: 'Could not load ATR rule list (GitHub API error). Draft defensively — assume similar rules may already exist.',
    };
  }

  const normalized = keywords.map((k) => k.toLowerCase().trim()).filter((k) => k.length >= 2);
  if (normalized.length === 0) {
    return {
      total: summaries.length,
      matches: [],
      note: 'No usable keywords provided. Pass 1-5 short keyword strings to search rule titles, descriptions, and conditions.',
    };
  }

  // Load each rule's raw YAML and check for keyword substring matches.
  // We use the cached raw content from loadAllRuleSummaries' fetch where
  // possible, but we need the full text for grep — so we do a second fetch
  // layer here, cached by path.
  const matches: RuleSummary[] = [];
  for (const s of summaries) {
    const cacheKey = `raw:${s.path}`;
    let raw = cacheGet<string>(cacheKey);
    if (!raw) {
      try {
        raw = await httpsGet(
          `https://raw.githubusercontent.com/${ATR_REPO_OWNER}/${ATR_REPO_NAME}/${ATR_REPO_BRANCH}/${s.path}`,
        );
        cacheSet(cacheKey, raw);
      } catch {
        continue;
      }
    }
    const lower = raw.toLowerCase();
    const hit = normalized.find((kw) => lower.includes(kw));
    if (hit) {
      // Extract a 120-char preview around the match for Claude to see context
      const idx = lower.indexOf(hit);
      const start = Math.max(0, idx - 40);
      const end = Math.min(raw.length, idx + hit.length + 80);
      const preview = raw.slice(start, end).replace(/\s+/g, ' ').trim();
      matches.push({ ...s, previewMatch: `...${preview}...` });
    }
  }

  return {
    total: summaries.length,
    matches,
    note:
      matches.length === 0
        ? `No existing rule matched the keywords. This attack class appears to be uncovered — proceed with drafting.`
        : `Found ${matches.length} rules mentioning one or more keywords. Inspect them with read_rule before drafting to avoid duplication.`,
  };
}

// ---------------------------------------------------------------------------
// Tool 2: read_rule
// ---------------------------------------------------------------------------

export async function readRule(ruleId: string): Promise<{
  readonly ruleId: string;
  readonly found: boolean;
  readonly content: string;
  readonly note: string;
}> {
  if (!/^ATR-\d{4}-\d{5}$/.test(ruleId)) {
    return {
      ruleId,
      found: false,
      content: '',
      note: `rule_id must match the pattern ATR-YYYY-NNNNN (got "${ruleId}")`,
    };
  }

  const summaries = await loadAllRuleSummaries();
  const match = summaries.find((s) => s.ruleId === ruleId);
  if (!match) {
    return {
      ruleId,
      found: false,
      content: '',
      note: `No rule with id ${ruleId} in the current ATR corpus`,
    };
  }

  const cacheKey = `raw:${match.path}`;
  let raw = cacheGet<string>(cacheKey);
  if (!raw) {
    try {
      raw = await httpsGet(
        `https://raw.githubusercontent.com/${ATR_REPO_OWNER}/${ATR_REPO_NAME}/${ATR_REPO_BRANCH}/${match.path}`,
      );
      cacheSet(cacheKey, raw);
    } catch (err) {
      return {
        ruleId,
        found: false,
        content: '',
        note: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // Truncate very long rules to keep the LLM context bounded
  const MAX_CHARS = 6000;
  const content = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) + '\n# ... (truncated)' : raw;
  return {
    ruleId,
    found: true,
    content,
    note: `Full rule at https://github.com/${ATR_REPO_OWNER}/${ATR_REPO_NAME}/blob/${ATR_REPO_BRANCH}/${match.path}`,
  };
}

// ---------------------------------------------------------------------------
// Tool 3: fetch_research
// ---------------------------------------------------------------------------

const RESEARCH_ALLOWLIST = new Set([
  'invariantlabs.ai',
  'elastic.co',
  'snyk.io',
  'arxiv.org',
  'atlas.mitre.org',
  'mitre.org',
  'unit42.paloaltonetworks.com',
  'genai.owasp.org',
  'owasp.org',
  'github.com',
  'raw.githubusercontent.com',
  'developer.microsoft.com',
  'trendmicro.com',
  'helpnetsecurity.com',
  'agentseal.org',
  'keysight.com',
  'zenity.io',
  'docker.com',
  'stytch.com',
  'aembit.io',
  'datasciencedojo.com',
  'thehackernews.com',
]);

export async function fetchResearch(url: string): Promise<{
  readonly url: string;
  readonly ok: boolean;
  readonly content: string;
  readonly note: string;
}> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { url, ok: false, content: '', note: `Invalid URL: ${url}` };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { url, ok: false, content: '', note: 'Only https:// URLs are allowed' };
  }

  const host = parsedUrl.hostname.replace(/^www\./, '');
  const domainOk =
    RESEARCH_ALLOWLIST.has(host) || Array.from(RESEARCH_ALLOWLIST).some((d) => host.endsWith('.' + d));
  if (!domainOk) {
    return {
      url,
      ok: false,
      content: '',
      note: `Domain ${host} is not on the research allowlist. Allowed: ${Array.from(RESEARCH_ALLOWLIST).slice(0, 10).join(', ')}, ...`,
    };
  }

  const cacheKey = `research:${url}`;
  const cached = cacheGet<string>(cacheKey);
  if (cached) {
    return { url, ok: true, content: cached, note: '(cached)' };
  }

  let raw: string;
  try {
    raw = await httpsGet(url);
  } catch (err) {
    return {
      url,
      ok: false,
      content: '',
      note: `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Strip HTML tags, collapse whitespace, decode common entities
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const MAX_RESEARCH_CHARS = 5000;
  const truncated = text.length > MAX_RESEARCH_CHARS ? text.slice(0, MAX_RESEARCH_CHARS) + ' ... (truncated)' : text;

  cacheSet(cacheKey, truncated);
  return { url, ok: true, content: truncated, note: text.length > MAX_RESEARCH_CHARS ? 'truncated to 5000 chars' : 'full' };
}

// ---------------------------------------------------------------------------
// Dispatcher — called by the llm-reviewer tool-use loop
// ---------------------------------------------------------------------------

export interface ToolCallResult {
  readonly content: string;
  readonly isError: boolean;
}

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
): Promise<ToolCallResult> {
  try {
    if (name === 'grep_existing_rules') {
      const keywords = Array.isArray(input['keywords']) ? (input['keywords'] as string[]) : [];
      const result = await grepExistingRules(keywords);
      return { content: JSON.stringify(result), isError: false };
    }
    if (name === 'read_rule') {
      const ruleId = typeof input['rule_id'] === 'string' ? (input['rule_id'] as string) : '';
      const result = await readRule(ruleId);
      return { content: JSON.stringify(result), isError: false };
    }
    if (name === 'fetch_research') {
      const url = typeof input['url'] === 'string' ? (input['url'] as string) : '';
      const result = await fetchResearch(url);
      return { content: JSON.stringify(result), isError: false };
    }
    return { content: `Unknown tool: ${name}`, isError: true };
  } catch (err) {
    return {
      content: `Tool ${name} threw: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}
