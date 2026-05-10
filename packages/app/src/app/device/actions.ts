'use server';

import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspaceBySlug } from '@/lib/workspaces';

const ApproveInput = z.object({
  userCode: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'invalid code format'),
  workspaceSlug: z.string(),
});

export interface ApproveResult {
  ok: boolean;
  error?: string;
}

function mintDeviceApiKey(): { plaintext: string; keyPrefix: string; keyHash: string } {
  const raw = randomBytes(32).toString('base64url');
  const plaintext = `pga_${raw}`;
  const keyPrefix = plaintext.slice(0, 11);
  const keyHash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, keyPrefix, keyHash };
}

export async function approveDeviceCode(formData: FormData): Promise<ApproveResult> {
  const parsed = ApproveInput.safeParse({
    userCode: formData.get('userCode'),
    workspaceSlug: formData.get('workspaceSlug'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid_input' };

  const ctx = await requireWorkspaceBySlug(parsed.data.workspaceSlug);
  if (!ctx) return { ok: false, error: 'workspace_not_found' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const admin = createAdminClient();
  const { data: code, error: fetchErr } = await admin
    .from('device_codes')
    .select('*')
    .eq('user_code', parsed.data.userCode)
    .maybeSingle();
  if (fetchErr || !code) return { ok: false, error: 'code_not_found' };
  if (new Date(code.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'code_expired' };
  }
  if (code.approved_at) return { ok: false, error: 'already_approved' };

  // Mint an API key tied to this device code + workspace + user.
  const key = mintDeviceApiKey();
  const { data: apiKey, error: keyErr } = await admin
    .from('api_keys')
    .insert({
      workspace_id: ctx.workspace.id,
      name: `CLI (${new Date().toISOString().slice(0, 10)})`,
      key_prefix: key.keyPrefix,
      key_hash: key.keyHash,
      created_by: user.id,
    })
    .select()
    .single();
  if (keyErr || !apiKey) return { ok: false, error: keyErr?.message ?? 'key_mint_failed' };

  const { error: updErr } = await admin
    .from('device_codes')
    .update({
      user_id: user.id,
      workspace_id: ctx.workspace.id,
      issued_api_key_id: apiKey.id,
      approved_at: new Date().toISOString(),
      // Stash plaintext here so the /poll endpoint can return it exactly once.
      pending_plaintext: key.plaintext,
    })
    .eq('device_code', code.device_code);
  if (updErr) return { ok: false, error: updErr.message };

  return { ok: true };
}
