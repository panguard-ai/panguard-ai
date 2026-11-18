import { describe, it, expect } from 'vitest';
import { sanitizeSkillLabel } from '../src/threat-cloud/skill-label.js';

describe('sanitizeSkillLabel', () => {
  it('keeps a plain manifest name', () => {
    expect(sanitizeSkillLabel('weather-skill')).toBe('weather-skill');
    expect(sanitizeSkillLabel('@acme/pdf-tools')).toBe('pdf-tools');
  });

  it('reduces POSIX, home-relative and Windows paths to the last segment', () => {
    expect(sanitizeSkillLabel('/Users/alice/work/secret-skill')).toBe('secret-skill');
    expect(sanitizeSkillLabel('~/skills/my-skill')).toBe('my-skill');
    expect(sanitizeSkillLabel('C:\\Users\\alice\\skills\\my-skill')).toBe('my-skill');
    expect(sanitizeSkillLabel('\\\\fileserver\\share\\my-skill\\')).toBe('my-skill');
  });

  it('never returns a path separator and caps the length', () => {
    expect(sanitizeSkillLabel('a/'.repeat(200))).not.toMatch(/[\\/]/);
    expect(sanitizeSkillLabel('x'.repeat(500))).toHaveLength(80);
  });
});
