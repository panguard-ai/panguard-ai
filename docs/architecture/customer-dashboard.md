# Customer Dashboard Architecture (Phase 2)

Status: **IMPLEMENTATION — 2026-04-22**
Owner: Solo founder ops
Target: First Pilot customer onboarded within 2 weeks of this doc landing

---

## Executive summary

PanGuard ships a 7-layer agent security platform with strong CLI + daemon
(Community tier, OSS). Phase 2 adds the paid-tier customer console so a
Pilot / Enterprise customer can:

1. Log in and see their own workspace
2. Run `pga login` and attach their CLI to that workspace
3. See every `pga audit` / Guard / Trap / Respond event in one timeline
4. Generate signed PDF compliance reports on demand (EU AI Act, NIST, ISO 42001, Colorado, OWASP)
5. Invite teammates and manage API keys

---

## Hard boundaries

- **Community tier keeps working exactly as today.** `pga scan`, `pga audit`, `pga guard` all work with zero login. Anonymous telemetry still goes to `tc.panguard.ai`. This file changes nothing about that path.
- **Paid-tier events live in Supabase,** not in the `threat-cloud` service. Tenant isolation via Postgres RLS. No cross-contamination between customer data and public rule-crystallization pipeline.
- **ATR stays independent.** Nothing in `agent-threat-rules` repo changes for this work. ATR website audit is a separate workstream.

---

## System diagram

