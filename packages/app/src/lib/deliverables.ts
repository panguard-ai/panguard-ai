/**
 * Data access for the deliverable-report feature. Reads run under the caller's
 * RLS session (`createClient`); privileged writes (the issue/upload path) use
 * the admin client inside the server action. Pure row -> generator-input
 * mapping lives in `@/lib/report/from-db` so it stays testable without pulling
 * in the server-only Supabase client.
 */

import { createClient } from '@/lib/supabase/server';
import type { Deliverable, DeliverableFindingRow } from '@/lib/types';

/** List a workspace's deliverables, newest first. Returns [] on error. */
export async function listDeliverables(
  workspaceId: string
): Promise<ReadonlyArray<Deliverable>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) {
    console.error('[deliverables] list', error?.message);
    return [];
  }
  return data as unknown as Deliverable[];
}

/** Fetch a single deliverable scoped to the workspace, or null. */
export async function getDeliverable(
  workspaceId: string,
  id: string
): Promise<Deliverable | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('deliverables')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  return (data as unknown as Deliverable | null) ?? null;
}

/** Fetch a deliverable's findings ordered by display ordinal. */
export async function listDeliverableFindings(
  deliverableId: string
): Promise<ReadonlyArray<DeliverableFindingRow>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deliverable_findings')
    .select('*')
    .eq('deliverable_id', deliverableId)
    .order('ordinal', { ascending: true });
  if (error || !data) {
    console.error('[deliverables] listFindings', error?.message);
    return [];
  }
  return data as unknown as DeliverableFindingRow[];
}

/**
 * Live finding counts for a set of deliverables, keyed by deliverable id.
 * Drafts have no stored `finding_count` (it is only written when the report is
 * issued), so the list view needs this live tally to avoid showing "0" for a
 * draft that already has findings. One `IN (...)` query, not N round-trips;
 * runs under the caller's RLS session so it never sees another workspace's
 * findings. Returns an empty map on empty input or error.
 */
export async function findingCountsByDeliverable(
  deliverableIds: ReadonlyArray<string>
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (deliverableIds.length === 0) return counts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deliverable_findings')
    .select('deliverable_id')
    .in('deliverable_id', [...deliverableIds]);
  if (error || !data) {
    console.error('[deliverables] findingCounts', error?.message);
    return counts;
  }

  for (const row of data as ReadonlyArray<{ deliverable_id: string }>) {
    counts.set(row.deliverable_id, (counts.get(row.deliverable_id) ?? 0) + 1);
  }
  return counts;
}
