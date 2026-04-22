# PanGuard AI — Supabase Database

Schema, policies, and storage buckets for the PanGuard AI Customer Dashboard (Phase 2 MVP).

This directory is consumed by the Supabase CLI. It defines the data layer shared between `packages/app/` (Next.js console at `app.panguard.ai`) and the CLI / CI integrations that authenticate via device code + API key flows.

## File layout

```
supabase/
  config.toml                                 # Project config (ports, auth, storage caps)
  seed.sql                                    # Local-only reset seed (minimal — see scripts/seed.ts)
  migrations/
    20260422000001_initial.sql                # Tables + helper functions + triggers
    20260422000002_rls.sql                    # Row Level Security policies
    20260422000003_storage.sql                # `reports` bucket + object-level policies
```

Every SQL file is idempotent enough to survive being re-applied (extensions use `IF NOT EXISTS`, bucket insert uses `ON CONFLICT DO NOTHING`).

---

## 1. Install the Supabase CLI

```bash
brew install supabase/tap/supabase
supabase --version   # should print 1.x or newer
```

On non-macOS, see https://supabase.com/docs/guides/cli.

---

## 2. Local development (Docker)

Local mode runs the entire Supabase stack (Postgres + GoTrue + PostgREST + Storage + Studio) in Docker on your laptop. Good for iterating on migrations.

**Requires Docker Desktop to be running.**

```bash
cd /Users/user/Downloads/panguard-ai

# First-time setup: boots containers and applies every migration in order.
supabase start

# Subsequent sessions:
supabase start           # same command; detects existing containers

# When migrations change, re-apply by resetting the local DB:
supabase db reset        # drops, recreates, reapplies migrations + seed.sql

# When you're done:
supabase stop
```

After `supabase start`, the CLI prints the local URLs and keys. The ones you need are:

| Label                    | Example value                                |
|--------------------------|----------------------------------------------|
| `API URL`                | `http://localhost:54321`                     |
| `Studio URL`             | `http://localhost:54323` (browse tables/SQL) |
| `Inbucket URL`           | `http://localhost:54324` (catches magic-link emails) |
| `anon key`               | `eyJ...` (public, safe in browser)           |
| `service_role key`       | `eyJ...` (server-only — do not ship)         |

Copy the anon and service_role keys into `packages/app/.env.local` (see section 4).

---

## 3. Cloud project (Supabase-hosted)

Once local iteration stabilises, the founder creates the shared project.

```bash
# One-time: log in to Supabase.
supabase login

# Create project in the Supabase dashboard at https://supabase.com/dashboard
# then grab the project ref (e.g. "abcdefghijklmnopqrst") and:
supabase link --project-ref <ref>

# Push migrations to the linked project.
supabase db push

# If you later add a migration, just re-run push. Supabase tracks what has
# been applied via the `schema_migrations` table; only new files run.
supabase db push
```

The production dashboard lives at `https://<ref>.supabase.co`. Get the anon and service_role keys from **Project Settings → API** and store them as described below.

---

## 4. Environment variables

`packages/app/.env.local` (never committed):

```dotenv
# Public — injected into the browser bundle. Anon key is safe to expose;
# RLS is what actually gates access.
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only. Bypasses RLS. Used by Next.js route handlers that need to
# mint API keys, write to audit_log, or manage device_codes. NEVER expose
# this to the client bundle (the `NEXT_PUBLIC_` prefix is deliberately
# absent so Next's build will error if you accidentally import it into a
# client component).
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

For local development, point the first two at `http://localhost:54321` and use the keys that `supabase start` printed.

The three variables the app needs are, in summary:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Creating the first admin user (staging / production)

The first user can't create their workspace via an invite link (there's no workspace to invite them from), so do this in order:

1. In the Supabase Dashboard → **Authentication → Users → Invite user**, invite the founder's email address. They'll receive a magic link.
2. Founder clicks the link, lands on `https://app.panguard.ai`, which calls the `create_workspace('PanGuard','panguard')` RPC from the Next.js onboarding page.
3. The RPC runs SECURITY DEFINER, inserts the workspace, makes them `admin`, and writes an `audit_log` entry.
4. From the admin UI, they invite the rest of the team — subsequent users are added via `workspace_members` INSERT (admin-gated by RLS).

For fully automated staging seeding, run `scripts/seed.ts` (to be written) which uses the service-role client to call `supabase.auth.admin.createUser` and then invokes `create_workspace` through a forged JWT.

---

## 6. Rotating keys

### Supabase anon / service_role keys

If a key leaks:

1. Supabase Dashboard → **Project Settings → API → Reset service role key** (or anon key).
2. Update `packages/app/.env.local` and your deploy platform's env config (Vercel, Fly.io, etc.).
3. Redeploy the app. Old keys become invalid within a few seconds of rotation.
4. Grep the Git history for the leaked value — if it was ever committed, force-rotate the Supabase key AND revoke all sessions from **Authentication → Users → Sign out all users**.

### Workspace-level API keys

These are our own tokens (`public.api_keys`), not Supabase's:

```sql
-- Revoke a specific key (admin UI surfaces this as a button):
UPDATE public.api_keys
SET revoked_at = now()
WHERE id = '<key-id>';
```

The app treats any row with `revoked_at IS NOT NULL` as invalid on every auth check.

### TC pre-shared secret

`workspaces.tc_api_key_hash` stores the SHA-256 of the secret used to authenticate workspace → Threat Cloud calls. To rotate:

1. Generate a new random 32-byte secret in the admin UI.
2. Server-side: UPDATE the hash column with `encode(sha256('<new-secret>'::bytea), 'hex')`.
3. Hand the plaintext to the TC deployment (it's consumed by `tc.panguard.ai` for verdict-cache requests).
4. Old hash never leaves the DB, so there's no residue to clean up.

---

## 7. Schema cheat sheet

```
workspaces (id, name, slug, tier, tier_expires_at, tc_api_key_hash, …)
      ^
      |  ON DELETE CASCADE
      |
workspace_members (workspace_id, user_id, role, invited_at, accepted_at)
      |
      |-- api_keys         (key_prefix, sha256 key_hash, last_used_at, revoked_at)
      |-- device_codes     (user_code, device_code, expires_at, issued_api_key_id)
      |-- reports          (framework, format, sha256, storage_path, …)
      |-- audit_log        (action, target_type, target_id, metadata, ip_address)

storage.buckets('reports')      <- PDFs / JSON / MD live here, path = reports/<ws_id>/<id>.<ext>
```

See the inline comments in each migration file for why specific constraints exist.
