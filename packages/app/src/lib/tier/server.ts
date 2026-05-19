/**
 * Server-side tier resolution.
 *
 * Pages and route handlers call `getCurrentWorkspaceTier(slug)` instead of
 * reaching into the Workspace row directly. Centralising it here means
 * the lazy-downgrade logic in `requireWorkspaceBySlug` is automatically
 * applied (a workspace whose paid grace period just expired returns
 * 'community', not the stale paid tier).
 *
 * Throws if the caller isn't a workspace member — pages should catch and
 * call `notFound()` so an unauthenticated visitor sees a 404 rather than
 * an exception page.
 */

import { requireWorkspaceBySlug } from '@/lib/workspaces';
import type { Tier } from './types';

export class WorkspaceAccessError extends Error {
  constructor(slug: string) {
    super(`No access to workspace "${slug}"`);
    this.name = 'WorkspaceAccessError';
  }
}

export async function getCurrentWorkspaceTier(slug: string): Promise<Tier> {
  const ctx = await requireWorkspaceBySlug(slug);
  if (!ctx) throw new WorkspaceAccessError(slug);
  return ctx.workspace.tier;
}
