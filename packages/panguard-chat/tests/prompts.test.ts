/**
 * Prompts tests
 * 提示詞測試
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, getUserTypeInstructions } from '../src/agent/prompts.js';

describe('getUserTypeInstructions', () => {
  it('should return developer instructions in zh-TW', () => {
    const result = getUserTypeInstructions('developer', 'zh-TW');
    expect(result).toContain('CVE');
    expect(result).toContain('MITRE');
    expect(result).toContain('CLI');
  });

  it('should return developer instructions in en', () => {
    const result = getUserTypeInstructions('developer', 'en');
    expect(result).toContain('CVE');
    expect(result).toContain('MITRE');
  });

  it('should return boss instructions without technical terms in zh-TW', () => {
    const result = getUserTypeInstructions('boss', 'zh-TW');
    expect(result).toContain('不懂技術');
    expect(result).toContain('類比');
    expect(result).not.toContain('CVE');
  });

  it('should return boss instructions without technical terms in en', () => {
    const result = getUserTypeInstructions('boss', 'en');
    expect(result).toContain('no technical background');
    expect(result).toContain('analogies');
  });

  it('should return it_admin instructions with compliance in zh-TW', () => {
    const result = getUserTypeInstructions('it_admin', 'zh-TW');
    expect(result).toContain('合規');
    expect(result).toContain('MITRE');
  });

  it('should return it_admin instructions in en', () => {
    const result = getUserTypeInstructions('it_admin', 'en');
    expect(result).toContain('compliance');
    expect(result).toContain('MITRE');
  });
});

describe('buildSystemPrompt', () => {
  it('should build zh-TW prompt with user type instructions', () => {
    const prompt = buildSystemPrompt('developer', 'zh-TW');
    expect(prompt).toContain('Panguard AI');
    expect(prompt).toContain('AI 保鑣');
    expect(prompt).toContain('CVE'); // developer-specific instructions injected
  });

  it('should build en prompt with user type instructions', () => {
    const prompt = buildSystemPrompt('boss', 'en');
    expect(prompt).toContain('Panguard AI');
    expect(prompt).toContain('AI bodyguard');
    expect(prompt).toContain('no technical background');
  });

  it('should include language rules', () => {
    const prompt = buildSystemPrompt('developer', 'en');
    expect(prompt).toContain('NEVER use');
    expect(prompt).toContain('everyday language');
  });

  it('should include follow-up handling instructions', () => {
    const prompt = buildSystemPrompt('developer', 'en');
    expect(prompt).toContain('2000 tokens');
    expect(prompt).toContain('follow-up');
  });

  it('should include notification format guidelines', () => {
    const prompt = buildSystemPrompt('developer', 'zh-TW');
    expect(prompt).toContain('威脅告警');
    expect(prompt).toContain('摘要報告');
  });
});
