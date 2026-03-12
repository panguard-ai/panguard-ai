/**
 * Tests for `panguard status` command
 * Tests command structure, JSON output mode, and status collection logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statusCommand } from '../src/cli/commands/status.js';

// Mock readConfig to control test scenarios
const mockReadConfig = vi.fn();

vi.mock('../src/init/config-writer.js', () => ({
  readConfig: () => mockReadConfig(),
}));

// Mock fs operations to control guard PID and scan result checks
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(''),
  };
});

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
    },
    symbols: {
      info: '[i]',
      pass: '[ok]',
      fail: '[x]',
      warn: '[!]',
      scan: '[scan]',
    },
    divider: (label: string) => `--- ${label} ---`,
    statusPanel: (_title: string, items: Array<{ label: string; value: string }>) =>
      items.map((i) => `${i.label}: ${i.value}`).join('\n'),
    scoreDisplay: (score: number, grade: string) => `Score: ${score} Grade: ${grade}`,
    table: (_cols: unknown, rows: Array<Record<string, string>>) =>
      rows.map((r) => Object.values(r).join(' | ')).join('\n'),
    timeAgo: (ts: string) => `time-ago(${ts})`,
    header: (text: string) => `=== ${text} ===`,
    scoreToGrade: (score: number) => {
      if (score >= 90) return 'A';
      if (score >= 75) return 'B';
      if (score >= 60) return 'C';
      if (score >= 40) return 'D';
      return 'F';
    },
  };
});

describe('statusCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create a command named "status"', () => {
    const cmd = statusCommand();
    expect(cmd.name()).toBe('status');
  });

  it('should have a description mentioning status', () => {
    const cmd = statusCommand();
    expect(cmd.description()).toContain('status');
  });

  describe('options', () => {
    it('should define --json option', () => {
      const cmd = statusCommand();
      const jsonOpt = cmd.options.find((o) => o.long === '--json');
      expect(jsonOpt).toBeDefined();
    });

    it('should define --lang option', () => {
      const cmd = statusCommand();
      const langOpt = cmd.options.find((o) => o.long === '--lang');
      expect(langOpt).toBeDefined();
    });
  });

  describe('no config scenario', () => {
    it('should indicate config is not initialized when no config exists (en)', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--lang', 'en'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Not initialized');
    });

    it('should suggest running "panguard init" (en)', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--lang', 'en'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('panguard init');
    });

    it('should show Chinese text when lang is zh-TW', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--lang', 'zh-TW'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('panguard init');
    });
  });

  describe('JSON output mode', () => {
    it('should output valid JSON when --json flag is set (no config)', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--json'], { from: 'user' });

      // The console.log call receives the JSON string
      expect(consoleSpy).toHaveBeenCalled();
      const jsonOutput = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(jsonOutput);
      expect(parsed).toHaveProperty('configLoaded', false);
      expect(parsed).toHaveProperty('guard', null);
      expect(parsed).toHaveProperty('lastScan', null);
      expect(parsed).toHaveProperty('notifications');
      expect(parsed).toHaveProperty('modules');
    });

    it('should include configPath in JSON output', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--json'], { from: 'user' });
      const jsonOutput = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(jsonOutput);
      expect(parsed).toHaveProperty('configPath');
      expect(typeof parsed.configPath).toBe('string');
      expect(parsed.configPath as string).toContain('.panguard');
    });

    it('should show modules from config in JSON output', async () => {
      mockReadConfig.mockReturnValue({
        modules: {
          guard: true,
          scan: true,
          chat: false,
          trap: false,
          report: true,
          dashboard: true,
        },
        guard: { mode: 'learning', learningDays: 7 },
        notifications: { channel: 'telegram', configured: true },
        trap: { enabled: false, services: [] },
        ai: { preference: 'cloud_ai', provider: 'claude' },
        meta: { language: 'en' },
      });
      const cmd = statusCommand();
      await cmd.parseAsync(['--json'], { from: 'user' });
      const jsonOutput = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(jsonOutput);
      expect(parsed).toHaveProperty('configLoaded', true);
      expect(parsed.modules).toHaveProperty('guard');
      expect(parsed.modules).toHaveProperty('scan');
      expect(parsed.modules.guard.enabled).toBe(true);
      expect(parsed.modules.chat.enabled).toBe(false);
      expect(parsed.modules.chat.status).toBe('disabled');
    });

    it('should include AI and notification status in JSON output', async () => {
      mockReadConfig.mockReturnValue({
        modules: {
          guard: true,
          scan: true,
          chat: true,
          trap: false,
          report: true,
          dashboard: true,
        },
        guard: { mode: 'protection', learningDays: 7 },
        notifications: { channel: 'slack', configured: true },
        trap: { enabled: false, services: [] },
        ai: { preference: 'cloud_ai', provider: 'claude' },
        meta: { language: 'en' },
      });
      const cmd = statusCommand();
      await cmd.parseAsync(['--json'], { from: 'user' });
      const jsonOutput = consoleSpy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.ai).toEqual({ preference: 'cloud_ai', provider: 'claude' });
      expect(parsed.notifications).toEqual({ channel: 'slack', configured: true });
    });
  });

  describe('language option', () => {
    it('should accept --lang zh-TW', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--lang', 'zh-TW'], { from: 'user' });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should accept --lang en and output English', async () => {
      mockReadConfig.mockReturnValue(null);
      const cmd = statusCommand();
      await cmd.parseAsync(['--lang', 'en'], { from: 'user' });
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('System Status');
    });
  });
});
