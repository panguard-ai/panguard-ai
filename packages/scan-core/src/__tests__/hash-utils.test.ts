import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { contentHash, patternHash } from '../hash-utils.js';

describe('contentHash', () => {
  it('produces a 16-character hex string', () => {
    const result = contentHash('hello world');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic: same input yields same output', () => {
    const input = 'some skill content\nwith multiple lines';
    expect(contentHash(input)).toBe(contentHash(input));
  });

  it('handles empty string input', () => {
    const result = contentHash('');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
    expect(result).toHaveLength(16);
  });

  it('produces different hashes for different inputs', () => {
    expect(contentHash('content-a')).not.toBe(contentHash('content-b'));
  });

  it('is case-sensitive: different case = different hash', () => {
    expect(contentHash('Hello')).not.toBe(contentHash('hello'));
  });

  it('handles unicode content', () => {
    const result = contentHash('你好世界');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
    expect(result).toHaveLength(16);
  });

  it('handles large content without error', () => {
    const large = 'x'.repeat(100_000);
    const result = contentHash(large);
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('patternHash', () => {
  it('produces a 16-character hex string', () => {
    const result = patternHash('my-skill', 'Prompt injection detected');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic: same inputs yield same output', () => {
    const name = 'my-skill';
    const summary = 'Prompt injection detected';
    expect(patternHash(name, summary)).toBe(patternHash(name, summary));
  });

  it('uses the scan: prefix (not web-scan: or skill-audit:)', () => {
    // Verify indirectly: the output must match a locally computed SHA-256
    // using the `scan:` prefix format defined in the implementation.
    const expected = createHash('sha256')
      .update('scan:my-skill:critical finding')
      .digest('hex')
      .slice(0, 16);
    expect(patternHash('my-skill', 'critical finding')).toBe(expected);
  });

  it('does NOT match a web-scan: prefixed hash', () => {
    const webScanHash = createHash('sha256')
      .update('web-scan:my-skill:critical finding')
      .digest('hex')
      .slice(0, 16);
    expect(patternHash('my-skill', 'critical finding')).not.toBe(webScanHash);
  });

  it('does NOT match a skill-audit: prefixed hash', () => {
    const skillAuditHash = createHash('sha256')
      .update('skill-audit:my-skill:critical finding')
      .digest('hex')
      .slice(0, 16);
    expect(patternHash('my-skill', 'critical finding')).not.toBe(skillAuditHash);
  });

  it('produces different hashes for different skill names', () => {
    const summary = 'same summary';
    expect(patternHash('skill-a', summary)).not.toBe(patternHash('skill-b', summary));
  });

  it('produces different hashes for different finding summaries', () => {
    const name = 'same-skill';
    expect(patternHash(name, 'finding one')).not.toBe(patternHash(name, 'finding two'));
  });

  it('handles empty strings', () => {
    const result = patternHash('', '');
    expect(result).toMatch(/^[0-9a-f]{16}$/);
    expect(result).toHaveLength(16);
  });

  it('both functions return hex-only output (no uppercase, no special chars)', () => {
    const ch = contentHash('test content');
    const ph = patternHash('skill', 'summary');
    expect(ch).toMatch(/^[0-9a-f]+$/);
    expect(ph).toMatch(/^[0-9a-f]+$/);
  });
});
