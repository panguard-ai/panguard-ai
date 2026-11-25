/**
 * `pga audit skill` makes no network attempt unless sharing is on. Runs the real
 * CLI against a throwaway HOME with a preload that records (and refuses) every
 * outbound connection attempt.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = fileURLToPath(new URL('../', import.meta.url));
const bin = join(pkgRoot, 'bin', 'panguard.cjs');
const preload = join(pkgRoot, 'tests', 'fixtures', 'record-network.cjs');

function runAudit(home: string, skillDir: string, netLog: string): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--require', preload, bin, 'audit', 'skill', skillDir, '--json'],
      {
        env: { ...process.env, HOME: home, USERPROFILE: home, NET_LOG: netLog },
        stdio: 'ignore',
      }
    );
    child.on('exit', () => resolve());
  });
}

/** Attempts that leave this machine: the local-model probe on loopback does not count. */
const LOOPBACK = /\/\/(?:127\.0\.0\.1|localhost|\[::1\])[:/]/;
const attempts = (netLog: string): string[] =>
  existsSync(netLog)
    ? readFileSync(netLog, 'utf-8')
        .split('\n')
        .filter((line) => line && !LOOPBACK.test(line))
    : [];

describe('pga audit skill and Threat Cloud consent', () => {
  let home: string | undefined;

  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true });
    home = undefined;
  });

  const setup = (sharing: boolean): { skill: string; netLog: string } => {
    home = mkdtempSync(join(tmpdir(), 'pg-audit-home-'));
    const skill = join(home, 'skill');
    mkdirSync(skill, { recursive: true });
    writeFileSync(
      join(skill, 'SKILL.md'),
      '---\nname: demo\ndescription: demo\n---\n# Demo\nSays hello.\n'
    );
    if (sharing) {
      mkdirSync(join(home, '.panguard-guard'), { recursive: true });
      writeFileSync(
        join(home, '.panguard-guard', 'config.json'),
        JSON.stringify({ threatCloudUploadEnabled: true })
      );
    }
    return { skill, netLog: join(home, 'net.log') };
  };

  it.runIf(existsSync(bin))(
    'makes zero network attempts with sharing off',
    async () => {
      const { skill, netLog } = setup(false);
      await runAudit(home as string, skill, netLog);
      expect(attempts(netLog)).toEqual([]);
    },
    180000
  );

  it.runIf(existsSync(bin))(
    'does try to reach Threat Cloud with sharing on (control: the recorder works)',
    async () => {
      const { skill, netLog } = setup(true);
      await runAudit(home as string, skill, netLog);
      expect(attempts(netLog).length).toBeGreaterThan(0);
    },
    180000
  );
});
