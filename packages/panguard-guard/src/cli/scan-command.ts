/**
 * `panguard-guard scan` — Zero-install MCP skill security audit
 *
 * Detects all MCP platforms, finds installed skills, audits each one.
 * No daemon, no config, no Threat Cloud connection required.
 *
 * Usage:
 *   npx panguard-guard scan              # terminal output
 *   npx panguard-guard scan --json       # JSON output (for CI)
 *   npx panguard-guard scan --explain    # include source code context
 *   npx panguard-guard scan --deep       # include AI analysis (slower)
 *   npx panguard-guard scan --verbose    # debug output
 *
 * Exit codes: 0 = clean, 1 = findings (HIGH/CRITICAL), 2 = error
 *
 * @module @panguard-ai/panguard-guard/cli/scan-command
 */

import { c, symbols, divider, banner, setLogLevel } from '@panguard-ai/core';
import type {
  ScanReport,
  ScanSkillResult,
  ScanFinding,
} from './scan-types.js';
import { SCAN_EXIT_CODES } from './scan-types.js';

// ---------------------------------------------------------------------------
// Dynamic imports (avoid build-time circular deps)
// ---------------------------------------------------------------------------

interface MCPServerEntry {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly platformId: string;
}

interface McpConfigModule {
  detectPlatforms: () => Promise<Array<{ id: string; detected: boolean }>>;
  getConfigPath: (id: string) => string;
  parseMCPServers: (configPath: string, platformId: string) => readonly MCPServerEntry[];
  resolveSkillDir: (entry: MCPServerEntry) => string | null;
}

interface AuditReport {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: Array<{ id: string; title: string; description: string; severity: string; category: string; location?: string }>;
  durationMs: number;
}

interface AuditModule {
  auditSkill: (
    dir: string,
    opts?: { skipAI?: boolean }
  ) => Promise<AuditReport>;
}

async function loadMcpConfig(): Promise<McpConfigModule> {
  return (await import('@panguard-ai/panguard-mcp/config' as string)) as unknown as McpConfigModule;
}

async function loadAuditor(): Promise<AuditModule> {
  return (await import('@panguard-ai/panguard-skill-auditor' as string)) as unknown as AuditModule;
}

// ---------------------------------------------------------------------------
// Scan command
// ---------------------------------------------------------------------------

