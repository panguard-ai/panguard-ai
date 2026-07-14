/**
 * auditSkill skipCode option — the fast bulk-scan path.
 *
 * `pga up` / first-run setup scan EVERY installed skill. The per-skill semgrep
 * startup (~3-4s) times the skill count turned that into a multi-minute hang, and
 * a project-style skill bundling node_modules + built binaries made a single scan
 * take a minute. skipCode runs the ATR pattern check on the manifest but skips the
 * code (SAST/secrets) scan; the full scan is available via `pga audit --deep`.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditSkill } from '../src/index.js';

const dirs: string[] = [];
function makeSkill(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'pg-skipcode-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'SKILL.md'), `---\nname: t\ndescription: d\n---\n# T\n${body}\n`);
  return dir;
}
const hasCodeCheck = (r: Awaited<ReturnType<typeof auditSkill>>): boolean =>
  r.checks.some((c) => /Code|Secrets/i.test(c.label));

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('auditSkill skipCode', () => {
  it(
    'runs the code security check by default',
    async () => {
      const report = await auditSkill(makeSkill('Just a friendly helper.'), { skipAI: true });
      expect(hasCodeCheck(report)).toBe(true);
    },
    // Generous timeout: the default path invokes semgrep, whose cold start alone
    // is a few seconds and slower under CI/host load — the whole point of the
    // sibling skipCode test is that a fast bulk scan must NOT pay this cost.
    30_000
  );

  it('skips the code security check when skipCode is set (fast bulk path)', async () => {
    const report = await auditSkill(makeSkill('Just a friendly helper.'), {
      skipAI: true,
      skipCode: true,
    });
    expect(hasCodeCheck(report)).toBe(false);
    // The ATR manifest check still runs, so a skill is still evaluated.
    expect(report.riskLevel).toBeDefined();
  });
});
