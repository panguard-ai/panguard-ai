/**
 * GET /api/atr-rules/[id] — return ATR rule metadata for the event drill-down popover.
 *
 * No auth required: rule metadata is from the open-source agent-threat-rules
 * package (MIT licensed, public on GitHub). Workspace-scoping is not needed.
 */

import { NextResponse } from 'next/server';
import { getRuleMeta } from '@/lib/atr-rules';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^ATR-\d{4}-\d{5}$/.test(id)) {
    return NextResponse.json(
      { error: 'invalid_id', message: 'Rule ID must match ATR-YYYY-NNNNN' },
      { status: 400 }
    );
  }
  const meta = await getRuleMeta(id);
  if (!meta) {
    return NextResponse.json({ error: 'not_found', id }, { status: 404 });
  }
  return NextResponse.json(meta, {
    headers: {
      // Rule metadata is immutable per ATR package version → safe to cache.
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
