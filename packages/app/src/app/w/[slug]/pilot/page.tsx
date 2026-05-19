/**
 * Pilot milestone tracker — the customer-facing 90-day progress page.
 *
 * Shows where the workspace is in the 90-day Pilot SOW timeline, which of
 * the 6 deliverables are complete, how much of the 78-hour engineering
 * budget has been used, and what decision is due at Day 90.
 *
 * Only visible to workspaces on tier='pilot'. Other tiers redirect to the
 * standard workspace overview.
 *
 * Data sources:
 *   - workspaces.tier + tier_expires_at (90-day window)
 *   - pilot_deliverables table (added in 20260520_pilot_tracker.sql)
 *   - pilot_engineering_hours table (same migration)
 *
 * For Founding Customers (first 3 Pilot tier purchases), this page also
 * surfaces the public-acknowledgement opt-in and the $25K-to-Y1-Enterprise
 * credit countdown.
 */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle } from '@/components/icons';

interface DeliverableState {
  id: string;
  label: string;
  targetDay: number;
  status: 'not_started' | 'in_progress' | 'delivered' | 'accepted';
  deliveredAt: string | null;
  acceptedAt: string | null;
}

/**
 * Six SOW deliverables. Order matches Pilot SOW Section 2. Status is
 * sourced from the pilot_deliverables table at runtime; defaults below
 * apply when no row exists yet.
 */
const SOW_DELIVERABLES: Array<Omit<DeliverableState, 'status' | 'deliveredAt' | 'acceptedAt'>> = [
  { id: 'engine', label: 'ATR engine deployment', targetDay: 14 },
  { id: 'rule_pack', label: 'Custom ATR rule pack (50-100 rules)', targetDay: 21 },
  { id: 'evidence_pack', label: 'Sample compliance evidence pack', targetDay: 75 },
  { id: 'siem_webhook', label: 'SIEM webhook integration', targetDay: 30 },
  { id: 'engineering_hours', label: 'Senior engineering office hours', targetDay: 90 },
  { id: 'exit_packet', label: 'Day-90 exit packet', targetDay: 90 },
];

function dayBetween(startIso: string, endIso: string): number {
  const ms = Date.parse(endIso) - Date.parse(startIso);
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function statusTone(s: DeliverableState['status']): 'safe' | 'caution' | 'alert' | 'neutral' {
  if (s === 'accepted' || s === 'delivered') return 'safe';
  if (s === 'in_progress') return 'caution';
  return 'neutral';
}

function statusLabel(s: DeliverableState['status']): string {
  switch (s) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'delivered':
      return 'Delivered (awaiting acceptance)';
    case 'accepted':
      return 'Accepted';
  }
}

