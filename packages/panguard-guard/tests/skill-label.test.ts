import { describe, it, expect } from 'vitest';
import { sanitizeSkillLabel } from '../src/threat-cloud/skill-label.js';

describe('sanitizeSkillLabel', () => {
  it('keeps a plain manifest name', () => {
    expect(sanitizeSkillLabel('weather-skill')).toBe('weather-skill');
    expect(sanitizeSkillLabel('@acme/pdf-tools')).toBe('@acme/pdf-tools');
    expect(sanitizeSkillLabel('owner/skill-name')).toBe('owner/skill-name');
  });

  it('reduces POSIX, home-relative and Windows paths to the last segment', () => {
    expect(sanitizeSkillLabel('/Users/alice/work/secret-skill')).toBe('secret-skill');
    expect(sanitizeSkillLabel('~/skills/my-skill')).toBe('my-skill');
    expect(sanitizeSkillLabel('C:\\Users\\alice\\skills\\my-skill')).toBe('my-skill');
    expect(sanitizeSkillLabel('\\\\fileserver\\share\\my-skill\\')).toBe('my-skill');
  });

  it('never returns a path with more than one separator and caps the length', () => {
    expect(sanitizeSkillLabel('a/b/'.repeat(100))).not.toMatch(/[\\/]/);
    expect(sanitizeSkillLabel('/etc/x')).toBe('x');
    expect(sanitizeSkillLabel('x'.repeat(500))).toHaveLength(80);
  });
});
