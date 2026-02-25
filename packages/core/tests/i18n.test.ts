import { describe, it, expect, beforeEach } from 'vitest';
import { initI18n, getI18n, changeLanguage, t, resetI18n } from '../src/i18n/index.js';

describe('i18n', () => {
  beforeEach(() => {
    resetI18n();
  });

  it('should initialize with English by default', async () => {
    await initI18n('en');
    const i18n = getI18n();
    expect(i18n).not.toBeNull();
    expect(i18n?.language).toBe('en');
  });

  it('should translate common terms in English', async () => {
    await initI18n('en');
    expect(t('welcome')).toBe('Welcome to OpenClaw Security');
    expect(t('appName')).toBe('OpenClaw Security Platform');
  });

  it('should initialize with Traditional Chinese', async () => {
    await initI18n('zh-TW');
    const i18n = getI18n();
    expect(i18n?.language).toBe('zh-TW');
  });

  it('should translate common terms in Traditional Chinese', async () => {
    await initI18n('zh-TW');
    expect(t('welcome')).toContain('OpenClaw Security');
    expect(t('appName')).toBe('OpenClaw 安全平台');
  });

  it('should switch language from English to Chinese', async () => {
    await initI18n('en');
    expect(t('settings')).toBe('Settings');

    await changeLanguage('zh-TW');
    expect(t('settings')).toBe('設定');
  });

  it('should translate security namespace terms', async () => {
    await initI18n('en');
    expect(t('security:scan.title')).toBe('Security Scan');

    await changeLanguage('zh-TW');
    expect(t('security:scan.title')).toBe('安全掃描');
  });

  it('should translate severity levels', async () => {
    await initI18n('en');
    expect(t('security:threats.severity.critical')).toBe('Critical');

    await changeLanguage('zh-TW');
    expect(t('security:threats.severity.critical')).toBe('嚴重');
  });

  it('should return key when not initialized', () => {
    const result = t('nonExistentKey');
    expect(result).toBe('nonExistentKey');
  });

  it('should throw when changing language before init', async () => {
    await expect(changeLanguage('zh-TW')).rejects.toThrow('i18n not initialized');
  });

  it('should return null from getI18n when not initialized', () => {
    expect(getI18n()).toBeNull();
  });
});
