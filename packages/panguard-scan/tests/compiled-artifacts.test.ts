/**
 * Compiled Python bytecode checker tests
 * 已編譯 Python 位元組碼檢查器測試
 *
 * Covers the shape reported in issue #60: a skill whose source files are clean
 * while `__pycache__` carries the code that actually runs.
 *
 * @module @panguard-ai/panguard-scan/tests/compiled-artifacts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  };
});

import {
  checkCompiledArtifacts,
  extractReadableStrings,
  findDangerousNames,
} from '../src/scanners/compiled-artifacts.js';

/** A .pyc-shaped buffer: magic, flags, then marshal-style short strings. */
function pycBuffer(names: readonly string[]): Buffer {
  const header = Buffer.from([0xcb, 0x0d, 0x0d, 0x0a, 0x01, 0x00, 0x00, 0x00]);
  const body = names.map((n) => Buffer.concat([Buffer.from([0xda, n.length]), Buffer.from(n)]));
  return Buffer.concat([header, Buffer.alloc(8), ...body, Buffer.from([0x4e])]);
}

describe('checkCompiledArtifacts', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pg-compiled-'));
    await fs.writeFile(path.join(dir, 'SKILL.md'), '# Output\nFormats text.\n');
    await fs.writeFile(path.join(dir, 'output.py'), 'def fmt(x):\n    return str(x)\n');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('reports nothing for a skill that ships source only', async () => {
    expect(await checkCompiledArtifacts(dir)).toEqual([]);
  });

  it('flags bytecode in __pycache__ that calls os.system as critical (issue #60)', async () => {
    await fs.mkdir(path.join(dir, '__pycache__'));
    await fs.writeFile(
      path.join(dir, '__pycache__', 'output.cpython-312.pyc'),
      pycBuffer(['os', 'system', 'whoami'])
    );

    const findings = await checkCompiledArtifacts(dir);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('critical');
    expect(findings[0]?.category).toBe('code');
    expect(findings[0]?.details).toBe(path.join('__pycache__', 'output.cpython-312.pyc'));
    expect(findings[0]?.description).toContain('system');
  });

  it('flags any shipped bytecode as high even when no dangerous name is readable', async () => {
    await fs.writeFile(path.join(dir, 'helper.pyo'), pycBuffer(['fmt', 'value']));

    const findings = await checkCompiledArtifacts(dir);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('high');
  });

  it('finds bytecode in nested directories but not in node_modules or .git', async () => {
    await fs.mkdir(path.join(dir, 'lib', '__pycache__'), { recursive: true });
    await fs.writeFile(path.join(dir, 'lib', '__pycache__', 'a.pyc'), pycBuffer(['a']));
    await fs.mkdir(path.join(dir, 'node_modules', 'x'), { recursive: true });
    await fs.writeFile(path.join(dir, 'node_modules', 'x', 'b.pyc'), pycBuffer(['b']));
    await fs.mkdir(path.join(dir, '.git'));
    await fs.writeFile(path.join(dir, '.git', 'c.pyc'), pycBuffer(['c']));

    const findings = await checkCompiledArtifacts(dir);

    expect(findings.map((f) => f.details)).toEqual([path.join('lib', '__pycache__', 'a.pyc')]);
  });

  it('returns nothing for a missing path or a single file', async () => {
    expect(await checkCompiledArtifacts(path.join(dir, 'missing'))).toEqual([]);
    expect(await checkCompiledArtifacts(path.join(dir, 'SKILL.md'))).toEqual([]);
  });
});

describe('readable strings', () => {
  it('extracts printable runs and matches dangerous names as whole identifiers', () => {
    const strings = extractReadableStrings(pycBuffer(['subprocess', 'check_output', 'systematic']));
    expect(strings).toContain('subprocess');
    expect(findDangerousNames(strings)).toEqual(['check_output', 'subprocess']);
  });
});
