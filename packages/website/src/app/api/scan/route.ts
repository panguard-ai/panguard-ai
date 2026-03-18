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

function runFullScan(
  content: string,
  source: string
): { findings: Finding[]; checks: CheckResult[]; atrPatternsMatched: number } {
  const findings: Finding[] = [];
  const checks: CheckResult[] = [];
  const matchedRuleIds = new Set<string>();
  const isReadme = source.toLowerCase().includes('readme');

  // Strip code blocks, quotes, inline code — these are documentation, not behavior
  const scanContent = stripMarkdownNoise(content);

  // ── ATR Pattern Detection (61 rules, 450 patterns) ──
  for (const rule of liveATR) {
    for (const compiled of rule.compiled) {
      try {
        if (compiled.regex.test(scanContent)) {
          if (!matchedRuleIds.has(rule.id)) {
            matchedRuleIds.add(rule.id);
            const baseSeverity = (
              ['critical', 'high', 'medium', 'low', 'info'].includes(rule.severity)
                ? rule.severity
                : 'medium'
            ) as Finding['severity'];
            // README matches are downgraded — descriptive text ≠ malicious behavior
            const severity = isReadme ? downgradeSeverity(baseSeverity) : baseSeverity;
            findings.push({
              id: `atr-${rule.id}`,
              title: rule.title,
              description: compiled.desc || `Matched ATR rule ${rule.id}`,
              severity,
              category: rule.category || 'atr',
              location: `ATR Rule: ${rule.id}`,
            });
          }
          break; // One match per rule is enough
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

  return { findings, checks, atrPatternsMatched: matchedRuleIds.size };
}

function computeRisk(findings: Finding[]): {
  riskScore: number;
  riskLevel: ScanReport['riskLevel'];
} {
  const weights: Record<string, number> = { critical: 25, high: 15, medium: 5, low: 1, info: 0 };
  const score = Math.min(
    100,
    findings.reduce((sum, f) => sum + (weights[f.severity] ?? 0), 0)
  );
  const hasCritical = findings.some((f) => f.severity === 'critical');

  let riskLevel: ScanReport['riskLevel'] = 'LOW';
  if (score >= 70 || (hasCritical && score >= 25)) riskLevel = 'CRITICAL';
  else if (score >= 40 || hasCritical) riskLevel = 'HIGH';
  else if (score >= 15) riskLevel = 'MEDIUM';

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

  // Run full scan with ATR rules
  const start = Date.now();
  const { findings, checks, atrPatternsMatched } = runFullScan(skill.content, skill.source);
  const { riskScore, riskLevel } = computeRisk(findings);
  const durationMs = Date.now() - start;

  const skillName = parseSkillName(skill.content) ?? `${owner}/${repo}`;

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
