# @panguard-ai/app

Customer dashboard for PanGuard AI — deploys to `app.panguard.ai`.

Next.js 14 App Router · TypeScript strict · Supabase SSR · Tailwind.

## Dev setup

```bash
cp packages/app/.env.local.example packages/app/.env.local
# fill in Supabase URL, anon key, service role, TC secret, HMAC key
pnpm --filter @panguard-ai/app dev
# → http://localhost:3001
```

### Required env vars

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used for admin ops: device code approval, workspace bootstrap, report uploads |
| `TC_API_URL` | Threat Cloud base URL (prod: `https://tc.panguard.ai`) |
| `TC_INTERNAL_SECRET` | Shared secret between app and TC |
| `PANGUARD_REPORT_SIGNING_KEY` | HMAC key for report integrity attestation |
| `NEXT_PUBLIC_APP_URL` | Used to build magic-link redirect URL |

## How the device flow works

```
┌────────┐   POST /api/device/code      ┌─────┐
│  CLI   │ ───────────────────────────▶ │ app │  ← creates device_code row
└────────┘ ◀──────  user_code, device_code ──
    │ browser opens verification_uri_complete
    ▼
┌────────┐   /device?code=XXXX          ┌─────┐
│  User  │ ───────────────────────────▶ │ app │  ← approveDeviceCode() action
└────────┘                              └─────┘  mints api_key, stores plaintext once
    ▲
    │
┌────────┐   POST /api/device/poll       ┌─────┐
│  CLI   │ ───────────────────────────▶ │ app │  returns api_key (once), clears it
└────────┘
```

## Deploy to Vercel

1. New Vercel project pointed at `packages/app`.
2. Root directory: `packages/app`.
3. Build command: `pnpm --filter @panguard-ai/app build`.
4. Install command: `pnpm install --frozen-lockfile` at repo root.
5. Add the env vars from the table above.
6. Domain: `app.panguard.ai`.

## File structure

```
packages/app/
├── src/
│   ├── app/                    # App Router routes
│   │   ├── (auth)/login/       # Magic-link sign in
│   │   ├── auth/callback/      # OTP exchange
│   │   ├── auth/error/
│   │   ├── onboarding/         # First workspace creation
│   │   ├── device/             # CLI device-flow approval UI
│   │   ├── w/[slug]/           # Per-workspace layout + pages
│   │   ├── api/device/         # RFC 8628 device-flow JSON endpoints
│   │   ├── api/reports/        # CLI report download
│   │   └── page.tsx            # Root router
│   ├── components/
│   │   ├── ui/                 # Button, Card, Input, Select, Badge, Table, Dialog, Toast
│   │   ├── workspace/          # Sidebar, Topbar, Switcher
│   │   └── icons.tsx
│   ├── lib/
│   │   ├── supabase/           # server, client, middleware, admin
│   │   ├── tc-client.ts        # Threat Cloud HTTP wrapper
│   │   ├── report-generator.ts # wraps @panguard-ai/panguard-report
│   │   ├── workspaces.ts       # listMyWorkspaces, requireWorkspaceBySlug
│   │   ├── types.ts
│   │   └── env.ts
│   ├── middleware.ts           # auth gate + session refresh
│   └── i18n.ts
└── messages/{en,zh-TW}.json
```
