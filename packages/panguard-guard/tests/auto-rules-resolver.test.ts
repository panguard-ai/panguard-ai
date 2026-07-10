/**
 * Gap A slice 2 — the advise-vs-enforce trust decision (resolveStagedAutoRules).
 *
 * This is where "is this fresh bundle allowed to BLOCK?" is decided. The
 * adversarial property: a staged version NEWER than what the user trusted must
 * be adviseOnly=true (cannot block); only a version <= trusted may enforce.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStagedAutoRules, isNewerVersion } from '../src/auto-rules.js';

let dataDir: string;

function stage(version: string): void {
  const dir = join(dataDir, 'auto-rules', version);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'placeholder.yaml'), 'id: x\n');
}

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'pg-autorules-'));
});
afterEach(() => {
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

describe('resolveStagedAutoRules', () => {
  it('returns null when nothing is staged', () => {
    expect(resolveStagedAutoRules(dataDir, null)).toBeNull();
    expect(resolveStagedAutoRules(join(dataDir, 'nope'), '9.9.9')).toBeNull();
  });

  it('adviseOnly=true when nothing is trusted yet', () => {
    stage('3.5.7');
    const r = resolveStagedAutoRules(dataDir, null);
    expect(r).not.toBeNull();
    expect(r!.version).toBe('3.5.7');
    expect(r!.adviseOnly).toBe(true);
  });

  it('adviseOnly=true when the staged version is NEWER than trusted', () => {
    stage('3.6.0');
    const r = resolveStagedAutoRules(dataDir, '3.5.7');
    expect(r!.adviseOnly).toBe(true); // fresh — must NOT block
  });

  it('adviseOnly=false when the staged version == trusted (armed)', () => {
    stage('3.5.7');
    const r = resolveStagedAutoRules(dataDir, '3.5.7');
    expect(r!.adviseOnly).toBe(false);
  });

  it('adviseOnly=false when the staged version is OLDER than trusted (armed)', () => {
    stage('3.5.0');
    const r = resolveStagedAutoRules(dataDir, '3.5.7');
    expect(r!.adviseOnly).toBe(false);
  });

  it('picks the NEWEST staged version among several', () => {
    stage('3.5.0');
    stage('3.6.2');
    stage('3.5.9');
    const r = resolveStagedAutoRules(dataDir, null);
    expect(r!.version).toBe('3.6.2');
  });

  it('ignores non-version dirs', () => {
    mkdirSync(join(dataDir, 'auto-rules', 'not-a-version'), { recursive: true });
    stage('3.5.7');
    const r = resolveStagedAutoRules(dataDir, null);
    expect(r!.version).toBe('3.5.7');
  });
});

describe('isNewerVersion', () => {
  it('compares dotted versions', () => {
    expect(isNewerVersion('3.6.0', '3.5.7')).toBe(true);
    expect(isNewerVersion('3.5.7', '3.5.7')).toBe(false);
    expect(isNewerVersion('3.5.0', '3.5.7')).toBe(false);
    expect(isNewerVersion('4.0.0', '3.9.9')).toBe(true);
  });
});
