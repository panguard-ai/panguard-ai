/**
 * Endpoints page — fleet view.
 *
 * Server component. Lists every endpoint registered against the workspace
 * plus a 30-day threat counter. Health badge is computed app-side from
 * last_seen_at:
 *   < 5 min  → healthy
 *   5min-1h  → stale
 *   > 1h     → offline
 *
 * Performance: the 30-day threat count is fetched in ONE aggregated query
 * (GROUP BY endpoint_id) instead of an N+1 per-endpoint loop. For Pilot
 * customers with up-to-50 endpoints this is the difference between
 * one ~10ms query and fifty.
 *
 * Empty state shows the device-code login command so a fresh workspace
 * doesn't dead-end on this page.
 */

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import type { Endpoint } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Terminal } from '@/components/icons';

type Health = 'healthy' | 'stale' | 'offline';

const FIVE_MIN_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/** Decide health status from last_seen_at timestamp. Pure helper for tests. */
export function computeHealth(lastSeenIso: string | null, nowMs: number = Date.now()): Health {
  if (!lastSeenIso) return 'offline';
  const last = Date.parse(lastSeenIso);
  if (Number.isNaN(last)) return 'offline';
  const delta = nowMs - last;
  if (delta < FIVE_MIN_MS) return 'healthy';
  if (delta < ONE_HOUR_MS) return 'stale';
  return 'offline';
}

const healthTone: Record<Health, 'safe' | 'caution' | 'danger'> = {
  healthy: 'safe',
  stale: 'caution',
  offline: 'danger',
};

interface _ThreatCountRow {
  endpoint_id: string;
  count: number;
}

/**
 * One aggregated query for ALL endpoints' 30-day high+critical counts.
 * Uses a raw RPC-friendly select rather than .group() (postgrest-js
 * doesn't expose GROUP BY in a typed way for arbitrary aggregations,
 * so we call a SQL function defined in the migration — but to avoid
 * coupling the page to a yet-to-exist function we issue a plain select
 * and aggregate in JS as a fallback. Either path is single-query.)
 */
async function fetchThreatCounts(workspaceId: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('events')
    .select('endpoint_id, severity')
    .eq('workspace_id', workspaceId)
    .gte('occurred_at', cutoff)
    .in('severity', ['critical', 'high'])
    .not('endpoint_id', 'is', null);

  if (error || !data) return new Map();

  const counts = new Map<string, number>();
  for (const row of data as Array<{ endpoint_id: string | null }>) {
    if (!row.endpoint_id) continue;
    counts.set(row.endpoint_id, (counts.get(row.endpoint_id) ?? 0) + 1);
  }
  return counts;
}

/** Read all endpoints for this workspace, newest activity first. */
async function fetchEndpoints(workspaceId: string): Promise<Endpoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('endpoints')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('last_seen_at', { ascending: false });
  return (data ?? []) as unknown as Endpoint[];
}

interface EndpointRow extends Endpoint {
  current_mode?: string | null;
  total_threats_30d?: number | null;
  last_sync_at?: string | null;
  tier_at_last_sync?: string | null;
}

export default async function EndpointsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const [endpoints, threatCounts] = await Promise.all([
    fetchEndpoints(ctx.workspace.id),
    fetchThreatCounts(ctx.workspace.id),
  ]);

  if (endpoints.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Endpoints</h1>
          <p className="mt-1 text-sm text-text-muted">
            Machines reporting telemetry into {ctx.workspace.name}.
          </p>
        </div>
        <Card padding="lg" className="text-center">
          <Terminal className="mx-auto h-8 w-8 text-brand-sage" />
          <h3 className="mt-3 text-base font-semibold text-text-primary">No endpoints yet</h3>
          <p className="mt-1 text-sm text-text-muted">
            Run the command below on any machine you want to monitor. It will register here on the
            first event.
          </p>
          <pre className="mt-4 inline-block rounded-lg bg-surface-2 px-4 py-2 font-mono text-xs text-text-primary">
            npx @panguard-ai/panguard login
          </pre>
          <p className="mt-4 text-xs text-text-muted">
            <a
              className="text-brand-sage hover:text-brand-sage-light"
              href="https://docs.panguard.ai/install"
            >
              Installation docs
            </a>
          </p>
        </Card>
      </div>
    );
  }

  const nowMs = Date.now();
  const rows: Array<EndpointRow & { health: Health; threats: number }> = endpoints.map((ep) => {
    const r = ep as EndpointRow;
    return {
      ...r,
      health: computeHealth(r.last_seen_at, nowMs),
      threats: threatCounts.get(r.id) ?? r.total_threats_30d ?? 0,
    };
  });

  // Quick fleet health summary (above the table) — gives CISO an at-a-glance
  // signal without scanning every row.
  const fleetHealth = rows.reduce(
    (acc, r) => {
      acc[r.health]++;
      return acc;
    },
    { healthy: 0, stale: 0, offline: 0 } as Record<Health, number>
  );
  const totalThreats = rows.reduce((n, r) => n + r.threats, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Endpoints</h1>
        <p className="mt-1 text-sm text-text-muted">
          {endpoints.length} machine{endpoints.length === 1 ? '' : 's'} reporting telemetry · last
          30 days · Detection runs 0% on LLM
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Healthy
          </p>
          <p className="mt-1 text-2xl font-bold text-brand-emerald">{fleetHealth.healthy}</p>
          <p className="text-[11px] text-text-muted">Reported within 5 min</p>
        </Card>
        <Card padding="md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Stale
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{fleetHealth.stale}</p>
          <p className="text-[11px] text-text-muted">Last 5 min - 1 hr</p>
        </Card>
        <Card padding="md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Offline
          </p>
          <p className="mt-1 text-2xl font-bold text-red-400">{fleetHealth.offline}</p>
          <p className="text-[11px] text-text-muted">No telemetry &gt; 1 hr</p>
        </Card>
        <Card padding="md">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            High+critical (30d)
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{totalThreats}</p>
          <p className="text-[11px] text-text-muted">Across all endpoints</p>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader title="Fleet" />
        <Table>
          <THead>
            <TR>
              <TH>Hostname</TH>
              <TH>OS</TH>
              <TH>Version</TH>
              <TH>Mode</TH>
              <TH>Threats (30d)</TH>
              <TH>Last Seen</TH>
              <TH>Health</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD className="font-mono text-xs">{row.hostname ?? '—'}</TD>
                <TD className="text-text-secondary">{row.os_type ?? '—'}</TD>
                <TD className="font-mono text-xs">{row.panguard_version ?? '—'}</TD>
                <TD className="text-text-secondary">{row.current_mode ?? '—'}</TD>
                <TD>
                  <Badge tone={row.threats > 0 ? 'alert' : 'neutral'}>{row.threats}</Badge>
                </TD>
                <TD className="text-xs text-text-muted">
                  {new Date(row.last_seen_at).toLocaleString()}
                </TD>
                <TD>
                  <Badge tone={healthTone[row.health]}>{row.health}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
