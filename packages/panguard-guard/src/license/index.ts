/**
 * License verification — client side (panguard-guard).
 *
 * Two input shapes are accepted by `validateLicense`:
 *   1. `pga_*` api_key → POST to app.panguard.ai/api/license/verify, receive
 *      a signed JWT, verify it with the embedded public key, cache the JWT
 *      locally so the next launch can run offline.
 *   2. A pre-signed JWT (three dot-separated base64 segments) → verify
 *      directly against the public key. Useful for air-gapped installs that
 *      receive a license file out of band.
 *
 * Offline behavior:
 *   - If the api_key path fails (network down, 5xx, timeout) we fall back to
 *     the on-disk cache at `~/.panguard/license-cache.json`. A cached JWT is
 *     re-verified and returned if not expired.
 *   - If there is no cache either, we degrade to community tier so users are
 *     never locked out of the free product just because they're offline.
 *
 * Network calls have a hard 5s timeout and never throw out of this module —
 * callers always get a `LicenseInfo`-shaped result.
 */

import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { jwtVerify, importSPKI, type JWTPayload, type KeyLike } from 'jose';

export type LicenseTier = 'community' | 'pilot' | 'enterprise' | 'free' | 'pro';

/** Alias preserved for callers that import `Tier`. */
export type Tier = LicenseTier;

export interface LicenseInfo {
  key: string;
  tier: LicenseTier;
  isValid: boolean;
  expiresAt: Date | null;
  workspace_id: string | null;
  maxEndpoints?: number;
  features: string[];
}

const COMMUNITY_FEATURES: ReadonlyArray<string> = [
  'basic_scan',
  'basic_monitoring',
  'skill_audit',
  'rule_matching',
  'auto_respond',
  'threat_cloud_upload',
  'dashboard',
];

const PILOT_FEATURES: ReadonlyArray<string> = [
  ...COMMUNITY_FEATURES,
  'threat_cloud_live',
  'sarif_export',
  'evidence_pack',
  'ai_analysis',
  'auto_fix',
  'notifications',
  'context_memory',
  'custom_rules',
];

const ENTERPRISE_FEATURES: ReadonlyArray<string> = [
  ...PILOT_FEATURES,
  'audit_log_export',
  'sso',
  'dedicated_tc',
  'priority_support',
  'multi_endpoint',
  'webhook_api',
  'threat_cloud',
];

const TIER_FEATURES: Record<LicenseTier, ReadonlyArray<string>> = {
  community: COMMUNITY_FEATURES,
  free: COMMUNITY_FEATURES,
  pilot: PILOT_FEATURES,
  pro: PILOT_FEATURES,
  enterprise: ENTERPRISE_FEATURES,
};

const ISSUER = 'panguard.ai';
const AUDIENCE = 'panguard-guard';
const ALGORITHM = 'EdDSA';

const NETWORK_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_API_URL = 'https://app.panguard.ai';

function cachePath(): string {
  return join(homedir(), '.panguard', 'license-cache.json');
}

function apiBaseUrl(): string {
  return (process.env['PANGUARD_API_URL'] ?? '').trim() || DEFAULT_API_URL;
}

function publicKeyPem(): string | null {
  const raw =
    process.env['NEXT_PUBLIC_LICENSE_PUBLIC_KEY_PEM'] ??
    process.env['PANGUARD_LICENSE_PUBLIC_KEY_PEM'] ??
    '';
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    if (decoded.includes('PUBLIC KEY')) return decoded;
  } catch {
    /* fall through */
  }
  return null;
}

let cachedPublicKey: KeyLike | null = null;

async function loadPublicKey(): Promise<KeyLike | null> {
  if (cachedPublicKey) return cachedPublicKey;
  const pem = publicKeyPem();
  if (!pem) return null;
  try {
    cachedPublicKey = (await importSPKI(pem, ALGORITHM)) as KeyLike;
    return cachedPublicKey;
  } catch {
    return null;
  }
}

function looksLikeApiKey(input: string): boolean {
  return input.startsWith('pga_') && input.length >= 20;
}

function looksLikeJwt(input: string): boolean {
  const parts = input.split('.');
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p));
}

