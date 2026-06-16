/**
 * Tests for the shared secret redactor used by the dashboard /api/config
 * handler and the CLI `config` dump.
 */

import { describe, it, expect } from 'vitest';
import { redactSecrets, SECRET_KEY_RE, REDACTED } from '../src/redact.js';

describe('redactSecrets', () => {
  it('redacts ai.apiKey', () => {
    const out = redactSecrets({ ai: { provider: 'claude', apiKey: 'sk-ant-secret123' } });
    expect(out.ai.apiKey).toBe(REDACTED);
    expect(out.ai.provider).toBe('claude');
  });

  it('redacts threatCloudApiKey, licenseKey and notification secrets', () => {
    const out = redactSecrets({
      threatCloudApiKey: 'tc-key-abc',
      licenseKey: 'lic-xyz',
      notifications: {
        telegram: { botToken: 'bot-123', chatId: '42' },
        slack: { webhookUrl: 'https://hooks.slack.com/aaa' },
        email: { auth: { user: 'u', pass: 'smtp-secret' }, host: 'mail' },
        webhook: { url: 'https://x', secret: 'hook-secret' },
      },
    });
    expect(out.threatCloudApiKey).toBe(REDACTED);
    expect(out.licenseKey).toBe(REDACTED);
    expect(out.notifications.telegram.botToken).toBe(REDACTED);
    expect(out.notifications.email.auth.pass).toBe(REDACTED);
    expect(out.notifications.webhook.secret).toBe(REDACTED);
    // Non-secret fields survive so the reader can tell a channel is configured.
    expect(out.notifications.telegram.chatId).toBe('42');
    expect(out.notifications.email.host).toBe('mail');
    expect(out.notifications.slack.webhookUrl).toBe('https://hooks.slack.com/aaa');
  });

  it('leaves empty and non-string secret-named values untouched', () => {
    const out = redactSecrets({ apiKey: '', token: undefined, secret: null, count: 7 });
    expect(out.apiKey).toBe('');
    expect(out.count).toBe(7);
  });

  it('does not mutate the input object', () => {
    const input = { ai: { apiKey: 'sk-keep-me' } };
    redactSecrets(input);
    expect(input.ai.apiKey).toBe('sk-keep-me');
  });

  it('SECRET_KEY_RE matches expected secret-ish key names', () => {
    for (const k of ['apiKey', 'api_key', 'licenseKey', 'botToken', 'password', 'pass', 'secret']) {
      expect(SECRET_KEY_RE.test(k)).toBe(true);
    }
    for (const k of ['provider', 'model', 'chatId', 'host', 'endpoint']) {
      expect(SECRET_KEY_RE.test(k)).toBe(false);
    }
  });
});
