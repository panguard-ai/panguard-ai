/**
 * Platform Sandbox Tests - NemoClaw & WorkBuddy
 * 平台沙盒測試 - NemoClaw 和 WorkBuddy
 *
 * Tests platform detection, config injection, and removal
 * using isolated temp directories as sandboxed home environments.
 *
 * @module @panguard-ai/panguard-mcp/tests/platform-sandbox
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Sandbox Setup ──────────────────────────────────────────────────────────

const SANDBOX_ROOT = join(tmpdir(), `panguard-sandbox-${Date.now()}`);
const FAKE_HOME = join(SANDBOX_ROOT, 'home');

// Mock os.homedir() to return our sandbox
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: () => FAKE_HOME,
  };
});

// Mock child_process to prevent actual command lookups
vi.mock('node:child_process', () => ({
  execFile: (_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
    cb(new Error('not found'));
  },
}));

// Mock @panguard-ai/core
vi.mock('@panguard-ai/core', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Import after mocks
import { detectPlatforms, getConfigPath } from '../src/config/platform-detector.js';
import { injectMCPConfig, removeMCPConfig } from '../src/config/mcp-injector.js';
import type { PlatformId } from '../src/config/platform-detector.js';

// ─── Cleanup ────────────────────────────────────────────────────────────────

afterAll(() => {
  rmSync(SANDBOX_ROOT, { recursive: true, force: true });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// WorkBuddy Sandbox Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('WorkBuddy platform sandbox', () => {
  const WORKBUDDY_DIR = join(FAKE_HOME, '.workbuddy');
  const WORKBUDDY_CONFIG = join(WORKBUDDY_DIR, '.mcp.json');

  beforeEach(() => {
    ensureDir(FAKE_HOME);
  });

  describe('detection', () => {
    it('detects WorkBuddy when ~/.workbuddy directory exists', async () => {
      ensureDir(WORKBUDDY_DIR);

      const platforms = await detectPlatforms();
      const wb = platforms.find((p) => p.id === 'workbuddy');

      expect(wb).toBeDefined();
      expect(wb!.detected).toBe(true);
      expect(wb!.name).toBe('Workbuddy');
    });

    it('reports not detected when ~/.workbuddy does not exist', async () => {
      // Clean up if exists from previous test
      rmSync(WORKBUDDY_DIR, { recursive: true, force: true });

      const platforms = await detectPlatforms();
      const wb = platforms.find((p) => p.id === 'workbuddy');

      expect(wb).toBeDefined();
      expect(wb!.detected).toBe(false);
    });

    it('reports alreadyConfigured when config contains panguard', async () => {
      ensureDir(WORKBUDDY_DIR);
      writeFileSync(
        WORKBUDDY_CONFIG,
        JSON.stringify({
          mcpServers: { panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] } },
        })
      );

      const platforms = await detectPlatforms();
      const wb = platforms.find((p) => p.id === 'workbuddy');

      expect(wb!.alreadyConfigured).toBe(true);
    });

    it('reports not configured when config has no panguard entry', async () => {
      ensureDir(WORKBUDDY_DIR);
      writeFileSync(WORKBUDDY_CONFIG, JSON.stringify({ mcpServers: {} }));

      const platforms = await detectPlatforms();
      const wb = platforms.find((p) => p.id === 'workbuddy');

      expect(wb!.alreadyConfigured).toBe(false);
    });
  });

  describe('config path', () => {
    it('returns ~/.workbuddy/.mcp.json (with leading dot)', () => {
      const configPath = getConfigPath('workbuddy');
      expect(configPath).toBe(WORKBUDDY_CONFIG);
      expect(configPath).toContain('.mcp.json');
    });
  });

  describe('injection', () => {
    beforeEach(() => {
      rmSync(WORKBUDDY_DIR, { recursive: true, force: true });
    });

    it('injects panguard MCP entry into empty config', () => {
      const result = injectMCPConfig('workbuddy');

      expect(result.success).toBe(true);
      expect(result.configPath).toBe(WORKBUDDY_CONFIG);
      expect(existsSync(WORKBUDDY_CONFIG)).toBe(true);

      const config = readJsonFile(WORKBUDDY_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['panguard']).toBeDefined();

      const entry = servers['panguard'] as Record<string, unknown>;
      expect(entry['command']).toBe('npx');
      expect(entry['args']).toEqual(['-y', '@panguard-ai/panguard-mcp']);
    });

    it('preserves existing MCP servers when injecting', () => {
      ensureDir(WORKBUDDY_DIR);
      writeFileSync(
        WORKBUDDY_CONFIG,
        JSON.stringify({
          mcpServers: {
            'other-server': { command: 'node', args: ['server.js'] },
          },
        })
      );

      const result = injectMCPConfig('workbuddy');

      expect(result.success).toBe(true);

      const config = readJsonFile(WORKBUDDY_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['other-server']).toBeDefined();
      expect(servers['panguard']).toBeDefined();
    });

    it('creates backup before modifying existing config', () => {
      ensureDir(WORKBUDDY_DIR);
      writeFileSync(WORKBUDDY_CONFIG, JSON.stringify({ mcpServers: {} }));

      const result = injectMCPConfig('workbuddy');

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);
    });

    it('creates parent directory if ~/.workbuddy does not exist', () => {
      rmSync(WORKBUDDY_DIR, { recursive: true, force: true });

      const result = injectMCPConfig('workbuddy');

      expect(result.success).toBe(true);
      expect(existsSync(WORKBUDDY_DIR)).toBe(true);
    });
  });

  describe('removal', () => {
    it('removes panguard entry from config', () => {
      ensureDir(WORKBUDDY_DIR);
      writeFileSync(
        WORKBUDDY_CONFIG,
        JSON.stringify({
          mcpServers: {
            panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] },
            'other-server': { command: 'node', args: ['server.js'] },
          },
        })
      );

      const result = removeMCPConfig('workbuddy');

      expect(result.success).toBe(true);

      const config = readJsonFile(WORKBUDDY_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['panguard']).toBeUndefined();
      expect(servers['other-server']).toBeDefined();
    });

    it('succeeds when config file does not exist', () => {
      rmSync(WORKBUDDY_CONFIG, { force: true });

      const result = removeMCPConfig('workbuddy');

      expect(result.success).toBe(true);
    });

    it('creates backup before removal', () => {
      ensureDir(WORKBUDDY_DIR);
      writeFileSync(
        WORKBUDDY_CONFIG,
        JSON.stringify({
          mcpServers: { panguard: { command: 'npx' } },
        })
      );

      const result = removeMCPConfig('workbuddy');

      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NemoClaw Sandbox Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('NemoClaw platform sandbox', () => {
  const NEMOCLAW_DIR = join(FAKE_HOME, '.nemoclaw');
  const NEMOCLAW_CONFIG = join(NEMOCLAW_DIR, 'mcp.json');

  beforeEach(() => {
    ensureDir(FAKE_HOME);
  });

  describe('detection', () => {
    it('detects NemoClaw when ~/.nemoclaw directory exists', async () => {
      ensureDir(NEMOCLAW_DIR);

      const platforms = await detectPlatforms();
      const nc = platforms.find((p) => p.id === 'nemoclaw');

      expect(nc).toBeDefined();
      expect(nc!.detected).toBe(true);
      expect(nc!.name).toBe('NemoClaw');
    });

    it('reports not detected when ~/.nemoclaw does not exist', async () => {
      rmSync(NEMOCLAW_DIR, { recursive: true, force: true });

      const platforms = await detectPlatforms();
      const nc = platforms.find((p) => p.id === 'nemoclaw');

      expect(nc).toBeDefined();
      expect(nc!.detected).toBe(false);
    });

    it('reports alreadyConfigured when config contains panguard', async () => {
      ensureDir(NEMOCLAW_DIR);
      writeFileSync(
        NEMOCLAW_CONFIG,
        JSON.stringify({
          mcpServers: { panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] } },
        })
      );

      const platforms = await detectPlatforms();
      const nc = platforms.find((p) => p.id === 'nemoclaw');

      expect(nc!.alreadyConfigured).toBe(true);
    });

    it('reports not configured when config has no panguard entry', async () => {
      ensureDir(NEMOCLAW_DIR);
      writeFileSync(NEMOCLAW_CONFIG, JSON.stringify({ mcpServers: {} }));

      const platforms = await detectPlatforms();
      const nc = platforms.find((p) => p.id === 'nemoclaw');

      expect(nc!.alreadyConfigured).toBe(false);
    });

    it('nemoclaw is included in detectPlatforms result', async () => {
      const platforms = await detectPlatforms();
      const ids = platforms.map((p) => p.id);

      expect(ids).toContain('nemoclaw');
    });
  });

  describe('config path', () => {
    it('returns ~/.nemoclaw/mcp.json', () => {
      const configPath = getConfigPath('nemoclaw');
      expect(configPath).toBe(NEMOCLAW_CONFIG);
    });
  });

  describe('injection', () => {
    beforeEach(() => {
      rmSync(NEMOCLAW_DIR, { recursive: true, force: true });
    });

    it('injects panguard MCP entry into empty config', () => {
      const result = injectMCPConfig('nemoclaw');

      expect(result.success).toBe(true);
      expect(result.configPath).toBe(NEMOCLAW_CONFIG);
      expect(existsSync(NEMOCLAW_CONFIG)).toBe(true);

      const config = readJsonFile(NEMOCLAW_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['panguard']).toBeDefined();

      const entry = servers['panguard'] as Record<string, unknown>;
      expect(entry['command']).toBe('npx');
      expect(entry['args']).toEqual(['-y', '@panguard-ai/panguard-mcp']);
    });

    it('preserves existing MCP servers when injecting', () => {
      ensureDir(NEMOCLAW_DIR);
      writeFileSync(
        NEMOCLAW_CONFIG,
        JSON.stringify({
          mcpServers: {
            'nvidia-tools': { command: 'nemoclaw-tools', args: ['--gpu'] },
          },
        })
      );

      const result = injectMCPConfig('nemoclaw');

      expect(result.success).toBe(true);

      const config = readJsonFile(NEMOCLAW_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['nvidia-tools']).toBeDefined();
      expect(servers['panguard']).toBeDefined();
    });

    it('creates backup before modifying existing config', () => {
      ensureDir(NEMOCLAW_DIR);
      writeFileSync(NEMOCLAW_CONFIG, JSON.stringify({ mcpServers: {} }));

      const result = injectMCPConfig('nemoclaw');

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);
    });

    it('creates parent directory if ~/.nemoclaw does not exist', () => {
      rmSync(NEMOCLAW_DIR, { recursive: true, force: true });

      const result = injectMCPConfig('nemoclaw');

      expect(result.success).toBe(true);
      expect(existsSync(NEMOCLAW_DIR)).toBe(true);
    });

    it('idempotent: re-injection overwrites cleanly', () => {
      injectMCPConfig('nemoclaw');
      const result = injectMCPConfig('nemoclaw');

      expect(result.success).toBe(true);

      const config = readJsonFile(NEMOCLAW_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['panguard']).toBeDefined();
    });
  });

  describe('removal', () => {
    it('removes panguard entry from config', () => {
      ensureDir(NEMOCLAW_DIR);
      writeFileSync(
        NEMOCLAW_CONFIG,
        JSON.stringify({
          mcpServers: {
            panguard: { command: 'npx', args: ['-y', '@panguard-ai/panguard-mcp'] },
            'nvidia-tools': { command: 'nemoclaw-tools', args: ['--gpu'] },
          },
        })
      );

      const result = removeMCPConfig('nemoclaw');

      expect(result.success).toBe(true);

      const config = readJsonFile(NEMOCLAW_CONFIG);
      const servers = config['mcpServers'] as Record<string, unknown>;
      expect(servers['panguard']).toBeUndefined();
      expect(servers['nvidia-tools']).toBeDefined();
    });

    it('succeeds when config file does not exist', () => {
      rmSync(NEMOCLAW_CONFIG, { force: true });

      const result = removeMCPConfig('nemoclaw');

      expect(result.success).toBe(true);
    });

    it('creates backup before removal', () => {
      ensureDir(NEMOCLAW_DIR);
      writeFileSync(
        NEMOCLAW_CONFIG,
        JSON.stringify({
          mcpServers: { panguard: { command: 'npx' } },
        })
      );

      const result = removeMCPConfig('nemoclaw');

      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-platform: All 7 platforms present
// ═══════════════════════════════════════════════════════════════════════════

describe('All 7 platforms registered', () => {
  it('detectPlatforms returns exactly 7 platforms', async () => {
    const platforms = await detectPlatforms();

    expect(platforms).toHaveLength(7);
  });

  it('includes all expected platform IDs', async () => {
    const platforms = await detectPlatforms();
    const ids = platforms.map((p) => p.id);

    const expectedIds: PlatformId[] = [
      'claude-code',
      'claude-desktop',
      'cursor',
      'openclaw',
      'codex',
      'workbuddy',
      'nemoclaw',
    ];

    for (const id of expectedIds) {
      expect(ids).toContain(id);
    }
  });

  it('getConfigPath returns valid path for all platforms', () => {
    const allIds: PlatformId[] = [
      'claude-code',
      'claude-desktop',
      'cursor',
      'openclaw',
      'codex',
      'workbuddy',
      'nemoclaw',
    ];

    for (const id of allIds) {
      const configPath = getConfigPath(id);
      expect(configPath).toBeTruthy();
      expect(typeof configPath).toBe('string');
      expect(configPath.length).toBeGreaterThan(0);
    }
  });
});
