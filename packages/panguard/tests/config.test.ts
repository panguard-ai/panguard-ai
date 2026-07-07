/**
 * Tests for `panguard config` command
 * Tests command structure, subcommand flow, provider validation,
 * and LLM config operations (save/load/delete)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { configCommand } from '../src/cli/commands/config.js';

// Mock credentials module
const mockSaveLlmConfig = vi.fn();
const mockLoadLlmConfig = vi.fn();
const mockDeleteLlmConfig = vi.fn();

vi.mock('../src/cli/credentials.js', () => ({
  saveLlmConfig: (...args: unknown[]) => mockSaveLlmConfig(...args),
  loadLlmConfig: () => mockLoadLlmConfig(),
  deleteLlmConfig: () => mockDeleteLlmConfig(),
}));

vi.mock('@panguard-ai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@panguard-ai/core')>();
  return {
    ...actual,
    c: {
      sage: (s: string) => s,
      bold: (s: string) => s,
      dim: (s: string) => s,
      safe: (s: string) => s,
      caution: (s: string) => s,
      critical: (s: string) => s,
      underline: (s: string) => s,
    },
    banner: () => 'BANNER',
  };
});

vi.mock('../../index.js', () => ({
  PANGUARD_VERSION: '0.0.0-test',
}));

describe('configCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create a command named "config"', () => {
    const cmd = configCommand();
    expect(cmd.name()).toBe('config');
  });

  it('should have a description', () => {
    const cmd = configCommand();
    expect(cmd.description()).toContain('configuration');
  });

  describe('llm subcommand', () => {
    it('should register "llm" subcommand', () => {
      const cmd = configCommand();
      const subcommandNames = cmd.commands.map((c) => c.name());
      expect(subcommandNames).toContain('llm');
    });

    it('should have LLM subcommand with relevant options', () => {
      const cmd = configCommand();
      const llmCmd = cmd.commands.find((c) => c.name() === 'llm');
      expect(llmCmd).toBeDefined();
      const optionNames = llmCmd!.options.map((o) => o.long);
      expect(optionNames).toContain('--provider');
      expect(optionNames).toContain('--model');
      expect(optionNames).toContain('--endpoint');
      expect(optionNames).toContain('--show');
      expect(optionNames).toContain('--clear');
    });

    it('must NOT expose an --api-key option (secret via argv = ps leak)', () => {
      const cmd = configCommand();
      const llmCmd = cmd.commands.find((c) => c.name() === 'llm');
      const optionNames = llmCmd!.options.map((o) => o.long);
      expect(optionNames).not.toContain('--api-key');
    });
  });

  describe('config llm --show', () => {
    it('should show "No LLM configuration found" when no config exists', async () => {
      mockLoadLlmConfig.mockReturnValue(null);
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--show'], { from: 'user' });
      expect(mockLoadLlmConfig).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('No LLM configuration found');
    });

    it('should display provider and masked API key when config exists', async () => {
      mockLoadLlmConfig.mockReturnValue({
        provider: 'claude',
        apiKey: 'sk-ant-1234567890abcdef',
        model: 'claude-haiku-4-5-20251001',
        endpoint: undefined,
        savedAt: '2026-01-15T00:00:00.000Z',
      });
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--show'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('claude');
      expect(output).toContain('LLM Configuration');
    });
  });

  describe('config llm --clear', () => {
    it('should call deleteLlmConfig when --clear is used', async () => {
      mockDeleteLlmConfig.mockReturnValue(true);
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--clear'], { from: 'user' });
      expect(mockDeleteLlmConfig).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('removed');
    });

    it('should show message when no config to remove', async () => {
      mockDeleteLlmConfig.mockReturnValue(false);
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--clear'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('No LLM configuration to remove');
    });
  });

  describe('config llm --provider', () => {
    it('should require --provider flag', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('--provider is required');
    });

    it('should reject invalid provider names', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'gemini'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Invalid provider');
      expect(output).toContain('gemini');
      expect(mockSaveLlmConfig).not.toHaveBeenCalled();
    });

    it('should NOT persist a cloud key for "claude" — prints env-var guidance instead', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'claude'], { from: 'user' });
      // Cloud keys are read from the environment, never written to disk.
      expect(mockSaveLlmConfig).not.toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('ANTHROPIC_API_KEY');
      expect(output).toContain('OPENAI_API_KEY');
    });

    it('should NOT persist a cloud key for "openai" — prints env-var guidance instead', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'openai'], { from: 'user' });
      expect(mockSaveLlmConfig).not.toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('ANTHROPIC_API_KEY');
      expect(output).toContain('OPENAI_API_KEY');
    });

    it('should accept "ollama" (no key involved)', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'ollama'], { from: 'user' });
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'ollama' })
      );
    });

    it('should never pass an apiKey field to saveLlmConfig', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'ollama'], { from: 'user' });
      const saved = mockSaveLlmConfig.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(saved).toBeDefined();
      expect(saved).not.toHaveProperty('apiKey');
    });
  });

  describe('config llm with --model and --endpoint', () => {
    it('should forward model override when provided (ollama — the persisted path)', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'ollama', '--model', 'llama3.2'], {
        from: 'user',
      });
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'llama3.2' })
      );
    });

    it('should forward endpoint override when provided', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(
        ['llm', '--provider', 'ollama', '--endpoint', 'http://gpu-server:11434'],
        { from: 'user' }
      );
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'http://gpu-server:11434' })
      );
    });

    it('should include savedAt timestamp in saved config', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'ollama'], { from: 'user' });
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          savedAt: expect.any(String),
        })
      );
      // Verify it's an ISO date string
      const savedConfig = mockSaveLlmConfig.mock.calls[0]![0] as { savedAt: string };
      expect(() => new Date(savedConfig.savedAt)).not.toThrow();
      expect(new Date(savedConfig.savedAt).toISOString()).toBe(savedConfig.savedAt);
    });
  });
});

/**
 * `pga config set <key> <value>` — boolean validation (the silent-reverse-set bug).
 *
 * The action calls process.exit(1) and writes ~/.panguard-guard/config.json via
 * homedir(), so we drive the REAL built CLI through a spawn harness (same shape as
 * hook.test.ts's run()) with a throwaway HOME, and assert against the actual file
 * that gets written. Two contracts are locked:
 *   1. Recognised truthy/falsy words map to the CORRECT boolean (on/enabled/true →
 *      true, false → false) — no accidental inversion.
 *   2. An UNRECOGNISED value exits non-zero AND does not touch the config — the
 *      original bug silently coerced anything-not-truthy to FALSE, disabling the
 *      very thing the user was trying to enable.
 */
