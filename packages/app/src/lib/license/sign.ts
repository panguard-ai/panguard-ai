/**
 * License JWT signer.
 *
 * Uses ed25519 (EdDSA) — fast, deterministic, small key, supported by `jose`.
 *
 * The private key lives in env (`LICENSE_SIGNING_KEY_PRIVATE_PEM`) as a
 * base64-encoded PKCS8 PEM. Decoded once per process and cached. The matching
 * public SPKI must be shipped to clients as `NEXT_PUBLIC_LICENSE_PUBLIC_KEY_PEM`
 * so guard endpoints can verify offline.
 *
 * Claim shape (kept narrow on purpose — guard only needs tier + workspace):
 *   { workspace_id, tier, exp }
 * Standard JOSE claims: iss=panguard.ai, aud=panguard-guard, iat.
 */

import { SignJWT, importPKCS8 } from 'jose';
import type { KeyLike } from 'jose';

export type LicenseTier = 'community' | 'pilot' | 'enterprise';

export interface SignedLicense {
  jwt: string;
  /** Expiry in seconds since epoch (matches JWT `exp`). */
  exp: number;
}

export interface SignLicenseInput {
  workspace_id: string;
  tier: LicenseTier;
  /** ISO timestamp from `workspaces.tier_expires_at`. Null/undefined → default. */
  tier_expires_at: string | null | undefined;
}

const ISSUER = 'panguard.ai';
const AUDIENCE = 'panguard-guard';
const ALGORITHM = 'EdDSA';
const DEFAULT_COMMUNITY_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

let cachedKey: KeyLike | null = null;

async function loadPrivateKey(): Promise<KeyLike> {
  if (cachedKey) return cachedKey;
  const raw = process.env.LICENSE_SIGNING_KEY_PRIVATE_PEM ?? '';
  if (!raw) {
    throw new Error(
      '[panguard/app] LICENSE_SIGNING_KEY_PRIVATE_PEM is not set — license signing unavailable'
    );
  }
  let pem: string;
  try {
    pem = Buffer.from(raw, 'base64').toString('utf8');
  } catch {
    throw new Error('[panguard/app] LICENSE_SIGNING_KEY_PRIVATE_PEM is not valid base64');
  }
  if (!pem.includes('PRIVATE KEY')) {
    throw new Error('[panguard/app] LICENSE_SIGNING_KEY_PRIVATE_PEM did not decode to a PKCS8 PEM');
  }
  cachedKey = (await importPKCS8(pem, ALGORITHM)) as KeyLike;
  return cachedKey;
}

function computeExp(input: SignLicenseInput): number {
  const nowSec = Math.floor(Date.now() / 1000);
  if (input.tier_expires_at) {
    const t = Date.parse(input.tier_expires_at);
    if (!Number.isNaN(t)) {
      const expSec = Math.floor(t / 1000);
      if (expSec > nowSec) return expSec;
    }
  }
  // Community / missing expiry — default to now + 30d.
  return nowSec + DEFAULT_COMMUNITY_TTL_SECONDS;
}

/**
 * Produce a signed license JWT for the given workspace + tier.
 *
 * Throws if the signing key is missing or malformed. Callers should treat
 * that as a 500 (server misconfigured).
 */
export async function signLicense(input: SignLicenseInput): Promise<SignedLicense> {
  const key = await loadPrivateKey();
  const exp = computeExp(input);

  const jwt = await new SignJWT({
    workspace_id: input.workspace_id,
    tier: input.tier,
  })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);

  return { jwt, exp };
}

export const LICENSE_ISSUER = ISSUER;
export const LICENSE_AUDIENCE = AUDIENCE;
export const LICENSE_ALGORITHM = ALGORITHM;
