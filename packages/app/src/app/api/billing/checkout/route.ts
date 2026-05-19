/**
 * POST /api/billing/checkout
 *
 * Browser-facing endpoint that mints a Stripe Checkout Session for a paid
 * tier upgrade (pilot or enterprise). Returns `{ url }` which the client
 * redirects to.
 *
 * Auth contract:
 *   1. Caller must have a valid Supabase session cookie (the same cookie
 *      pattern used by every authenticated page in this app).
 *   2. The session user must be a member of the target workspace with
 *      role='admin'. Lower roles cannot purchase on the org's behalf.
 *
 * Body: { tier: 'pilot' | 'enterprise', workspace_id: string }
 *
 * Success (200): { url: string }            // redirect target
 * Auth fail (401): { error: 'unauthenticated' }
 * Forbidden (403): { error: 'not_workspace_admin' }
 * Bad input (400): { error: 'invalid_body' | 'unknown_workspace' | 'missing_price_id' }
 * Server error (500): { error: 'stripe_session_failed' | 'config_error' }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import type { Role, Tier, Workspace } from '@/lib/types';

const BodySchema = z.object({
  tier: z.enum(['pilot', 'enterprise']),
  workspace_id: z.string().uuid(),
});

type PaidTier = Extract<Tier, 'pilot' | 'enterprise'>;

/**
 * Allow the marketing site (different origin) to POST here with credentials.
 * Matches the pattern used by `/api/me/session`. Wildcard origin is not
 * allowed with credentials, so we echo back only the configured website URL.
 */
function corsHeaders(req: NextRequest): Record<string, string> {
  const allowed = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://panguard.ai';
  const origin = req.headers.get('origin') ?? '';
  const allowOrigin = origin === allowed ? origin : allowed;
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    vary: 'origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * Map a paid tier to its env-driven Stripe Price ID. We deliberately read
 * from `process.env` at request time (not module load) so that swapping
 * keys between sandbox and live doesn't require a redeploy.
 */
function getPriceIdForTier(tier: PaidTier): string | null {
  const envKey = tier === 'pilot' ? 'STRIPE_PRICE_ID_PILOT' : 'STRIPE_PRICE_ID_ENTERPRISE';
  const value = process.env[envKey];
  return value && value.length > 0 ? value : null;
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  // 1. Parse + validate body before any DB / Stripe round trip.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers });
  }
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers });
  }
  const { tier, workspace_id } = parsed.data;

  // 2. Require an authenticated Supabase session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers });
  }

  // 3. Verify the workspace exists AND the caller is an admin of it.
  //    Run both queries; RLS already scopes selects to membership but we
  //    still need the role to enforce the admin requirement explicitly.
  const { data: wsRaw, error: wsErr } = await supabase
    .from('workspaces')
    .select('id, slug, name, tier, tier_expires_at')
    .eq('id', workspace_id)
    .maybeSingle();
  if (wsErr) {
    return NextResponse.json({ error: 'unknown_workspace' }, { status: 400, headers });
  }
  const ws = wsRaw as Pick<Workspace, 'id' | 'slug' | 'name' | 'tier' | 'tier_expires_at'> | null;
  if (!ws) {
    return NextResponse.json({ error: 'unknown_workspace' }, { status: 400, headers });
  }

  const { data: memberRaw, error: memberErr } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (memberErr) {
    return NextResponse.json({ error: 'not_workspace_admin' }, { status: 403, headers });
  }
  const member = memberRaw as { role: Role } | null;
  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'not_workspace_admin' }, { status: 403, headers });
  }

  // 4. Look up the Price ID for this tier — fail loudly if unset so the
  //    operator knows the Stripe Dashboard config hasn't been completed.
  const priceId = getPriceIdForTier(tier);
  if (!priceId) {
    return NextResponse.json({ error: 'missing_price_id' }, { status: 500, headers });
  }

  // 5. Build the absolute redirect URLs from the incoming request's origin.
  //    Falls back to NEXT_PUBLIC_APP_URL so server-side fetches still work.
  //    When called from the marketing site the Origin header is the website
  //    origin (e.g. https://panguard.ai) — we redirect there on cancel only;
  //    success goes to the app's own settings page.
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const cancelOrigin = req.headers.get('origin') ?? appOrigin;

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[billing/checkout] stripe init failed:', detail);
    return NextResponse.json({ error: 'config_error' }, { status: 500, headers });
  }

  // 6. Mint the Checkout Session. Metadata is the breadcrumb the webhook
  //    will use to map `customer.subscription.updated` back to a workspace.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appOrigin}/w/${ws.slug}/settings/billing?success=1`,
      cancel_url: `${cancelOrigin}/pricing`,
      client_reference_id: workspace_id,
      metadata: {
        workspace_id,
        tier,
      },
      subscription_data: {
        metadata: {
          workspace_id,
          tier,
        },
      },
      customer_email: user.email ?? undefined,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      // Defensive — Stripe should always return a URL for redirect-mode
      // sessions, but TS surfaces the nullable case and we'd rather report
      // it cleanly than crash the JSON response.
      return NextResponse.json({ error: 'stripe_session_failed' }, { status: 500, headers });
    }

    return NextResponse.json({ url: session.url }, { headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[billing/checkout] session create failed:', detail);
    return NextResponse.json({ error: 'stripe_session_failed' }, { status: 500, headers });
  }
}
