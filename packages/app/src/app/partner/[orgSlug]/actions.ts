'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireOrgBySlug } from '@/lib/organizations';
import type { Workspace } from '@/lib/types';

const CreateInput = z.object({
  orgSlug: z.string(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,40}$/, 'Slug must be 2-40 chars: lowercase letters, digits, hyphen'),
});

export interface CreateClientResult {
  ok: boolean;
  slug?: string;
  error?: string;
}

/**
 * Partner self-service: create a new client workspace under the partner's org.
 *
 * Authorization is enforced twice (defense in depth):
 *   1. Here — requireOrgBySlug resolves the org via RLS and we check the
 *      caller is partner_admin.
 *   2. In the DB — create_client_workspace() re-checks is_org_member(_,'partner_admin')
 *      inside the SECURITY DEFINER body, so even a forged RPC call is rejected.
 */
export async function createClientWorkspace(formData: FormData): Promise<CreateClientResult> {
  const parsed = CreateInput.safeParse({
    orgSlug: formData.get('orgSlug'),
    name: formData.get('name'),
    slug: formData.get('slug'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(' ') };
  }

  const ctx = await requireOrgBySlug(parsed.data.orgSlug);
  if (!ctx) return { ok: false, error: 'Organization not found' };
  if (ctx.role !== 'partner_admin') {
    return { ok: false, error: 'Only a partner admin can create client workspaces' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_client_workspace', {
    p_org_id: ctx.organization.id,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error) {
    // 23505 = unique_violation — the slug is already taken globally.
    const message =
      error.code === '23505'
        ? `A workspace with slug "${parsed.data.slug}" already exists. Pick another.`
        : error.message;
    return { ok: false, error: message };
  }

  revalidatePath(`/partner/${parsed.data.orgSlug}`);
  const created = data as Workspace | null;
  return { ok: true, slug: created?.slug ?? parsed.data.slug };
}
