/**
 * The npx specs PanGuard writes into agent configs are pinned to the exact
 * version of the writing package; older unpinned entries are still recognised
 * and upgraded on re-inject.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const state = vi.hoisted(() => ({ configPath: '' }));

vi.mock('../src/config/platform-detector.js', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '../src/config/platform-detector.js'
  );
  return { ...actual, getConfigPath: () => state.configPath };
});

import {
  injectMCPConfig,
  injectProxy,
  removeProxy,
  repinPanguardConfig,
} from '../src/config/mcp-injector.js';
import { SELF_VERSION, isSpecOf } from '../src/config/package-spec.js';

const readServers = (p: string): Record<string, { command: string; args: string[] }> =>
  (JSON.parse(readFileSync(p, 'utf-8')) as { mcpServers: Record<string, never> }).mcpServers;

describe('pinned npx specs', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `panguard-pin-${process.pid}-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    state.configPath = join(dir, 'mcp.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('uses the package own version, which is an exact semver', () => {
    expect(SELF_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('writes the panguard MCP entry with @<exact version>', () => {
    const res = injectMCPConfig('cursor');
    expect(res.success).toBe(true);
    expect(readServers(state.configPath)['panguard']!.args).toEqual([
      '-y',
      `@panguard-ai/panguard-mcp@${SELF_VERSION}`,
    ]);
  });

  it('re-inject upgrades an existing unpinned panguard entry to the pinned form', () => {
    writeFileSync(
      state.configPath,
      JSON.stringify({
        mcpServers: { panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] } },
      })
    );
    injectMCPConfig('cursor');
    expect(readServers(state.configPath)['panguard']!.args[1]).toBe(
      `@panguard-ai/panguard-mcp@${SELF_VERSION}`
    );
  });

  it('wraps servers with the pinned proxy spec and unwraps back to the original', () => {
    writeFileSync(
      state.configPath,
      JSON.stringify({
        mcpServers: {
          fs: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
        },
      })
    );
    injectProxy(['cursor']);
    expect(readServers(state.configPath)['fs']!.args.slice(0, 3)).toEqual([
      '-y',
      `@panguard-ai/panguard-mcp-proxy@${SELF_VERSION}`,
      '--',
    ]);
    removeProxy(['cursor']);
    expect(readServers(state.configPath)['fs']).toEqual({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
    });
  });

  it('an unpinned proxied entry is still detected, upgraded in place, and not double-wrapped', () => {
    writeFileSync(
      state.configPath,
      JSON.stringify({
        mcpServers: {
          fs: {
            command: 'npx',
            args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', 'node', 'server.js'],
          },
          panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] },
        },
      })
    );
    const summary = injectProxy(['cursor']);
    expect(summary.totalServersProxied).toBe(0);
    const servers = readServers(state.configPath);
    expect(servers['fs']!.args).toEqual([
      '-y',
      `@panguard-ai/panguard-mcp-proxy@${SELF_VERSION}`,
      '--',
      'node',
      'server.js',
    ]);
    // panguard's own entry is not wrapped, but is upgraded to the pinned spec
    expect(servers['panguard']!.args).toEqual(['-y', `@panguard-ai/panguard-mcp@${SELF_VERSION}`]);

    removeProxy(['cursor']);
    expect(readServers(state.configPath)['fs']).toEqual({
      command: 'node',
      args: ['server.js'],
    });
  });

  it('repinPanguardConfig upgrades an older entry in place and keeps env and other fields', () => {
    writeFileSync(
      state.configPath,
      JSON.stringify({
        mcpServers: {
          panguard: {
            command: 'npx',
            args: ['-y', '@panguard-ai/panguard-mcp@0.0.1'],
            env: { FOO: 'bar' },
            disabled: false,
          },
          other: { command: 'node', args: ['x.js'] },
        },
      })
    );
    expect(repinPanguardConfig(['cursor'])).toEqual(['cursor']);
    const servers = readServers(state.configPath) as Record<string, Record<string, unknown>>;
    expect(servers['panguard']).toEqual({
      command: 'npx',
      args: ['-y', `@panguard-ai/panguard-mcp@${SELF_VERSION}`],
      env: { FOO: 'bar' },
      disabled: false,
    });
    expect(servers['other']).toEqual({ command: 'node', args: ['x.js'] });
    // already pinned: nothing to do
    expect(repinPanguardConfig(['cursor'])).toEqual([]);
  });

  it('repinPanguardConfig leaves a customised entry alone', () => {
    const custom = { command: 'node', args: ['/opt/panguard/server.js'] };
    writeFileSync(state.configPath, JSON.stringify({ mcpServers: { panguard: custom } }));
    expect(repinPanguardConfig(['cursor'])).toEqual([]);
    expect(readServers(state.configPath)['panguard']).toEqual(custom);
  });

  it('injectProxy (the pga up path) upgrades the panguard entry but does not proxy it', () => {
    writeFileSync(
      state.configPath,
      JSON.stringify({
        mcpServers: { panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] } },
      })
    );
    const summary = injectProxy(['cursor']);
    expect(summary.totalServersProxied).toBe(0);
    expect(readServers(state.configPath)['panguard']!.args).toEqual([
      '-y',
      `@panguard-ai/panguard-mcp@${SELF_VERSION}`,
    ]);
  });

  it('isSpecOf matches pinned and unpinned forms only for the exact package name', () => {
    expect(isSpecOf('@panguard-ai/panguard-mcp-proxy', '@panguard-ai/panguard-mcp-proxy')).toBe(
      true
    );
    expect(
      isSpecOf('@panguard-ai/panguard-mcp-proxy@1.2.3', '@panguard-ai/panguard-mcp-proxy')
    ).toBe(true);
    expect(isSpecOf('@panguard-ai/panguard-mcp-proxy-x', '@panguard-ai/panguard-mcp-proxy')).toBe(
      false
    );
  });
});
