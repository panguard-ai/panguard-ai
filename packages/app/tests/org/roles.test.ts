/**
 * Unit tests for the organization role helpers.
 *
 * These pin two invariants that, if broken, would silently mis-scope a
 * partner's access across EVERY client workspace under their org:
 *
 *   1. The org role ordering (partner_admin supersedes partner_analyst).
 *   2. The org→workspace role mapping, which MUST stay in lockstep with the
 *      CASE expression in branch 2 of the SQL is_workspace_member() function
 *      (supabase/migrations/20260530000001_organizations.sql):
 *        partner_admin   → workspace 'admin'
 *        partner_analyst → workspace 'analyst'
 *      If you change the SQL ladder, change orgRoleToWorkspaceRole() and this
 *      test together.
 */

import { describe, it, expect } from 'vitest';
import {
  meetsOrgRole,
  orgRoleToWorkspaceRole,
  ORG_ROLE_ORDER,
  type OrgRole,
} from '../../src/lib/org/roles';
import type { Role } from '../../src/lib/types';

describe('ORG_ROLE_ORDER', () => {
  it('orders partner_analyst < partner_admin', () => {
    expect(ORG_ROLE_ORDER.partner_analyst).toBeLessThan(ORG_ROLE_ORDER.partner_admin);
  });

  it('uses contiguous integers starting at 0 (guards against typos)', () => {
    const values = Object.values(ORG_ROLE_ORDER).sort((a, b) => a - b);
    expect(values).toEqual([0, 1]);
  });
});

describe('meetsOrgRole', () => {
  it('partner_admin satisfies every requirement (inherits down)', () => {
    expect(meetsOrgRole('partner_admin', 'partner_admin')).toBe(true);
    expect(meetsOrgRole('partner_admin', 'partner_analyst')).toBe(true);
  });

  it('partner_analyst satisfies only partner_analyst', () => {
    expect(meetsOrgRole('partner_analyst', 'partner_analyst')).toBe(true);
    expect(meetsOrgRole('partner_analyst', 'partner_admin')).toBe(false);
  });
});

describe('orgRoleToWorkspaceRole — mirrors SQL is_workspace_member org branch', () => {
  it('maps partner_admin to workspace admin', () => {
    expect(orgRoleToWorkspaceRole('partner_admin')).toBe('admin');
  });

  it('maps partner_analyst to workspace analyst', () => {
    expect(orgRoleToWorkspaceRole('partner_analyst')).toBe('analyst');
  });

  it('maps every org role to a valid workspace role (exhaustive)', () => {
    const allOrgRoles: OrgRole[] = ['partner_admin', 'partner_analyst'];
    const validWorkspaceRoles: Role[] = ['admin', 'analyst', 'auditor', 'readonly'];
    for (const orgRole of allOrgRoles) {
      expect(validWorkspaceRoles).toContain(orgRoleToWorkspaceRole(orgRole));
    }
  });
});
