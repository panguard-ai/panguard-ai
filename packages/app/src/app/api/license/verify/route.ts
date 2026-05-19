/**
 * POST /api/license/verify
 *
 * Issues a signed license JWT for a guard endpoint.
 *
 * Auth: Bearer <pga_...> — same api_key scheme as POST /api/v2/events.
 * The key is looked up via SHA-256 hash in `api_keys`; the row's
 * `workspace_id` is then joined to `workspaces` to pull the current
 * `tier` + `tier_expires_at`. The result is signed with ed25519 via
 * `lib/license/sign.ts` and returned as `{ jwt, exp }`.
 *
 * Failures:
 *   401 invalid_api_key      — missing/wrong/revoked key
 *   401 workspace_not_found  — api_key has no workspace (data integrity bug)
 *   403 tier_expired         — paid tier's `tier_expires_at` is in the past
 *   500 sign_failed          — signing key missing/malformed
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { signLicense, type LicenseTier } from '@/lib/license/sign';

const VALID_TIERS: ReadonlySet<string> = new Set(['community', 'pilot', 'enterprise']);

function isLicenseTier(value: unknown): value is LicenseTier {
  return typeof value === 'string' && VALID_TIERS.has(value);
}

export async function POST(req: NextRequest) {
  // 1. Authenticate the api_key (same shape as /api/v2/events).
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token.startsWith('pga_') || token.length < 20) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }
  const tokenHash = createHash('sha256').update(token).digest('hex');

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: 'server_misconfigured', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }

  const { data: key, error: keyErr } = await admin
    .from('api_keys')
    .select('id, workspace_id, revoked_at')
    .eq('key_hash', tokenHash)
    .maybeSingle();
  if (keyErr || !key || key.revoked_at) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }

  // 2. Load workspace tier.
  const { data: workspace, error: wsErr } = await admin
    .from('workspaces')
    .select('id, tier, tier_expires_at')
    .eq('id', key.workspace_id)
    .maybeSingle();
  if (wsErr || !workspace) {
    return NextResponse.json({ error: 'workspace_not_found' }, { status: 401 });
  }

  const tier: LicenseTier = isLicenseTier(workspace.tier) ? workspace.tier : 'community';
  const expiresAt: string | null =
    typeof workspace.tier_expires_at === 'string' ? workspace.tier_expires_at : null;

  // 3. Paid-tier expiry check — community never expires.
  if (tier !== 'community' && expiresAt) {
    const expMs = Date.parse(expiresAt);
    if (!Number.isNaN(expMs) && expMs <= Date.now()) {
      return NextResponse.json({ error: 'tier_expired' }, { status: 403 });
    }
  }

  // 4. Sign.
  let signed;
  try {
    signed = await signLicense({
      workspace_id: workspace.id,
      tier,
      tier_expires_at: expiresAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'sign_failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }

  // 5. Best-effort touch last_used_at.
  void admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id)
    .then(
      () => undefined,
      () => undefined
    );

  return NextResponse.json({ jwt: signed.jwt, exp: signed.exp });
}
