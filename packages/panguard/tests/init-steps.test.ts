import { describe, it, expect } from 'vitest';
import { getWizardSteps, getQuickSteps } from '../src/init/steps.js';

describe('getWizardSteps', () => {
  it('should include notification credential steps', () => {
    const steps = getWizardSteps();
    const ids = steps.map((s) => s.id);

    expect(ids).toContain('telegram_token');
    expect(ids).toContain('telegram_chat_id');
    expect(ids).toContain('slack_webhook_url');
    expect(ids).toContain('email_smtp_host');
    expect(ids).toContain('email_recipients');
    expect(ids).toContain('webhook_url');
  });

  it('should place credential steps after notification and before aiPreference', () => {
    const steps = getWizardSteps();
    const ids = steps.map((s) => s.id);

    const notificationIdx = ids.indexOf('notification');
    const aiPreferenceIdx = ids.indexOf('aiPreference');
    const credentialIds = [
      'telegram_token',
      'telegram_chat_id',
      'slack_webhook_url',
      'email_smtp_host',
      'email_recipients',
      'webhook_url',
    ];

    for (const credId of credentialIds) {
      const idx = ids.indexOf(credId);
      expect(idx).toBeGreaterThan(notificationIdx);
      expect(idx).toBeLessThan(aiPreferenceIdx);
    }
  });

  it('should have dependsOn for credential steps', () => {
    const steps = getWizardSteps();

    const telegramToken = steps.find((s) => s.id === 'telegram_token');
    expect(telegramToken?.dependsOn).toEqual({
      stepId: 'notification',
      values: ['telegram'],
    });

    const telegramChatId = steps.find((s) => s.id === 'telegram_chat_id');
    expect(telegramChatId?.dependsOn).toEqual({
      stepId: 'notification',
      values: ['telegram'],
    });

    const slackWebhook = steps.find((s) => s.id === 'slack_webhook_url');
    expect(slackWebhook?.dependsOn).toEqual({
      stepId: 'notification',
      values: ['slack'],
    });

    const emailSmtp = steps.find((s) => s.id === 'email_smtp_host');
    expect(emailSmtp?.dependsOn).toEqual({
      stepId: 'notification',
      values: ['email'],
    });

    const emailRecipients = steps.find((s) => s.id === 'email_recipients');
    expect(emailRecipients?.dependsOn).toEqual({
      stepId: 'notification',
      values: ['email'],
    });

    const webhookUrl = steps.find((s) => s.id === 'webhook_url');
    expect(webhookUrl?.dependsOn).toEqual({
      stepId: 'notification',
      values: ['webhook'],
    });
  });

  it('should have validation on credential steps', () => {
    const steps = getWizardSteps();

    const telegramToken = steps.find((s) => s.id === 'telegram_token');
    expect(telegramToken?.validate?.('')).toBe('Required');
    expect(telegramToken?.validate?.('valid-token')).toBeNull();

    const telegramChatId = steps.find((s) => s.id === 'telegram_chat_id');
    expect(telegramChatId?.validate?.('')).toBe('Required');
    expect(telegramChatId?.validate?.('-1001234567890')).toBeNull();

    const slackWebhook = steps.find((s) => s.id === 'slack_webhook_url');
    expect(slackWebhook?.validate?.('http://not-secure')).toBe('Must be an HTTPS URL');
    expect(slackWebhook?.validate?.('https://hooks.slack.com/services/xxx')).toBeNull();

    const emailSmtp = steps.find((s) => s.id === 'email_smtp_host');
    expect(emailSmtp?.validate?.('')).toBe('Required');
    expect(emailSmtp?.validate?.('smtp.gmail.com')).toBeNull();

    const emailRecipients = steps.find((s) => s.id === 'email_recipients');
    expect(emailRecipients?.validate?.('not-an-email')).toBe('Enter a valid email');
    expect(emailRecipients?.validate?.('user@example.com')).toBeNull();

    const webhookUrl = steps.find((s) => s.id === 'webhook_url');
    expect(webhookUrl?.validate?.('http://insecure')).toBe('Must be an HTTPS URL');
    expect(webhookUrl?.validate?.('https://api.example.com/webhook')).toBeNull();
  });

  it('should use text inputType for all credential steps', () => {
    const steps = getWizardSteps();
    const credentialIds = [
      'telegram_token',
      'telegram_chat_id',
      'slack_webhook_url',
      'email_smtp_host',
      'email_recipients',
      'webhook_url',
    ];

    for (const id of credentialIds) {
      const step = steps.find((s) => s.id === id);
      expect(step?.inputType).toBe('text');
    }
  });

  it('should have bilingual titles and descriptions for credential steps', () => {
    const steps = getWizardSteps();
    const credentialIds = [
      'telegram_token',
      'telegram_chat_id',
      'slack_webhook_url',
      'email_smtp_host',
      'email_recipients',
      'webhook_url',
    ];

    for (const id of credentialIds) {
      const step = steps.find((s) => s.id === id);
      expect(step?.title).toHaveProperty('en');
      expect(step?.title).toHaveProperty('zh-TW');
      expect(step?.description).toHaveProperty('en');
      expect(step?.description).toHaveProperty('zh-TW');
    }
  });
});

describe('getQuickSteps', () => {
  it('should not include notification credential steps', () => {
    const steps = getQuickSteps();
    const ids = steps.map((s) => s.id);

    expect(ids).not.toContain('telegram_token');
    expect(ids).not.toContain('slack_webhook_url');
    expect(ids).not.toContain('webhook_url');
  });
});
