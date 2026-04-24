import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const PollInput = z.object({
  device_code: z.string().min(16).max(128),
});

/**
 * RFC 8628 device token polling endpoint.
 *
 * Returns:
 *   - 200 + { api_key, workspace_slug, user_email } when approved (once, then cleared)
 *   - 400 + { error: 'authorization_pending' } while waiting
 *   - 400 + { error: 'expired_token' } when TTL elapsed
 *   - 400 + { error: 'access_denied' } if the code was denied (not implemented yet)
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const parsed = PollInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: code, error } = await admin
    .from('device_codes')
    .select('*, workspaces(id, slug, name, tier, tc_org_id)')
    .eq('device_code', parsed.data.device_code)
    .maybeSingle();

  if (error || !code) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
  }

  if (new Date(code.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired_token' }, { status: 400 });
  }

  if (!code.approved_at) {
    // RFC 8628: while pending, returns 4xx with `authorization_pending`.
    // CLI (packages/panguard) treats 428 as the poll-again signal.
    return NextResponse.json({ error: 'authorization_pending' }, { status: 428 });
  }

  // Return the plaintext key exactly once, then null it.
  // Column is added by supabase/migrations/20260422000005_device_pending.sql.
  const plaintext = (code as { pending_plaintext?: string | null }).pending_plaintext;
  if (!plaintext) {
    return NextResponse.json({ error: 'access_denied' }, { status: 400 });
  }

  await admin
    .from('device_codes')
    .update({ pending_plaintext: null })
    .eq('device_code', code.device_code);

  // Fetch the approving user's email via admin API (never store it on the row).
  let userEmail: string | null = null;
  if (code.user_id) {
    try {
      const { data: adminUser } = await admin.auth.admin.getUserById(code.user_id);
      userEmail = adminUser?.user?.email ?? null;
    } catch {
      // Non-fatal; user can verify elsewhere.
    }
  }

  const workspace = Array.isArray(code.workspaces) ? code.workspaces[0] : code.workspaces;

  return NextResponse.json({
    api_key: plaintext,
    workspace: workspace
      ? {
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name,
          tier: workspace.tier,
          tc_org_id: workspace.tc_org_id,
        }
      : null,
    user: { email: userEmail },
    token_type: 'Bearer',
  });
}
