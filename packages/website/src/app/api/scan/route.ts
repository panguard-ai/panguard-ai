import { NextResponse } from 'next/server';
import {
  scanContent,
  compileRules,
  contentHash as computeContentHash,
} from '@panguard-ai/scan-core';
import type { ATRRuleCompiled, CompiledRule, ScanResult } from '@panguard-ai/scan-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * POST /api/scan
 *
 * Unified skill scanner powered by @panguard-ai/scan-core.
 * Handles GitHub fetch, caching, rate limiting, and Threat Cloud integration.
 * Core scan logic is shared with the CLI Skill Auditor.
 */

// ---------------------------------------------------------------------------
// Types (API-specific)
// ---------------------------------------------------------------------------

interface WebScanReport {
  skillName: string | null;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: ScanResult['findings'];
  checks: ScanResult['checks'];
  durationMs: number;
  atrRulesEvaluated: number;
  atrPatternsMatched: number;
}

// ---------------------------------------------------------------------------
// ATR Rules: bundled fallback + live sync from Threat Cloud
// ---------------------------------------------------------------------------

// Read at runtime to avoid webpack mangling Unicode in CJK regex patterns
const atrJsonPath = resolve(process.cwd(), 'src/lib/atr-rules-compiled.json');
const BUNDLED_ATR: ATRRuleCompiled[] = JSON.parse(readFileSync(atrJsonPath, 'utf-8'));
const TC_ENDPOINT = process.env['NEXT_PUBLIC_THREAT_CLOUD_URL'] || 'https://tc.panguard.ai';
const TC_SYNC_INTERVAL_MS = 15 * 60 * 1000;

let liveATR: CompiledRule[] = compileRules(BUNDLED_ATR);
let lastTCSyncAt = 0;
let tcSyncInProgress = false;

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

    const parsed: ATRRuleCompiled[] = [];
    for (const cr of cloudRules) {
      try {
        const rc = typeof cr.ruleContent === 'string' ? JSON.parse(cr.ruleContent) : cr;
        if (rc.id && rc.detection?.conditions) {
          parsed.push({
            id: rc.id,
            title: rc.title || rc.id,
            severity: rc.severity || 'medium',
            category: rc.tags?.category || 'atr',
            patterns: rc.detection.conditions
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

    // Merge: bundled + cloud (cloud overrides by ID)
    const mergedMap = new Map<string, ATRRuleCompiled>();
    for (const r of BUNDLED_ATR) mergedMap.set(r.id, r);
    for (const r of parsed) mergedMap.set(r.id, r);

    liveATR = compileRules(Array.from(mergedMap.values()));
    lastTCSyncAt = Date.now();
  } catch {
    // TC unreachable - keep using current rules
  } finally {
    tcSyncInProgress = false;
  }
}

function ensureRulesFresh(): void {
  if (Date.now() - lastTCSyncAt > TC_SYNC_INTERVAL_MS) {
    void syncATRFromTC();
  }
}

// ---------------------------------------------------------------------------
// Threat Cloud Whitelist
// ---------------------------------------------------------------------------

let tcWhitelist: Set<string> = new Set();
let tcWhitelistFetchedAt = 0;
const TC_WHITELIST_TTL_MS = 5 * 60 * 1000;

function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\/\.@]/g, '');
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
      skills
        .map((s: { name?: string }) => normalizeSkillName(s.name ?? ''))
        .filter((n: string) => n.length > 0)
    );
    tcWhitelistFetchedAt = Date.now();
  } catch {
    // TC unreachable
  }
}

async function checkTCWhitelist(skillName: string, repoSlug: string): Promise<boolean> {
  if (Date.now() - tcWhitelistFetchedAt > TC_WHITELIST_TTL_MS) {
    await fetchTCWhitelist();
  }
  if (tcWhitelist.size === 0) return false;
  return (
    tcWhitelist.has(normalizeSkillName(skillName)) || tcWhitelist.has(normalizeSkillName(repoSlug))
  );
}

// ---------------------------------------------------------------------------
// Cache + Rate Limit
// ---------------------------------------------------------------------------

const scanCache = new Map<string, { report: WebScanReport; scannedAt: string }>();

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
// Threat Cloud submission (best-effort, non-blocking)
// ---------------------------------------------------------------------------

