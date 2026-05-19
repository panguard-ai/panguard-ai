/**
 * Tier resolution + per-tier quota table.
 * 階層解析與配額表
 *
 * Maps the authenticated identity of a request (admin / static / client-guard /
 * client-partner / anonymous) plus the workspace tier stored on the client
 * key row to a single TcTier value. That value drives the per-token rate
 * limiter in the HTTP server: each tier gets its own requests-per-minute
 * budget.
 *
 * Resolution rules
 * - admin                 -> enterprise  (TC_ADMIN_API_KEY = full quota)
 * - static                -> enterprise  (TC_API_KEYS = pre-shared internal)
 * - anonymous             -> community   (unauthenticated public reads)
 * - client-guard/partner  -> tier from client_keys.tier column
 *                            (falls back to community when missing/unknown)
 *
 * @module @panguard-ai/threat-cloud/auth/tier-resolver
 */

/** Workspace tier — drives requests-per-minute budget. */
export type TcTier = 'community' | 'pilot' | 'enterprise';

/** Requests-per-minute budget per tier. */
export const TIER_LIMITS: Record<TcTier, number> = {
  community: 120,
  pilot: 1200,
  enterprise: 12000,
};

/** Authenticated role attached to the request by the server's auth gate. */
export type TcAuthRole = 'admin' | 'static' | 'client-guard' | 'client-partner' | 'anonymous';

/**
 * Client key row info (the subset the resolver cares about). The optional
 * `tier` field is what the resolver actually reads — clientId/role exist only
 * for log/audit context at the call site.
 */
export interface ClientKeyInfo {
  readonly clientId: string;
  readonly role: string;
  readonly tier?: string;
}

/**
 * Decide which tier this request is rate-limited under.
 * 決定此請求屬於哪個階層。
 *
 * @param authRole       Role attached by the auth gate in server.ts.
 * @param clientKeyInfo  Row data for client-guard/client-partner keys; null otherwise.
 */
export function resolveTier(authRole: TcAuthRole, clientKeyInfo: ClientKeyInfo | null): TcTier {
  // admin / static keys are pre-shared with internal services — they always
  // get the full enterprise budget so internal jobs aren't throttled.
  if (authRole === 'admin') return 'enterprise';
  if (authRole === 'static') return 'enterprise';
  // Unauthenticated public reads (/health, /api/stats, etc.) get the
  // baseline community budget; this branch is normally short-circuited at
  // the call site since anonymous requests go through the per-IP limiter.
  if (authRole === 'anonymous') return 'community';
  // client-guard / client-partner: tier lives on the client_keys row.
  const tier = clientKeyInfo?.tier;
  if (tier === 'enterprise') return 'enterprise';
  if (tier === 'pilot') return 'pilot';
  return 'community';
}

/** Type guard: is the string a known tier name? Used by the admin endpoint. */
export function isTcTier(value: unknown): value is TcTier {
  return value === 'community' || value === 'pilot' || value === 'enterprise';
}
