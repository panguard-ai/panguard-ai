#!/usr/bin/env node
/**
 * scripts/provision-partner.ts
 *
 * Onboard a Partner / JV organization after the agreement is signed.
 * Founder-only utility. Not shipped to customers. Mirrors
 * provision-workspace.ts but one tier up (organizations, not workspaces).
 *
 * Usage:
 *   tsx scripts/provision-partner.ts \
 *     --name "Acme Security JV" \
 *     --slug "acme-jv" \
 *     --type partner \
 *     --region eu \
 *     --status active \
 *     --admin-email "lead@acme-jv.com" \
 *     [--dry-run]
 *
 *   --type:   partner | direct        (default: partner)
 *   --region: eu | us | apac | global (default: global)
 *   --status: trial | active | suspended (default: active)
 *   --admin-email: invited as the first partner_admin (sends magic link)
 *
 * Required env (from Supabase project):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * What it does (service role bypasses RLS):
 *   1. Validates inputs
 *   2. Inserts the organizations row
 *   3. Invites the admin email via supabase.auth.admin.inviteUserByEmail
 *   4. Adds them to organization_members as partner_admin
 *   5. Writes an organization.provisioned audit_log entry
 *   6. Prints the partner console URL + next steps
 */

import { createClient } from '@supabase/supabase-js';

// ─── Arg parsing (no external dep) ───────────────────────────────────────

type OrgType = 'partner' | 'direct';
type OrgRegion = 'eu' | 'us' | 'apac' | 'global';
type ContractStatus = 'trial' | 'active' | 'suspended';

interface Args {
  name: string;
  slug: string;
  type: OrgType;
  region: OrgRegion;
  status: ContractStatus;
  adminEmail: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {
    type: 'partner',
    region: 'global',
    status: 'active',
    dryRun: false,
  };
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
      case '--type': {
        const t = next();
        if (t !== 'partner' && t !== 'direct') throw new Error(`Invalid --type: ${t}`);
        args.type = t;
        break;
      }
      case '--region': {
        const r = next();
        if (r !== 'eu' && r !== 'us' && r !== 'apac' && r !== 'global') {
          throw new Error(`Invalid --region: ${r}`);
        }
        args.region = r;
        break;
      }
      case '--status': {
        const s = next();
        if (s !== 'trial' && s !== 'active' && s !== 'suspended') {
          throw new Error(`Invalid --status: ${s}`);
        }
        args.status = s;
        break;
      }
      case '--admin-email':
        args.adminEmail = next();
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
Usage: tsx scripts/provision-partner.ts --name <N> --slug <S> --admin-email <E> [--type partner] [--region global] [--status active] [--dry-run]

  --name         Organization display name, e.g. "Acme Security JV"
  --slug         URL-friendly slug, 2-40 chars [a-z0-9-], e.g. "acme-jv"
  --type         partner | direct (default: partner)
  --region       eu | us | apac | global (default: global)
  --status       trial | active | suspended (default: active)
  --admin-email  Email to invite as the first partner_admin
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

  console.log(`\n  Provisioning partner organization:`);
  console.log(`    name:         ${args.name}`);
  console.log(`    slug:         ${args.slug}`);
  console.log(`    type:         ${args.type}`);
  console.log(`    region:       ${args.region}`);
  console.log(`    status:       ${args.status}`);
  console.log(`    admin_email:  ${args.adminEmail}`);
  console.log(`    dry_run:      ${args.dryRun}\n`);

  if (args.dryRun) {
    console.log('  DRY RUN — no changes made.\n');
    return;
  }

  // 1. Create the organizations row (service role bypasses the WITH CHECK(false)
  //    INSERT lock).
  const { data: org, error: orgErr } = await sb
    .from('organizations')
    .insert({
      name: args.name,
      slug: args.slug,
      type: args.type,
      region: args.region,
      contract_status: args.status,
    })
    .select()
    .single();

  if (orgErr) {
    if (orgErr.code === '23505') {
      throw new Error(`Organization with slug "${args.slug}" already exists.`);
    }
    throw orgErr;
  }

  console.log(`  ✓ organization created: ${org.id}`);

  // 2. Invite the admin email (sends magic link), or resolve an existing user.
  const appUrl = process.env['APP_URL'] ?? 'https://app.panguard.ai';
  const { data: invite, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(args.adminEmail, {
    redirectTo: `${appUrl}/auth/callback?partner=${org.slug}`,
  });

  let adminUserId: string | null = null;
  if (inviteErr) {
    if (!inviteErr.message.toLowerCase().includes('already')) {
      throw inviteErr;
    }
    console.log(`  ! user already exists — fetching their id`);
    const { data: existing } = await sb.auth.admin.listUsers();
    const match = existing?.users?.find((u) => u.email === args.adminEmail);
    if (!match) {
      throw new Error(`User ${args.adminEmail} expected to exist but not found`);
    }
    adminUserId = match.id;
  } else if (invite?.user) {
    adminUserId = invite.user.id;
  }

  if (!adminUserId) {
    throw new Error('Could not resolve an admin user id to attach as partner_admin');
  }

  // 3. Add them as partner_admin.
  const { error: memberErr } = await sb.from('organization_members').upsert(
    {
      organization_id: org.id,
      user_id: adminUserId,
      role: 'partner_admin',
      accepted_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,user_id' }
  );
  if (memberErr) throw memberErr;
  console.log(`  ✓ partner_admin attached: ${adminUserId}`);

  // 4. Audit trail (org-level event → workspace_id NULL).
  await sb.from('audit_log').insert({
    action: 'organization.provisioned',
    target_type: 'organization',
    target_id: org.id,
    metadata: {
      slug: args.slug,
      type: args.type,
      region: args.region,
      contract_status: args.status,
      admin_email: args.adminEmail,
      provisioned_by: 'founder_cli',
    },
  });

  // 5. Next steps.
  console.log(`\n  Done.\n`);
  console.log(`  Next steps for the partner:`);
  console.log(`    1. Check inbox for magic-link email to ${args.adminEmail}`);
  console.log(`    2. Visit ${appUrl}/partner/${org.slug} after clicking the link`);
  console.log(`    3. Add client workspaces from the fleet console`);
  console.log(`\n  Partner console URL: ${appUrl}/partner/${org.slug}\n`);
}

main().catch((err) => {
  console.error('\n  Error:', err instanceof Error ? err.message : err, '\n');
  process.exitCode = 1;
});
