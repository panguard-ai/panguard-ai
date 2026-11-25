/**
 * `pga setup` brings an already-configured panguard MCP entry written by an
 * older release (unpinned or another version) to the pinned spec, keeping env
 * and other fields. Runs the real CLI against a throwaway HOME.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = fileURLToPath(new URL('../', import.meta.url));
const bin = join(pkgRoot, 'bin', 'panguard.cjs');
const { version } = JSON.parse(
  readFileSync(join(pkgRoot, '..', 'panguard-mcp', 'package.json'), 'utf-8')
) as {
  version: string;
};

describe('pga setup re-pins an existing panguard MCP entry', () => {
  let home: string | undefined;

  afterEach(() => {
    if (home) rmSync(home, { recursive: true, force: true });
    home = undefined;
  });

  const runSetup = (h: string): number =>
    spawnSync(
      process.execPath,
      [
        bin,
        'setup',
        '--json',
        '--skip-scan',
        '--skip-guard',
        '--skip-service',
        '--yes',
        '--platform',
        'cursor',
      ],
      {
        // minimal PATH: the real `claude` CLI must not be reachable from this test
        env: { ...process.env, HOME: h, USERPROFILE: h, PATH: '/usr/bin:/bin' },
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    ).status ?? -1;

  it.runIf(existsSync(bin))(
    'rewrites an unpinned entry in place and keeps env',
    () => {
      home = mkdtempSync(join(tmpdir(), 'pg-repin-home-'));
      const cfg = join(home, '.cursor', 'mcp.json');
      mkdirSync(join(home, '.cursor'), { recursive: true });
      writeFileSync(
        cfg,
        JSON.stringify({
          mcpServers: {
            panguard: {
              command: 'npx',
              args: ['-y', '@panguard-ai/panguard-mcp'],
              env: { K: 'v' },
            },
            other: { command: 'node', args: ['x.js'] },
          },
        })
      );

      runSetup(home);

      const servers = (
        JSON.parse(readFileSync(cfg, 'utf-8')) as { mcpServers: Record<string, unknown> }
      ).mcpServers;
      expect(servers['panguard']).toEqual({
        command: 'npx',
        args: ['-y', `@panguard-ai/panguard-mcp@${version}`],
        env: { K: 'v' },
      });
      expect(servers['other']).toEqual({ command: 'node', args: ['x.js'] });
    },
    120000
  );

  it.runIf(existsSync(bin))(
    'leaves a customised entry alone',
    () => {
      home = mkdtempSync(join(tmpdir(), 'pg-repin-home-'));
      const cfg = join(home, '.cursor', 'mcp.json');
      mkdirSync(join(home, '.cursor'), { recursive: true });
      const custom = { command: 'node', args: ['/opt/panguard/server.js'] };
      writeFileSync(cfg, JSON.stringify({ mcpServers: { panguard: custom } }));

      runSetup(home);

      const servers = (
        JSON.parse(readFileSync(cfg, 'utf-8')) as { mcpServers: Record<string, unknown> }
      ).mcpServers;
      expect(servers['panguard']).toEqual(custom);
    },
    120000
  );
});
