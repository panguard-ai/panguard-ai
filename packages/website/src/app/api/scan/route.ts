import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

/**
 * POST /api/scan
 *
 * Accepts a GitHub URL, fetches the SKILL.md (or README.md),
 * runs lightweight security checks, and returns a risk report.
 * Results are cached by content hash.
 *
 * Body: { url: string }
 * Returns: { ok, data: { report, cached, contentHash, source, scannedAt } }
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
// Inline Security Checks (mirrors skill-auditor patterns)
// ---------------------------------------------------------------------------

/** Prompt injection patterns */
const INJECTION_PATTERNS: Array<{
  id: string;
  pattern: RegExp;
  title: string;
  severity: Finding['severity'];
}> = [
  {
    id: 'inj-ignore-prev',
    pattern: /ignore\s+(all\s+)?previous\s+instructions/i,
    title: 'Prompt injection: ignore previous instructions',
    severity: 'critical',
  },
  {
    id: 'inj-new-role',
    pattern: /you\s+are\s+now\s+(a|an)\s+\w+/i,
    title: 'Prompt injection: role reassignment',
    severity: 'high',
  },
  {
    id: 'inj-do-not-reveal',
    pattern: /do\s+not\s+(reveal|mention|tell|disclose)/i,
    title: 'Stealth instruction: suppress disclosure',
    severity: 'high',
  },
  {
    id: 'inj-override',
    pattern: /override\s+(system|safety|security)\s+(prompt|instructions|rules)/i,
    title: 'Prompt injection: override system prompt',
    severity: 'critical',
  },
  {
    id: 'inj-jailbreak',
    pattern: /\b(DAN|jailbreak|bypass\s+filter)\b/i,
    title: 'Jailbreak attempt detected',
    severity: 'critical',
  },
  {
    id: 'inj-base64',
    pattern: /(?:eval|exec|Function)\s*\(\s*(?:atob|Buffer\.from)\s*\(/,
    title: 'Encoded payload execution',
    severity: 'critical',
  },
  {
    id: 'inj-hidden-unicode',
    pattern: /[\u200B-\u200F\u2028-\u202F\uFEFF]/,
    title: 'Hidden Unicode characters detected',
    severity: 'high',
  },
  {
    id: 'inj-exfil',
    pattern: /(?:curl|wget|fetch|http)\s+.*(?:env|secret|key|token|password)/i,
    title: 'Data exfiltration pattern',
    severity: 'critical',
  },
  {
    id: 'inj-curl-pipe',
    pattern: /curl\s+.*\|\s*(?:bash|sh|sudo)/,
    title: 'Remote code execution: curl pipe to shell',
    severity: 'critical',
  },
  {
    id: 'inj-never-mention',
    pattern: /never\s+mention\s+(this|these)\s+(instructions|steps)/i,
    title: 'Stealth: hide instructions from user',
    severity: 'high',
  },
];

/** Dangerous tool/permission patterns */
const PERMISSION_PATTERNS: Array<{
  id: string;
  pattern: RegExp;
  title: string;
  severity: Finding['severity'];
}> = [
  {
    id: 'perm-exec',
    pattern: /(?:child_process|execSync|execFile|spawn)\b/,
    title: 'System command execution capability',
    severity: 'medium',
  },
  {
    id: 'perm-fs-write',
    pattern: /(?:writeFile|appendFile|createWriteStream)\b/,
    title: 'Filesystem write access',
    severity: 'low',
  },
  {
    id: 'perm-network',
    pattern: /(?:http\.request|https\.request|net\.connect|fetch\()\b/,
    title: 'Network access capability',
    severity: 'low',
  },
  {
    id: 'perm-env',
    pattern: /process\.env\[/,
    title: 'Environment variable access',
    severity: 'medium',
  },
  {
    id: 'perm-eval',
    pattern: /\beval\s*\(/,
    title: 'Dynamic code evaluation (eval)',
    severity: 'high',
  },
];

/** Secret patterns */
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

function runChecks(
  content: string,
  source: string
): { findings: Finding[]; checks: CheckResult[] } {
  const findings: Finding[] = [];
  const checks: CheckResult[] = [];

  // Check 1: Injection patterns
  let injectionCount = 0;
  for (const p of INJECTION_PATTERNS) {
    if (p.pattern.test(content)) {
      findings.push({
        id: p.id,
        title: p.title,
        description: `Detected in ${source}`,
        severity: p.severity,
        category: 'prompt-injection',
      });
      injectionCount++;
    }
  }
  checks.push({
    status: injectionCount > 0 ? 'fail' : 'pass',
    label:
      injectionCount > 0
        ? `Injection Detection: ${injectionCount} pattern(s) found`
        : 'Injection Detection: clean',
  });

  // Check 2: Permission patterns
  let permCount = 0;
  for (const p of PERMISSION_PATTERNS) {
    if (p.pattern.test(content)) {
      findings.push({
        id: p.id,
        title: p.title,
        description: `Detected in ${source}`,
        severity: p.severity,
        category: 'permission',
      });
      permCount++;
    }
  }
  checks.push({
    status: permCount > 2 ? 'warn' : 'pass',
    label:
      permCount > 0
        ? `Permission Audit: ${permCount} capability(s) found`
        : 'Permission Audit: minimal',
  });

  // Check 3: Secrets
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

  // Check 4: Manifest validation (basic)
  const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(content);
  const hasName = /^name:\s*.+/m.test(content);
  if (source === 'README.md') {
    checks.push({ status: 'info', label: 'Manifest: no SKILL.md found, analyzed README.md' });
  } else if (!hasFrontmatter) {
    checks.push({ status: 'warn', label: 'Manifest: missing YAML frontmatter' });
  } else if (!hasName) {
    checks.push({ status: 'warn', label: 'Manifest: missing name field' });
  } else {
    checks.push({ status: 'pass', label: 'Manifest: valid structure' });
  }

  // Check 5: Content size
  if (content.length > 50_000) {
    findings.push({
      id: 'size-large',
      title: 'Unusually large skill content',
      description: `${(content.length / 1024).toFixed(0)}KB — could contain obfuscated payloads`,
      severity: 'medium',
      category: 'code',
    });
    checks.push({ status: 'warn', label: `Size: ${(content.length / 1024).toFixed(0)}KB (large)` });
  } else {
    checks.push({ status: 'pass', label: `Size: ${(content.length / 1024).toFixed(1)}KB` });
  }

  return { findings, checks };
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

// ---------------------------------------------------------------------------
// Parse SKILL.md name
// ---------------------------------------------------------------------------

function parseSkillName(content: string): string | null {
  const match = content.match(/^---\n[\s\S]*?^name:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
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

  // Fetch content
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

  // Content hash
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

  // Run checks
  const start = Date.now();
  const { findings, checks } = runChecks(skill.content, skill.source);
  const { riskScore, riskLevel } = computeRisk(findings);
  const durationMs = Date.now() - start;

  const report: ScanReport = {
    skillName: parseSkillName(skill.content) ?? `${owner}/${repo}`,
    riskScore,
    riskLevel,
    findings,
    checks,
    durationMs,
  };

  const scannedAt = new Date().toISOString();
  scanCache.set(contentHash, { report, scannedAt });

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
