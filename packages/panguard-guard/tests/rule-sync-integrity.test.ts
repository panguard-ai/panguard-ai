/**
 * Gap A slice 1 — the trust anchor for background rule auto-update.
 *
 * `verifyTarballIntegrity` is the single gate that decides whether a downloaded
 * agent-threat-rules bundle is allowed to be extracted and staged. A bundle
 * whose bytes do not hash to the registry-published npm SRI value means
 * tamper/MITM and MUST be rejected. These are ADVERSARIAL tests: the tamper
 * cases (a flipped byte → MUST fail) are the point of the file.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyTarballIntegrity } from '../src/rule-sync.js';

/** npm SRI string form for a buffer under a given algorithm. */
function sri(buf: Buffer, algo: 'sha512' | 'sha384' | 'sha256'): string {
  return `${algo}-${createHash(algo).update(buf).digest('base64')}`;
}

describe('verifyTarballIntegrity — Gap A trust anchor', () => {
  const bundle = Buffer.from('pretend-this-is-an-agent-threat-rules-tarball\n'.repeat(64));

  it('accepts a bundle whose sha512 matches the published integrity', () => {
    expect(verifyTarballIntegrity(bundle, sri(bundle, 'sha512'))).toBe(true);
  });

  it('accepts sha384 and sha256 forms too', () => {
    expect(verifyTarballIntegrity(bundle, sri(bundle, 'sha384'))).toBe(true);
    expect(verifyTarballIntegrity(bundle, sri(bundle, 'sha256'))).toBe(true);
  });

  it('REJECTS a bundle with a single flipped byte (tamper)', () => {
    const tampered = Buffer.from(bundle);
    tampered[0] = tampered[0]! ^ 0x01;
    // integrity still describes the ORIGINAL bytes — the tampered buffer must fail.
    expect(verifyTarballIntegrity(tampered, sri(bundle, 'sha512'))).toBe(false);
  });

  it('REJECTS when the integrity value is for a different payload', () => {
    const other = Buffer.from('a completely different bundle');
    expect(verifyTarballIntegrity(bundle, sri(other, 'sha512'))).toBe(false);
  });

  it('accepts if ANY space-separated alternative matches (npm multi-hash form)', () => {
    const wrong = sri(Buffer.from('nope'), 'sha512');
    const right = sri(bundle, 'sha512');
    expect(verifyTarballIntegrity(bundle, `${wrong} ${right}`)).toBe(true);
  });

  it('REJECTS an unsupported / unknown algorithm', () => {
    // md5 is not in the allowlist — even a "correct" md5 must not pass.
    const md5 = `md5-${createHash('md5').update(bundle).digest('base64')}`;
    expect(verifyTarballIntegrity(bundle, md5)).toBe(false);
  });

  it('REJECTS malformed / empty integrity strings (fail-closed)', () => {
    expect(verifyTarballIntegrity(bundle, '')).toBe(false);
    expect(verifyTarballIntegrity(bundle, 'sha512')).toBe(false); // no dash/value
    expect(verifyTarballIntegrity(bundle, 'garbage')).toBe(false);
  });
});
