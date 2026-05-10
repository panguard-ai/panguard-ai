/**
 * E2E: PGA CLI UX tests
 * Exercises critical user journeys via child_process, asserting on stdout/stderr content.
 * Each test invokes the globally-linked `pga` binary and validates output.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PGA_BIN = new URL('../../packages/panguard/bin/panguard.cjs', import.meta.url).pathname;
const TIMEOUT_MS = 60_000;

interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function run(args: string[], env?: NodeJS.ProcessEnv): RunResult {
  const result = spawnSync(process.execPath, [PGA_BIN, ...args], {
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    env: { ...process.env, ...env },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

/** Combine stdout + stderr for assertions that don't care which stream carries the text. */
function output(r: RunResult): string {
  return r.stdout + r.stderr;
}

/** Returns true if the string contains any CJK (Chinese/Japanese/Korean) character. */
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f]/.test(text);
}

// ---------------------------------------------------------------------------
// 1. Install & Version Check
// ---------------------------------------------------------------------------

describe('Install & Version Check', () => {
  it('pga --version prints a semver version number', () => {
    const r = run(['--version']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('pga --help shows commands list in English', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    const out = output(r);
    // Core commands must be present
    expect(out).toMatch(/scan/);
    expect(out).toMatch(/guard/);
    expect(out).toMatch(/status/);
    expect(out).toMatch(/doctor/);
    expect(out).toMatch(/config/);
  });

  it('pga --help contains no Chinese characters', () => {
    const r = run(['--help']);
    expect(r.status).toBe(0);
    expect(hasChinese(output(r))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Status Command
// ---------------------------------------------------------------------------

describe('Status Command', () => {
  it('pga status exits without crash', () => {
    const r = run(['status']);
    // status may warn (e.g. config not found) but must not hard-crash
    expect(r.status).toBeLessThanOrEqual(1);
  });

  it('pga status produces output in English', () => {
    const r = run(['status']);
    const out = output(r);
    // Visible non-JSON output should not contain Chinese
    // Strip JSON log lines (those start with {"timestamp":) before checking
    const nonJsonLines = out
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('{"timestamp"'))
      .join('\n');
    expect(hasChinese(nonJsonLines)).toBe(false);
  });

  it('pga status --json outputs valid JSON', () => {
    const r = run(['status', '--json']);
    expect(r.status).toBeLessThanOrEqual(1);
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(r.stdout.trim());
    }).not.toThrow();
    expect(parsed).toBeTypeOf('object');
    expect(parsed).not.toBeNull();
  });

  it('pga status --json output contains expected top-level keys', () => {
    const r = run(['status', '--json']);
    const parsed = JSON.parse(r.stdout.trim()) as Record<string, unknown>;
    // These keys are present in the current status schema
    expect(parsed).toHaveProperty('guard');
    expect(parsed).toHaveProperty('notifications');
  });
});

// ---------------------------------------------------------------------------
// 3. Doctor Command
// ---------------------------------------------------------------------------

describe('Doctor Command', () => {
  it('pga doctor exits without crash', () => {
    const r = run(['doctor']);
    expect(r.status).toBeLessThanOrEqual(1);
  });

  it('pga doctor output is in English', () => {
    const r = run(['doctor']);
    const out = output(r);
    expect(hasChinese(out)).toBe(false);
  });

  it('pga doctor --json outputs a valid JSON array', () => {
    const r = run(['doctor', '--json']);
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(r.stdout.trim());
    }).not.toThrow();
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('pga doctor --json items have required fields (status, label, detail)', () => {
    const r = run(['doctor', '--json']);
    const items = JSON.parse(r.stdout.trim()) as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('detail');
    }
  });

  it('pga doctor --json status values are limited to pass/fail/warn', () => {
    const r = run(['doctor', '--json']);
    const items = JSON.parse(r.stdout.trim()) as Array<Record<string, unknown>>;
    const validStatuses = new Set(['pass', 'fail', 'warn']);
    for (const item of items) {
      expect(validStatuses.has(item['status'] as string)).toBe(true);
    }
  });

  it('pga doctor --fix shows commands to run (not "coming soon")', () => {
    const r = run(['doctor', '--fix']);
    const out = output(r);
    expect(out.toLowerCase()).not.toMatch(/coming soon/);
    // Should contain at least one actionable command hint
    expect(out).toMatch(/pga /);
  });

  it('pga doctor --fix suggestions use "pga" not "panguard"', () => {
    const r = run(['doctor', '--fix']);
    const out = output(r);
    // Strip the "panguard [#] AI" branding header — only check fix lines
    const fixLines = out
      .split('\n')
      .filter((l) => l.includes('Would run') || l.includes('fix:') || l.includes('Run "'));
    const combined = fixLines.join('\n');
    // "panguard" as a standalone command (not part of "panguard-ai" branding) must not appear
    expect(combined).not.toMatch(/\bpanguard\b(?!\s*\[#\]|\s*AI|-ai)/i);
  });

  it('pga doctor license check says "Open source — no license required"', () => {
    const r = run(['doctor']);
    expect(output(r)).toMatch(/Open source — no license required/i);
  });

  it('pga doctor --json license item has correct detail', () => {
    const r = run(['doctor', '--json']);
    const items = JSON.parse(r.stdout.trim()) as Array<Record<string, unknown>>;
    const licenseItem = items.find(
      (i) => typeof i['label'] === 'string' && i['label'].toLowerCase().includes('license')
    );
    expect(licenseItem).toBeDefined();
    expect(licenseItem!['detail']).toMatch(/open source/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Scan Command
// ---------------------------------------------------------------------------

describe('Scan Command', () => {
  it('pga scan --help exits cleanly', () => {
    const r = run(['scan', '--help']);
    expect(r.status).toBe(0);
  });

  it('pga scan --help shows --all option', () => {
    const r = run(['scan', '--help']);
    expect(output(r)).toMatch(/--all/);
  });

  it('pga scan --help description matches expected text', () => {
    const r = run(['scan', '--help']);
    expect(output(r)).toMatch(/Scan skills for threats, or run a system security scan/i);
  });

  it('pga scan --help shows --json option', () => {
    const r = run(['scan', '--help']);
    expect(output(r)).toMatch(/--json/);
  });

  it(
    'pga scan --all runs and produces some output (non-invasive)',
    () => {
      // --all walks $HOME/.claude/skills. On dev machines that legitimately
      // have hundreds of installed skills, full SAST + secrets scan exceeds
      // the 60s test timeout. Use a temp HOME so the test only verifies the
      // CLI surface (parses --all, exits cleanly, produces output) without
      // depending on the developer's actual skill inventory.
      const tmpHome = mkdtempSync(pathJoin(tmpdir(), 'panguard-test-home-'));
      try {
        const r = run(['scan', '--all', '--json'], { HOME: tmpHome });
        const combined = output(r);
        expect(combined.length).toBeGreaterThan(0);
      } finally {
        rmSync(tmpHome, { recursive: true, force: true });
      }
    },
    TIMEOUT_MS
  );
});

// ---------------------------------------------------------------------------
// 5. Config Command
// ---------------------------------------------------------------------------

describe('Config Command', () => {
  it('pga config set lang en succeeds', () => {
    const r = run(['config', 'set', 'lang', 'en']);
    expect(r.status).toBe(0);
    expect(output(r)).toMatch(/lang set to en/i);
  });

  it('pga config set lang zh-TW succeeds', () => {
    const r = run(['config', 'set', 'lang', 'zh-TW']);
    expect(r.status).toBe(0);
    expect(output(r)).toMatch(/lang set to zh-TW/i);
    // Reset to English after test so subsequent tests see English output
    run(['config', 'set', 'lang', 'en']);
  });

  it('pga config set lang invalid errors with valid languages listed', () => {
    const r = run(['config', 'set', 'lang', 'invalid']);
    // Should be a non-zero exit or at minimum print an error message
    const out = output(r);
    expect(out).toMatch(/invalid/i);
    // Must enumerate the valid options
    expect(out).toMatch(/en/);
    expect(out).toMatch(/zh-TW/);
  });

  it('pga config set lang invalid does not exit 0', () => {
    const r = run(['config', 'set', 'lang', 'invalid']);
    expect(r.status).not.toBe(0);
  });

  it('pga config set telemetry false succeeds', () => {
    const r = run(['config', 'set', 'telemetry', 'false']);
    expect(r.status).toBe(0);
    expect(output(r)).toMatch(/telemetryEnabled set to false/i);
    // Restore telemetry to true (best-effort)
    run(['config', 'set', 'telemetry', 'true']);
  });
});

// ---------------------------------------------------------------------------
// 6. Guard Commands
// ---------------------------------------------------------------------------

describe('Guard Commands', () => {
  it('pga guard --help exits cleanly', () => {
    const r = run(['guard', '--help']);
    expect(r.status).toBe(0);
  });

  it('pga guard --help shows subcommands in English', () => {
    const r = run(['guard', '--help']);
    const out = output(r);
    expect(out).toMatch(/start/);
    expect(out).toMatch(/stop/);
    expect(out).toMatch(/status/);
    expect(out).toMatch(/install/);
  });

  it('pga guard --help contains no Chinese characters', () => {
    const r = run(['guard', '--help']);
    expect(hasChinese(output(r))).toBe(false);
  });

  it('pga guard status runs without crash', () => {
    const r = run(['guard', 'status']);
    expect(r.status).toBeLessThanOrEqual(1);
  });

  it('pga guard status output contains status indicator', () => {
    const r = run(['guard', 'status']);
    const out = output(r);
    // Should report STOPPED or RUNNING
    expect(out).toMatch(/STOPPED|RUNNING|stopped|running/i);
  });
});
