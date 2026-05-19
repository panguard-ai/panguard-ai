/**
 * Pure authorization decision for POST /api/billing/portal.
 *
 * The route handler does three things: parse the body, run a couple of
 * Supabase queries, and call Stripe. The first two are I/O-bound and not
 * worth mocking deeply, but the *decision* layered on top is a small state
 * machine that determines which HTTP status we return. Pulling that into
 * a pure function lets us unit-test the auth contract directly without
 * standing up Supabase.
 *
 * Inputs:
 *   - user:     the authenticated Supabase user, or null
 *   - workspace: the looked-up workspace (slug + stripe_customer_id), or null
 *   - member:    the workspace_members row { role } for (user, workspace), or null
 *
 * Outputs:
 *   - { kind: 'allow', stripeCustomerId, slug } — proceed with portal session mint
 *   - { kind: 'unauthenticated' | 'unknown_workspace' | 'not_workspace_admin'
 *     | 'no_subscription' }                    — caller returns matching error
 */

import type { Role, Workspace } from '../types';

export type PortalAuthDecision =
  | { kind: 'allow'; stripeCustomerId: string; slug: string }
  | { kind: 'unauthenticated' }
  | { kind: 'unknown_workspace' }
  | { kind: 'not_workspace_admin' }
  | { kind: 'no_subscription' };

export interface PortalAuthInput {
  user: { id: string } | null;
  workspace: Pick<Workspace, 'id' | 'slug' | 'stripe_customer_id'> | null;
  member: { role: Role } | null;
}

export function decidePortalAuth(input: PortalAuthInput): PortalAuthDecision {
  if (!input.user) return { kind: 'unauthenticated' };
  if (!input.workspace) return { kind: 'unknown_workspace' };
  if (!input.member || input.member.role !== 'admin') {
    return { kind: 'not_workspace_admin' };
  }
  if (!input.workspace.stripe_customer_id) {
    return { kind: 'no_subscription' };
  }
  return {
    kind: 'allow',
    stripeCustomerId: input.workspace.stripe_customer_id,
    slug: input.workspace.slug,
  };
}
