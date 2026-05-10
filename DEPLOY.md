# PanGuard AI — Phase 2 Deploy Guide

This guide gets the **Customer Dashboard** (`app.panguard.ai`) + **Supabase
backend** + **CLI auth** running end-to-end for the first Pilot customer.

---

## What you're deploying

```
Browser → app.panguard.ai            (Next.js on Vercel)
              │
              ▼
         Supabase (cloud)            (Auth + Postgres + Storage)
              ▲
              │
         CLI `pga login` / scan      (Device Code Flow, events → /api/v2/events)
```

The existing marketing site at `panguard.ai` and the Threat Cloud at
`tc.panguard.ai` are **unchanged**. Nothing in `agent-threat-rules` repo is
touched.

---

## Step 1 — Create Supabase project (≈ 15 min)

1. Go to https://supabase.com/dashboard → **New project**
   - Name: `panguard-prod` (or whatever)
   - DB password: generate a strong one, save in 1Password
   - Region: same as your Vercel region (e.g. `us-east-1`)
2. Wait for provisioning (~2 min)
3. Grab 3 values from **Project Settings → API**:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (NEVER share / NEVER put in a `NEXT_PUBLIC_` var)
4. From the local checkout, apply migrations:
   ```bash
   cd /Users/user/Downloads/panguard-ai
   supabase link --project-ref <the-ref-from-your-dashboard-url>
   supabase db push
   ```
5. Verify in Supabase Studio → **Table Editor** that you see:
   `workspaces`, `workspace_members`, `api_keys`, `device_codes`,
   `endpoints`, `events`, `reports`, `audit_log`.

### Auth settings

In Supabase dashboard → **Authentication → URL Configuration**:

- Site URL: `https://app.panguard.ai`
- Redirect URLs (add each on its own line):
  - `https://app.panguard.ai/**`
  - `http://localhost:3001/**` (for local dev)

In **Authentication → Providers**:

- Email: **enabled**, with **Confirm email = ON**
- Password: **disabled** (magic link only for MVP)

---

## Step 2 — Deploy `app.panguard.ai` to Vercel (≈ 20 min)

1. Vercel dashboard → **Add New → Project**
2. Import `github.com/panguard-ai/panguard-ai`
3. **Root Directory**: `packages/app`
4. **Framework preset**: Next.js (auto-detected)
5. Environment variables (all 6):

   | Name                            | Value                                                                  |
   | ------------------------------- | ---------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | from Step 1                                                            |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Step 1                                                            |
   | `SUPABASE_SERVICE_ROLE_KEY`     | from Step 1 (mark as **secret**)                                       |
   | `NEXT_PUBLIC_APP_URL`           | `https://app.panguard.ai`                                              |
   | `PANGUARD_REPORT_SIGNING_KEY`   | 64-char random hex (`openssl rand -hex 32`)                            |
   | `TC_API_URL`                    | `https://tc.panguard.ai` (optional — only needed if fetching TC feeds) |

6. Deploy — first build takes ~3 min.
7. Custom domain: **Settings → Domains → Add** `app.panguard.ai`
   - Cloudflare DNS: CNAME `app` → `cname.vercel-dns.com` (proxy OFF, grey cloud)
   - Wait for cert (1-2 min)

### Smoke test the deploy

```bash
curl -I https://app.panguard.ai/             # 200 (redirects to /login)
curl -I https://app.panguard.ai/login        # 200
curl -I https://app.panguard.ai/api/device/code -X POST  # 200 + JSON body
```

---

## Step 3 — Publish updated CLI (≈ 10 min)

The CLI now supports `pga login`, `pga logout`, `pga whoami`. To ship it:

```bash
cd /Users/user/Downloads/panguard-ai/packages/panguard
# Bump version
npm version minor   # 1.5.4 → 1.6.0
pnpm build
pnpm test
npm publish --access public   # publishes @panguard-ai/panguard
```

Then bump the top-level `panguard` wrapper (packages/panguard-cli):

```bash
cd ../panguard-cli
# Update the @panguard-ai/panguard dep version in its package.json to 1.6.0
npm version minor
npm publish --access public
```

