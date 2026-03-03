/**
 * Tests for `panguard config` command
 * Tests command structure, subcommand flow, provider validation,
 * and LLM config operations (save/load/delete)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      expect(optionNames).toContain('--api-key');
      expect(optionNames).toContain('--model');
      expect(optionNames).toContain('--endpoint');
      expect(optionNames).toContain('--show');
      expect(optionNames).toContain('--clear');
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

    it('should accept "claude" as valid provider', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'claude', '--api-key', 'sk-ant-test1234'], {
        from: 'user',
      });
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'claude', apiKey: 'sk-ant-test1234' })
      );
    });

    it('should accept "openai" as valid provider', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'openai', '--api-key', 'sk-proj-test'], {
        from: 'user',
      });
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'openai', apiKey: 'sk-proj-test' })
      );
    });

    it('should accept "ollama" without api-key', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'ollama'], { from: 'user' });
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'ollama' })
      );
    });

    it('should require --api-key for claude provider', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'claude'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('--api-key is required');
      expect(mockSaveLlmConfig).not.toHaveBeenCalled();
    });

    it('should require --api-key for openai provider', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(['llm', '--provider', 'openai'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('--api-key is required');
      expect(mockSaveLlmConfig).not.toHaveBeenCalled();
    });
  });

  describe('config llm with --model and --endpoint', () => {
    it('should forward model override when provided', async () => {
      const cmd = configCommand();
      await cmd.parseAsync(
        ['llm', '--provider', 'claude', '--api-key', 'sk-test', '--model', 'claude-opus-4-6'],
        { from: 'user' }
      );
      expect(mockSaveLlmConfig).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4-6' })
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
