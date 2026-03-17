/**
 * Platform Sandbox Tests
 * 平台沙盒測試
 *
 * Tests platform detection and config path resolution
 * using isolated temp directories as sandboxed home environments.
 *
 * Note: WorkBuddy, NemoClaw, QClaw tests removed (platforms dropped in 3b2c49dc).
 *
 * @module @panguard-ai/panguard-mcp/tests/platform-sandbox
 */

import { describe, it, expect, vi, afterAll } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
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
import type { PlatformId } from '../src/config/platform-detector.js';

// ─── Cleanup ────────────────────────────────────────────────────────────────

afterAll(() => {
  rmSync(SANDBOX_ROOT, { recursive: true, force: true });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Cross-platform: All supported platforms
// ═══════════════════════════════════════════════════════════════════════════

describe('All supported platforms registered', () => {
  it('detectPlatforms returns exactly 5 platforms', async () => {
    const platforms = await detectPlatforms();
    expect(platforms).toHaveLength(5);
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
    ];

    for (const id of expectedIds) {
      expect(ids).toContain(id);
    }
  });

  it('getConfigPath returns valid path for all platforms', () => {
    const allIds: PlatformId[] = ['claude-code', 'claude-desktop', 'cursor', 'openclaw', 'codex'];

    for (const id of allIds) {
      const configPath = getConfigPath(id);
      expect(configPath).toBeTruthy();
      expect(typeof configPath).toBe('string');
      expect(configPath!.length).toBeGreaterThan(0);
    }
  });
});
