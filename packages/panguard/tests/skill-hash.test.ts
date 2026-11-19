import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contentHash } from '@panguard-ai/scan-core';
import { computeSkillHash } from '../src/cli/skill-hash.js';

describe('computeSkillHash', () => {
  let a: string;
  let b: string;

  beforeEach(() => {
    a = mkdtempSync(join(tmpdir(), 'sh-alice-'));
    b = mkdtempSync(join(tmpdir(), 'sh-bob-'));
  });

  afterEach(() => {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  });

  it('with a SKILL.md it is the content hash of that file (website-compatible)', () => {
    writeFileSync(join(a, 'SKILL.md'), '# demo');
    expect(computeSkillHash(a)).toBe(contentHash('# demo'));
  });

  it('without a SKILL.md it does not hash the absolute path', () => {
    for (const dir of [a, b]) {
      mkdirSync(join(dir, 'src'));
      writeFileSync(join(dir, 'src', 'index.js'), 'run()');
    }
    expect(computeSkillHash(a)).not.toBe(contentHash(a));
    // same content in two different locations => same hash
    expect(computeSkillHash(a)).toBe(computeSkillHash(b));
    writeFileSync(join(b, 'src', 'index.js'), 'run2()');
    expect(computeSkillHash(a)).not.toBe(computeSkillHash(b));
  });
});
