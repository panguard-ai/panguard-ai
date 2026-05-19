import { notFound } from 'next/navigation';
import { requireWorkspaceBySlug } from '@/lib/workspaces';
import { listEvents } from '@/lib/tc-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal } from '@/components/icons';
import { EventsLiveStream } from './events-live-stream';
import type { Tier } from '@/lib/types';

/** Plain-text retention hint by tier. No paywall, just informational. */
function retentionHint(tier: Tier): string {
  switch (tier) {
    case 'community':
      return 'Events retained 7 days. Upgrade to Pilot for 90 days.';
    case 'pilot':
      return 'Events retained 90 days.';
    case 'enterprise':
      return 'Events retained indefinitely.';
  }
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; severity?: string; q?: string }>;
}

export default async function EventsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) notFound();

  const page = Number.parseInt(sp.page ?? '1', 10) || 1;
  const severity = sp.severity;
  const q = sp.q;

  const result = await listEvents(ctx.workspace.id, {
    page,
    pageSize: 25,
    severity,
    query: q,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Security events</h1>
          <p className="mt-1 text-sm text-text-muted">
            Showing {result.rows.length} of {result.total}
            {severity ? ` · severity=${severity}` : ''}
            {q ? ` · query="${q}"` : ''}
          </p>
          <p className="mt-1 text-xs text-text-muted">{retentionHint(ctx.workspace.tier)}</p>
        </div>
      </div>

      <Card padding="md">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label htmlFor="severity" className="text-xs font-medium uppercase text-text-muted">
              Severity
            </label>
            <select
              id="severity"
              name="severity"
              defaultValue={severity ?? ''}
              className="mt-1 rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-text-primary"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="min-w-[200px] flex-1">
            <label htmlFor="q" className="text-xs font-medium uppercase text-text-muted">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q ?? ''}
              placeholder="rule id, endpoint, summary..."
              className="mt-1 w-full rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
        </form>
      </Card>

      {result.rows.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Terminal className="mx-auto h-8 w-8 text-brand-sage" />
          <h3 className="mt-3 text-base font-semibold text-text-primary">No events match</h3>
          <p className="mt-1 text-sm text-text-muted">
            Try clearing filters or install the CLI to start streaming events.
          </p>
          {/*
            Live-stream client still mounts here so that an event arriving
            against an empty filter-pass list will surface a toast and the
            user can click through to investigate without an F5 refresh.
          */}
          <div className="mt-4">
            <EventsLiveStream workspaceId={ctx.workspace.id} initialEvents={[]} />
          </div>
        </Card>
      ) : (
        <Card padding="none">
          {/*
            EventsLiveStream owns the rendered <Table> for both SSR initial
            rows AND any live INSERTs received via Supabase Realtime. It is
            a client component so the SSR-rendered HTML for the initial
            rows still ships in the first response (Next.js hydrates the
            same markup), preserving fast first paint.
          */}
          <EventsLiveStream workspaceId={ctx.workspace.id} initialEvents={result.rows} />
        </Card>
      )}

      <div className="flex items-center justify-between text-sm text-text-muted">
        <span>
          Page {result.page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button
              variant="secondary"
              size="sm"
              href={buildHref(slug, { ...sp, page: String(page - 1) })}
            >
              Previous
            </Button>
          ) : null}
          {page < totalPages ? (
            <Button
              variant="secondary"
              size="sm"
              href={buildHref(slug, { ...sp, page: String(page + 1) })}
            >
              Next
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildHref(slug: string, params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const qs = usp.toString();
  return `/w/${slug}/events${qs ? `?${qs}` : ''}`;
}