```
                                          ┌────────────────────────────┐
                                          │  Browser user (CISO / IT)  │
                                          └──────────────┬─────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  app.panguard.ai — Next.js 14 (packages/app/)                           │
│                                                                         │
│   • Magic-link login via Supabase Auth                                  │
│   • /w/[slug]/{overview, events, reports, settings}                     │
│   • Device Code Flow authorization page at /device                      │
│   • API routes for CLI:                                                 │
│       POST /api/device/code         — create device_code                │
│       POST /api/device/poll         — CLI polls for token               │
│       POST /api/v2/events           — CLI pushes audit events           │
│       GET  /api/me                  — return workspace + user summary   │
│       GET  /api/v2/reports/:id/dl   — signed download URL               │
└───────┬─────────────────────────────────────────────────────────────────┘
        │                                                                  
        │ service-role key                                                  
        ▼                                                                  
┌────────────────────────────────────────────────────────────────────────┐
│  Supabase (cloud or self-hosted)                                        │
│                                                                         │
│   Auth:       magic link → httpOnly cookie → Phase 2B adds SAML         │
│   Postgres:   workspaces, workspace_members, api_keys, device_codes,    │
│               endpoints, events, reports, audit_log                     │
│   Storage:    reports/ bucket (signed URL, RLS by workspace)            │
│   RLS:        is_workspace_member(workspace_id, min_role) helper        │
└────────────────────────────────────────────────────────────────────────┘
                         ▲                                  
                         │                                  
                         │ REST via PostgREST + service key 
                         │                                  
┌────────────────────────┴────────────────────────────────────────────────┐
│  CLI `pga` (packages/panguard/)                                         │
│                                                                          │
│   pga login    → Device Code Flow, writes ~/.panguard/auth.json         │
│   pga whoami   → reads auth.json + GET /api/me                          │
│   pga logout   → deletes auth.json + revokes api_key                    │
│                                                                          │
│   pga audit /path/to/skill:                                              │
│       1. Run scan locally (311 ATR rules)                               │
│       2. Print findings to stdout as before (offline-first)             │
│       3. If auth.json exists, POST /api/v2/events with findings          │
│          → auto-creates endpoint, creates one event per finding         │
│       4. If --anonymous or no auth, existing TC telemetry path            │
└──────────────────────────────────────────────────────────────────────────┘

                                                                          
┌────────────────────────────────────────────────────────────────────────┐
│  tc.panguard.ai — threat-cloud service (existing, UNCHANGED this phase) │
│                                                                         │
│   • Still serves /api/rules, /api/stats, /api/atr-rules/live            │
│   • Still receives anonymous Community telemetry                        │
│   • Still runs rule crystallization pipeline (LLM review → ATR PR bot)  │
│   • Not touched in Phase 2. Phase 3 may merge workspace-scoped          │
│     telemetry opt-in for customers who want TC-level correlation.       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication model

Two separate token types:

### User session token (browser)
- Issued by Supabase Auth on magic-link verification
- Stored in `sb-<project>-auth-token` httpOnly cookie
- Validated server-side via `@supabase/ssr` in every server component and API route
- Carries `auth.uid()` which RLS policies reference

### API key (CLI)
- Issued by Device Code Flow approval step
- Format: `pga_` + 60 hex chars (256-bit entropy)
- Only the sha256 is stored (`api_keys.key_hash`)
- Sent by CLI as `Authorization: Bearer <api_key>`
- Each API route that accepts api_key does:
  ```ts
  const { data } = await admin.from('api_keys')
    .select('workspace_id, revoked_at')
    .eq('key_hash', sha256(token))
    .single();
  if (!data || data.revoked_at) throw Unauthorized;
  ```
- Once validated, API route uses service-role client scoped to that workspace_id
- `api_keys.last_used_at` updated async on each successful call

### No mutual cross-reference
- A user session can invalidate any api_key the user created (via settings)
- An api_key cannot perform session-only actions (invite members, manage billing, etc.)
- Clear separation keeps the blast radius of a leaked api_key limited to data ingestion + read within one workspace.

---

## Event ingestion contract (`POST /api/v2/events`)

Request body (JSON):
```json
{
  "events": [
    {
      "event_type": "scan.rule_match",
      "severity": "high",
      "rule_id": "ATR-2026-00021",
      "target": "github.com/acme/skills/finance-helper",
      "target_hash": "sha256:abc...",
      "payload_summary": "API key pattern in SKILL.md tools section",
      "occurred_at": "2026-04-22T08:30:00Z"
    }
  ],
  "endpoint": {
    "machine_id": "sha256:hash-of-machineid-plus-user",
    "hostname": "laptop-attila",
    "os_type": "darwin",
    "panguard_version": "1.5.4"
  }
}
```

Server:
1. Validate `Authorization: Bearer pga_...` → look up `workspace_id`
2. Zod validate body (max 500 events per POST, 1MB body limit)
3. `upsert_endpoint(workspace_id, machine_id, ...)` → returns endpoint_id
4. Bulk `INSERT INTO events (...) VALUES (...)` with workspace_id + endpoint_id
5. Update `api_keys.last_used_at`
6. Return `{ ok: true, ingested: N, endpoint_id: "..." }`

Payload privacy:
- `target` is file path / repo URL / skill name — no secret leak
- `target_hash` lets dedup / search without storing content
- `payload_summary` is a 1-line human-readable summary PRODUCED BY THE CLI (never the raw adversarial string)
- Raw adversarial payloads never leave the user's machine

---

## Report generation flow

Browser triggers report generation via Server Action:

```
User clicks "Generate EU AI Act report" on /w/acme/reports
  → Server Action `generateReport(workspaceId, framework='eu-ai-act', format='pdf', orgName='Acme Corp')`
  → Validates auth.uid() is workspace member (analyst+)
  → Calls internal report generator (reused from packages/panguard-report):
      • Loads workspace's events from last 90d
      • Loads ATR compliance metadata (spec/compliance-metadata.md schema)
      • Renders PDF via pdfkit (same code path as `pga report generate --format pdf`)
      • Computes sha256 + hmac-sha256 (env PANGUARD_REPORT_SIGNING_KEY per-workspace)
  → Uploads PDF to Supabase Storage bucket `reports/<workspace_id>/<report_id>.pdf`
  → Inserts row into reports table with storage_path + sha256 + hmac
  → Returns { id, download_url } to browser
  → Browser redirects to /w/[slug]/reports/[id]/download which streams signed URL
```

---

## Deploy plan

### Stage 1: Supabase project (15 min manual)
1. Founder creates Supabase project (cloud free tier): https://supabase.com/dashboard
2. Founder copies: project URL, anon key, service-role key
3. Founder runs locally: `supabase link --project-ref <ref>` + `supabase db push`
4. Founder creates `.env.local` in `packages/app/` from `.env.local.example`

### Stage 2: Vercel deploy (20 min)
1. Create new Vercel project from monorepo, root = `packages/app`
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PANGUARD_REPORT_SIGNING_KEY`
3. Connect domain `app.panguard.ai` (DNS CNAME to cname.vercel-dns.com)
4. Add app.panguard.ai to Supabase Auth allowed redirect URLs

