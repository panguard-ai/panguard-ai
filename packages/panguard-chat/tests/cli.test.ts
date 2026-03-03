/**
 * CLI setup config persistence tests
 * CLI 設定配置持久化測試
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('commandSetup config persistence', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    delete process.env['PANGUARD_CHAT_CONFIG'];
  });

  it('should save config when channel and user-type provided', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chat-test-'));
    const configPath = join(tempDir, 'config.json');
    process.env['PANGUARD_CHAT_CONFIG'] = configPath;

    const { runCLI } = await import('../src/cli/index.js');
    await runCLI(['setup', '--channel', 'webhook', '--user-type', 'it_admin', '--url', 'https://example.com/hook']);

    expect(existsSync(configPath)).toBe(true);
    const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(saved.userProfile.notificationChannel).toBe('webhook');
    expect(saved.userProfile.type).toBe('it_admin');
    expect(saved.channels.webhook.endpoint).toBe('https://example.com/hook');
    expect(saved.maxFollowUpTokens).toBe(2000);
  });

  it('should save config with default language zh-TW', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chat-test-'));
    const configPath = join(tempDir, 'config.json');
    process.env['PANGUARD_CHAT_CONFIG'] = configPath;

    const { runCLI } = await import('../src/cli/index.js');
    await runCLI(['setup', '--channel', 'webhook', '--user-type', 'developer', '--url', 'https://example.com/hook']);

    const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(saved.userProfile.language).toBe('zh-TW');
  });

  it('should save config with en language when --lang en specified', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chat-test-'));
    const configPath = join(tempDir, 'config.json');
    process.env['PANGUARD_CHAT_CONFIG'] = configPath;

    const { runCLI } = await import('../src/cli/index.js');
    await runCLI(['setup', '--channel', 'webhook', '--user-type', 'boss', '--lang', 'en', '--url', 'https://example.com/hook']);

    const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(saved.userProfile.language).toBe('en');
    expect(saved.userProfile.type).toBe('boss');
  });

  it('should save telegram config with token and chat-id', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chat-test-'));
    const configPath = join(tempDir, 'config.json');
    process.env['PANGUARD_CHAT_CONFIG'] = configPath;

    const { runCLI } = await import('../src/cli/index.js');
    await runCLI(['setup', '--channel', 'telegram', '--user-type', 'it_admin', '--token', 'bot123', '--chat-id', '456']);

    const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(saved.channels.telegram.botToken).toBe('bot123');
    expect(saved.channels.telegram.chatId).toBe('456');
  });

  it('should save default preferences with all enabled', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'chat-test-'));
    const configPath = join(tempDir, 'config.json');
    process.env['PANGUARD_CHAT_CONFIG'] = configPath;

    const { runCLI } = await import('../src/cli/index.js');
    await runCLI(['setup', '--channel', 'webhook', '--user-type', 'it_admin', '--url', 'https://example.com/hook']);

    const saved = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(saved.userProfile.preferences.criticalAlerts).toBe(true);
    expect(saved.userProfile.preferences.dailySummary).toBe(true);
    expect(saved.userProfile.preferences.weeklySummary).toBe(true);
    expect(saved.userProfile.preferences.peacefulReport).toBe(true);
  });
});