async function submitToThreatCloud(
  skillName: string,
  cHash: string,
  riskScore: number,
  riskLevel: string,
  findings: ScanResult['findings']
): Promise<void> {
  try {
    await fetch(`${TC_ENDPOINT}/api/skill-threats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skillHash: cHash,
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
    // Best-effort
  }
}

async function submitATRProposal(
  skillName: string,
  riskLevel: string,
  findings: ScanResult['findings'],
  pHash: string
): Promise<void> {
  try {
    const highFindings = findings
      .filter((f) => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 5);
    if (highFindings.length === 0) return;

    const severity = riskLevel === 'CRITICAL' ? 'critical' : 'high';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const findingSummary = highFindings.map((f) => f.title).join('; ');

    const conditions = highFindings
      .map((f, idx) => {
        const keywords = f.title
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 4);
        if (keywords.length === 0) return null;
        const regex = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
        return `    - field: content\n      operator: regex\n      value: "(?i)${regex}"\n      description: "Pattern ${idx + 1}: ${f.title.slice(0, 80)}"`;
      })
      .filter(Boolean);

    if (conditions.length === 0) return;

    const ruleContent = `title: "Web Scan: ${highFindings[0]?.title.slice(0, 60) ?? skillName}"
id: ATR-2026-DRAFT-${pHash.slice(0, 8)}
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
        patternHash: pHash,
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
    // Best-effort
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

  const cHash = computeContentHash(skill.content);

  // Check cache
  const cached = scanCache.get(cHash);
  if (cached) {
    return NextResponse.json({
      ok: true,
      data: {
        report: cached.report,
        cached: true,
        contentHash: cHash,
        source: `${owner}/${repo}/${skill.source}`,
        scannedAt: cached.scannedAt,
      },
    });
  }

  // Sync ATR rules from TC if stale (non-blocking)
  ensureRulesFresh();

  const isReadme = skill.source.toLowerCase().includes('readme');
  const skillName = `${owner}/${repo}`;

  // Check Threat Cloud whitelist
  const whitelisted = await checkTCWhitelist(skillName, `${owner}/${repo}`);
  if (whitelisted) {
    const safeReport: WebScanReport = {
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
    scanCache.set(cHash, { report: safeReport, scannedAt });
    return NextResponse.json({
      ok: true,
      data: {
        report: safeReport,
        cached: false,
        contentHash: cHash,
        source: `${owner}/${repo}/${skill.source}`,
        scannedAt,
        whitelisted: true,
      },
    });
  }

  // --- Run unified scan via scan-core ---
  const result = scanContent(skill.content, {
    sourceType: isReadme ? 'documentation' : 'skill',
    atrRules: liveATR,
    skillName,
  });

  // README files are documentation, not executable agent instructions.
  // Score cap: README sources max out at MEDIUM regardless of pattern matches.
  // This is a product decision: describing "prompt injection" in docs != performing it.
  // Context signals in scan-core already discount READMEs but Next.js minification
  // can alter regex behavior, so we enforce the cap here as defense-in-depth.
  let finalScore = result.riskScore;
  let finalLevel = result.riskLevel;
  if (isReadme && result.riskScore > 25) {
    finalScore = Math.min(result.riskScore, 25);
    finalLevel = 'MEDIUM';
  }

  const report: WebScanReport = {
    skillName: result.skillName ?? skillName,
    riskScore: finalScore,
    riskLevel: finalLevel,
    findings: result.findings,
    checks: result.checks,
    durationMs: result.durationMs,
    atrRulesEvaluated: result.atrRulesEvaluated,
    atrPatternsMatched: result.atrPatternsMatched,
  };

  const scannedAt = new Date().toISOString();
  scanCache.set(cHash, { report, scannedAt });

  // Track usage (non-blocking)
  void fetch(`${TC_ENDPOINT}/api/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'scan',
      source: 'website',
      metadata: { skill: skillName, risk: result.riskLevel, score: result.riskScore },
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});

  // Submit to Threat Cloud (non-blocking)
  // Skip README-based scans — documentation descriptions trigger false positives
  // that would pollute the community threat database.
  if (result.riskScore > 0 && !isReadme) {
    void submitToThreatCloud(
      report.skillName ?? cHash,
      cHash,
      result.riskScore,
      result.riskLevel,
      result.findings
    );
  }

  // Flywheel: submit ATR proposal for HIGH/CRITICAL findings (SKILL.md only)
  if (
    !isReadme &&
    (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') &&
    result.findings.length > 0
  ) {
    void submitATRProposal(
      report.skillName ?? cHash,
      result.riskLevel,
      result.findings,
      result.patternHash
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      report,
      cached: false,
      contentHash: cHash,
      source: `${owner}/${repo}/${skill.source}`,
      scannedAt,
    },
  });
}
