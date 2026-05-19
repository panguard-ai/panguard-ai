/**
 * POST /api/billing/webhook
 *
 * Stripe-facing webhook endpoint. Receives signed event deliveries from
 * Stripe and mutates the workspaces table to reflect tier changes.
 *
 * Auth contract:
 *   Stripe signs every request with the endpoint's `STRIPE_WEBHOOK_SECRET`.
 *   We verify the signature with `stripe.webhooks.constructEvent` BEFORE
 *   parsing JSON — an unsigned request never reaches our handlers.
 *
 * Body handling:
 *   The Stripe SDK's `constructEvent` needs the *raw* request body bytes
 *   (signing is computed over the byte stream, not a parsed object). We
 *   read with `req.text()` rather than `req.json()` to preserve that.
 *
 * Events handled:
 *   - checkout.session.completed       — first-time upgrade flow
 *   - customer.subscription.updated    — renewals, plan changes, downgrades
 *   - customer.subscription.deleted    — cancellation / churn
 *   - invoice.payment_failed           — dunning trigger (audit only, no
 *                                        downgrade — Stripe retries 3x)
 *
 * Idempotency:
 *   Stripe retries deliveries on non-2xx responses. The `billing_events`
 *   table (PK on `event_id`) is INSERT-on-conflict; a duplicate replay is
 *   caught by the unique violation and the handler returns 200 immediately.
 *
 * Response codes:
 *   200 { received: true }                — processed (or already processed)
 *   400 { error: 'invalid_signature' }    — bad/missing stripe-signature
 *   400 { error: 'invalid_body' }         — body could not be read
 *   500 { error: 'config_error' }         — STRIPE_WEBHOOK_SECRET unset, etc.
 *   500 { error: 'webhook_processing_failed' } — DB write failed (Stripe will retry)
 */

import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { priceIdToTier } from '@/lib/billing/price-tier-map';
import { setWorkspaceTier } from '@/lib/billing/provision';
import { decideCancellationOutcome } from '@/lib/billing/grace';

/**
 * Next.js App Router treats route handlers as edge-or-node by inference;
 * pin to the Node runtime so the raw-body `req.text()` path runs against
 * Node's stream APIs (Stripe SDK uses Node-only crypto for signing).
 */
export const runtime = 'nodejs';

// 90 days for pilot, 1 year for enterprise — falls back to enterprise on
// any unrecognised paid tier so the workspace doesn't end up with a stale
// expiry. Community never gets passed here (its expiry is always null).
const PILOT_DURATION_MS = 90 * 24 * 60 * 60 * 1000;
const ENTERPRISE_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

function expiryForTier(tier: 'pilot' | 'enterprise', nowMs = Date.now()): string {
  const durationMs = tier === 'pilot' ? PILOT_DURATION_MS : ENTERPRISE_DURATION_MS;
  return new Date(nowMs + durationMs).toISOString();
}

/**
 * Idempotency guard. INSERTs the event into `billing_events`; the PK is
 * `event_id` so a duplicate Stripe delivery raises a unique violation
 * (Postgres code 23505) which we translate into "already processed, skip".
 *
 * Returns:
 *   - `'fresh'` if this is the first time we've seen this event.id
 *   - `'duplicate'` if we've processed it before — caller should ack 200.
 *   - `'error'` on any other failure — caller should return 500 so Stripe
 *     retries; the underlying issue (DB outage) is likely transient.
 */
