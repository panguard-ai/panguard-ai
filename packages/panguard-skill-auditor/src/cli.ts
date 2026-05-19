#!/usr/bin/env node
/**
 * panguard-skill-audit CLI
 *
 * Bug 4 fix (2026-05-19): package previously shipped library only, no
 * `bin` entry. SKU A delivery couldn't demonstrate skill-audit step
 * without a wrapper script. This adds a thin CLI: audit a single skill
 * directory or scan a fleet of skill dirs and emit JSON / text / non-zero
 * exit on findings.
 */

import { auditSkill } from './index.js';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

interface CliOptions {
  dir: string;
  json: boolean;
  failOn: 'critical' | 'high' | 'medium' | 'low' | null;
  fleet: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dir: '.',
    json: false,
    failOn: null,
    fleet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' && argv[i + 1]) {
      opts.dir = argv[++i]!;
    } else if (a === '--json') {
      opts.json = true;
    } else if (a === '--fail-on' && argv[i + 1]) {
      const v = argv[++i] as CliOptions['failOn'];
      if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') {
        opts.failOn = v;
      }
    } else if (a === '--fleet') {
      opts.fleet = true;
    } else if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (a === '--version' || a === '-v') {
      console.log('panguard-skill-audit (workspace)');
      process.exit(0);
    } else if (a && a.startsWith('--')) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`panguard-skill-audit — Static security audit for AI agent skill bundles

Usage:
  panguard-skill-audit --dir <skill-dir> [--json] [--fail-on critical|high|medium|low]
  panguard-skill-audit --dir <parent-dir> --fleet [--json]

Options:
  --dir <path>          Single skill directory, or parent directory with --fleet
  --fleet               Treat --dir as parent; audit every subdirectory containing SKILL.md
  --json                Emit machine-readable JSON to stdout (no human text)
  --fail-on <severity>  Exit 1 if any finding at or above this severity exists
  -h, --help            Show this help
  -v, --version         Show version

Exit codes:
  0 — audit completed; no failing findings (or no --fail-on)
  1 — at least one finding at or above --fail-on threshold
  2 — invalid args / no skill directory found
`);
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

function severityBelowThreshold(found: string, threshold: CliOptions['failOn']): boolean {
  if (!threshold) return true;
  const f = SEVERITY_ORDER.indexOf(found as (typeof SEVERITY_ORDER)[number]);
  const t = SEVERITY_ORDER.indexOf(threshold);
  if (f === -1 || t === -1) return true;
  return f > t;
}

async function findSkillDirs(parent: string): Promise<string[]> {
  const entries = await readdir(parent);
  const result: string[] = [];
  for (const e of entries) {
    const full = join(parent, e);
    try {
      const s = await stat(full);
      if (s.isDirectory() && existsSync(join(full, 'SKILL.md'))) {
        result.push(full);
      }
    } catch {
      // Skip unreadable entries.
    }
  }
  return result;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const dir = resolve(opts.dir);

  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(2);
  }

  const targets = opts.fleet ? await findSkillDirs(dir) : [dir];
  if (targets.length === 0) {
    console.error(
      opts.fleet
        ? `No skill directories (containing SKILL.md) found under ${dir}`
        : `Directory has no SKILL.md: ${dir}`
    );
    process.exit(2);
  }

  const reports = [];
  for (const t of targets) {
    try {
      const report = await auditSkill(t);
      reports.push(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      reports.push({
        skillPath: t,
        manifest: null,
        riskScore: 0,
        riskLevel: 'unknown' as const,
        checks: [],
        findings: [
          {
            checkId: 'audit-error',
            severity: 'high' as const,
            title: 'Audit failed',
            description: msg,
            evidence: '',
          },
        ],
        auditedAt: new Date().toISOString(),
        durationMs: 0,
      });
    }
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ reports }, null, 2));
    process.stdout.write('\n');
  } else {
    for (const r of reports) {
      console.log(`\n=== ${r.skillPath} ===`);
      console.log(`Risk: ${r.riskLevel} (score: ${r.riskScore})`);
      console.log(`Checks: ${r.checks.length}  Findings: ${r.findings.length}`);
      for (const f of r.findings.slice(0, 10)) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.title}`);
        if (f.description) console.log(`    ${f.description}`);
      }
      if (r.findings.length > 10) {
        console.log(`  ... and ${r.findings.length - 10} more`);
      }
    }
  }

  if (opts.failOn) {
    const hasFailing = reports.some((r) =>
      r.findings.some((f) => !severityBelowThreshold(f.severity, opts.failOn))
    );
    if (hasFailing) process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