describe('pga config set — boolean validation (no silent reverse-set)', () => {
  const bin = join(fileURLToPath(new URL('../', import.meta.url)), 'bin', 'panguard.cjs');

  let home: string | undefined;
  const origHome = process.env['HOME'];

  afterEach(() => {
    if (origHome === undefined) delete process.env['HOME'];
    else process.env['HOME'] = origHome;
    if (home) {
      rmSync(home, { recursive: true, force: true });
      home = undefined;
    }
  });

  // homedir() honors $HOME on macOS/Linux, so a throwaway HOME fully sandboxes
  // the config write — the real ~/.panguard-guard is never touched.
  const sandbox = (): string => {
    home = mkdtempSync(join(tmpdir(), 'pg-cfg-home-'));
    return home;
  };

  const configPath = (h: string): string => join(h, '.panguard-guard', 'config.json');

  // Run the real CLI. Returns exit status + whatever was persisted (or null).
  const run = (h: string, args: string[]): { status: number; config: Record<string, unknown> | null } => {
    const r = spawnSync(process.execPath, [bin, 'config', 'set', ...args], {
      env: { ...process.env, HOME: h },
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const p = configPath(h);
    const config = existsSync(p)
      ? (JSON.parse(readFileSync(p, 'utf-8')) as Record<string, unknown>)
      : null;
    return { status: r.status ?? -1, config };
  };

  it.runIf(existsSync(bin))(
    'telemetry: on / enabled / true all persist telemetryEnabled=TRUE (never inverted)',
    () => {
      for (const word of ['on', 'enabled', 'true']) {
        const h = sandbox();
        const { status, config } = run(h, ['telemetry', word]);
        expect(status).toBe(0);
        expect(config).toEqual({ telemetryEnabled: true });
        rmSync(h, { recursive: true, force: true });
        home = undefined;
      }
    },
    30000
  );

  it.runIf(existsSync(bin))(
    'telemetry: false / off / disabled all persist telemetryEnabled=FALSE',
    () => {
      for (const word of ['false', 'off', 'disabled']) {
        const h = sandbox();
        const { status, config } = run(h, ['telemetry', word]);
        expect(status).toBe(0);
        expect(config).toEqual({ telemetryEnabled: false });
        rmSync(h, { recursive: true, force: true });
        home = undefined;
      }
    },
    30000
  );

  it.runIf(existsSync(bin))(
    'threat-cloud on persists threatCloudUploadEnabled=TRUE',
    () => {
      const h = sandbox();
      const { status, config } = run(h, ['threat-cloud', 'on']);
      expect(status).toBe(0);
      expect(config).toEqual({ threatCloudUploadEnabled: true });
    },
    30000
  );

  it.runIf(existsSync(bin))(
    'REGRESSION: an unknown value exits 1 and writes NOTHING (no silent false)',
    () => {
      const h = sandbox();
      const { status, config } = run(h, ['telemetry', 'banana']);
      // Loud failure, not a silent coerce-to-false.
      expect(status).not.toBe(0);
      // Nothing was persisted at all — the file must not even exist.
      expect(config).toBeNull();
    },
    30000
  );

  it.runIf(existsSync(bin))(
    'REGRESSION: an unknown value NEVER flips an ALREADY-true setting to false',
    () => {
      const h = sandbox();
      // First, legitimately enable telemetry.
      expect(run(h, ['telemetry', 'true']).config).toEqual({ telemetryEnabled: true });
      const before = readFileSync(configPath(h), 'utf-8');

      // Now a typo'd value must be rejected AND leave the config byte-for-byte intact
      // — the original bug would have silently rewritten it to { telemetryEnabled: false }.
      const { status } = run(h, ['telemetry', 'disable-it-please']);
      expect(status).not.toBe(0);
      expect(readFileSync(configPath(h), 'utf-8')).toBe(before);
    },
    30000
  );

  it.runIf(existsSync(bin))(
    'an unknown KEY also exits 1 and writes nothing',
    () => {
      const h = sandbox();
      const { status, config } = run(h, ['bogus-key', 'true']);
      expect(status).not.toBe(0);
      expect(config).toBeNull();
    },
    30000
  );
});