Community users still work offline without login. Adding login unlocks
the dashboard sync.

---

## Step 4 — Provision your first Pilot workspace (≈ 5 min)

Use the provisioning script. Requires `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` env vars set locally.

```bash
cd /Users/user/Downloads/panguard-ai
export SUPABASE_URL='https://<ref>.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<service-role-key>'
export APP_URL='https://app.panguard.ai'

npx tsx scripts/provision-workspace.ts \
  --name "Acme Corp" \
  --slug "acme" \
  --tier pilot \
  --admin-email "security-lead@acme.com" \
  --days 90
```

Output tells you what happens next:

1. Customer receives magic-link email
2. Clicks it → lands on `https://app.panguard.ai/w/acme`
3. Installs the CLI: `npm i -g panguard`
4. Runs `pga login` → browser opens → approves → CLI is attached
5. Runs `pga audit /path/to/skill` → dashboard shows events within seconds

Issue the Pilot invoice via Stripe Invoicing ($25K / 90 days). Store the
invoice ID on the workspace row once it's paid.

---

## Step 5 — End-to-end smoke test (do this before telling the customer)

Use a test email you control.

1. Create test workspace:
   ```bash
   npx tsx scripts/provision-workspace.ts \
     --name "Internal Test" \
     --slug "internal-test" \
     --tier pilot \
     --admin-email "you+test@panguard.ai"
   ```
2. Open email, click magic link → lands in dashboard
3. Go to **Settings → API keys** → create one, copy plaintext
4. In a separate terminal:
   ```bash
   pga login --app-url https://app.panguard.ai
   # Browser opens, click Authorize
   pga whoami
   # Should show workspace=internal-test
   pga audit ./some-skill
   # Should print "✓ N events synced to Internal Test"
   ```
5. Refresh dashboard → `/w/internal-test` → events should appear
6. Go to **Reports** → generate **EU AI Act** → **PDF**
7. Download the PDF, verify integrity:
   ```bash
   # Compare sha256 shown in PDF cover page with:
   shasum -a 256 report.pdf
   ```

If all six steps pass, you're shippable.

---

## Architecture recap (for reference)

Single source of truth: `docs/architecture/customer-dashboard.md`. Key
decisions:

- **Magic link only** in MVP; SSO (SAML) in Phase 2B after first Pilot signs
- **No payment gateway** in Phase 2 — Stripe Invoicing wires are fine for
  Pilot $25K and Enterprise $150K-$500K
- **TC unchanged** — customer events go to Supabase, Community telemetry
  still goes to `tc.panguard.ai`
- **4 roles**: admin / analyst / auditor / readonly. No per-permission
  custom roles in Phase 2
- **One plaintext return** for API keys: via httpOnly cookie at creation,
  or via device-flow poll response. Never stored plaintext in DB.

---

## Common failures and fixes

**Build fails on Vercel with "Module not found: @panguard-ai/panguard-report"**
→ Not expected: the `packages/app` build does not import this package (the
report generator was inlined). Check `packages/app/src/lib/report-generator.ts`
for any accidental re-added imports.

**`supabase db push` fails with "function create_workspace already exists"**
→ You ran migrations before. Use `supabase migration repair` or drop the
function manually in Studio.

**`pga login` hangs indefinitely**
→ Browser never approved. Ctrl+C, make sure user clicked the authorize
button on `/device`. Re-run.

**Dashboard shows "No events yet" after `pga audit`**
→ Check `pga audit --verbose` output for a "N events synced to ..." line.
If missing, check that `~/.panguard/auth.json` exists and has `api_key`.
If auth file exists but sync fails, check `app.panguard.ai/api/v2/events`
is reachable and `SUPABASE_SERVICE_ROLE_KEY` is set on Vercel.

**PDF report has "0 rules mapped"**
→ The `agent-threat-rules` npm package must be installed in the app build.
Check `packages/app/package.json` dependencies includes `agent-threat-rules`.
The Vercel build logs should show "resolved agent-threat-rules@2.0.15+".
