/**
 * POST /api/billing/portal
 *
 * Browser-facing endpoint that mints a Stripe Billing Portal session for the
 * caller's workspace. The portal lets a paying customer update their card,
 * download invoices, swap plans, and cancel — all without us having to ship
 * (and then maintain) those flows ourselves.
 *
 * Auth contract:
 *   1. Caller must have a valid Supabase session cookie.
 *   2. The session user must be a member of the target workspace with
 *      role='admin'. Lower roles cannot manage billing.
 *
 * Body: { workspace_id: string }
 *
 * Success (200): { url: string }                  // redirect target
 * Auth fail (401): { error: 'unauthenticated' }
 * Forbidden (403): { error: 'not_workspace_admin' }
 * Bad input (400): { error: 'invalid_body' | 'unknown_workspace' | 'no_subscription' }
 * Server error (500): { error: 'stripe_portal_failed' | 'config_error' }
 *
 * Idempotency: Stripe Billing Portal sessions are short-lived single-use
 * tokens — repeated calls just mint fresh sessions. Safe to retry.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import { decidePortalAuth } from '@/lib/billing/portal-auth';
import type { Role, Workspace } from '@/lib/types';

const BodySchema = z.object({
  workspace_id: z.string().uuid(),
});

/**
 * Mirror the checkout route's CORS handling. The marketing site can POST
 * here directly with credentials, so we echo back only the configured
 * website origin (wildcard is not allowed with credentials).
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

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  // 1. Parse and validate body.
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
  const { workspace_id } = parsed.data;

  // 2. Run the three Supabase look-ups (session user, workspace,
  //    membership). Errors in any of these collapse to "unknown_workspace"
  //    / "not_workspace_admin" via the pure decidePortalAuth helper below.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ws: Pick<Workspace, 'id' | 'slug' | 'stripe_customer_id'> | null = null;
  if (user) {
    const { data: wsRaw } = await supabase
      .from('workspaces')
      .select('id, slug, name, stripe_customer_id')
      .eq('id', workspace_id)
      .maybeSingle();
    ws = wsRaw as Pick<Workspace, 'id' | 'slug' | 'stripe_customer_id'> | null;
  }

  let member: { role: Role } | null = null;
  if (user && ws) {
    const { data: memberRaw } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();
    member = memberRaw as { role: Role } | null;
  }

  const decision = decidePortalAuth({ user, workspace: ws, member });
  switch (decision.kind) {
    case 'unauthenticated':
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers });
    case 'unknown_workspace':
      return NextResponse.json({ error: 'unknown_workspace' }, { status: 400, headers });
    case 'not_workspace_admin':
      return NextResponse.json({ error: 'not_workspace_admin' }, { status: 403, headers });
    case 'no_subscription':
      return NextResponse.json({ error: 'no_subscription' }, { status: 400, headers });
    case 'allow':
      break;
  }

  // 3. Compute the return URL relative to the app's own origin. The portal
  //    will redirect back here after the customer closes it.
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const returnUrl = `${appOrigin}/w/${decision.slug}/settings/billing`;

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[billing/portal] stripe init failed:', detail);
    return NextResponse.json({ error: 'config_error' }, { status: 500, headers });
  }

  // 5. Mint the portal session. We don't need to set a configuration here —
  //    Stripe falls back to the default billing portal configuration in the
  //    dashboard. Operators can customise behaviour (cancel reasons, plan
  //    changes, etc.) without touching this route.
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: decision.stripeCustomerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'stripe_portal_failed' }, { status: 500, headers });
    }

    return NextResponse.json({ url: session.url }, { headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[billing/portal] session create failed:', detail);
    return NextResponse.json({ error: 'stripe_portal_failed' }, { status: 500, headers });
  }
}