export default async function PilotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  // Only Pilot-tier workspaces see this page. Community / Enterprise / etc.
  // get redirected to the workspace overview where the milestone-tracker
  // narrative doesn't apply.
  if (ctx.workspace.tier !== 'pilot') {
    redirect(`/w/${ctx.workspace.slug}`);
  }

  // 90-day clock: tier_expires_at is the SOW Day-90 target. Effective Date
  // is back-derived as expiry minus 90 days. If tier_expires_at is null
  // (workspace migrated without a clock) we fall back to created_at.
  const expiresAt = ctx.workspace.tier_expires_at ?? null;
  const created = ((ctx.workspace as unknown as { created_at?: string }).created_at) ?? null;
  const effectiveDate =
    expiresAt
      ? new Date(Date.parse(expiresAt) - 90 * 24 * 60 * 60 * 1000).toISOString()
      : created ?? new Date().toISOString();
  const now = new Date().toISOString();
  const dayNum = Math.min(90, dayBetween(effectiveDate, now));
  const daysRemaining = Math.max(0, 90 - dayNum);

  // Pull deliverable rows. The table is created lazy by the welcome-email
  // handler; if it doesn't exist yet the query returns empty and we render
  // defaults (not_started for everything).
  const supabase = await createClient();
  const { data: deliverableRows } = await supabase
    .from('pilot_deliverables')
    .select('id, label, target_day, status, delivered_at, accepted_at')
    .eq('workspace_id', ctx.workspace.id)
    .order('target_day', { ascending: true });

  const rowMap = new Map<string, DeliverableState>();
  for (const r of (deliverableRows ?? []) as Array<{
    id: string;
    label: string;
    target_day: number;
    status: DeliverableState['status'];
    delivered_at: string | null;
    accepted_at: string | null;
  }>) {
    rowMap.set(r.id, {
      id: r.id,
      label: r.label,
      targetDay: r.target_day,
      status: r.status,
      deliveredAt: r.delivered_at,
      acceptedAt: r.accepted_at,
    });
  }

  const deliverables: DeliverableState[] = SOW_DELIVERABLES.map((d) => {
    const row = rowMap.get(d.id);
    if (row) return row;
    return {
      ...d,
      status: 'not_started',
      deliveredAt: null,
      acceptedAt: null,
    };
  });

  // Engineering hours used vs 78-hour budget. Falls back to 0 if the
  // pilot_engineering_hours table is empty for this workspace.
  const { data: hoursRows } = await supabase
    .from('pilot_engineering_hours')
    .select('hours_used')
    .eq('workspace_id', ctx.workspace.id);

  const hoursUsed = ((hoursRows ?? []) as Array<{ hours_used: number }>).reduce(
    (sum, r) => sum + (r.hours_used ?? 0),
    0
  );
  const hoursBudget = 78; // 6 hr/wk × 13 weeks
  const hoursPct = Math.min(100, Math.round((hoursUsed / hoursBudget) * 100));

  // Decision moments — derived from dayNum and SOW Section 11.
  const refundWindowDaysLeft = Math.max(0, 7 - dayNum);
  const decisionWindow =
    dayNum < 60
      ? 'preparation'
      : dayNum < 90
        ? 'enterprise-scoping'
        : 'day-90-decision';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Pilot tracker</h1>
        <p className="mt-1 text-sm text-text-muted">
          Day {dayNum} of 90 · {daysRemaining} days remaining · 0% LLM in detection
        </p>
      </div>

      {/* Progress band */}
      <Card padding="lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted uppercase tracking-wider font-semibold">
            <span>Day 0</span>
            <span>Day 30</span>
            <span>Day 60</span>
            <span>Day 90</span>
          </div>
          <div className="relative h-3 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-brand-sage transition-all duration-500"
              style={{ width: `${(dayNum / 90) * 100}%` }}
            />
          </div>
          <p className="text-sm text-text-secondary">
            {refundWindowDaysLeft > 0 ? (
              <span className="text-amber-400 font-semibold">
                7-day refund window: {refundWindowDaysLeft} day{refundWindowDaysLeft === 1 ? '' : 's'}{' '}
                left.
              </span>
            ) : decisionWindow === 'preparation' ? (
              <span>
                In the build phase. ATR engine + custom rule pack + SIEM webhook are the focus through
                Day 30.
              </span>
            ) : decisionWindow === 'enterprise-scoping' ? (
              <span>
                Enterprise scoping window is open. Reply &quot;scope it&quot; in Slack Connect to
                start the Y1 SOW draft.
              </span>
            ) : (
              <span className="text-brand-emerald font-semibold">
                Day-90 decision window. Pick: Enterprise upgrade · Pilot extension · Clean exit.
              </span>
            )}
          </p>
        </div>
      </Card>

      {/* 6 deliverables */}
      <Card padding="none">
        <CardHeader
          title="SOW deliverables"
          subtitle="Six items per Pilot SOW Section 2. Status updated by PanGuard as work lands."
        />
        <ul className="divide-y divide-border">
          {deliverables.map((d) => {
            const overdue = d.status !== 'delivered' && d.status !== 'accepted' && dayNum > d.targetDay;
            return (
              <li key={d.id} className="px-6 py-4 flex items-start gap-4">
                <div className="mt-1">
                  {d.status === 'accepted' || d.status === 'delivered' ? (
                    <Check className="w-5 h-5 text-brand-emerald" />
                  ) : overdue ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">{d.label}</p>
                    <Badge tone={statusTone(d.status)}>{statusLabel(d.status)}</Badge>
                    {overdue ? <Badge tone="alert">Overdue</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Target: Day {d.targetDay}
                    {d.deliveredAt
                      ? ` · Delivered ${new Date(d.deliveredAt).toLocaleDateString()}`
                      : ''}
                    {d.acceptedAt
                      ? ` · Accepted ${new Date(d.acceptedAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Engineering hours */}
      <Card padding="lg">
        <CardHeader title="Senior engineering office hours" />
        <div className="space-y-3 mt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold text-text-primary">
              {hoursUsed.toFixed(1)} <span className="text-base text-text-muted">/ {hoursBudget} hrs</span>
            </p>
            <p className="text-sm text-text-muted">
              {hoursPct}% used · ~{(6 - (hoursUsed / Math.max(1, dayNum / 7))).toFixed(1)} hrs/wk
              avg remaining
            </p>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-brand-sage transition-all duration-500"
              style={{ width: `${hoursPct}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">
            6 hr / week, tracked weekly. Unused weekly hours expire. Pre-scheduled blocks preferred;
            ad-hoc Slack support honored on best-effort.
          </p>
        </div>
      </Card>

      {/* Day 90 decision */}
      <Card padding="lg">
        <CardHeader
          title="Day 90 decision"
          subtitle="Three options per SOW Section 11. $25K Founding Customer credit applies until Day 120."
        />
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Badge tone="safe">1</Badge>
            <span>
              <strong>Upgrade to Enterprise</strong> — Y1 $250K base. $25K Founding Customer credit
              applied (net $225K minimum). Quarterly evidence packs, SLA, AIAM (when Q3 2026 ships).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge tone="caution">2</Badge>
            <span>
              <strong>Pilot extension</strong> — only if Founding Customer slots remain. Otherwise
              upgrade or exit.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Badge tone="neutral">3</Badge>
            <span>
              <strong>Clean exit</strong> — keep all delivered artifacts. 30-day data export window.
              ATR rules remain MIT-licensed under your independent use.
            </span>
          </li>
        </ul>
      </Card>

      {/* Quick links */}
      <Card padding="lg" className="bg-surface-1">
        <CardHeader title="Reference documents" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <a
            href="https://panguard.ai/legal/sow"
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-border hover:border-brand-sage transition-colors"
          >
            <p className="font-semibold text-text-primary">Pilot SOW (your version)</p>
            <p className="text-xs text-text-muted mt-1">90-day scope · 6 deliverables · acceptance criteria</p>
          </a>
          <a
            href="https://panguard.ai/legal/msa"
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-border hover:border-brand-sage transition-colors"
          >
            <p className="font-semibold text-text-primary">MSA</p>
            <p className="text-xs text-text-muted mt-1">Liability, IP, dispute resolution</p>
          </a>
          <a
            href="https://panguard.ai/legal/refund"
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-border hover:border-brand-sage transition-colors"
          >
            <p className="font-semibold text-text-primary">Refund Policy</p>
            <p className="text-xs text-text-muted mt-1">7-day no-questions window · service credits</p>
          </a>
          <a
            href="https://panguard.ai/legal/dpa"
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-border hover:border-brand-sage transition-colors"
          >
            <p className="font-semibold text-text-primary">DPA</p>
            <p className="text-xs text-text-muted mt-1">GDPR + Taiwan PDPA, 72-hr breach SLA</p>
          </a>
          <a
            href="https://panguard.ai/legal/security"
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-border hover:border-brand-sage transition-colors"
          >
            <p className="font-semibold text-text-primary">Security whitepaper</p>
            <p className="text-xs text-text-muted mt-1">SOC 2 Type 1 target Oct 1, 2026</p>
          </a>
          <a
            href="https://panguard.ai/evidence-pack"
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-border hover:border-brand-sage transition-colors"
          >
            <p className="font-semibold text-text-primary">Public sample evidence pack</p>
            <p className="text-xs text-text-muted mt-1">SHA-256 + HMAC · same pipeline that runs for you</p>
          </a>
        </div>
      </Card>
    </div>
  );
}
