/**
 * /pilot/checkout?intent=<uuid>
 *
 * Magic-link callback. After the visitor clicks the link in their email,
 * Supabase Auth puts them through /auth/callback which redirects here.
 *
 * On arrival:
 *   1. Look up pilot_intent by `?intent=`
 *   2. Verify the authenticated user's email matches the intent's email
 *   3. Re-check the founding-3 gate
 *   4. Provision a workspace IF the user doesn't have one yet
 *   5. Mint a Stripe Checkout Session with:
 *        - mode: 'payment' (one-time $25K)
 *        - automatic_tax: enabled
 *        - tax_id_collection: enabled
 *        - billing_address_collection: required
 *        - metadata.pilot_intent_id (so the webhook can update the row)
 *      Card path → redirect to Stripe Checkout URL
 *      Wire path → create Stripe Invoice + redirect to invoice URL
 *   6. Mark pilot_intent.stripe_session_id + workspace_id
 *
 * Edge cases handled:
 *   - intent expired → ask user to resubmit at /scoping
 *   - intent already converted (has stripe_session_id) → redirect to that session
 *   - email mismatch → 403 with "use the email you submitted with"
 *   - founding cap reached between intent submission + checkout → message + sales link
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/client';

const FOUNDING_SLOT_CAP = 3;

interface PilotIntentRow {
  pk: string;
  org_name: string;
  contact_email: string;
  contact_name: string;
  framework: string;
  deployment_target: string;
  team_size: string;
  use_case: string;
  payment_path: 'card' | 'wire';
  workspace_id: string | null;
  stripe_session_id: string | null;
  stripe_session_status: string | null;
  expires_at: string;
}

interface SearchParams {
  intent?: string;
}

export default async function PilotCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { intent } = await searchParams;
  if (!intent || !/^[0-9a-f-]{36}$/i.test(intent)) {
    return <ErrorScreen title="Invalid checkout link" body="The link you used is malformed. Resubmit at panguard.ai/scoping." />;
  }

  // 1. Require authenticated session (magic link consumed by /auth/callback)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/pilot/checkout?intent=${intent}`)}`);
  }

  // 2. Service-role lookup for the intent row
  const admin = createAdminClient();
  const { data: intentRow, error: intentErr } = await admin
    .from('pilot_intent')
    .select(
      'pk, org_name, contact_email, contact_name, framework, deployment_target, team_size, use_case, payment_path, workspace_id, stripe_session_id, stripe_session_status, expires_at'
    )
    .eq('pk', intent)
    .maybeSingle();

  if (intentErr || !intentRow) {
    return (
      <ErrorScreen
        title="Intent not found"
        body="This pilot intent doesn't exist or has expired. Resubmit at panguard.ai/scoping."
      />
    );
  }
  const row = intentRow as unknown as PilotIntentRow;

  // 3. Email match check — protect against link forwarding
  const userEmail = (user.email ?? '').toLowerCase();
  const intentEmail = row.contact_email.toLowerCase();
  if (userEmail !== intentEmail) {
    return (
      <ErrorScreen
        title="Email mismatch"
        body={`This intent was submitted by ${intentEmail}. You signed in as ${userEmail}. Use the email you submitted with at panguard.ai/scoping.`}
      />
    );
  }

  // 4. Expiry check
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return (
      <ErrorScreen
        title="Intent expired"
        body="This pilot intent expired (14-day TTL). Resubmit at panguard.ai/scoping."
      />
    );
  }

  // 5. If already converted, send them to settings/billing where Stripe redirected
  if (row.stripe_session_id && row.stripe_session_status === 'paid' && row.workspace_id) {
    const { data: ws } = await admin
      .from('workspaces')
      .select('slug')
      .eq('id', row.workspace_id)
      .maybeSingle();
    if (ws) redirect(`/w/${(ws as { slug: string }).slug}/pilot`);
  }

  // 6. Hard founding-3 gate (race-safe — re-checked here)
  const { count: paidCount } = await admin
    .from('pilot_intent')
    .select('pk', { count: 'exact', head: true })
    .eq('stripe_session_status', 'paid');
  if ((paidCount ?? 0) >= FOUNDING_SLOT_CAP) {
    return (
      <ErrorScreen
        title="All Founding Customer slots claimed"
        body="Between your scoping submission and this checkout, the 3 founding-customer slots filled. Email sales@panguard.ai for Enterprise tier ($250K+)."
      />
    );
  }

  // 7. Find OR create the workspace for this user.
  //    A user might already have a Community workspace from before (rare in
  //    Founding Customer flow but possible). If yes, upgrade that one. If
  //    no, bootstrap a new workspace seeded with the scoping answers.
  let workspaceId = row.workspace_id;
  let workspaceSlug: string | null = null;

  if (!workspaceId) {
    // Check existing membership first
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces!inner(slug)')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (existing && typeof existing === 'object' && 'workspace_id' in existing) {
      workspaceId = (existing as { workspace_id: string }).workspace_id;
      // Supabase typed join can return as object or array depending on the
      // relationship cardinality the schema inferred. Handle both shapes
      // defensively rather than fight the generated types.
      const rawJoin = (existing as { workspaces: { slug: string } | Array<{ slug: string }> })
        .workspaces;
      if (Array.isArray(rawJoin)) {
        workspaceSlug = rawJoin[0]?.slug ?? null;
      } else if (rawJoin && typeof rawJoin === 'object' && 'slug' in rawJoin) {
        workspaceSlug = rawJoin.slug;
      }
    } else {
      // Bootstrap workspace from scoping data
      const slug = slugify(row.org_name) + '-' + Math.random().toString(36).slice(2, 7);
      const { data: newWs, error: wsErr } = await admin
        .from('workspaces')
        .insert({
          name: row.org_name,
          slug,
          tier: 'community',
          metadata: {
            pilot_intent_id: row.pk,
            framework: row.framework,
            deployment_target: row.deployment_target,
            team_size: row.team_size,
            use_case: row.use_case.slice(0, 500),
          },
        })
        .select('id, slug')
        .single();
      if (wsErr || !newWs) {
        return (
          <ErrorScreen
            title="Workspace creation failed"
            body="Couldn't bootstrap your workspace. Email adam@panguard.ai with intent ID and we'll resolve manually."
          />
        );
      }
      workspaceId = (newWs as { id: string; slug: string }).id;
      workspaceSlug = (newWs as { id: string; slug: string }).slug;

      // Add user as admin
      await admin.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'admin',
      });
    }

    // Link intent → workspace
    await admin.from('pilot_intent').update({ workspace_id: workspaceId }).eq('pk', row.pk);
  } else {
    const { data: ws } = await admin
      .from('workspaces')
      .select('slug')
      .eq('id', workspaceId)
      .maybeSingle();
    if (ws) workspaceSlug = (ws as { slug: string }).slug;
  }

  if (!workspaceSlug) {
    return (
      <ErrorScreen
        title="Workspace lookup failed"
        body="Couldn't find your workspace slug. Email adam@panguard.ai with the intent ID."
      />
    );
  }

  // 8. Mint Stripe Checkout Session (card) OR Stripe Invoice (wire).
  const priceId = process.env['STRIPE_PRICE_ID_PILOT'];
  if (!priceId) {
    return (
      <ErrorScreen
        title="Checkout misconfigured"
        body="Server is missing Stripe Price ID. Email adam@panguard.ai."
      />
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return (
      <ErrorScreen
        title="Stripe unavailable"
        body="Stripe SDK couldn't initialise. Email adam@panguard.ai."
      />
    );
  }

  const websiteOrigin = process.env['NEXT_PUBLIC_WEBSITE_URL'] ?? 'https://panguard.ai';

  if (row.payment_path === 'wire') {
    // Path B — Stripe Invoice with Net-30 (customer wires; manual reconcile)
    // Create a Customer record first
    let customerId: string;
    try {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: row.org_name,
        description: `Pilot intent ${row.pk} — wire path`,
        metadata: {
          pilot_intent_id: row.pk,
          workspace_id: workspaceId,
          contact_name: row.contact_name,
        },
      });
      customerId = customer.id;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[pilot/checkout] customer create failed', err);
      return (
        <ErrorScreen
          title="Stripe customer creation failed"
          body="Couldn't create your billing record. Email adam@panguard.ai."
        />
      );
    }

    try {
      // Create invoice + invoice item + finalise so customer gets a hosted invoice URL
      await stripe.invoiceItems.create({
        customer: customerId,
        price: priceId,
      });
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        auto_advance: true,
        automatic_tax: { enabled: true },
        metadata: {
          pilot_intent_id: row.pk,
          workspace_id: workspaceId,
          tier: 'pilot',
        },
      });
      // Finalise so a hosted_invoice_url exists
      const finalised = await stripe.invoices.finalizeInvoice(invoice.id ?? '');
      const hostedUrl = finalised.hosted_invoice_url;

      // Mark intent
      await admin
        .from('pilot_intent')
        .update({
          stripe_session_id: finalised.id,
          stripe_session_status: 'open',
        })
        .eq('pk', row.pk);

      if (hostedUrl) {
        redirect(hostedUrl);
      }
      return (
        <ErrorScreen
          title="Invoice created"
          body={`Invoice ${finalised.id} created (Net-30). Stripe didn't return a hosted URL — email billing@panguard.ai with intent ID ${row.pk} to receive it manually.`}
        />
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      // eslint-disable-next-line no-console
      console.error('[pilot/checkout] invoice path failed', msg);
      return (
        <ErrorScreen
          title="Invoice creation failed"
          body={`Stripe rejected the invoice. Detail: ${msg}. Email adam@panguard.ai.`}
        />
      );
    }
  }

  // Path A — Stripe Checkout Session (card)
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'required',
      success_url: `${websiteOrigin}/pilot/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${websiteOrigin}/scoping?cancelled=1`,
      client_reference_id: workspaceId,
      metadata: {
        workspace_id: workspaceId,
        tier: 'pilot',
        pilot_intent_id: row.pk,
        framework: row.framework,
      },
      payment_intent_data: {
        metadata: {
          workspace_id: workspaceId,
          tier: 'pilot',
          pilot_intent_id: row.pk,
        },
      },
      customer_email: user.email ?? undefined,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return (
        <ErrorScreen
          title="Stripe didn't return a checkout URL"
          body="Email adam@panguard.ai with intent ID."
        />
      );
    }

    // Mark intent before redirecting
    await admin
      .from('pilot_intent')
      .update({ stripe_session_id: session.id, stripe_session_status: 'open' })
      .eq('pk', row.pk);

    redirect(session.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    // eslint-disable-next-line no-console
    console.error('[pilot/checkout] session create failed', msg);
    return (
      <ErrorScreen
        title="Checkout creation failed"
        body={`Stripe rejected the checkout request. Detail: ${msg}. Email adam@panguard.ai.`}
      />
    );
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function ErrorScreen({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-4 text-sm text-text-secondary leading-relaxed">{body}</p>
        <a
          href="https://panguard.ai/scoping"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-sage hover:text-brand-sage-light"
        >
          Back to scoping →
        </a>
      </div>
    </div>
  );
}
