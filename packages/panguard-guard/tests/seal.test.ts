/**
 * Endpoint-upload sealing (P1) — round-trip + ADVERSARIAL tests.
 * The whole point is "only the ingest private key can read it", so the negative
 * cases (public key cannot decrypt; no key => no plaintext) are the real assertions.
 */
import { describe, it, expect } from 'vitest';
import { generateKeyPair, exportJWK, importJWK, compactDecrypt, type JWK } from 'jose';
import {
  sealToIngestKey,
  sealForIngest,
  activeIngestKey,
  sealingAvailable,
  type IngestKey,
} from '../src/threat-cloud/seal.js';

async function makeIngestKey(kid = 'test-key'): Promise<{ key: IngestKey; privateKey: CryptoKey; publicJwk: JWK }> {
  const { publicKey, privateKey } = await generateKeyPair('ECDH-ES', { crv: 'X25519', extractable: true });
  const publicJwk = await exportJWK(publicKey);
  const key: IngestKey = {
    kid,
    publicJwk,
    notBefore: '2000-01-01T00:00:00Z',
    notAfter: '2999-01-01T00:00:00Z',
  };
  return { key, privateKey: privateKey as CryptoKey, publicJwk };
}

describe('seal — round trip', () => {
  it('seals to the ingest public key; ONLY the private key decrypts it back', async () => {
    const { key, privateKey } = await makeIngestKey();
    const payload = { attackType: 'prompt-injection', rule: 'ATR-2026-00120', region: 'TW' };
    const env = await sealToIngestKey(payload, key);

    expect(env.v).toBe(1);
    expect(env.alg).toBe('ECDH-ES+A256GCM');
    expect(env.kid).toBe('test-key');
    // The envelope must NOT contain the plaintext anywhere.
    expect(env.jwe).not.toContain('prompt-injection');
    expect(env.jwe).not.toContain('ATR-2026-00120');

    const { plaintext } = await compactDecrypt(env.jwe, privateKey);
    expect(JSON.parse(new TextDecoder().decode(plaintext))).toEqual(payload);
  });
});

describe('seal — adversarial', () => {
  it('the PUBLIC key cannot decrypt the envelope (sender-anonymous, read-only by KMS)', async () => {
    const { key, publicJwk } = await makeIngestKey();
    const env = await sealToIngestKey({ secret: 'x' }, key);
    const pub = await importJWK(publicJwk, 'ECDH-ES');
    await expect(compactDecrypt(env.jwe, pub)).rejects.toBeTruthy();
  });

  it('a DIFFERENT ingest private key cannot decrypt (wrong recipient)', async () => {
    const { key } = await makeIngestKey();
    const other = await makeIngestKey('other');
    const env = await sealToIngestKey({ secret: 'x' }, key);
    await expect(compactDecrypt(env.jwe, other.privateKey)).rejects.toBeTruthy();
  });

  it('no configured ingest key => sealForIngest returns null (caller must NOT upload plaintext)', async () => {
    // The bundled INGEST_KEYS is empty until a KMS key is provisioned.
    expect(sealingAvailable()).toBe(false);
    expect(await sealForIngest({ any: 'payload' })).toBeNull();
  });

  it('ephemeral key per message: two seals of the same payload differ (no deterministic linkage)', async () => {
    const { key } = await makeIngestKey();
    const a = await sealToIngestKey({ same: 'payload' }, key);
    const b = await sealToIngestKey({ same: 'payload' }, key);
    expect(a.jwe).not.toBe(b.jwe);
  });
});

describe('seal — key rotation window', () => {
  const mk = (kid: string, nb: string, na: string): IngestKey => ({
    kid,
    publicJwk: { kty: 'OKP', crv: 'X25519', x: 'AAAA' },
    notBefore: nb,
    notAfter: na,
  });

  it('picks the active key by validity window; null outside any window', () => {
    const keys = [
      mk('old', '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
      mk('new', '2026-05-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    ];
    // overlap window: newest notBefore wins
    expect(activeIngestKey(new Date('2026-05-15T00:00:00Z'), keys)?.kid).toBe('new');
    // before any key
    expect(activeIngestKey(new Date('2025-01-01T00:00:00Z'), keys)).toBeNull();
    // after all keys
    expect(activeIngestKey(new Date('2028-01-01T00:00:00Z'), keys)).toBeNull();
  });
});