export async function commandScan(args: string[]): Promise<void> {
  const jsonOutput = args.includes('--json');
  const explain = args.includes('--explain');
  const deep = args.includes('--deep');
  const verbose = args.includes('--verbose');
  const startTime = Date.now();

  // Suppress library log noise unless verbose
  if (!verbose) {
    setLogLevel('error');
  }

  if (!jsonOutput) {
    console.log(banner());
    console.log('');
    console.log(`  ${c.sage('MCP Skill Security Scan')}`);
    console.log(`  ${c.dim(divider())}`);
    console.log('');
  }

  // Step 1: Detect platforms
  let mcpConfig: McpConfigModule;
  try {
    mcpConfig = await loadMcpConfig();
  } catch (err) {
    if (jsonOutput) {
      printJsonError('Failed to load platform detection module', startTime);
    } else {
      console.error(`  ${symbols.fail} Failed to load platform detection: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(SCAN_EXIT_CODES.ERROR);
  }

  let allPlatforms: Array<{ id: string; detected: boolean }>;
  try {
    allPlatforms = await mcpConfig.detectPlatforms();
  } catch (err) {
    if (jsonOutput) {
      printJsonError('Platform detection failed', startTime);
    } else {
      console.error(`  ${symbols.fail} Platform detection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(SCAN_EXIT_CODES.ERROR);
  }
  const platforms = allPlatforms.filter((p) => p.detected);

  if (platforms.length === 0) {
    if (jsonOutput) {
      printJsonReport({ platforms: [], skills: [], startTime });
    } else {
      console.log(`  ${symbols.info} No MCP platforms detected on this machine.`);
      console.log(`  ${c.dim('Supported: Claude Desktop, Cursor, Windsurf, Cline, Zed')}`);
    }
    process.exit(SCAN_EXIT_CODES.CLEAN);
  }

  if (!jsonOutput) {
    console.log(`  ${symbols.pass} Platforms detected: ${platforms.map((p) => c.sage(p.id)).join(', ')}`);
    console.log('');
  }

  // Step 2: Discover skills across all platforms
  const allSkills: Array<{ entry: MCPServerEntry; platformId: string }> = [];

  for (const platform of platforms) {
    try {
      const configPath = mcpConfig.getConfigPath(platform.id);
      const servers = mcpConfig.parseMCPServers(configPath, platform.id);
      for (const server of servers) {
        // Skip panguard itself
        if (server.name === 'panguard') continue;
        if (server.args.some((a: string) => a.includes('panguard'))) continue;
        allSkills.push({ entry: server, platformId: platform.id });
      }
    } catch (err) {
      if (verbose && !jsonOutput) {
        console.log(`  ${symbols.warn} Failed to parse ${platform.id} config: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (allSkills.length === 0) {
    if (jsonOutput) {
      printJsonReport({ platforms: platforms.map((p) => p.id), skills: [], startTime });
    } else {
      console.log(`  ${symbols.pass} No MCP skills installed. Your setup is clean.`);
    }
    process.exit(SCAN_EXIT_CODES.CLEAN);
  }

  if (!jsonOutput) {
    console.log(`  ${symbols.info} Found ${c.bold(String(allSkills.length))} MCP skill(s). Scanning...`);
    console.log('');
  }

  // Step 3: Audit each skill (tiered: fast regex+ATR first)
  let auditor: AuditModule;
  try {
    auditor = await loadAuditor();
  } catch (err) {
    if (jsonOutput) {
      printJsonError('Failed to load skill auditor', startTime);
    } else {
      console.error(`  ${symbols.fail} Failed to load skill auditor: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(SCAN_EXIT_CODES.ERROR);
  }

  const results: ScanSkillResult[] = [];

  for (const { entry, platformId } of allSkills) {
    const skillDir = mcpConfig.resolveSkillDir(entry);

    if (!skillDir) {
      results.push({
        name: entry.name,
        platform: platformId,
        riskScore: 0,
        riskLevel: 'LOW',
        findings: [],
        status: 'skipped',
        skipReason: 'Could not resolve skill directory',
      });
      if (verbose && !jsonOutput) {
        console.log(`  ${symbols.warn} ${c.dim(entry.name)} — skipped (dir not found)`);
      }
      continue;
    }

    try {
      const report = await auditor.auditSkill(skillDir, { skipAI: !deep });

      const findings: ScanFinding[] = report.findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity as ScanFinding['severity'],
        category: f.category,
        location: f.location,
        ...(explain ? { explain: { reason: f.description } } : {}),
      }));

      results.push({
        name: entry.name,
        platform: platformId,
        riskScore: report.riskScore,
        riskLevel: report.riskLevel,
        findings,
        status: 'audited',
      });

      // Terminal progress
      if (!jsonOutput) {
        const icon = report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH'
          ? symbols.fail
          : report.riskLevel === 'MEDIUM'
            ? symbols.warn
            : symbols.pass;
        const color = report.riskLevel === 'CRITICAL' || report.riskLevel === 'HIGH'
          ? c.bold
          : report.riskLevel === 'MEDIUM'
            ? c.sage
            : c.dim;
        console.log(`  ${icon} ${color(entry.name)} ${c.dim(`(${platformId})`)} — ${color(report.riskLevel)} ${c.dim(`[${report.riskScore}]`)} ${findings.length > 0 ? c.dim(`(${findings.length} finding${findings.length > 1 ? 's' : ''})`) : ''}`);
      }
    } catch (err) {
      results.push({
        name: entry.name,
        platform: platformId,
        riskScore: 0,
        riskLevel: 'LOW',
        findings: [],
        status: 'skipped',
        skipReason: err instanceof Error ? err.message : String(err),
      });
      if (verbose && !jsonOutput) {
        console.log(`  ${symbols.warn} ${c.dim(entry.name)} — audit error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Step 4: Output results
  const durationMs = Date.now() - startTime;
  const highestRisk = getHighestRisk(results);

  if (jsonOutput) {
    printJsonReport({
      platforms: platforms.map((p) => p.id),
      skills: results,
      startTime,
    });
  } else {
    printTerminalSummary(results, durationMs, highestRisk, deep);
  }

  // Exit code based on highest risk
  if (highestRisk === 'HIGH' || highestRisk === 'CRITICAL') {
    process.exit(SCAN_EXIT_CODES.FINDINGS);
  }
  process.exit(SCAN_EXIT_CODES.CLEAN);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHighestRisk(results: ScanSkillResult[]): ScanReport['highestRisk'] {
  const levels = results.filter((r) => r.status === 'audited').map((r) => r.riskLevel);
  if (levels.includes('CRITICAL')) return 'CRITICAL';
  if (levels.includes('HIGH')) return 'HIGH';
  if (levels.includes('MEDIUM')) return 'MEDIUM';
  if (levels.includes('LOW')) return 'LOW';
  return 'CLEAN';
}

function printJsonReport(opts: {
  platforms: string[];
  skills: ScanSkillResult[];
  startTime: number;
}): void {
  const { platforms, skills, startTime } = opts;
  const durationMs = Date.now() - startTime;
  const audited = skills.filter((s) => s.status === 'audited');

  const report: ScanReport = {
    version: 1,
    scannedAt: new Date().toISOString(),
    durationMs,
    platforms,
    totalSkills: skills.length,
    summary: {
      clean: audited.filter((s) => s.riskLevel === 'LOW' && s.findings.length === 0).length,
      low: audited.filter((s) => s.riskLevel === 'LOW' && s.findings.length > 0).length,
      medium: audited.filter((s) => s.riskLevel === 'MEDIUM').length,
      high: audited.filter((s) => s.riskLevel === 'HIGH').length,
      critical: audited.filter((s) => s.riskLevel === 'CRITICAL').length,
      skipped: skills.filter((s) => s.status === 'skipped').length,
    },
    skills,
    highestRisk: getHighestRisk(skills),
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

function printJsonError(message: string, startTime: number): void {
  process.stderr.write(
    JSON.stringify({ version: 1, error: message, durationMs: Date.now() - startTime }) + '\n'
  );
}

function printTerminalSummary(
  results: ScanSkillResult[],
  durationMs: number,
  highestRisk: ScanReport['highestRisk'],
  deep: boolean
): void {
  const audited = results.filter((r) => r.status === 'audited');
  const critical = audited.filter((r) => r.riskLevel === 'CRITICAL').length;
  const high = audited.filter((r) => r.riskLevel === 'HIGH').length;
  const medium = audited.filter((r) => r.riskLevel === 'MEDIUM').length;
  const clean = audited.filter((r) => r.riskLevel === 'LOW').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const totalFindings = audited.reduce((sum, r) => sum + r.findings.length, 0);

  console.log('');
  console.log(`  ${c.dim(divider())}`);
  console.log('');

  if (highestRisk === 'CRITICAL' || highestRisk === 'HIGH') {
    console.log(`  ${symbols.fail} ${c.bold('Threats detected!')}`);
  } else if (highestRisk === 'MEDIUM') {
    console.log(`  ${symbols.warn} ${c.sage('Some concerns found.')}`);
  } else {
    console.log(`  ${symbols.pass} ${c.sage('All clean!')}`);
  }

  console.log('');
  console.log(`  Skills scanned:  ${audited.length}${skipped > 0 ? c.dim(` (${skipped} skipped)`) : ''}`);
  console.log(`  Findings:        ${totalFindings}`);

  if (critical > 0) console.log(`  CRITICAL:        ${c.bold(String(critical))}`);
  if (high > 0) console.log(`  HIGH:            ${c.bold(String(high))}`);
  if (medium > 0) console.log(`  MEDIUM:          ${medium}`);
  console.log(`  Clean:           ${clean}`);
  console.log(`  Duration:        ${(durationMs / 1000).toFixed(1)}s`);

  if (!deep && (critical > 0 || high > 0)) {
    console.log('');
    console.log(`  ${symbols.info} Run with ${c.sage('--deep')} for AI-powered semantic analysis.`);
  }

  console.log('');
}
