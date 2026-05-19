/**
 * Unit tests for the POST /api/billing/portal auth flow.
 *
 * The route is mostly I/O glue around Supabase and Stripe; the auth
 * decision is extracted into decidePortalAuth() so we can exercise every
 * branch without standing up the runtime.
 *
 * Test matrix:
 *   - unauthenticated → no user
 *   - unknown_workspace → user but no workspace row
 *   - not_workspace_admin → user + workspace, but no membership / wrong role
 *   - no_subscription → admin user + workspace but stripe_customer_id NULL
 *   - allow → admin user + workspace + stripe_customer_id set
 */

import { describe, it, expect } from 'vitest';
import { decidePortalAuth } from '../../src/lib/billing/portal-auth';

const USER = { id: '00000000-0000-0000-0000-000000000001' };
const PAID_WORKSPACE = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'acme',
  stripe_customer_id: 'cus_paid123',
};
const COMMUNITY_WORKSPACE = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'community-org',
  stripe_customer_id: null,
};

describe('decidePortalAuth', () => {
  it('rejects when there is no authenticated user', () => {
    const out = decidePortalAuth({
      user: null,
      workspace: PAID_WORKSPACE,
      member: { role: 'admin' },
    });
    expect(out.kind).toBe('unauthenticated');
  });

  it('rejects when the workspace does not exist', () => {
    const out = decidePortalAuth({
      user: USER,
      workspace: null,
      member: null,
    });
    expect(out.kind).toBe('unknown_workspace');
  });

  it('rejects when the caller is not a member of the workspace', () => {
    const out = decidePortalAuth({
      user: USER,
      workspace: PAID_WORKSPACE,
      member: null,
    });
    expect(out.kind).toBe('not_workspace_admin');
  });

  it.each(['analyst', 'auditor', 'readonly'] as const)(
    'rejects when the caller has role=%s (admin-only endpoint)',
    (role) => {
      const out = decidePortalAuth({
        user: USER,
        workspace: PAID_WORKSPACE,
        member: { role },
      });
      expect(out.kind).toBe('not_workspace_admin');
    }
  );

  it('returns no_subscription when the workspace never paid', () => {
    // The Billing Portal has no Stripe Customer to operate on if the
    // workspace has never been through Checkout. The route should advise
    // the client UI to offer an upgrade path instead.
    const out = decidePortalAuth({
      user: USER,
      workspace: COMMUNITY_WORKSPACE,
      member: { role: 'admin' },
    });
    expect(out.kind).toBe('no_subscription');
  });

  it('allows the happy path and surfaces the Stripe customer id', () => {
    const out = decidePortalAuth({
      user: USER,
      workspace: PAID_WORKSPACE,
      member: { role: 'admin' },
    });
    expect(out).toEqual({
      kind: 'allow',
      stripeCustomerId: 'cus_paid123',
      slug: 'acme',
    });
  });

  it('prioritises unauthenticated over all other failure modes', () => {
    // Defense-in-depth: even if downstream lookups somehow returned data
    // for a null user (they shouldn't), the auth check must short-circuit.
    const out = decidePortalAuth({
      user: null,
      workspace: PAID_WORKSPACE,
      member: { role: 'admin' },
    });
    expect(out.kind).toBe('unauthenticated');
  });

  it('prioritises unknown_workspace over membership check', () => {
    // If there is no workspace, the membership row can't exist either —
    // but in case the caller passes a stale `member` we still return the
    // narrower "unknown_workspace" error.
    const out = decidePortalAuth({
      user: USER,
      workspace: null,
      member: { role: 'admin' },
    });
    expect(out.kind).toBe('unknown_workspace');
  });
});
