import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import atrRulesData from '@/lib/atr-rules-compiled.json';

/**
 * POST /api/scan
 *
 * Full-featured skill scanner using all 61 ATR rules (450 patterns)
 * + inline injection/permission/secret checks.
 * Results cached by content hash. Submits findings to Threat Cloud.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  location?: string;
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail' | 'info';
  label: string;
}

interface ScanReport {
  skillName: string | null;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: Finding[];
  checks: CheckResult[];
  durationMs: number;
  atrRulesEvaluated: number;
  atrPatternsMatched: number;
}

interface ATRRuleCompiled {
  id: string;
  title: string;
  severity: string;
  category: string;
  patterns: Array<{ field: string; pattern: string; desc: string }>;
}

// ---------------------------------------------------------------------------
// ATR Rules: bundled fallback + live sync from Threat Cloud
// ---------------------------------------------------------------------------

const BUNDLED_ATR = atrRulesData as ATRRuleCompiled[];
const TC_ENDPOINT = process.env['NEXT_PUBLIC_THREAT_CLOUD_URL'] || 'https://tc.panguard.ai';
const TC_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface CompiledRule extends ATRRuleCompiled {
  compiled: Array<{ regex: RegExp; desc: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const isSafeRegex = require('safe-regex') as (re: string | RegExp) => boolean;

function compileRules(rules: ATRRuleCompiled[]): CompiledRule[] {
  return rules.map((rule) => ({
    ...rule,
    compiled: rule.patterns
      .map((p) => {
        try {
          // Strip (?i) inline flag (unsupported in JS) and use 'i' flag instead
          const hasInlineIgnoreCase = /\(\?i\)/.test(p.pattern);
          const cleaned = hasInlineIgnoreCase ? p.pattern.replace(/\(\?i\)/g, '') : p.pattern;
          const flags = hasInlineIgnoreCase ? 'i' : '';
          const regex = new RegExp(cleaned, flags);
          // Reject ReDoS-vulnerable patterns (catastrophic backtracking)
          if (!isSafeRegex(regex)) return null;
          return { regex, desc: p.desc };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ regex: RegExp; desc: string }>,
  }));
}

// Live rule state — starts with bundled, refreshed from TC
let liveATR: CompiledRule[] = compileRules(BUNDLED_ATR);
let lastTCSyncAt = 0;
let tcSyncInProgress = false;

/** Fetch latest ATR rules from Threat Cloud and merge with bundled */
async function syncATRFromTC(): Promise<void> {
  if (tcSyncInProgress) return;
  tcSyncInProgress = true;
  try {
    const res = await fetch(`${TC_ENDPOINT}/api/atr-rules`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return;

    const raw = await res.json();
    const cloudRules = Array.isArray(raw) ? raw : (raw?.data ?? []);

    if (cloudRules.length === 0) return;

    // Parse cloud rules into ATRRuleCompiled format
    const parsed: ATRRuleCompiled[] = [];
    for (const cr of cloudRules) {
      try {
        const ruleContent = typeof cr.ruleContent === 'string' ? JSON.parse(cr.ruleContent) : cr;
        if (ruleContent.id && ruleContent.detection?.conditions) {
          parsed.push({
            id: ruleContent.id,
            title: ruleContent.title || ruleContent.id,
            severity: ruleContent.severity || 'medium',
            category: ruleContent.tags?.category || 'atr',
            patterns: ruleContent.detection.conditions
              .filter((c: Record<string, unknown>) => c.operator === 'regex' && c.value)
              .map((c: Record<string, unknown>) => ({
                field: c.field || 'user_input',
                pattern: c.value as string,
                desc: (c.description as string) || '',
              })),
          });
        }
      } catch {
        // Skip unparseable cloud rules
      }
    }

    // Merge: bundled + cloud (cloud rules override by ID)
    const mergedMap = new Map<string, ATRRuleCompiled>();
    for (const r of BUNDLED_ATR) mergedMap.set(r.id, r);
    for (const r of parsed) mergedMap.set(r.id, r);

    liveATR = compileRules(Array.from(mergedMap.values()));
    lastTCSyncAt = Date.now();
  } catch {
    // TC unreachable — keep using current rules
  } finally {
    tcSyncInProgress = false;
  }
}

/** Ensure rules are fresh (non-blocking sync if stale) */
function ensureRulesFresh(): void {
  if (Date.now() - lastTCSyncAt > TC_SYNC_INTERVAL_MS) {
    void syncATRFromTC();
  }
}

// ---------------------------------------------------------------------------
// Threat Cloud Whitelist
// ---------------------------------------------------------------------------

/** Cached whitelist from Threat Cloud */
let tcWhitelist: Set<string> = new Set();
let tcWhitelistFetchedAt = 0;
const TC_WHITELIST_TTL_MS = 5 * 60 * 1000; // 5 minutes

function normalizeSkillName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-\/\.@]/g, '');
}