### Stage 3: CLI release
1. Bump `@panguard-ai/panguard` minor version (1.5.4 → 1.6.0)
2. `pga login` / `pga logout` / `pga whoami` become visible commands
3. `pga audit` / `pga scan` detect auth.json and auto-POST to app.panguard.ai
4. Publish to npm; community tier still works offline without login

### Stage 4: First pilot
1. Manually create workspace in Supabase Studio (name, slug, tier='pilot', tier_expires_at=now+90d)
2. Invite pilot customer admin email via Supabase Auth dashboard (send invite)
3. Customer receives email → clicks magic link → lands on /w/[slug]
4. Customer runs `pga login`, authorizes → CLI can ingest
5. Stripe Invoice for $25K issued manually (Stripe Invoicing, no integration)

---

## What we explicitly are NOT doing in Phase 2

- **SAML SSO** — deferred to Phase 2B, 1 week sprint after first pilot signs SOW
- **RBAC beyond admin/analyst/auditor/readonly** — only 4 roles, no custom roles
- **Billing UI** — Stripe Invoice sent manually per contract; no self-serve checkout
- **Incident console with session replay** — Phase 2C after MVP lands
- **L1 Discover central inventory dashboard** — Phase 3
- **L7 AIAM (agent identity + OAuth scopes)** — Phase 5 per design doc
- **Multi-region data residency** — Phase 3 as Enterprise differentiator
- **Audit-log UI** — events written but no read UI until Phase 2B
- **Custom rule pack upload** — Phase 3

Anyone who says "what about X" for any of the above gets this list.

---

## Open operational questions (resolve pre-Pilot-1)

1. **SafeBase trust center** — stand up alongside this? Both are enterprise prerequisites. Targeting Week 2.
2. **SOC 2 Type 1 start date** — Phase 5 per existing plan. First pilot will accept "in progress, targeting Q3 2026" per existing GTM memory.
3. **MSA / SOW template** — founder needs to procure from startup legal service (e.g. Clerky, Stripe Atlas boilerplate). Budget $500-2000 one-time.
4. **DPA** — EU data processing agreement. Template from Supabase own DPA + customize. 2-3 hours.

---

## Code location map

```
supabase/                                           Supabase project config + migrations
  config.toml
  migrations/
    20260422000001_initial.sql                      workspaces, members, api_keys, device_codes, reports, audit_log
    20260422000002_rls.sql                          Row-level security policies
    20260422000003_storage.sql                      reports/ bucket + policies
    20260422000004_events.sql                       endpoints + events tables + RLS + rollup helpers
  README.md                                         local dev / cloud deploy guide

packages/app/                                       Next.js 14 customer dashboard (app.panguard.ai)
  src/app/
    (auth)/login/                                   magic link form + Server Action
    auth/callback/                                  Supabase callback handler
    device/                                         Device Code Flow approval page
    onboarding/                                     First-workspace creation
    w/[slug]/                                       Per-workspace routes
      layout.tsx                                    sidebar + topbar + workspace context
      page.tsx                                      Overview (counters + recent events)
      events/                                       Events timeline
      reports/                                      Compliance report generator
      settings/                                     Members, API keys, workspace settings
    api/
      device/code                                   POST: create device_code
      device/poll                                   POST: CLI polls
      v2/events                                     POST: CLI pushes events
      me                                            GET: whoami endpoint
      reports/[id]/download                         GET: signed storage URL
  src/lib/supabase/{server,client,admin,middleware}.ts
  src/middleware.ts
  src/components/ui/*                               Button, Card, Input, Select, Dialog, Table, Badge, Toast
  src/components/workspace/*                        Sidebar, Topbar, WorkspaceSwitcher
  tailwind.config.ts                                shared tokens with packages/website
  .env.local.example

packages/panguard/src/cli/                          CLI updates
  commands/login.ts                                 Device Code Flow
  commands/logout.ts                                revoke + delete auth.json
  commands/whoami.ts                                read auth.json + GET /api/me
  commands/audit.ts                                 +auth.json detection → auto-POST /api/v2/events
  auth-guard.ts                                     loadAuth / authHeader / requireAuth / isAuthenticated
  index.ts                                          promote login/logout/whoami to primary
docs/panguard/DEVICE_FLOW.md                        Protocol doc for future contributors
```
