'use server';

/**
 * Workspace settings server actions.
 *
 * Each exported action has signature `(FormData) => Promise<void>` so it can
 * be wired directly to `<form action={...}>` in RSC pages. Errors throw and
 * bubble up to the nearest error.tsx boundary; success redirects or
 * revalidates as appropriate.
 *
 * Future: wrap in useActionState on client components to display inline
 * error messages. For MVP, thrown errors land the user on the error page
 * which is enough fidelity for the primary actions.
 */

import { revalidatePath } from 'next/cache';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireWorkspaceBySlug } from '@/lib/workspaces';

class ActionError extends Error {}

function assertAdmin(role: string): asserts role is 'admin' {
  if (role !== 'admin') throw new ActionError('forbidden');
}

// ─── Workspace general settings ─────────────────────────────────────────────

const UpdateWorkspaceInput = z.object({
  slug: z.string(),
  name: z.string().trim().min(2).max(64),
});

export async function updateWorkspaceName(formData: FormData): Promise<void> {
  const parsed = UpdateWorkspaceInput.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
  });
  if (!parsed.success) throw new ActionError('invalid_input');

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) throw new ActionError('not_found');
  assertAdmin(ctx.role);

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspaces')
    .update({ name: parsed.data.name })
    .eq('id', ctx.workspace.id);
  if (error) throw new ActionError(error.message);

  revalidatePath(`/w/${parsed.data.slug}/settings`);
}

// ─── Members ────────────────────────────────────────────────────────────────

const InviteInput = z.object({
  slug: z.string(),
  email: z.string().email().max(320),
  role: z.enum(['admin', 'analyst', 'auditor', 'readonly']),
});

export async function inviteMember(formData: FormData): Promise<void> {
  const parsed = InviteInput.safeParse({
    slug: formData.get('slug'),
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) throw new ActionError('invalid_input');

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) throw new ActionError('not_found');
  assertAdmin(ctx.role);

  const admin = createAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email.toLowerCase(),
  );
  if (inviteErr || !invited.user) {
    throw new ActionError(inviteErr?.message ?? 'invite_failed');
  }

  const { error: memberErr } = await admin.from('workspace_members').insert({
    workspace_id: ctx.workspace.id,
    user_id: invited.user.id,
    role: parsed.data.role,
  });
  if (memberErr && !memberErr.message.includes('duplicate')) {
    throw new ActionError(memberErr.message);
  }

  revalidatePath(`/w/${parsed.data.slug}/settings`);
}

const RemoveMemberInput = z.object({
  slug: z.string(),
  userId: z.string().uuid(),
});

export async function removeMember(formData: FormData): Promise<void> {
  const parsed = RemoveMemberInput.safeParse({
    slug: formData.get('slug'),
    userId: formData.get('userId'),
  });
  if (!parsed.success) throw new ActionError('invalid_input');

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) throw new ActionError('not_found');
  assertAdmin(ctx.role);

  const admin = createAdminClient();
  const { error } = await admin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', ctx.workspace.id)
    .eq('user_id', parsed.data.userId);
  if (error) throw new ActionError(error.message);

  revalidatePath(`/w/${parsed.data.slug}/settings`);
}

// ─── API keys ───────────────────────────────────────────────────────────────

const CreateKeyInput = z.object({
  slug: z.string(),
  name: z.string().trim().min(2).max(64),
});

function mintApiKey(): { plaintext: string; keyPrefix: string; keyHash: string } {
  const raw = randomBytes(32).toString('base64url');
  const plaintext = `pga_${raw}`;
  const keyPrefix = plaintext.slice(0, 11);
  const keyHash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, keyPrefix, keyHash };
}

/**
 * Create a new API key. The plaintext is only returned ONCE via a one-shot
 * httpOnly cookie that the settings page reads on next render, then clears.
 * This avoids showing the key in the URL or in a query string.
 */
export async function createApiKey(formData: FormData): Promise<void> {
  const parsed = CreateKeyInput.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
  });
  if (!parsed.success) throw new ActionError('invalid_input');

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) throw new ActionError('not_found');
  assertAdmin(ctx.role);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ActionError('unauthenticated');

  const key = mintApiKey();
  const admin = createAdminClient();
  const { error } = await admin.from('api_keys').insert({
    workspace_id: ctx.workspace.id,
    name: parsed.data.name,
    key_prefix: key.keyPrefix,
    key_hash: key.keyHash,
    created_by: user.id,
  });
  if (error) throw new ActionError(error.message);

  // One-shot cookie to display the plaintext on next render.
  const jar = await cookies();
  jar.set('pga_new_key', key.plaintext, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge: 60, // 1 minute window
    path: `/w/${parsed.data.slug}/settings`,
  });

  revalidatePath(`/w/${parsed.data.slug}/settings`);
}

const RevokeKeyInput = z.object({
  slug: z.string(),
  id: z.string().uuid(),
});

export async function revokeApiKey(formData: FormData): Promise<void> {
  const parsed = RevokeKeyInput.safeParse({
    slug: formData.get('slug'),
    id: formData.get('id'),
  });
  if (!parsed.success) throw new ActionError('invalid_input');

  const ctx = await requireWorkspaceBySlug(parsed.data.slug);
  if (!ctx) throw new ActionError('not_found');
  assertAdmin(ctx.role);

  const admin = createAdminClient();
  const { error } = await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
    .eq('workspace_id', ctx.workspace.id);
  if (error) throw new ActionError(error.message);

  revalidatePath(`/w/${parsed.data.slug}/settings`);
}