async function fetchTCWhitelist(): Promise<void> {
  try {
    const res = await fetch(`${TC_ENDPOINT}/api/skill-whitelist`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const skills = Array.isArray(data) ? data : (data?.data ?? []);
    tcWhitelist = new Set(
      skills.map((s: { name?: string }) => normalizeSkillName(s.name ?? ''))
        .filter((n: string) => n.length > 0)
    );
    tcWhitelistFetchedAt = Date.now();
  } catch {
    // TC unreachable — keep using current whitelist (or empty)
  }
}

/**
 * Check if a skill is on the Threat Cloud community whitelist.
 * Matches against both the skill name from frontmatter and the owner/repo slug.
 */
async function checkTCWhitelist(skillName: string, repoSlug: string): Promise<boolean> {
  // Refresh whitelist if stale
  if (Date.now() - tcWhitelistFetchedAt > TC_WHITELIST_TTL_MS) {
    await fetchTCWhitelist();
  }
  if (tcWhitelist.size === 0) return false;

  return (
    tcWhitelist.has(normalizeSkillName(skillName)) ||
    tcWhitelist.has(normalizeSkillName(repoSlug))
  );
}

// ---------------------------------------------------------------------------
// Cache + Rate Limit
// ---------------------------------------------------------------------------

const scanCache = new Map<string, { report: ScanReport; scannedAt: string }>();

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// GitHub URL Parser
// ---------------------------------------------------------------------------

function parseGitHubUrl(
  url: string
): { owner: string; repo: string; branch: string; path: string } | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!u.hostname.includes('github.com')) return null;

    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    let branch = 'main';
    let path = '';

    if (parts.length > 3 && (parts[2] === 'tree' || parts[2] === 'blob')) {
      branch = parts[3];
      path = parts.slice(4).join('/');
    }

    return { owner, repo, branch, path };
  } catch {
    return null;
  }
}

async function fetchGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchSkillContent(
  owner: string,
  repo: string,
  branch: string,
  basePath: string
): Promise<{ content: string; source: string } | null> {
  const candidates = basePath
    ? [`${basePath}/SKILL.md`, `${basePath}/skill.md`, 'SKILL.md']
    : ['SKILL.md', 'skill.md', 'src/SKILL.md'];

  for (const candidate of candidates) {
    const content = await fetchGitHubFile(owner, repo, branch, candidate);
    if (content) return { content, source: candidate };
  }

  const readme = await fetchGitHubFile(owner, repo, branch, 'README.md');
  if (readme) return { content: readme, source: 'README.md' };

  return null;
}

// ---------------------------------------------------------------------------
// Additional inline checks (secrets, permissions)
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: Array<{ id: string; pattern: RegExp; title: string }> = [
  { id: 'secret-aws', pattern: /AKIA[0-9A-Z]{16}/, title: 'AWS Access Key exposed' },
  { id: 'secret-github', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/, title: 'GitHub token exposed' },
  { id: 'secret-sk', pattern: /sk-[A-Za-z0-9]{20,}/, title: 'API secret key exposed' },
  {
    id: 'secret-private-key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
    title: 'Private key exposed',
  },
];

// ---------------------------------------------------------------------------
// Full scan engine
// ---------------------------------------------------------------------------

