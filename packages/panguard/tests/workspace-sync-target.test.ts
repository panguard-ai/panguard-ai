import { describe, it, expect } from 'vitest';
import { sanitizeSyncTarget } from '../src/cli/workspace-target.js';
import { buildEventsFromAuditReport } from '../src/cli/workspace-sync.js';

describe('sanitizeSyncTarget', () => {
  it('reduces POSIX paths to the basename', () => {
    expect(sanitizeSyncTarget('/Users/alice/projects/secret/my-skill')).toBe('my-skill');
    expect(sanitizeSyncTarget('./skills/my-skill/')).toBe('my-skill');
    expect(sanitizeSyncTarget('~/skills/my-skill')).toBe('my-skill');
  });

  it('reduces Windows-style paths to the basename', () => {
    expect(sanitizeSyncTarget('C:\\Users\\alice\\skills\\my-skill')).toBe('my-skill');
    expect(sanitizeSyncTarget('\\\\server\\share\\my-skill\\')).toBe('my-skill');
  });

  it('keeps scheme, host and pathname of a URL but drops credentials, query and fragment', () => {
    expect(
      sanitizeSyncTarget('https://user:tok3n@github.com/acme/skill/tree/main?token=abc#readme')
    ).toBe('https://github.com/acme/skill/tree/main');
  });

  it('keeps prefixed remote identifiers (they are not local paths)', () => {
    expect(sanitizeSyncTarget('github:owner/repo/SKILL.md')).toBe('github:owner/repo/SKILL.md');
    expect(sanitizeSyncTarget('clawhub:owner/skill')).toBe('clawhub:owner/skill');
    // a Windows drive path is still a local path
    expect(sanitizeSyncTarget('C:\\Users\\alice\\skill')).toBe('skill');
  });

  it('never leaks a path or credentials and has a fallback', () => {
    expect(sanitizeSyncTarget('')).toBe('unknown');
    expect(sanitizeSyncTarget('/')).toBe('unknown');
    expect(sanitizeSyncTarget('x'.repeat(500)).length).toBe(200);
  });
});

describe('buildEventsFromAuditReport target', () => {
  it('sends only the sanitized target and keeps target_hash', () => {
    const events = buildEventsFromAuditReport({
      target: '/Users/alice/work/my-skill',
      targetHash: 'abc123',
      riskLevel: 'HIGH',
      riskScore: 70,
      findings: [{ ruleId: 'ATR-2026-00001', severity: 'high', title: 't' }],
    });
    expect(events.length).toBe(2);
    for (const e of events) {
      expect(e.target).toBe('my-skill');
      expect(e.target_hash).toBe('abc123');
      expect(JSON.stringify(e)).not.toContain('alice');
    }
  });
});
