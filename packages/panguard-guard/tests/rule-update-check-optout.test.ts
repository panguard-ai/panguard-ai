import { describe, it, expect } from 'vitest';
import { ruleUpdateCheckEnabled } from '../src/rule-sync.js';

describe('ruleUpdateCheckEnabled', () => {
  it('is on when PANGUARD_NO_UPDATE_CHECK is unset or empty', () => {
    expect(ruleUpdateCheckEnabled({})).toBe(true);
    expect(ruleUpdateCheckEnabled({ PANGUARD_NO_UPDATE_CHECK: '' })).toBe(true);
    expect(ruleUpdateCheckEnabled({ PANGUARD_NO_UPDATE_CHECK: '0' })).toBe(true);
  });

  it('is off for 1, true or yes, in any case and with spaces', () => {
    for (const v of ['1', 'true', 'TRUE', ' yes ']) {
      expect(ruleUpdateCheckEnabled({ PANGUARD_NO_UPDATE_CHECK: v })).toBe(false);
    }
  });
});