/**
 * Strip markdown code blocks, inline code, and blockquotes from content.
 * These contain examples/documentation that should NOT trigger ATR rules.
 */
function stripMarkdownNoise(raw: string): string {
  let cleaned = raw;
  // Remove fenced code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  // Remove indented code blocks (4 spaces or 1 tab)
  cleaned = cleaned.replace(/^(?:    |\t).+$/gm, ' ');
  // Remove inline code (`...`)
  cleaned = cleaned.replace(/`[^`]+`/g, ' ');
  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s?.+$/gm, ' ');
  // Remove markdown link URLs (keep link text)
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  return cleaned;
}

/**
 * Downgrade severity for README-based matches.
 * README text is documentation, not behavior — pattern matches are low confidence.
 * critical → medium, high → low, medium → low, low → info
 */
function downgradeSeverity(severity: string): Finding['severity'] {
  const map: Record<string, Finding['severity']> = {
    critical: 'medium',
    high: 'low',
    medium: 'low',
    low: 'info',
    info: 'info',
  };
  return map[severity] ?? 'info';
}

/**
 * Known-safe install URLs — legitimate package manager install scripts.
 * curl|bash for these URLs is standard practice, not an attack.
 */
const SAFE_INSTALL_URLS = [
  'bun.sh/install', 'get.docker.com', 'install.python-poetry.org',
  'raw.githubusercontent.com/nvm-sh/nvm', 'sh.rustup.rs', 'deno.land/install',
  'get.pnpm.io/install', 'brew.sh', 'ohmyz.sh/install',
  'raw.githubusercontent.com/Homebrew', 'sdk.cloud.google.com', 'cli.github.com',
  'astral.sh/uv',
];

/**
 * Check if content contains curl|bash ONLY targeting known-safe install URLs.
 * Returns true if ALL curl|bash instances in the content are safe.
 */
function allCurlBashAreSafe(content: string): boolean {
  const curlBashRe = /\b(curl|wget)\s+[^\n|]*\|\s*(sudo\s+)?(bash|sh|zsh|python|node|perl)/gi;
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = curlBashRe.exec(content)) !== null) {
    found = true;
    // Only look at the matched line itself (not surrounding context from other lines)
    const matchedText = match[0].toLowerCase();
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index + match[0].length);
    const line = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd).toLowerCase();
    const isSafe = SAFE_INSTALL_URLS.some(url => line.includes(url.toLowerCase()));
    if (!isSafe) return false;
  }
  return found;
}

/**
 * Check if a specific ATR rule match is a known-safe install pattern.
 * Looks at the original (pre-stripped) content around the match area.
 */
function isRuleSafeInstall(ruleId: string, ruleDesc: string, originalContent: string): boolean {
  // Only apply to rules that detect curl|bash, download-execute, or RCE patterns
  const curlBashRuleKeywords = ['curl', 'wget', 'download', 'pipe', 'bash', 'remote code'];
  const descLower = ruleDesc.toLowerCase();
  if (!curlBashRuleKeywords.some(kw => descLower.includes(kw))) return false;
  return allCurlBashAreSafe(originalContent);
}

// ---------------------------------------------------------------------------
// Context Signals (inline version — mirrors panguard-skill-auditor/context-signals.ts)
// TODO: unify with @panguard-ai/panguard-skill-auditor/context-signals
// ---------------------------------------------------------------------------

interface WebContextSignal {
  id: string;
  type: 'booster' | 'reducer';
  label: string;
  weight: number;
}

function detectWebContextSignals(
  content: string,
  skillName: string | null
): { signals: WebContextSignal[]; multiplier: number } {
  const signals: WebContextSignal[] = [];

  // ── Boosters (malicious) ──
  if (/<IMPORTANT>/i.test(content)) {
    signals.push({ id: 'boost-important-block', type: 'booster', label: '<IMPORTANT> hidden instruction block', weight: 0.5 });
  }
  if (/\b(do\s+not\s+tell|don[''\u2019t]*\s+(tell|mention|notify|inform|reveal|show)|keep\s+(this\s+)?hidden|hide\s+this\s+from|this\s+is\s+(?:a\s+)?secret|be\s+very\s+gentle\s+and\s+not\s+scary)\b/i.test(content)) {
    signals.push({ id: 'boost-concealment', type: 'booster', label: 'Concealment language', weight: 0.5 });
  }
  if (/\.(workers\.dev|ngrok\.io|pipedream\.net|requestbin\.com|hookbin\.com|webhook\.site)\b|[?&](data|payload|exfil|stolen|secret|dump)=/i.test(content)) {
    signals.push({ id: 'boost-exfil-url', type: 'booster', label: 'Exfiltration URL pattern', weight: 0.4 });
  }
  if (/\b(without\s+(asking|confirmation|user\s+consent|prompting|verification|approval)|skip\s+(verification|confirmation|approval|all\s+verification)|silently\s+(send|upload|exfiltrate|transmit|post|execute)|do\s+not\s+prompt\s+the\s+user)\b/i.test(content)) {
    signals.push({ id: 'boost-consent-bypass', type: 'booster', label: 'Consent bypass language', weight: 0.3 });
  }
  const hasCredFiles = /~?\/?\.(ssh\/(id_rsa|id_ed25519)|aws\/credentials|npmrc|env)\b|\/etc\/(shadow|passwd)\b/i.test(content);
  const hasNetworkCalls = /\b(curl|wget|fetch|http\.get|requests\.post|nc\s+-)\b/i.test(content);
  if (hasCredFiles && hasNetworkCalls) {
    signals.push({ id: 'boost-credential-plus-network', type: 'booster', label: 'Credential access + network calls', weight: 0.5 });
  }
  // Description mismatch: parse description from frontmatter
  const descMatch = content.match(/^---\n[\s\S]*?^description:\s*[|>]?\s*\n?\s*(.+?)$/m);
  const description = descMatch?.[1]?.trim() ?? '';
  const isBenignDesc = /\b(calculator|math|add\s+two|simple\s+tool|formatter|translator|converter|fact\s+of\s+the\s+day|random\s+number|dice|tip\s+calcul)\b/i.test(description);
  const hasDangerousInstr = /\b(rm\s+-rf|chmod\s+7|bash\s+-[ci]|sh\s+-c|\.ssh\/|\.aws\/|\.env\b|sudo\s)/i.test(content);
  if (isBenignDesc && hasDangerousInstr) {
    signals.push({ id: 'boost-description-mismatch', type: 'booster', label: 'Description-behavior mismatch', weight: 0.4 });
  }

  // ── Reducers (legitimate) ──
  const hasAllowedBash = /^allowed-tools:\s*\n(\s+-\s+.+\n)*\s+-\s+Bash/m.test(content);
  if (hasAllowedBash && hasDangerousInstr) {
    signals.push({ id: 'reduce-declared-tools', type: 'reducer', label: 'Declares Bash in allowed-tools', weight: -0.3 });
  }
  const isDevTool = /\b(shell|cli|terminal|command[\s-]line|devops|qa\s+test|build\s+tool|development|debugging|headless\s+browser|automation|deploy|code\s+review|lint|testing|docker|ci[\s/]cd)\b/i.test(description);
  if (isDevTool && hasDangerousInstr) {
    signals.push({ id: 'reduce-description-consistency', type: 'reducer', label: 'Dev tool description matches behavior', weight: -0.2 });
  }
  const hasFrontmatter = /^---\n[\s\S]*?^name:\s*.+/m.test(content);
  const hasVersion = /^version:\s*.+/m.test(content);
  if (hasFrontmatter && hasVersion) {
    signals.push({ id: 'reduce-structured-frontmatter', type: 'reducer', label: 'Well-structured frontmatter', weight: -0.1 });
  }

  let multiplier = 1.0;
  for (const s of signals) multiplier += s.weight;
  multiplier = Math.max(0.3, Math.min(2.5, multiplier));

  return { signals, multiplier };
}

function runFullScan(
  content: string,
  source: string
): { findings: Finding[]; checks: CheckResult[]; atrPatternsMatched: number; contextMultiplier: number } {
  const findings: Finding[] = [];
  const checks: CheckResult[] = [];
  const matchedRuleIds = new Set<string>();
  const isReadme = source.toLowerCase().includes('readme');

  // ── ATR Pattern Detection (61 rules, 474 patterns) ──
  // Two-pass scan:
  //   Pass 1: Raw content — catches attacks hidden in HTML, code blocks, comments
  //   Pass 2: Stripped content — catches attacks in prose (with README downgrade)
  // A rule that matches in raw-only (stripped removed it) = likely hidden payload = KEEP full severity
  // A rule that matches in stripped = visible text = apply README downgrade if applicable

  const strippedContent = stripMarkdownNoise(content);

  for (const rule of liveATR) {
    if (matchedRuleIds.has(rule.id)) continue;

    for (const compiled of rule.compiled) {
      try {
        const matchesRaw = compiled.regex.test(content);
        // Reset regex lastIndex for stateful regexes
        compiled.regex.lastIndex = 0;
        const matchesStripped = compiled.regex.test(strippedContent);
        compiled.regex.lastIndex = 0;

        if (matchesRaw) {
          matchedRuleIds.add(rule.id);
          const baseSeverity = (
            ['critical', 'high', 'medium', 'low', 'info'].includes(rule.severity)
              ? rule.severity
              : 'medium'
          ) as Finding['severity'];

          let severity = baseSeverity;
          const desc = compiled.desc || '';

          // Only matched in raw (stripped removed it) = hidden in HTML/code = FULL severity
          // Matched in stripped too = visible text = apply context downgrades
          if (matchesStripped) {
            if (isReadme) severity = downgradeSeverity(severity);
            if (isRuleSafeInstall(rule.id, `${rule.title} ${desc}`, content)) {
              severity = 'low';
            }
          }
          // If only raw matched: keep full severity (attack is HIDING in markup)

          const safeInstall = isRuleSafeInstall(rule.id, `${rule.title} ${desc}`, content);

          findings.push({
            id: `atr-${rule.id}`,
            title: safeInstall
              ? `${rule.title} (known-safe install script)`
              : !matchesStripped && matchesRaw
                ? `${rule.title} (hidden in markup)`
                : rule.title,
            description: compiled.desc || `Matched ATR rule ${rule.id}`,
            severity,
            category: rule.category || 'atr',
            location: `ATR Rule: ${rule.id}`,
          });
          break;
        }
      } catch {
        // Skip invalid regex
      }
    }
  }

  checks.push({
    status: matchedRuleIds.size > 0 ? 'fail' : 'pass',
    label:
      matchedRuleIds.size > 0
        ? `ATR Detection: ${matchedRuleIds.size} rule(s) triggered (${liveATR.length} evaluated)`
        : `ATR Detection: clean (${liveATR.length} rules evaluated)`,
  });

  // ── Secret Detection ──
  let secretCount = 0;
  for (const p of SECRET_PATTERNS) {
    if (p.pattern.test(content)) {
      findings.push({
        id: p.id,
        title: p.title,
        description: 'Hardcoded secret found in content',
        severity: 'critical',
        category: 'secrets',
      });
      secretCount++;
    }
  }
  checks.push({
    status: secretCount > 0 ? 'fail' : 'pass',
    label: secretCount > 0 ? `Secrets: ${secretCount} exposed` : 'Secrets: none found',
  });

  // ── Manifest Validation ──
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  const hasName = /^name:\s*.+/m.test(content);
  if (source === 'README.md') {
    checks.push({ status: 'info', label: 'Manifest: no SKILL.md found, analyzed README.md' });
  } else if (!hasFrontmatter || !hasName) {
    checks.push({ status: 'warn', label: 'Manifest: incomplete structure' });
  } else {
    checks.push({ status: 'pass', label: 'Manifest: valid' });
  }

  // ── Content Size ──
  checks.push({
    status: content.length > 50_000 ? 'warn' : 'pass',
    label: `Size: ${(content.length / 1024).toFixed(1)}KB`,
  });

  // ── Context Signals ──
  const skillName = parseSkillName(content);
  const ctx = detectWebContextSignals(content, skillName);
  if (ctx.signals.length > 0) {
    const boosterCount = ctx.signals.filter(s => s.type === 'booster').length;
    const reducerCount = ctx.signals.filter(s => s.type === 'reducer').length;
    checks.push({
      status: boosterCount > 0 ? 'warn' : 'pass',
      label: `Context: ${boosterCount} risk booster(s), ${reducerCount} reducer(s), multiplier ${ctx.multiplier.toFixed(2)}x`,
    });
  }

  return { findings, checks, atrPatternsMatched: matchedRuleIds.size, contextMultiplier: ctx.multiplier };
}

function computeRisk(findings: Finding[], contextMultiplier: number = 1.0): {
  riskScore: number;
  riskLevel: ScanReport['riskLevel'];
} {
  const weights: Record<string, number> = { critical: 25, high: 15, medium: 5, low: 1, info: 0 };
  const rawScore = findings.reduce((sum, f) => sum + (weights[f.severity] ?? 0), 0);
  const score = Math.min(100, Math.round(rawScore * contextMultiplier));
  const hasCritical = findings.some((f) => f.severity === 'critical');
  const weakenedOverride = contextMultiplier < 0.6;

  let riskLevel: ScanReport['riskLevel'] = 'LOW';
  if (score >= 70 || (hasCritical && !weakenedOverride && score >= 25)) riskLevel = 'CRITICAL';
  else if (score >= 40 || (hasCritical && !weakenedOverride)) riskLevel = 'HIGH';
  else if (score >= 15 || (hasCritical && weakenedOverride)) riskLevel = 'MEDIUM';

  return { riskScore: score, riskLevel };
}

function parseSkillName(content: string): string | null {
  const match = content.match(/^---\n[\s\S]*?^name:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// Threat Cloud submission (best-effort, non-blocking)
// ---------------------------------------------------------------------------

async function submitToThreatCloud(
  skillName: string,
  contentHash: string,
  riskScore: number,
  riskLevel: string,
  findings: Finding[]
): Promise<void> {
  try {
    await fetch(`${TC_ENDPOINT}/api/skill-threats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillHash: contentHash,
        skillName,
        riskScore,
        riskLevel,
        findingSummaries: findings.slice(0, 10).map((f) => ({
          id: f.id,
          category: f.category,
          severity: f.severity,
          title: f.title,
        })),
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Best-effort — never block the scan response
  }
}

