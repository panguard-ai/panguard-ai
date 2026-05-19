/**
 * POST /api/pilot/intent
 *
 * Captures scoping answers + terms acceptance from the public pilot
 * scoping form on panguard.ai/scoping. NO auth required — this is the
 * pre-signup funnel entry.
 *
 * Flow:
 *   1. Validate body (Zod) — 5 scoping answers + 3 terms acceptances + email
 *   2. Check the founding-customer gate (max 3 paid pilots)
 *      - Soft check: if 3 paid already, reject with `slots_exhausted`
 *      - Hard check happens again at checkout time
 *   3. Insert pilot_intent row via service-role client
 *   4. Trigger magic-link email via Supabase Auth (signInWithOtp)
 *      Email's emailRedirectTo carries the intent pk so the callback
 *      can convert intent → workspace + Stripe Session
 *   5. Return { ok: true, intent_id }
 *
 * Rate limit: 5 attempts per IP per hour (rough abuse cap; F500 buyers
 * never hit it, fraudsters do).
 *
 * Errors:
 *   400 invalid_body       — Zod failed
 *   400 invalid_email      — email regex / domain check failed
 *   409 slots_exhausted    — 3 founding-customer slots already paid
 *   429 rate_limited       — > 5 / IP / hr
 *   500 db_error           — insert failed
 *   500 email_send_failed  — magic link send failed (intent persisted though)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const BodySchema = z.object({
  org_name: z.string().min(2).max(200),
  contact_email: z.string().email().max(254),
  contact_name: z.string().min(2).max(100),
  framework: z.enum(['eu-ai-act', 'nist-ai-rmf', 'iso-42001', 'owasp-agentic', 'owasp-llm']),
  deployment_target: z.enum(['vpc-aws', 'vpc-gcp', 'vpc-azure', 'on-prem', 'airgap', 'undecided']),
  team_size: z.enum(['1-10', '11-50', '51-200', '200+']),
  use_case: z.string().min(10).max(1000),
  payment_path: z.enum(['card', 'wire']).default('card'),
  accepted_msa: z.literal(true),
  accepted_dpa: z.literal(true),
  accepted_refund_policy: z.literal(true),
  msa_version: z.string().default('v1.0'),
  dpa_version: z.string().default('v1.0'),
  refund_policy_version: z.string().default('v1.0'),
});

/** Founding Customer cap. Hard gate enforced at checkout creation too. */
const FOUNDING_SLOT_CAP = 3;

/**
 * Allow the marketing site (different origin) to POST here. Mirrors
 * /api/billing/checkout CORS pattern.
 */
function corsHeaders(req: NextRequest): Record<string, string> {
  const allowed = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'https://panguard.ai';
  const origin = req.headers.get('origin') ?? '';
  const allowOrigin = origin === allowed ? origin : allowed;
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-credentials': 'false',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    vary: 'origin',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

// Naive in-memory rate limit — fine for a low-volume founding-customer
// page. Replace with Redis if abuse picks up.
const rateBucket = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;

function ipFrom(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || entry.resetAt < now) {
    rateBucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const ip = ipFrom(req);

  if (!withinRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400, headers });
  }
  const body = parsed.data;

  // Reject obviously fake emails (gmail with role-name, postmaster@, etc.)
  if (/^(postmaster|admin|root|noreply|info)@/i.test(body.contact_email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400, headers });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[pilot/intent] admin client init failed', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500, headers });
  }

  // Founding-customer gate (soft check — hard check at /pilot/checkout)
  const { count: paidCount, error: countErr } = await admin
    .from('pilot_intent')
    .select('pk', { count: 'exact', head: true })
    .eq('stripe_session_status', 'paid');

  if (countErr) {
    // eslint-disable-next-line no-console
    console.error('[pilot/intent] count error', countErr);
    return NextResponse.json({ error: 'db_error' }, { status: 500, headers });
  }
  if ((paidCount ?? 0) >= FOUNDING_SLOT_CAP) {
    return NextResponse.json(
      {
        error: 'slots_exhausted',
        message:
          'All 3 Founding Customer Pilot slots have been claimed. Enterprise tier ($250K base) is available — contact sales@panguard.ai.',
      },
      { status: 409, headers }
    );
  }

  // Insert intent row
  const ua = req.headers.get('user-agent') ?? null;
  const { data: insertData, error: insertErr } = await admin
    .from('pilot_intent')
    .insert({
      org_name: body.org_name,
      contact_email: body.contact_email.toLowerCase(),
      contact_name: body.contact_name,
      framework: body.framework,
      deployment_target: body.deployment_target,
      team_size: body.team_size,
      use_case: body.use_case,
      payment_path: body.payment_path,
      accepted_msa: body.accepted_msa,
      accepted_dpa: body.accepted_dpa,
      accepted_refund_policy: body.accepted_refund_policy,
      msa_version: body.msa_version,
      dpa_version: body.dpa_version,
      refund_policy_version: body.refund_policy_version,
      ip_address: ip === 'unknown' ? null : ip,
      user_agent: ua,
    })
    .select('pk')
    .single();

  if (insertErr || !insertData) {
    // eslint-disable-next-line no-console
    console.error('[pilot/intent] insert error', insertErr);
    return NextResponse.json({ error: 'db_error' }, { status: 500, headers });
  }
  const intentId = insertData.pk as string;

  // Send magic-link via Supabase Auth — redirect target carries intent pk
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panguard.ai';
  const { error: otpErr } = await admin.auth.signInWithOtp({
    email: body.contact_email,
    options: {
      emailRedirectTo: `${appOrigin}/pilot/checkout?intent=${intentId}`,
      data: {
        pilot_intent_id: intentId,
        org_name: body.org_name,
        contact_name: body.contact_name,
      },
    },
  });

  if (otpErr) {
    // eslint-disable-next-line no-console
    console.error('[pilot/intent] OTP send failed', otpErr);
    // Don't fail the user — they can re-trigger from /pilot/checkout via "Resend magic link"
    return NextResponse.json(
      {
        ok: true,
        intent_id: intentId,
        magic_link_sent: false,
        message:
          'Scoping captured. Magic link email failed — please email adam@panguard.ai with subject "[Pilot Intent ' +
          intentId +
          '] resend" to receive your login link.',
      },
      { headers }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      intent_id: intentId,
      magic_link_sent: true,
      slots_remaining: Math.max(0, FOUNDING_SLOT_CAP - (paidCount ?? 0)),
    },
    { headers }
  );
}

/**
 * GET /api/pilot/intent?slots=1
 *
 * Returns the remaining Founding Customer slot count for the public
 * scoping form to render. Public + cached aggressively.
 */
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const url = new URL(req.url);
  if (url.searchParams.get('slots') !== '1') {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500, headers });
  }

  const { count, error } = await admin
    .from('pilot_intent')
    .select('pk', { count: 'exact', head: true })
    .eq('stripe_session_status', 'paid');

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500, headers });
  }

  const paid = count ?? 0;
  return NextResponse.json(
    {
      paid,
      total_slots: FOUNDING_SLOT_CAP,
      slots_remaining: Math.max(0, FOUNDING_SLOT_CAP - paid),
      exhausted: paid >= FOUNDING_SLOT_CAP,
    },
    {
      headers: {
        ...headers,
        'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
