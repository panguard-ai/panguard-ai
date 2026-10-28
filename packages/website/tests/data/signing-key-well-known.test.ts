import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, createPublicKey } from 'node:crypto';

/**
 * Value: protects=each /.well-known key's key_id is derived from its own Ed25519 PEM; key_ids are
 *   unique; every usage is named in the policy;
 * fails_when=a rotation or new key edits key_id or PEM alone, duplicates an entry, or renames a
 *   usage without updating the policy;
 * why_new=core tests pin a hardcoded copy of the audit key only; nothing reads this file or
 *   covers the technical-receipt key;
 * seam=none;
 * no_claim=does not prove the issuer holds the private keys or that receipts verify in the CLI;
 *   key_id is recomputed via node:crypto per the page's rule.
 */
const WELL_KNOWN = join(
  __dirname,
  '..',
  '..',
  'public',
  '.well-known',
  'panguard-signing-key.json'
);

interface PublishedKey {
  key_id: string;
  status: string;
  alg: string;
  usage: string;
  public_key_pem: string;
}

interface SigningKeyDocument {
  policy: string;
  keys: ReadonlyArray<PublishedKey>;
}

function loadDocument(): SigningKeyDocument {
  return JSON.parse(readFileSync(WELL_KNOWN, 'utf8')) as SigningKeyDocument;
}

/** The rule stated on the trust page: pgk1- + first 16 hex of SHA-256 over the key's SPKI DER. */
function deriveKeyId(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return `pgk1-${createHash('sha256').update(der).digest('hex').slice(0, 16)}`;
}

describe('/.well-known/panguard-signing-key.json', () => {
  it('lists distinct Ed25519 keys whose key_id derives from their PEM and whose usage the policy names', () => {
    const doc = loadDocument();
    expect(doc.keys.length).toBeGreaterThan(0);

    for (const key of doc.keys) {
      expect(createPublicKey(key.public_key_pem).asymmetricKeyType, key.key_id).toBe('ed25519');
      expect(key.alg, key.key_id).toBe('Ed25519');
      expect(deriveKeyId(key.public_key_pem), key.key_id).toBe(key.key_id);
      expect(['active', 'revoked'], key.key_id).toContain(key.status);
      expect(doc.policy, key.key_id).toContain(key.usage);
    }

    const keyIds = doc.keys.map((key) => key.key_id);
    expect(new Set(keyIds).size).toBe(keyIds.length);
  });
});
