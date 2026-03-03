/**
 * Config loader tests
 * Tests loadConfig with guard-specific, master config fallback, and defaults.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

// Mock createLogger before importing config
vi.mock('@panguard-ai/core', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@panguard-ai/core');
  return {
    ...actual,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

import { loadConfig, DEFAULT_GUARD_CONFIG, DEFAULT_DATA_DIR } from '../src/config.js';
import { DEFAULT_ACTION_POLICY } from '../src/types.js';

describe('loadConfig', () => {
  const testDir = join(tmpdir(), `panguard-config-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return defaults when no config file exists', () => {
    const config = loadConfig(join(testDir, 'nonexistent.json'));

    expect(config.mode).toBe(DEFAULT_GUARD_CONFIG.mode);
    expect(config.learningDays).toBe(DEFAULT_GUARD_CONFIG.learningDays);
    expect(config.actionPolicy).toEqual(DEFAULT_ACTION_POLICY);
  });

  it('should load and merge guard-specific config', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        mode: 'protection',
        learningDays: 14,
        verbose: true,
      })
    );

    const config = loadConfig(configPath);

    expect(config.mode).toBe('protection');
    expect(config.learningDays).toBe(14);
    expect(config.verbose).toBe(true);
    // Defaults should still be present for unspecified fields
    expect(config.dashboardPort).toBe(DEFAULT_GUARD_CONFIG.dashboardPort);
    expect(config.actionPolicy).toEqual(DEFAULT_ACTION_POLICY);
  });

  it('should support legacy actionThresholds key', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        mode: 'protection',
        actionThresholds: { autoRespond: 85, notifyAndWait: 60 },
      })
    );

    const config = loadConfig(configPath);

    expect(config.actionPolicy.autoRespond).toBe(85);
    expect(config.actionPolicy.notifyAndWait).toBe(60);
    expect(config.actionPolicy.logOnly).toBe(0); // default
  });

  it('should merge nested monitors config', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        monitors: { logMonitor: false, networkMonitor: false },
      })
    );

    const config = loadConfig(configPath);

    expect(config.monitors.logMonitor).toBe(false);
    expect(config.monitors.networkMonitor).toBe(false);
    // Unspecified monitors should keep defaults
    expect(config.monitors.processMonitor).toBe(true);
    expect(config.monitors.fileMonitor).toBe(true);
  });

  it('should merge notifications config', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        notifications: {
          telegram: { botToken: 'test-bot', chatId: '12345' },
        },
      })
    );

    const config = loadConfig(configPath);

    expect(config.notifications.telegram).toEqual({
      botToken: 'test-bot',
      chatId: '12345',
    });
  });

  it('should handle malformed JSON gracefully', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(configPath, '{ invalid json');

    const config = loadConfig(configPath);

    // Should fall back to defaults
    expect(config.mode).toBe(DEFAULT_GUARD_CONFIG.mode);
    expect(config.actionPolicy).toEqual(DEFAULT_ACTION_POLICY);
  });

  it('should export DEFAULT_DATA_DIR as ~/.panguard-guard', () => {
    expect(DEFAULT_DATA_DIR).toContain('.panguard-guard');
  });
});

describe('loadConfig - master config fallback', () => {
  // This tests the conceptual behavior; actual fallback to ~/.panguard/config.json
  // is difficult to test without mocking homedir, but we can test the guard config
  // loading path with a full config that includes all fields.

  const testDir = join(tmpdir(), `panguard-config-master-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load complete config with all notification types', () => {
    const configPath = join(testDir, 'config.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        lang: 'en',
        mode: 'protection',
        learningDays: 3,
        actionPolicy: { autoRespond: 95, notifyAndWait: 80, logOnly: 0 },
        notifications: {
          telegram: { botToken: 'tg-token', chatId: 'tg-chat' },
          slack: { webhookUrl: 'https://hooks.slack.com/xxx' },
          webhook: { url: 'https://my-siem.com/hook', secret: 'sec123' },
          line: { accessToken: 'line-tok' },
        },
        monitors: {
          logMonitor: true,
          networkMonitor: true,
          processMonitor: false,
          fileMonitor: false,
        },
        verbose: true,
        dashboardEnabled: false,
      })
    );

    const config = loadConfig(configPath);

    expect(config.lang).toBe('en');
    expect(config.mode).toBe('protection');
    expect(config.learningDays).toBe(3);
    expect(config.actionPolicy.autoRespond).toBe(95);
    expect(config.notifications.telegram?.botToken).toBe('tg-token');
    expect(config.notifications.slack?.webhookUrl).toBe('https://hooks.slack.com/xxx');
    expect(config.notifications.webhook?.url).toBe('https://my-siem.com/hook');
    expect(config.notifications.line?.accessToken).toBe('line-tok');
    expect(config.monitors.processMonitor).toBe(false);
    expect(config.verbose).toBe(true);
    expect(config.dashboardEnabled).toBe(false);
  });
});
