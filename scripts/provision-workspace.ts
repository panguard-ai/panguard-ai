#!/usr/bin/env node
/**
 * scripts/provision-workspace.ts
 *
 * Manually onboard a Pilot / Enterprise workspace before the admin UI exists.
 * Founder-only utility. Not shipped to customers.
 *
 * Usage:
 *   tsx scripts/provision-workspace.ts \
 *     --name "Acme Corp" \
 *     --slug "acme" \
 *     --tier pilot \
 *     --admin-email "security-lead@acme.com" \
 *     --days 90
 *
 *   --tier: community | pilot | enterprise
 *   --days: only applies to pilot; sets tier_expires_at = now + N days
 *   --admin-email: invites this email as workspace admin (sends magic link)
 *
 * Required env (from Supabase project):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * What it does:
 *   1. Validates inputs
 *   2. Creates workspace row with given tier
 *   3. Invites the admin email via supabase.auth.admin.inviteUserByEmail
 *   4. After user accepts, adds them to workspace_members as admin
 *      (the invite callback is handled by the app's onboarding flow)
 *   5. Prints summary with workspace ID, dashboard URL, CLI quick-start
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// ─── Arg parsing (no external dep) ───────────────────────────────────────

interface Args {
  name: string;
  slug: string;
  tier: 'community' | 'pilot' | 'enterprise';
  adminEmail: string;
  days: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { days: 90, dryRun: false, tier: 'pilot' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--name':
        args.name = next();
        break;
      case '--slug':
        args.slug = next();
        break;
      case '--tier': {
        const t = next();
        if (t !== 'community' && t !== 'pilot' && t !== 'enterprise') {
          throw new Error(`Invalid --tier: ${t}`);
        }
        args.tier = t;
        break;
      }
      case '--admin-email':
        args.adminEmail = next();
        break;
      case '--days':
        args.days = Number(next());
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
    }
  }
  if (!args.name || !args.slug || !args.adminEmail) {
    printUsage();
    throw new Error('Missing required args');
  }
  if (!/^[a-z0-9-]{2,40}$/.test(args.slug)) {
    throw new Error(`--slug must match ^[a-z0-9-]{2,40}$`);
  }
  return args as Args;
}

function printUsage(): void {
  console.log(`
Usage: tsx scripts/provision-workspace.ts --name <N> --slug <S> --tier <T> --admin-email <E> [--days 90] [--dry-run]

  --name         Workspace display name, e.g. "Acme Corp"
  --slug         URL-friendly slug, 2-40 chars [a-z0-9-], e.g. "acme"
  --tier         community | pilot | enterprise (default: pilot)
  --admin-email  Email to invite as first admin
  --days         Pilot window in days (default: 90; ignored for community/enterprise)
  --dry-run      Print what would happen; do not mutate DB
`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env['SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required. ' +
        'Get them from Supabase dashboard → Project Settings → API.'
    );
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tierExpiresAt =
    args.tier === 'pilot' ? new Date(Date.now() + args.days * 86400_000).toISOString() : null;

  console.log(`\n  Provisioning workspace:`);
  console.log(`    name:             ${args.name}`);
  console.log(`    slug:             ${args.slug}`);
  console.log(`    tier:             ${args.tier}`);
  console.log(`    tier_expires_at:  ${tierExpiresAt ?? '(none)'}`);
  console.log(`    admin_email:      ${args.adminEmail}`);
  console.log(`    dry_run:          ${args.dryRun}\n`);

  if (args.dryRun) {
    console.log('  DRY RUN — no changes made.\n');
    return;
  }

  // 1. Mint a TC org id up front so the workspace carries the link from day 1.
  // We generate it here (Supabase side) rather than calling TC's admin API
  // because TC's orgs table accepts client-supplied UUIDs — and doing it here
  // means provisioning works even when TC is down. A future reconciliation
  // job can ensure TC has a matching orgs row; workspaces.tc_org_id is the
  // source of truth for the mapping.
  const tcOrgId = randomUUID();

  // 2. Create workspace row (service role bypasses RLS + the create_workspace RPC's auth check)
  const { data: ws, error: wsErr } = await sb
    .from('workspaces')
    .insert({
      name: args.name,
      slug: args.slug,
      tier: args.tier,
      tier_expires_at: tierExpiresAt,
      tc_org_id: tcOrgId,
    })
    .select()
    .single();

  if (wsErr) {
    if (wsErr.code === '23505') {
      throw new Error(`Workspace with slug "${args.slug}" already exists.`);
    }
    throw wsErr;
  }

  console.log(`  ✓ workspace created: ${ws.id}`);
  console.log(`  ✓ tc_org_id:         ${tcOrgId}`);

  // 2. Invite the admin email (sends magic link)
  const { data: invite, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(
    args.adminEmail,
    {
      redirectTo: `${process.env['APP_URL'] ?? 'https://app.panguard.ai'}/auth/callback?workspace=${ws.slug}`,
    }
  );

  if (inviteErr) {
    // If user already exists, we can still add them as a member below
    if (!inviteErr.message.toLowerCase().includes('already')) {
      throw inviteErr;
    }
    console.log(`  ! user already exists — fetching their id`);
    const { data: existing } = await sb.auth.admin.listUsers();
    const match = existing?.users?.find((u) => u.email === args.adminEmail);
    if (!match) {
      throw new Error(`User ${args.adminEmail} expected to exist but not found`);
    }
    await addMember(sb, ws.id, match.id);
    console.log(`  ✓ existing user added as admin: ${match.id}`);
  } else if (invite?.user) {
    await addMember(sb, ws.id, invite.user.id);
    console.log(`  ✓ invite sent + pre-added as admin: ${invite.user.id}`);
  }

  // 3. Audit trail
  await sb.from('audit_log').insert({
    workspace_id: ws.id,
    action: 'workspace.provisioned',
    metadata: {
      tier: args.tier,
      tier_expires_at: tierExpiresAt,
      admin_email: args.adminEmail,
      provisioned_by: 'founder_cli',
    },
  });

  // 4. Print next steps
  const appUrl = process.env['APP_URL'] ?? 'https://app.panguard.ai';
  console.log(`\n  Done.\n`);
  console.log(`  Next steps for the customer:`);
  console.log(`    1. Check inbox for magic-link email to ${args.adminEmail}`);
  console.log(`    2. Visit ${appUrl}/w/${ws.slug} after clicking the link`);
  console.log(`    3. Install the CLI:   npm install -g panguard`);
  console.log(`    4. Log in:            pga login`);
  console.log(`    5. First audit:       pga audit /path/to/skill`);
  console.log(`\n  Workspace admin URL: ${appUrl}/w/${ws.slug}\n`);
}

async function addMember(
  sb: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { error } = await sb.from('workspace_members').upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role: 'admin',
      accepted_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,user_id' }
  );
  if (error) throw error;
}

main().catch((err) => {
  console.error('\n  Error:', err instanceof Error ? err.message : err, '\n');
  process.exitCode = 1;
});
