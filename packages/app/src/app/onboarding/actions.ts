'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SlugRegex = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

const CreateWorkspaceInput = z.object({
  name: z.string().trim().min(2).max(64),
  slug: z.string().trim().regex(SlugRegex, {
    message: 'Slug must be 2-40 chars, lowercase, start and end with a letter or number.',
  }),
});

export interface CreateWorkspaceResult {
  ok: boolean;
  slug?: string;
  error?: string;
}

export async function createWorkspace(formData: FormData): Promise<CreateWorkspaceResult> {
  const parsed = CreateWorkspaceInput.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(' '),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Prefer the SQL RPC (atomic: insert workspace + owner membership).
  const { data, error } = await supabase.rpc('create_workspace', {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      return { ok: false, error: 'That slug is already taken.' };
    }
    // Fallback: use admin client to do the two-step insert (dev convenience
    // when the RPC hasn't been deployed yet).
    const admin = createAdminClient();
    const { data: ws, error: wsErr } = await admin
      .from('workspaces')
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
      })
      .select()
      .single();
    if (wsErr || !ws) return { ok: false, error: wsErr?.message ?? 'insert failed' };

    await admin.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'admin',
      accepted_at: new Date().toISOString(),
    });
    redirect(`/w/${ws.slug}`);
  }

  const slug = data?.slug ?? parsed.data.slug;
  redirect(`/w/${slug}`);
}
