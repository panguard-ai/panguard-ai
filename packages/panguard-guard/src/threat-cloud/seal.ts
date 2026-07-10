/**
 * Sealed Threat-Cloud contributions — endpoint upload encryption (P1).
 *
 * Encrypts an outbound contribution to PanGuard's ingest PUBLIC key so ONLY the
 * ingest private-key holder (kept in KMS, never in the client) can read it — not
 * PanGuard's relay, not a TLS-termination middlebox, not a self-hosted relay
 * operator who lacks the key. This is end-to-end / client-side encryption on TOP
 * of TLS, closing the gap that the upload was previously plaintext-to-our-server.
 *
 * Construction: JWE (RFC 7516) with ECDH-ES key agreement over X25519 (RFC 8037)
 * + A256GCM content encryption — a standard, audited primitive available via the
 * already-bundled `jose` dependency (no new crypto dependency, no homemade crypto).
 * ECDH-ES derives the content key from a FRESH ephemeral key per message, so the
 * envelope carries NO sender identity (anonymous sender) — supporting the
 * unlinkable-by-default goal.
 *
 * Trust root = the ingest keypair. The PUBLIC half is bundled + pinned here (safe
 * to ship in the open-source client). The PRIVATE half lives in KMS and is NEVER
 * present in the client, so a client provably cannot decrypt its own contribution
 * — a property anyone can verify by inspecting INGEST_KEYS below (public X25519
 * key only, no `d` component) against this open-source source.
 *
 * @module @panguard-ai/panguard-guard/threat-cloud/seal
 */
import { CompactEncrypt, importJWK, type JWK } from 'jose';

export interface IngestKey {
  /** Key id carried in the JWE header so the server selects the matching private key. */
  readonly kid: string;
  /** X25519 public key (OKP/X25519 JWK). Public — safe to bundle. NEVER a private key. */
  readonly publicJwk: JWK;
  /** Rotation window (ISO 8601). A key is active when notBefore <= now < notAfter. */
  readonly notBefore: string;
  readonly notAfter: string;
}

export interface SealedEnvelope {
  readonly v: 1;
  readonly alg: 'ECDH-ES+A256GCM';
  readonly kid: string;
  /** Compact JWE — decryptable only by the ingest private key (in KMS). */
  readonly jwe: string;
}

/**
 * Bundled + pinned ingest public keys. POPULATE from the KMS-provisioned public key
 * before enabling sealed upload wiring (P1b). Multiple entries allow flag-day-free
 * rotation: publish the next key's validity window ahead of cutover so old + new
 * clients both seal to a key the server can still open during the overlap.
 *
 * SECURITY: only X25519 PUBLIC keys belong here. A private key must NEVER appear in
 * this file or anywhere in the open-source client.
 */
export const INGEST_KEYS: readonly IngestKey[] = [
  {
    kid: 'ingest-2026-07',
    // X25519 PUBLIC key only (no `d`). The matching PRIVATE key lives solely in the
    // backend env (TC_INGEST_PRIVATE_JWK) — never here. Provisioned 2026-07-07.
    publicJwk: { kty: 'OKP', crv: 'X25519', x: '7I14BpE3_RLBf_2dvZVBNtFCRW5C8QYrLR_c7sPl1Ww' },
    notBefore: '2026-07-01T00:00:00Z',
    notAfter: '2027-07-01T00:00:00Z',
  },
];

/**
 * Pick the ingest key valid at `now` (newest eligible wins, so a freshly-rotated
 * key is preferred during an overlap window). Returns null if none configured/valid.
 */
export function activeIngestKey(
  now: Date = new Date(),
  keys: readonly IngestKey[] = INGEST_KEYS
): IngestKey | null {
  const t = now.getTime();
  const eligible = keys.filter((k) => Date.parse(k.notBefore) <= t && t < Date.parse(k.notAfter));
  if (eligible.length === 0) return null;
  return eligible.reduce((a, b) => (Date.parse(b.notBefore) > Date.parse(a.notBefore) ? b : a));
}

/** Seal a payload to a specific ingest public key. Exported for tests + explicit use. */
export async function sealToIngestKey(payload: unknown, key: IngestKey): Promise<SealedEnvelope> {
  const pub = await importJWK(key.publicJwk, 'ECDH-ES');
  const jwe = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', kid: key.kid })
    .encrypt(pub);
  return { v: 1, alg: 'ECDH-ES+A256GCM', kid: key.kid, jwe };
}

/**
 * Seal a payload to the currently-active bundled ingest key. Returns null when NO
 * ingest key is configured/valid. Callers MUST treat null as "do not upload" — never
 * fall back to plaintext — so a key misconfiguration can never leak cleartext.
 */
export async function sealForIngest(
  payload: unknown,
  now: Date = new Date()
): Promise<SealedEnvelope | null> {
  const key = activeIngestKey(now);
  if (!key) return null;
  return sealToIngestKey(payload, key);
}

/** True when a usable ingest key is bundled, so the upload path can require sealing. */
export function sealingAvailable(now: Date = new Date()): boolean {
  return activeIngestKey(now) !== null;
}
