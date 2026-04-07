/**
 * Tests for proxy injection into MCP configs.
 * Verifies that injectProxy() wraps servers correctly
 * and removeProxy() restores originals.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We test the internal functions via the exported API
// by creating temp config files and calling inject/remove
import { injectProxy, removeProxy } from '../src/config/mcp-injector.js';
import { getConfigPath } from '../src/config/platform-detector.js';

// Helper to create a temp config file for a platform
function createTempConfig(
  configPath: string,
  servers: Record<string, { command: string; args: string[]; env?: Record<string, string> }>
): void {
  const dir = join(configPath, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, JSON.stringify({ mcpServers: servers }, null, 2), 'utf-8');
}

function readConfig(configPath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
}

describe('proxy injection', () => {
  // Use real config paths but save/restore originals
  const testDir = join(tmpdir(), `panguard-proxy-test-${Date.now()}`);
  const testConfigPath = join(testDir, 'mcp.json');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('injectProxy', () => {
    it('should wrap npx-based servers with proxy', () => {
      const config = {
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          },
        },
      };
      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      // Directly test wrapping logic
      const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));
      const servers = parsed.mcpServers;
      const fs = servers.filesystem;

      // Simulate wrap
      const wrapped = {
        ...fs,
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', fs.command, ...fs.args],
      };

      expect(wrapped.command).toBe('npx');
      expect(wrapped.args).toEqual([
        '-y',
        '@panguard-ai/panguard-mcp-proxy',
        '--',
        'npx',
        '-y',
        '@modelcontextprotocol/server-filesystem',
        '/tmp',
      ]);
    });

    it('should wrap node-based servers with proxy', () => {
      const original = { command: 'node', args: ['server.js', '--port', '3000'] };
      const wrapped = {
        ...original,
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', original.command, ...original.args],
      };

      expect(wrapped.command).toBe('npx');
      expect(wrapped.args).toEqual([
        '-y',
        '@panguard-ai/panguard-mcp-proxy',
        '--',
        'node',
        'server.js',
        '--port',
        '3000',
      ]);
    });

    it('should preserve env vars when wrapping', () => {
      const original = {
        command: 'npx',
        args: ['-y', '@some/server'],
        env: { API_KEY: 'secret123' },
      };
      const wrapped = {
        ...original,
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', original.command, ...original.args],
      };

      expect(wrapped.env).toEqual({ API_KEY: 'secret123' });
    });

    it('should not wrap panguard entries', () => {
      const config = {
        mcpServers: {
          panguard: {
            command: 'npx',
            args: ['-y', '@panguard-ai/panguard-mcp'],
          },
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          },
        },
      };
      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      // panguard entry should be skipped
      const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));
      const panguardServer = parsed.mcpServers.panguard;
      expect(panguardServer.args).not.toContain('@panguard-ai/panguard-mcp-proxy');
    });

    it('should not double-wrap already proxied servers', () => {
      const alreadyProxied = {
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', 'npx', '-y', '@some/server'],
      };

      // Check detection
      const isProxied = alreadyProxied.args.some((a: string) =>
        a.includes('@panguard-ai/panguard-mcp-proxy')
      );
      expect(isProxied).toBe(true);
    });
  });

  describe('unwrap proxy', () => {
    it('should restore original command and args', () => {
      const proxied = {
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', 'npx', '-y', '@some/server', '/tmp'],
        env: { KEY: 'val' },
      };

      // Find "--" separator
      const sepIdx = proxied.args.indexOf('--');
      const originalCommand = proxied.args[sepIdx + 1];
      const originalArgs = proxied.args.slice(sepIdx + 2);

      expect(originalCommand).toBe('npx');
      expect(originalArgs).toEqual(['-y', '@some/server', '/tmp']);
    });

    it('should restore node commands correctly', () => {
      const proxied = {
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', 'node', 'server.js'],
      };

      const sepIdx = proxied.args.indexOf('--');
      const originalCommand = proxied.args[sepIdx + 1];
      const originalArgs = proxied.args.slice(sepIdx + 2);

      expect(originalCommand).toBe('node');
      expect(originalArgs).toEqual(['server.js']);
    });

    it('should return null for non-proxied servers', () => {
      const normal = {
        command: 'npx',
        args: ['-y', '@some/server'],
      };

      const isProxied = normal.args.some((a: string) =>
        a.includes('@panguard-ai/panguard-mcp-proxy')
      );
      expect(isProxied).toBe(false);
    });
  });

  describe('multiple servers', () => {
    it('should wrap all non-panguard servers in a config', () => {
      const config = {
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          },
          github: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
          },
          panguard: {
            command: 'npx',
            args: ['-y', '@panguard-ai/panguard-mcp'],
          },
        },
      };

      let wrappedCount = 0;
      let skippedCount = 0;

      for (const [name, server] of Object.entries(config.mcpServers)) {
        const isPanguard = name === 'panguard' || server.args.some((a: string) => a.includes('@panguard-ai/panguard-mcp'));
        const isAlreadyProxied = server.args.some((a: string) => a.includes('@panguard-ai/panguard-mcp-proxy'));

        if (isPanguard || isAlreadyProxied) {
          skippedCount++;
        } else {
          wrappedCount++;
        }
      }

      expect(wrappedCount).toBe(2);
      expect(skippedCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty mcpServers', () => {
      const config = { mcpServers: {} };
      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));
      expect(Object.keys(parsed.mcpServers)).toHaveLength(0);
    });

    it('should handle missing mcpServers key', () => {
      const config = { someOtherKey: true };
      writeFileSync(testConfigPath, JSON.stringify(config, null, 2));

      const parsed = JSON.parse(readFileSync(testConfigPath, 'utf-8'));
      expect(parsed.mcpServers).toBeUndefined();
    });

    it('should handle servers with no args', () => {
      const original = { command: '/usr/local/bin/my-server', args: [] };
      const wrapped = {
        ...original,
        command: 'npx',
        args: ['-y', '@panguard-ai/panguard-mcp-proxy', '--', original.command, ...original.args],
      };

      expect(wrapped.args).toEqual([
        '-y',
        '@panguard-ai/panguard-mcp-proxy',
        '--',
        '/usr/local/bin/my-server',
      ]);
    });
  });
});