function tierFromPayload(payload: JWTPayload): LicenseTier {
  const t = (payload as { tier?: unknown }).tier;
  if (t === 'community' || t === 'pilot' || t === 'enterprise' || t === 'free' || t === 'pro') {
    return t;
  }
  return 'community';
}

function workspaceFromPayload(payload: JWTPayload): string | null {
  const w = (payload as { workspace_id?: unknown }).workspace_id;
  return typeof w === 'string' && w.length > 0 ? w : null;
}

function communityFallback(input: string): LicenseInfo {
  return {
    key: input,
    tier: 'community',
    isValid: true,
    expiresAt: null,
    workspace_id: null,
    features: [...COMMUNITY_FEATURES],
  };
}

function infoFromPayload(input: string, payload: JWTPayload): LicenseInfo {
  const tier = tierFromPayload(payload);
  const expSec = typeof payload.exp === 'number' ? payload.exp : null;
  return {
    key: input,
    tier,
    isValid: true,
    expiresAt: expSec ? new Date(expSec * 1000) : null,
    workspace_id: workspaceFromPayload(payload),
    features: [...(TIER_FEATURES[tier] ?? COMMUNITY_FEATURES)],
  };
}

interface CachedEntry {
  jwt: string;
  fetched_at: number;
}

async function readCache(): Promise<CachedEntry | null> {
  try {
    const raw = await fs.readFile(cachePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as CachedEntry).jwt === 'string' &&
      typeof (parsed as CachedEntry).fetched_at === 'number'
    ) {
      return parsed as CachedEntry;
    }
  } catch {
    /* no cache */
  }
  return null;
}

async function writeCache(entry: CachedEntry): Promise<void> {
  try {
    const p = cachePath();
    await fs.mkdir(dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(entry, null, 2), { mode: 0o600 });
  } catch {
    /* best effort */
  }
}

async function verifyJwt(input: string, jwt: string): Promise<LicenseInfo | null> {
  const key = await loadPublicKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(jwt, key, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });
    return infoFromPayload(input, payload);
  } catch {
    return null;
  }
}

async function fetchSignedJwt(apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBaseUrl()}/api/license/verify`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { jwt?: unknown };
    if (typeof data.jwt === 'string' && looksLikeJwt(data.jwt)) return data.jwt;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function offlineCachedInfo(input: string): Promise<LicenseInfo | null> {
  const cached = await readCache();
  if (!cached) return null;
  if (Date.now() - cached.fetched_at > CACHE_TTL_MS) return null;
  const info = await verifyJwt(input, cached.jwt);
  if (!info) return null;
  if (info.expiresAt && info.expiresAt.getTime() <= Date.now()) return null;
  return info;
}

/**
 * Validate a license input.
 *
 * Never throws — on any failure path returns a community-tier fallback so the
 * free product keeps working.
 */
export async function validateLicense(keyOrJwt: string): Promise<LicenseInfo> {
  const input = (keyOrJwt ?? '').trim();
  if (!input) return communityFallback('');

  // Direct JWT input — verify and return.
  if (looksLikeJwt(input)) {
    const info = await verifyJwt(input, input);
    return info ?? communityFallback(input);
  }

  // pga_* api_key — exchange for a signed JWT, then verify.
  if (looksLikeApiKey(input)) {
    const jwt = await fetchSignedJwt(input);
    if (jwt) {
      const info = await verifyJwt(input, jwt);
      if (info) {
        await writeCache({ jwt, fetched_at: Date.now() });
        return info;
      }
    }
    // Network/verify failed — try local cache.
    const cached = await offlineCachedInfo(input);
    if (cached) return cached;
    return communityFallback(input);
  }

  // Unknown shape → graceful community.
  return communityFallback(input);
}

export function hasFeature(license: LicenseInfo | string, feature?: string): boolean {
  if (typeof license === 'string') {
    return COMMUNITY_FEATURES.includes(license);
  }
  return license.features.includes(feature ?? '');
}

export function getTierFeatures(tier: LicenseTier): ReadonlyArray<string> {
  return TIER_FEATURES[tier] ?? COMMUNITY_FEATURES;
}

export function generateTestLicenseKey(tier?: LicenseTier): string {
  const suffix = tier ?? 'community';
  return `PG-${suffix.toUpperCase()}-TEST-0000-0000`;
}

export { TIER_FEATURES };