/**
 * Flywheel bridge: submit ATR proposal from web scan findings.
 * HIGH/CRITICAL skills get a rule proposal submitted directly to TC.
 */
async function submitATRProposal(
  skillName: string,
  riskLevel: string,
  findings: Finding[]
): Promise<void> {
  try {
    const highFindings = findings
      .filter((f) => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5);
    if (highFindings.length === 0) return;

    const findingSummary = highFindings.map((f) => f.title).join('; ');
    const patternHash = createHash('sha256')
      .update(`web-scan:${skillName}:${findingSummary}`)
      .digest('hex')
      .slice(0, 16);

    const severity = riskLevel === 'CRITICAL' ? 'critical' : 'high';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');

    // Build detection conditions from finding titles
    const conditions = highFindings
      .map((f, idx) => {
        const keywords = f.title
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 4);
        if (keywords.length === 0) return null;
        const regex = keywords
          .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*');
        return `    - field: content\n      operator: regex\n      value: "(?i)${regex}"\n      description: "Pattern ${idx + 1}: ${f.title.slice(0, 80)}"`;
      })
      .filter(Boolean);

    if (conditions.length === 0) return;

    const ruleContent = `title: "Web Scan: ${highFindings[0]?.title.slice(0, 60) ?? skillName}"
id: ATR-2026-DRAFT-${patternHash.slice(0, 8)}
status: draft
description: |
  Auto-generated from web scan of "${skillName}".
  Findings: ${findingSummary.slice(0, 200)}
author: "PanGuard Web Scanner"
date: "${date}"
schema_version: "0.1"
detection_tier: pattern
maturity: experimental
severity: ${severity}
tags:
  category: skill-compromise
  subcategory: web-scan
  confidence: medium
detection:
  conditions:
${conditions.join('\n')}
  condition: any
response:
  actions: [alert, snapshot]`;

    await fetch(`${TC_ENDPOINT}/api/atr-proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patternHash,
        ruleContent,
        llmProvider: 'web-scanner',
        llmModel: 'pattern-extraction',
        selfReviewVerdict: JSON.stringify({
          approved: true,
          source: 'web-scanner',
          skillName,
          riskLevel,
          findingCount: highFindings.length,
        }),
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Best-effort — never block the scan response
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded. Try again in 1 minute.' },
      { status: 429 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl || rawUrl.length > 500) {
    return NextResponse.json(
      { ok: false, error: 'Please provide a valid GitHub URL' },
      { status: 400 }
    );
  }

  const parsed = parseGitHubUrl(rawUrl);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: 'Only GitHub URLs are supported (e.g. github.com/owner/repo)' },
      { status: 400 }
    );
  }

  const { owner, repo, branch, path: basePath } = parsed;

  const skill = await fetchSkillContent(owner, repo, branch, basePath);
  if (!skill) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not find SKILL.md in ${owner}/${repo}. Make sure the repository is public.`,
      },
      { status: 404 }
    );
  }

  const contentHash = createHash('sha256').update(skill.content).digest('hex').slice(0, 16);

  // Check cache
  const cached = scanCache.get(contentHash);
  if (cached) {
    return NextResponse.json({
      ok: true,
      data: {
        report: cached.report,
        cached: true,
        contentHash,
        source: `${owner}/${repo}/${skill.source}`,
        scannedAt: cached.scannedAt,
      },
    });
  }

  // Sync ATR rules from TC if stale (non-blocking)
  ensureRulesFresh();

  const skillName = parseSkillName(skill.content) ?? `${owner}/${repo}`;

  // Check Threat Cloud whitelist — skip heavy scan for community-verified safe skills
  const whitelisted = await checkTCWhitelist(skillName, `${owner}/${repo}`);
  if (whitelisted) {
    const safeReport: ScanReport = {
      skillName,
      riskScore: 0,
      riskLevel: 'LOW',
      findings: [],
      checks: [{ status: 'pass', label: 'Community-verified safe skill (Threat Cloud whitelist)' }],
      durationMs: 0,
      atrRulesEvaluated: liveATR.length,
      atrPatternsMatched: 0,
    };
    const scannedAt = new Date().toISOString();
    scanCache.set(contentHash, { report: safeReport, scannedAt });
    return NextResponse.json({
      ok: true,
      data: { report: safeReport, cached: false, contentHash, source: `${owner}/${repo}/${skill.source}`, scannedAt, whitelisted: true },
    });
  }

  // Run full scan with ATR rules
  const start = Date.now();
  const { findings, checks, atrPatternsMatched, contextMultiplier } = runFullScan(skill.content, skill.source);
  const { riskScore, riskLevel } = computeRisk(findings, contextMultiplier);
  const durationMs = Date.now() - start;

  const report: ScanReport = {
    skillName,
    riskScore,
    riskLevel,
    findings,
    checks,
    durationMs,
    atrRulesEvaluated: liveATR.length,
    atrPatternsMatched,
  };

  const scannedAt = new Date().toISOString();
  scanCache.set(contentHash, { report, scannedAt });

  // Submit to Threat Cloud (non-blocking)
  if (riskScore > 0) {
    void submitToThreatCloud(skillName, contentHash, riskScore, riskLevel, findings);
  }

  // Flywheel: submit ATR proposal for HIGH/CRITICAL findings from web scans
  if ((riskLevel === 'HIGH' || riskLevel === 'CRITICAL') && findings.length > 0) {
    void submitATRProposal(skillName ?? contentHash, riskLevel, findings);
  }

  return NextResponse.json({
    ok: true,
    data: {
      report,
      cached: false,
      contentHash,
      source: `${owner}/${repo}/${skill.source}`,
      scannedAt,
    },
  });
}
