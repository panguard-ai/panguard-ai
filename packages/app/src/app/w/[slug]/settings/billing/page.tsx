/**
 * Settings → Billing
 *
 * Server component. Renders:
 *   1. Current tier (badge)
 *   2. Subscription status — "Active until <date>" for paid, "Free tier" for community
 *   3. Pending cancellation (when cancel_at is set) — "Cancels on <date>"
 *   4. Action buttons (client component):
 *        - "Manage Billing" → Stripe Billing Portal (when stripe_customer_id set)
 *        - "Upgrade to Pilot" → Stripe Checkout (when tier === community)
 *   5. Recent billing audit events (action LIKE 'billing.%').
 *
 * Auth contract: must be a workspace admin. assertAdmin throws otherwise.
 */

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import type { AuditLogRow } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ManageBillingButton, UpgradeButton } from './buttons';
import { TierGate } from '@/lib/tier/TierGate';
import { UpsellCard } from '@/lib/tier/UpsellCard';
import { ComplianceEvidenceSection } from './ComplianceEvidenceSection';

class BillingPageError extends Error {}

function assertAdmin(role: string): asserts role is 'admin' {
  if (role !== 'admin') throw new BillingPageError('forbidden');
}

/**
 * Human-readable label for an audit action verb. Keeps the table column
 * scannable without forcing operators to read enum strings.
 */
function humanAction(action: string): string {
  switch (action) {
    case 'billing.upgraded':
      return 'Upgraded';
    case 'billing.updated':
      return 'Plan updated';
    case 'billing.cancelled':
      return 'Cancelled';
    case 'billing.cancelled_with_grace':
      return 'Cancellation scheduled';
    case 'billing.downgraded_after_grace':
      return 'Downgraded';
    case 'billing.payment_failed':
      return 'Payment failed';
    default:
      return action;
  }
}

/**
 * Render a compact summary of an audit row's `metadata`. We pick a few
 * high-signal keys rather than dumping the JSON; the full record lives in
 * the audit_log table for forensic queries.
 */
function metadataExcerpt(meta: Record<string, unknown>): string {
  const fields: string[] = [];
  if (typeof meta.tier === 'string') {
    fields.push(`tier=${meta.tier}`);
  }
  if (typeof meta.subscription_id === 'string') {
    fields.push(`sub=${meta.subscription_id.slice(0, 14)}`);
  }
  if (typeof meta.grace_until === 'string') {
    fields.push(`grace_until=${meta.grace_until.slice(0, 10)}`);
  }
  if (typeof meta.cancellation_reason === 'string' && meta.cancellation_reason) {
    fields.push(`reason=${meta.cancellation_reason}`);
  }
  if (typeof meta.attempt_count === 'number') {
    fields.push(`attempt=${meta.attempt_count}`);
  }
  return fields.join(' · ') || '—';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function BillingSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();
  assertAdmin(ctx.role);

  const successFlag = sp.success === '1';

  const supabase = await createClient();
  const { data: auditRaw } = await supabase
    .from('audit_log')
    .select('*')
    .eq('workspace_id', ctx.workspace.id)
    .like('action', 'billing.%')
    .order('occurred_at', { ascending: false })
    .limit(10);
  const auditRows = (auditRaw ?? []) as unknown as AuditLogRow[];

  const ws = ctx.workspace;
  const isPaid = ws.tier !== 'community';
  const tierBadgeTone =
    ws.tier === 'enterprise' ? 'info' : ws.tier === 'pilot' ? 'sage' : 'neutral';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Billing</h1>
        <p className="mt-1 text-sm text-text-muted">
          {ws.name} · <span className="font-mono">{ws.slug}</span>
        </p>
      </div>

      {successFlag ? (
        <Card padding="md" variant="featured">
          <p className="text-sm text-text-primary">Checkout complete. Your new plan is active.</p>
          <p className="mt-1 text-xs text-text-muted">
            It may take a moment for the tier badge below to update if you just upgraded.
          </p>
        </Card>
      ) : null}

      <Card padding="lg">
        <CardHeader title="Current plan" subtitle="Your workspace tier and renewal schedule." />
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Tier</dt>
            <dd className="mt-1">
              <Badge tone={tierBadgeTone}>{ws.tier}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Status</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {isPaid ? (
                <>Active until {formatDate(ws.tier_expires_at)}</>
              ) : (
                <>Free tier — no billing</>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Next billing date</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {isPaid ? formatDate(ws.tier_expires_at) : '—'}
            </dd>
          </div>
          {ws.cancel_at ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">
                Cancellation scheduled
              </dt>
              <dd className="mt-1 text-sm text-status-caution">
                Downgrades to community on {formatDate(ws.cancel_at)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {ws.stripe_customer_id ? <ManageBillingButton workspaceId={ws.id} /> : null}
          {ws.tier === 'community' ? (
            <UpgradeButton workspaceId={ws.id} tier="pilot" label="Upgrade to Pilot" />
          ) : null}
        </div>

        {!ws.stripe_customer_id && ws.tier !== 'community' ? (
          <p className="mt-4 text-xs text-text-muted">
            No Stripe customer is linked to this workspace yet. Contact support if you believe this
            is a billing record issue.
          </p>
        ) : null}
      </Card>

      <Card padding="lg">
        <CardHeader
          title="Recent billing events"
          subtitle="The last 10 billing-related entries from the audit log."
        />
        {auditRows.length === 0 ? (
          <p className="text-sm text-text-muted">No billing events yet.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Event</TH>
                <TH>Details</TH>
              </TR>
            </THead>
            <TBody>
              {auditRows.map((row) => (
                <TR key={row.id}>
                  <TD className="text-xs">{new Date(row.occurred_at).toLocaleString()}</TD>
                  <TD>{humanAction(row.action)}</TD>
                  <TD className="font-mono text-xs text-text-muted">
                    {metadataExcerpt(row.metadata)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <TierGate
        require="pilot"
        currentTier={ws.tier}
        upsell={
          <UpsellCard
            feature="Compliance Evidence"
            description="Tamper-evident migrator/audit/scan packs that auditors can download with SHA-256 verified integrity. Available on Pilot and Enterprise."
          />
        }
      >
        <ComplianceEvidenceSection workspaceId={ws.id} />
      </TierGate>
    </div>
  );
}
