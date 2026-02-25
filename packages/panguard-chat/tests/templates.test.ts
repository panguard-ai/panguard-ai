/**
 * Alert Templates tests
 * 告警模板測試
 */

import { describe, it, expect } from 'vitest';
import {
  ALERT_TEMPLATES,
  findAlertTemplate,
  getHumanSummary,
} from '../src/templates/alert-templates.js';

describe('ALERT_TEMPLATES', () => {
  it('should have at least 5 built-in templates', () => {
    expect(ALERT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it('should have all required fields for each template', () => {
    for (const template of ALERT_TEMPLATES) {
      expect(template.attackType).toBeTruthy();
      expect(template.humanSummary['zh-TW']).toBeTruthy();
      expect(template.humanSummary['en']).toBeTruthy();
      expect(template.analogy['zh-TW']).toBeTruthy();
      expect(template.analogy['en']).toBeTruthy();
      expect(template.recommendedAction['zh-TW']).toBeTruthy();
      expect(template.recommendedAction['en']).toBeTruthy();
    }
  });

  it('should have template for SSH brute force', () => {
    const template = ALERT_TEMPLATES.find((t) => t.attackType === 'ssh_brute_force');
    expect(template).toBeDefined();
  });

  it('should have template for ransomware', () => {
    const template = ALERT_TEMPLATES.find((t) => t.attackType === 'ransomware_detected');
    expect(template).toBeDefined();
  });
});

describe('findAlertTemplate', () => {
  it('should find existing template by attack type', () => {
    const template = findAlertTemplate('ssh_brute_force');
    expect(template).toBeDefined();
    expect(template!.attackType).toBe('ssh_brute_force');
  });

  it('should return undefined for unknown attack type', () => {
    const template = findAlertTemplate('unknown_attack');
    expect(template).toBeUndefined();
  });
});

describe('getHumanSummary', () => {
  it('should return human summary in zh-TW', () => {
    const summary = getHumanSummary('ssh_brute_force', 'zh-TW', { count: 15 });
    expect(summary).toBeDefined();
    expect(summary).toContain('15');
    expect(summary).toContain('密碼');
  });

  it('should return human summary in en', () => {
    const summary = getHumanSummary('ssh_brute_force', 'en', { count: 15 });
    expect(summary).toBeDefined();
    expect(summary).toContain('15');
    expect(summary).toContain('password');
  });

  it('should return undefined for unknown attack type', () => {
    const summary = getHumanSummary('unknown', 'en');
    expect(summary).toBeUndefined();
  });

  it('should handle missing params gracefully', () => {
    const summary = getHumanSummary('ssh_brute_force', 'en');
    expect(summary).toBeDefined();
    expect(summary).toContain('{{count}}'); // unreplaced param
  });
});