async function recordEvent(event: Stripe.Event): Promise<'fresh' | 'duplicate' | 'error'> {
  const admin = createAdminClient();
  const { error } = await admin.from('billing_events').insert({
    event_id: event.id,
    type: event.type,
    payload_jsonb: event as unknown as Record<string, unknown>,
  });
  if (!error) return 'fresh';
  // Postgres unique-violation. Supabase surfaces it as code '23505'.
  if (error.code === '23505') return 'duplicate';
  // eslint-disable-next-line no-console
  console.error(
    `[billing/webhook] billing_events insert failed event=${event.id}: ${error.message}`
  );
  return 'error';
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.length === 0) {
    // eslint-disable-next-line no-console
    console.error('[billing/webhook] STRIPE_WEBHOOK_SECRET not set — refusing to process events');
    return NextResponse.json({ error: 'config_error' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // Stripe signs the byte stream; never call req.json() here or the
  // signature check will fail on every request.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[billing/webhook] stripe init failed:', detail);
    return NextResponse.json({ error: 'config_error' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[billing/webhook] signature verify failed:', detail);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const handled = await handleCheckoutCompleted(event);
        if (!handled.ok) {
          return NextResponse.json(
            { error: 'webhook_processing_failed', detail: handled.error },
            { status: 500 }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const handled = await handleSubscriptionUpdated(event);
        if (!handled.ok) {
          return NextResponse.json(
            { error: 'webhook_processing_failed', detail: handled.error },
            { status: 500 }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const handled = await handleSubscriptionDeleted(event);
        if (!handled.ok) {
          return NextResponse.json(
            { error: 'webhook_processing_failed', detail: handled.error },
            { status: 500 }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const handled = await handleInvoicePaymentFailed(event);
        if (!handled.ok) {
          return NextResponse.json(
            { error: 'webhook_processing_failed', detail: handled.error },
            { status: 500 }
          );
        }
        break;
      }

      default: {
        // Unhandled event types are intentionally a no-op — Stripe sends
        // dozens of types we don't care about. Acknowledge to stop retries.
        // We don't record these into billing_events: keeping that table
        // scoped to events we actually mutate state on is more useful for
        // forensics than a firehose of every Stripe delivery.
        // eslint-disable-next-line no-console
        console.error(`[billing/webhook] ignored event type=${event.type} id=${event.id}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Handler threw despite a valid signature. Return 500 so Stripe retries
    // — the underlying issue (DB outage, etc.) is likely transient.
    const detail = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error(`[billing/webhook] handler failed event=${event.id}: ${detail}`);
    return NextResponse.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }
}

// ─── Event handlers ─────────────────────────────────────────────────────────
//
// Contract for each handler:
//   - Returns `{ ok: true }` on success OR after a duplicate-replay detection
//     OR after a recoverable "skip" decision (e.g. missing metadata). The
//     top-level switch translates ok=true into a 200 to Stripe.
//   - Returns `{ ok: false, error }` ONLY when a DB write fails in a way
//     that warrants retry. Stripe then retries with exponential backoff.

interface HandlerResult {
  ok: boolean;
  error?: string;
}

/**
 * Translate Stripe's `current_period_end` (Unix seconds) into an ISO string.
 * Stripe occasionally returns 0 or null when a subscription is in a paused/
 * trialing state Stripe hasn't yet billed for — we treat those as "no
 * expiry known" and pass null through.
 */
function periodEndToIso(currentPeriodEnd: number | null | undefined): string | null {
  if (typeof currentPeriodEnd !== 'number' || currentPeriodEnd <= 0) {
    return null;
  }
  return new Date(currentPeriodEnd * 1000).toISOString();
}

async function handleCheckoutCompleted(event: Stripe.Event): Promise<HandlerResult> {
  const dedup = await recordEvent(event);
  if (dedup === 'duplicate') return { ok: true };
  if (dedup === 'error') return { ok: false, error: 'idempotency_log_failed' };

  const session = event.data.object as Stripe.Checkout.Session;

  const workspaceId =
    typeof session.metadata?.workspace_id === 'string' ? session.metadata.workspace_id : null;
  const rawTier = typeof session.metadata?.tier === 'string' ? session.metadata.tier : null;

  if (!workspaceId || (rawTier !== 'pilot' && rawTier !== 'enterprise')) {
    // eslint-disable-next-line no-console
    console.error(
      `[billing/webhook] checkout.session.completed missing metadata event=${event.id} workspace_id=${workspaceId ?? 'null'} tier=${rawTier ?? 'null'}`
    );
    // Ack the event — there's nothing actionable, and retrying wouldn't
    // populate metadata that Stripe never sent.
    return { ok: true };
  }
  const tier: 'pilot' | 'enterprise' = rawTier;

  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription?.id ?? null);

  const tierExpiresAt = expiryForTier(tier);

  const provision = await setWorkspaceTier({
    workspaceId,
    tier,
    tierExpiresAt,
    stripeCustomerId: stripeCustomerId ?? undefined,
    auditAction: 'billing.upgraded',
    auditMetadata: {
      event_id: event.id,
      session_id: session.id,
      subscription_id: subscriptionId,
      stripe_customer_id: stripeCustomerId,
      tier,
      tier_expires_at: tierExpiresAt,
    },
  });

  if (!provision.ok) {
    return { ok: false, error: provision.error };
  }
  return { ok: true };
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<HandlerResult> {
  const dedup = await recordEvent(event);
  if (dedup === 'duplicate') return { ok: true };
  if (dedup === 'error') return { ok: false, error: 'idempotency_log_failed' };

  const subscription = event.data.object as Stripe.Subscription;
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer?.id ?? null);
  if (!stripeCustomerId) {
    // eslint-disable-next-line no-console
    console.error(`[billing/webhook] subscription.updated has no customer event=${event.id}`);
    return { ok: true };
  }

  // Resolve workspace via the stripe_customer_id mapping populated on the
  // original checkout.session.completed.
  const admin = createAdminClient();
  const { data: ws, error: wsErr } = await admin
    .from('workspaces')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (wsErr) {
    return { ok: false, error: `workspace_lookup_failed: ${wsErr.message}` };
  }
  if (!ws) {
    // eslint-disable-next-line no-console
    console.error(
      `[billing/webhook] subscription.updated no workspace for customer=${stripeCustomerId} event=${event.id}`
    );
    return { ok: true };
  }

  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id ?? null;
  const tier = priceIdToTier(priceId);

  // Community = unknown / downgraded price. Clear expiry; otherwise use the
  // subscription's `current_period_end`.
  const tierExpiresAt =
    tier === 'community' ? null : periodEndToIso(subscription.current_period_end);

  const provision = await setWorkspaceTier({
    workspaceId: ws.id,
    tier,
    tierExpiresAt,
    // Don't overwrite the customer id; subscription.updated already implies
    // the mapping is correct (we just used it to find the workspace).
    auditAction: 'billing.updated',
    auditMetadata: {
      event_id: event.id,
      subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      price_id: priceId,
      tier,
      tier_expires_at: tierExpiresAt,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
  });

  if (!provision.ok) {
    return { ok: false, error: provision.error };
  }
  return { ok: true };
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<HandlerResult> {
  const dedup = await recordEvent(event);
  if (dedup === 'duplicate') return { ok: true };
  if (dedup === 'error') return { ok: false, error: 'idempotency_log_failed' };

  const subscription = event.data.object as Stripe.Subscription;
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer?.id ?? null);
  if (!stripeCustomerId) {
    // eslint-disable-next-line no-console
    console.error(`[billing/webhook] subscription.deleted has no customer event=${event.id}`);
    return { ok: true };
  }

  const admin = createAdminClient();
  const { data: wsRaw, error: wsErr } = await admin
    .from('workspaces')
    .select('id, tier, tier_expires_at')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (wsErr) {
    return { ok: false, error: `workspace_lookup_failed: ${wsErr.message}` };
  }
  if (!wsRaw) {
    // eslint-disable-next-line no-console
    console.error(
      `[billing/webhook] subscription.deleted no workspace for customer=${stripeCustomerId} event=${event.id}`
    );
    return { ok: true };
  }
  const ws = wsRaw as { id: string; tier: string; tier_expires_at: string | null };

  // Grace-period decision. Stripe surfaces `current_period_end` (Unix
  // seconds) on the deleted subscription — it is the end of the prepaid
  // window the customer has already paid for. Until that instant passes,
  // the paid tier rides out the period; only then do we downgrade. The
  // decision lives in a pure helper so it can be unit-tested in isolation.
  const outcome = decideCancellationOutcome(subscription.current_period_end, Date.now());

  if (outcome.kind === 'grace') {
    // Keep the current tier. Record `cancel_at = current_period_end` so the
    // lazy-check downgrade path in `requireWorkspaceBySlug` can flip the
    // workspace to community the next time someone visits, at or after
    // tier_expires_at.
    const cancelAtIso = outcome.cancelAtIso;

    // We deliberately do NOT use setWorkspaceTier here — that helper
    // assumes a tier change. The cancel_at update is a narrow column
    // write; we pair it with an audit_log entry to mirror the
    // upgraded/cancelled pattern from the rest of the webhook.
    const { error: updateErr } = await admin
      .from('workspaces')
      .update({ cancel_at: cancelAtIso })
      .eq('id', ws.id);
    if (updateErr) {
      return {
        ok: false,
        error: `workspace_update_failed: ${updateErr.message}`,
      };
    }

    const { error: auditErr } = await admin.from('audit_log').insert({
      workspace_id: ws.id,
      action: 'billing.cancelled_with_grace',
      target_type: 'subscription',
      target_id: subscription.id,
      metadata: {
        event_id: event.id,
        subscription_id: subscription.id,
        stripe_customer_id: stripeCustomerId,
        cancelled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        cancellation_reason: subscription.cancellation_details?.reason ?? null,
        grace_until: cancelAtIso,
        current_tier: ws.tier,
        tier_expires_at: ws.tier_expires_at,
      },
    });
    if (auditErr) {
      // eslint-disable-next-line no-console
      console.error(
        `[billing/webhook] audit_log insert failed for grace cancel ws=${ws.id}: ${auditErr.message}`
      );
    }
    return { ok: true };
  }

  // Period already over (or absent) — downgrade immediately. Keep
  // `stripe_customer_id` set so a future reactivation reuses the same
  // Stripe Customer object instead of creating an orphan in Stripe.
  const provision = await setWorkspaceTier({
    workspaceId: ws.id,
    tier: 'community',
    tierExpiresAt: null,
    auditAction: 'billing.cancelled',
    auditMetadata: {
      event_id: event.id,
      subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      cancellation_reason: subscription.cancellation_details?.reason ?? null,
    },
  });

  if (!provision.ok) {
    return { ok: false, error: provision.error };
  }
  return { ok: true };
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<HandlerResult> {
  const dedup = await recordEvent(event);
  if (dedup === 'duplicate') return { ok: true };
  if (dedup === 'error') return { ok: false, error: 'idempotency_log_failed' };

  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId =
    typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);
  if (!stripeCustomerId) {
    // eslint-disable-next-line no-console
    console.error(`[billing/webhook] invoice.payment_failed has no customer event=${event.id}`);
    return { ok: true };
  }

  const admin = createAdminClient();
  const { data: ws, error: wsErr } = await admin
    .from('workspaces')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();
  if (wsErr) {
    return { ok: false, error: `workspace_lookup_failed: ${wsErr.message}` };
  }
  if (!ws) {
    // eslint-disable-next-line no-console
    console.error(
      `[billing/webhook] invoice.payment_failed no workspace for customer=${stripeCustomerId} event=${event.id}`
    );
    return { ok: true };
  }

  // No tier downgrade here — Stripe retries an invoice ~3 times across ~3
  // weeks by default before emitting customer.subscription.deleted, at
  // which point the deletion handler downgrades. Audit only.
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription?.id ?? null);
  const { error: auditErr } = await admin.from('audit_log').insert({
    workspace_id: ws.id,
    action: 'billing.payment_failed',
    target_type: 'invoice',
    target_id: invoice.id,
    metadata: {
      event_id: event.id,
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      stripe_customer_id: stripeCustomerId,
      attempt_count: invoice.attempt_count ?? null,
      amount_due: invoice.amount_due ?? null,
      currency: invoice.currency ?? null,
      next_payment_attempt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null,
    },
  });
  if (auditErr) {
    return { ok: false, error: `audit_insert_failed: ${auditErr.message}` };
  }
  return { ok: true };
}
