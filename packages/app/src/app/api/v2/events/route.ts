/**
 * POST /api/v2/events
 *
 * CLI-facing event ingestion endpoint. Called by `pga audit` / `pga scan`
 * via packages/panguard/src/cli/workspace-sync.ts when the user has
 * authenticated with `pga login`.
 *
 * Auth: Bearer <pga_...>   — api_key issued by Device Code Flow
 * Body: { events: WorkspaceEvent[], endpoint: EndpointInfo }
 *
 * Success (200): { ok: true, ingested: N, endpoint_id: "..." }
 * Auth fail (401): { error: "invalid_api_key" }
 * Bad request (400): { error: "invalid_body" | "too_many_events" }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_EVENTS_PER_REQUEST = 500;

const EventSchema = z.object({
  event_type: z.enum([
    'scan.rule_match',
    'scan.completed',
    'guard.blocked',
    'guard.flagged',
    'trap.triggered',
    'respond.action',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  rule_id: z.string().max(64).optional(),
  target: z.string().min(1).max(512),
  target_hash: z.string().max(128).optional(),
  payload_summary: z.string().max(512),
  occurred_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const EndpointSchema = z.object({
  machine_id: z.string().min(8).max(128),
  hostname: z.string().max(255).optional(),
  os_type: z.string().max(32).optional(),
  panguard_version: z.string().max(64).optional(),
});

const BodySchema = z.object({
  events: z.array(EventSchema).min(1).max(MAX_EVENTS_PER_REQUEST),
  endpoint: EndpointSchema,
});

export async function POST(req: NextRequest) {
  // 1. Authenticate by api_key
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token.startsWith('pga_') || token.length < 20) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const admin = createAdminClient();
  const { data: key } = await admin
    .from('api_keys')
    .select('id, workspace_id, revoked_at')
    .eq('key_hash', tokenHash)
    .maybeSingle();
  if (!key || key.revoked_at) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 });
  }

  // 2. Validate body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', detail: parsed.error.issues },
      { status: 400 }
    );
  }

  // 3. Upsert endpoint (auto-registration)
  const { data: endpointId, error: epErr } = await admin.rpc('upsert_endpoint', {
    p_workspace_id: key.workspace_id,
    p_machine_id: parsed.data.endpoint.machine_id,
    p_hostname: parsed.data.endpoint.hostname ?? null,
    p_os_type: parsed.data.endpoint.os_type ?? null,
    p_panguard_version: parsed.data.endpoint.panguard_version ?? null,
  } as never);
  if (epErr) {
    return NextResponse.json({ error: 'endpoint_upsert_failed' }, { status: 500 });
  }

  // 4. Bulk insert events
  const nowIso = new Date().toISOString();
  const rows = parsed.data.events.map((e) => ({
    workspace_id: key.workspace_id,
    endpoint_id: typeof endpointId === 'string' ? endpointId : null,
    event_type: e.event_type,
    severity: e.severity,
    rule_id: e.rule_id ?? null,
    target: e.target,
    target_hash: e.target_hash ?? null,
    payload_summary: e.payload_summary ?? null,
    metadata: e.metadata ?? {},
    occurred_at: e.occurred_at ?? nowIso,
  }));
  const { error: insertErr } = await admin.from('events').insert(rows);
  if (insertErr) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insertErr.message },
      { status: 500 }
    );
  }

  // 5. Update api_keys.last_used_at (best-effort)
  void admin
    .from('api_keys')
    .update({ last_used_at: nowIso })
    .eq('id', key.id)
    .then(
      () => undefined,
      () => undefined
    );

  return NextResponse.json({
    ok: true,
    ingested: rows.length,
    endpoint_id: typeof endpointId === 'string' ? endpointId : null,
  });
}
