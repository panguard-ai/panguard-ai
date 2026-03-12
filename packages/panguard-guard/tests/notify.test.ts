/**
 * Notification system tests
 * Tests sendNotifications with different channel configurations,
 * parallel dispatch, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NotificationConfig, ThreatVerdict } from '../src/types.js';

// Mock createLogger
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

// Mock individual notification channels
const mockSendTelegram = vi.fn().mockResolvedValue({ channel: 'telegram' as const, success: true });
const mockSendSlack = vi.fn().mockResolvedValue({ channel: 'slack' as const, success: true });
const mockSendEmail = vi.fn().mockResolvedValue({ channel: 'email' as const, success: true });
const mockSendWebhook = vi.fn().mockResolvedValue({ channel: 'webhook' as const, success: true });
const mockSendLine = vi.fn().mockResolvedValue({ channel: 'line' as const, success: true });

vi.mock('../src/notify/telegram.js', () => ({
  sendTelegramNotify: (...args: unknown[]) => mockSendTelegram(...args),
}));

vi.mock('../src/notify/slack.js', () => ({
  sendSlackNotify: (...args: unknown[]) => mockSendSlack(...args),
}));

vi.mock('../src/notify/email.js', () => ({
  sendEmailNotify: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock('../src/notify/webhook.js', () => ({
  sendWebhookNotify: (...args: unknown[]) => mockSendWebhook(...args),
}));

vi.mock('../src/notify/line.js', () => ({
  sendLineNotify: (...args: unknown[]) => mockSendLine(...args),
}));

import { sendNotifications } from '../src/notify/index.js';

function makeVerdict(overrides: Partial<ThreatVerdict> = {}): ThreatVerdict {
  return {
    conclusion: 'malicious',
    confidence: 90,
    reasoning: 'Test reasoning',
    evidence: [{ source: 'rule_match', description: 'test rule', confidence: 90 }],
    recommendedAction: 'block_ip',
    ...overrides,
  };
}

describe('sendNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with no channels configured', () => {
    it('should return empty array when no channels are configured', async () => {
      const config: NotificationConfig = {};
      const verdict = makeVerdict();

      const results = await sendNotifications(config, verdict, 'Test event');

      expect(results).toEqual([]);
    });
  });

  describe('with Telegram only', () => {
    it('should send to Telegram when configured', async () => {
      const config: NotificationConfig = {
        telegram: { botToken: 'test-token', chatId: '12345' },
      };
      const verdict = makeVerdict();

      const results = await sendNotifications(config, verdict, 'Brute force detected');

      expect(mockSendTelegram).toHaveBeenCalledTimes(1);
      expect(mockSendTelegram).toHaveBeenCalledWith(
        config.telegram,
        verdict,
        'Brute force detected'
      );
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('telegram');
      expect(results[0].success).toBe(true);
    });

    it('should handle Telegram failure gracefully', async () => {
      mockSendTelegram.mockResolvedValue({
        channel: 'telegram',
        success: false,
        error: 'Bot token invalid',
      });

      const config: NotificationConfig = {
        telegram: { botToken: 'bad-token', chatId: '12345' },
      };

      const results = await sendNotifications(config, makeVerdict(), 'Test event');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Bot token invalid');
    });
  });

  describe('with Slack only', () => {
    it('should send to Slack when configured', async () => {
      const config: NotificationConfig = {
        slack: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
      };
      const verdict = makeVerdict();

      const results = await sendNotifications(config, verdict, 'SQL injection attempt');

      expect(mockSendSlack).toHaveBeenCalledTimes(1);
      expect(mockSendSlack).toHaveBeenCalledWith(config.slack, verdict, 'SQL injection attempt');
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('slack');
      expect(results[0].success).toBe(true);
    });

    it('should handle Slack failure gracefully', async () => {
      mockSendSlack.mockResolvedValue({
        channel: 'slack',
        success: false,
        error: 'Webhook URL invalid',
      });

      const config: NotificationConfig = {
        slack: { webhookUrl: 'https://bad-url.com' },
      };

      const results = await sendNotifications(config, makeVerdict(), 'Test');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('with Email only', () => {
    it('should send to Email when configured', async () => {
      const config: NotificationConfig = {
        email: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth: { user: 'alert@example.com', pass: 'secret' },
          from: 'alert@example.com',
          to: ['admin@example.com'],
        },
      };
      const verdict = makeVerdict();

      const results = await sendNotifications(config, verdict, 'Malware detected');

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(config.email, verdict, 'Malware detected');
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('email');
      expect(results[0].success).toBe(true);
    });
  });

  describe('with all channels configured', () => {
    const fullConfig: NotificationConfig = {
      telegram: { botToken: 'tg-token', chatId: 'tg-chat' },
      slack: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
      email: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
        from: 'alert@example.com',
        to: ['admin@example.com'],
      },
    };

    it('should dispatch to all three channels in parallel', async () => {
      const verdict = makeVerdict();
      const results = await sendNotifications(fullConfig, verdict, 'Multi-channel test');

      expect(mockSendTelegram).toHaveBeenCalledTimes(1);
      expect(mockSendSlack).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
    });

    it('should collect all success results', async () => {
      mockSendTelegram.mockResolvedValue({ channel: 'telegram', success: true });
      mockSendSlack.mockResolvedValue({ channel: 'slack', success: true });
      mockSendEmail.mockResolvedValue({ channel: 'email', success: true });

      const results = await sendNotifications(fullConfig, makeVerdict(), 'Test');

      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(3);
    });

    it('should handle mixed success and failure', async () => {
      mockSendTelegram.mockResolvedValue({ channel: 'telegram', success: true });
      mockSendSlack.mockResolvedValue({ channel: 'slack', success: false, error: 'Slack down' });
      mockSendEmail.mockResolvedValue({ channel: 'email', success: true });

      const results = await sendNotifications(fullConfig, makeVerdict(), 'Test');

      expect(results).toHaveLength(3);
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(2);
      const failedSlack = results.find((r) => !r.success);
      expect(failedSlack).toBeDefined();
    });

    it('should handle thrown errors from channels as failures', async () => {
      mockSendTelegram.mockRejectedValue(new Error('Network error'));
      mockSendSlack.mockResolvedValue({ channel: 'slack', success: true });
      mockSendEmail.mockResolvedValue({ channel: 'email', success: true });

      const results = await sendNotifications(fullConfig, makeVerdict(), 'Test');

      expect(results).toHaveLength(3);
      // The rejected promise should be caught and recorded as a failure
      const failed = results.find((r) => !r.success);
      expect(failed).toBeDefined();
      expect(failed!.error).toContain('Network error');
    });
  });

  describe('with Webhook only', () => {
    it('should send to Webhook when configured', async () => {
      const config: NotificationConfig = {
        webhook: { url: 'https://example.com/hook', secret: 'mysecret' },
      };
      const verdict = makeVerdict();

      const results = await sendNotifications(config, verdict, 'Webhook test');

      expect(mockSendWebhook).toHaveBeenCalledTimes(1);
      expect(mockSendWebhook).toHaveBeenCalledWith(config.webhook, verdict, 'Webhook test');
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('webhook');
      expect(results[0].success).toBe(true);
    });
  });

  describe('with LINE only', () => {
    it('should send to LINE when configured', async () => {
      const config: NotificationConfig = {
        line: { accessToken: 'line-token-123' },
      };
      const verdict = makeVerdict();

      const results = await sendNotifications(config, verdict, 'LINE test');

      expect(mockSendLine).toHaveBeenCalledTimes(1);
      expect(mockSendLine).toHaveBeenCalledWith(config.line, verdict, 'LINE test');
      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('line');
      expect(results[0].success).toBe(true);
    });
  });

  describe('with all five channels configured', () => {
    it('should dispatch to all five channels in parallel', async () => {
      const config: NotificationConfig = {
        telegram: { botToken: 'tg-token', chatId: 'tg-chat' },
        slack: { webhookUrl: 'https://hooks.slack.com/services/xxx' },
        email: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          auth: { user: 'user', pass: 'pass' },
          from: 'alert@example.com',
          to: ['admin@example.com'],
        },
        webhook: { url: 'https://example.com/hook' },
        line: { accessToken: 'line-token' },
      };
      const verdict = makeVerdict();
      const results = await sendNotifications(config, verdict, 'Five channels');

      expect(mockSendTelegram).toHaveBeenCalledTimes(1);
      expect(mockSendSlack).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendWebhook).toHaveBeenCalledTimes(1);
      expect(mockSendLine).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(5);
    });
  });

  describe('verdict content forwarding', () => {
    it('should forward malicious verdict correctly', async () => {
      const config: NotificationConfig = {
        telegram: { botToken: 'token', chatId: 'chat' },
      };
      const verdict = makeVerdict({
        conclusion: 'malicious',
        confidence: 95,
        mitreTechnique: 'T1059.001',
      });

      await sendNotifications(config, verdict, 'PowerShell execution');

      expect(mockSendTelegram).toHaveBeenCalledWith(
        config.telegram,
        expect.objectContaining({
          conclusion: 'malicious',
          confidence: 95,
          mitreTechnique: 'T1059.001',
        }),
        'PowerShell execution'
      );
    });

    it('should forward suspicious verdict correctly', async () => {
      const config: NotificationConfig = {
        slack: { webhookUrl: 'https://hooks.slack.com/test' },
      };
      const verdict = makeVerdict({
        conclusion: 'suspicious',
        confidence: 70,
      });

      await sendNotifications(config, verdict, 'Suspicious login');

      expect(mockSendSlack).toHaveBeenCalledWith(
        config.slack,
        expect.objectContaining({
          conclusion: 'suspicious',
          confidence: 70,
        }),
        'Suspicious login'
      );
    });

    it('should handle verdict with no evidence', async () => {
      mockSendTelegram.mockResolvedValue({ channel: 'telegram', success: true });

      const config: NotificationConfig = {
        telegram: { botToken: 'token', chatId: 'chat' },
      };
      const verdict = makeVerdict({ evidence: [] });

      const results = await sendNotifications(config, verdict, 'Minimal event');

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle verdict with multiple evidence entries', async () => {
      const config: NotificationConfig = {
        email: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          auth: { user: 'u', pass: 'p' },
          from: 'from@test.com',
          to: ['to@test.com'],
        },
      };
      const verdict = makeVerdict({
        evidence: [
          { source: 'rule_match', description: 'Rule 1', confidence: 80 },
          { source: 'ai_analysis', description: 'AI analysis', confidence: 85 },
          { source: 'threat_intel', description: 'Known bad IP', confidence: 95 },
        ],
      });

      const results = await sendNotifications(config, verdict, 'Complex threat');

      expect(results).toHaveLength(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        config.email,
        expect.objectContaining({
          evidence: expect.arrayContaining([
            expect.objectContaining({ source: 'rule_match' }),
            expect.objectContaining({ source: 'ai_analysis' }),
            expect.objectContaining({ source: 'threat_intel' }),
          ]),
        }),
        'Complex threat'
      );
    });
  });
});
