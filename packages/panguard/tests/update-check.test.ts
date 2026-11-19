import { describe, it, expect } from 'vitest';
import { isUpdateCheckEnabled } from '../src/cli/update-check.js';

describe('isUpdateCheckEnabled', () => {
  it('is on by default', () => {
    expect(isUpdateCheckEnabled({}, {})).toBe(true);
    expect(isUpdateCheckEnabled({ PANGUARD_NO_UPDATE_CHECK: '0' }, {})).toBe(true);
  });

  it('is off when the config key is false', () => {
    expect(isUpdateCheckEnabled({}, { updateCheck: false })).toBe(false);
  });

  it('the environment variable overrides the config', () => {
    expect(isUpdateCheckEnabled({ PANGUARD_NO_UPDATE_CHECK: '1' }, { updateCheck: true })).toBe(
      false
    );
    expect(isUpdateCheckEnabled({ PANGUARD_NO_UPDATE_CHECK: ' TRUE ' }, {})).toBe(false);
  });
});
