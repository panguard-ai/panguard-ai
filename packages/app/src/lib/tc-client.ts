import { env } from '@/lib/env';
import type { EventListRow, PaginatedEvents } from '@/lib/types';

/**
 * Thin wrapper around the Threat Cloud HTTP API.
 * TC is the source of truth for events + endpoints; the app is a read view.
 *
 * All requests carry TC_INTERNAL_SECRET and a workspace_id filter.
 */

interface OverviewCounters {
  events_last_7d: number;
  rules_triggered: number;
  endpoints_active: number;
  last_report_generated_at: string | null;
}

async function tcFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!env.TC_INTERNAL_SECRET) {
    throw new Error(
      '[tc-client] TC_INTERNAL_SECRET not set. Configure .env.local.',
    );
  }
  const url = `${env.TC_API_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-panguard-internal-secret': env.TC_INTERNAL_SECRET,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}

export async function getOverviewCounters(
  workspaceId: string,
): Promise<OverviewCounters> {
  try {
    const res = await tcFetch(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/overview`,
    );
    if (!res.ok) throw new Error(`TC ${res.status}`);
    return (await res.json()) as OverviewCounters;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[tc-client] getOverviewCounters failed, returning zeros', err);
    return {
      events_last_7d: 0,
      rules_triggered: 0,
      endpoints_active: 0,
      last_report_generated_at: null,
    };
  }
}

export interface ListEventsOptions {
  page?: number;
  pageSize?: number;
  severity?: string;
  query?: string;
}

export async function listEvents(
  workspaceId: string,
  opts: ListEventsOptions = {},
): Promise<PaginatedEvents> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));

  const params = new URLSearchParams({
    workspace_id: workspaceId,
    page: String(page),
    page_size: String(pageSize),
  });
  if (opts.severity) params.set('severity', opts.severity);
  if (opts.query) params.set('q', opts.query);

  try {
    const res = await tcFetch(`/api/events?${params.toString()}`);
    if (!res.ok) throw new Error(`TC ${res.status}`);
    const body = (await res.json()) as {
      rows: EventListRow[];
      total: number;
    };
    return { rows: body.rows, total: body.total, page, pageSize };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[tc-client] listEvents failed, returning empty', err);
    return { rows: [], total: 0, page, pageSize };
  }
}
