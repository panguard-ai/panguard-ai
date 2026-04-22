import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { getOverviewCounters, listEvents } from '@/lib/tc-client';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Terminal } from '@/components/icons';
import type { Severity } from '@/lib/types';

const severityTone: Record<Severity, 'safe' | 'caution' | 'alert' | 'danger'> = {
  info: 'safe',
  low: 'safe',
  medium: 'caution',
  high: 'alert',
  critical: 'danger',
};

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();
  const t = await getTranslations('workspace');

  const [counters, recent] = await Promise.all([
    getOverviewCounters(ctx.workspace.id),
    listEvents(ctx.workspace.id, { pageSize: 10 }),
  ]);

  const stats = [
    { label: 'Events (7d)', value: counters.events_last_7d },
    { label: 'Rules triggered', value: counters.rules_triggered },
    { label: 'Active endpoints', value: counters.endpoints_active },
    {
      label: 'Last report',
      value: counters.last_report_generated_at
        ? new Date(counters.last_report_generated_at).toLocaleDateString()
        : 'never',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {t('overviewTitle')}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {ctx.workspace.name} — live signals from your endpoints.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wide text-text-muted">
              {s.label}
            </p>
            <p className="mt-2 font-display text-3xl text-text-primary">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        <CardHeader
          title="Recent events"
          subtitle="Latest 10 events across all endpoints"
          action={<Button variant="ghost" href={`/w/${ctx.workspace.slug}/events`}>View all</Button>}
        />
        {recent.rows.length === 0 ? (
          <EmptyEvents slug={ctx.workspace.slug} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Severity</TH>
                <TH>Summary</TH>
                <TH>Endpoint</TH>
                <TH>When</TH>
              </TR>
            </THead>
            <TBody>
              {recent.rows.map((e) => (
                <TR key={e.id}>
                  <TD>
                    <Badge tone={severityTone[e.severity]}>{e.severity}</Badge>
                  </TD>
                  <TD className="text-text-primary">{e.payload_summary ?? ''}</TD>
                  <TD className="font-mono text-xs">{e.endpoint_hostname ?? '-'}</TD>
                  <TD>{new Date(e.occurred_at).toLocaleString()}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function EmptyEvents({ slug }: { slug: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-2 p-8 text-center">
      <Terminal className="mx-auto h-8 w-8 text-brand-sage" />
      <h3 className="mt-3 text-base font-semibold text-text-primary">
        No events yet
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        Install the CLI and run <kbd>pga login --workspace {slug}</kbd> on a
        developer machine to start streaming events.
      </p>
      <div className="mt-4">
        <Button variant="secondary" size="sm" href={`/w/${slug}/settings`}>
          Generate install command
        </Button>
      </div>
    </div>
  );
}
