# Pre-GA Playwright e2e Coverage

This suite is the last automated check before a customer signs.
The goal is not 100% coverage — it is to make sure the parts that
**break the sign-up flow if regressed** are guarded.

## In Coverage (5 specs)

| Spec                  | Path                                                | What it verifies                                                                                                                                                                                           | Mode                                                                              |
| --------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Pricing tiers         | `packages/website/e2e/pricing.e2e.spec.ts`          | Community / Pilot / Enterprise labels, prices ($0 / $25K / $150K floor), CTA destinations, Pilot button → `/login?next=/pricing&intent=pilot` for guest                                                    | Live (website on :3000) + route mock for `/api/me/session`                        |
| Migrator demo         | `packages/website/e2e/migrator-demo.e2e.spec.ts`    | Public Sigma → ATR YAML conversion, Copy ATR YAML button, ≥5 Pilot-only badges, Unlock Pilot CTA href                                                                                                      | Live (website on :3000), in-browser conversion                                    |
| Verify-email gate     | `packages/app/e2e/verify-email-gate.e2e.spec.ts`    | Unconfirmed user landing on `/onboarding` is redirected to `/verify-email`; page shows the user's email; Resend link button is present                                                                     | Skipped when `PLAYWRIGHT_HAS_SUPABASE` is unset                                   |
| Endpoints empty state | `packages/app/e2e/endpoints-empty.e2e.spec.ts`      | `/w/<slug>/endpoints` renders "No endpoints yet", `npx @panguard-ai/panguard login` inside `<pre>`, link to docs.panguard.ai/install                                                                       | Skipped when `PLAYWRIGHT_HAS_SUPABASE` is unset (server component reads Supabase) |
| Local Guard tier gate | `tests/e2e/local-dashboard-tier-gate.playwright.ts` | Spawns `pga up --license-key=PG-COMMUNITY-TEST-…` on port 8189, asserts Threats tab renders, SARIF buttons stay hidden, and the "Upgrade to Pilot — unlock SARIF + Evidence Pack" upsell anchor is visible | Skipped when `pga` is not on PATH                                                 |

## NOT in Coverage (and why)

The following flows are deliberately not in the Playwright suite. Each
either requires a live external service we cannot stand up in CI today
or has a deterministic enough state-machine to live in unit/integration
tests instead.

- **Stripe Checkout end-to-end.** Requires `STRIPE_SECRET_KEY=sk_test_…`
  in the env. The user runs `pnpm setup:stripe` only after Stripe
  approves the account. Until then the `/api/billing/checkout` endpoint
  returns `checkout_failed_*`. **Test plan:** when `sk_test_*` is set,
  add `pilot-checkout.e2e.spec.ts` that intercepts the Stripe redirect
  to verify `client_reference_id` matches the workspace id.
- **Device-code login flow.** Requires (a) live Supabase Auth, (b) a
  human clicking the approve button, (c) the CLI polling the
  `/api/device/poll` endpoint. The two halves of the flow span a CLI
  process + browser tab and are best validated by the manual smoke
  test below.
- **Supabase Realtime push.** Requires a live Postgres + Realtime
  service. The dashboard subscribes to a `workspaces:<id>` channel and
  re-renders on insert. Unit test (`packages/app/tests/realtime-channel.test.ts`)
  covers the channel hook; only a live integration can prove the wire.
- **Compliance Evidence Pack download.** Requires Supabase Storage
  configured + the `compliance-evidence` bucket created with the right
  RLS policies + a Pilot/Enterprise license. The PDF generation
  (`pdfkit`) is unit-tested; the storage-upload + signed-URL handshake
  is not.
- **Webhook handlers.** Stripe webhook handlers (`checkout.session.completed`,
  `customer.subscription.updated`) require the Stripe CLI's `listen`
  forwarder. Use `stripe listen --forward-to localhost:3001/api/billing/webhook`
  during manual smoke. Integration tests cover the handler logic in
  isolation (`packages/app/tests/billing/webhook.test.ts`).

## Five Manual Smoke Tests (must pass before first customer signs)

These walk the entire happy path against real services. Run them
once **as the customer would** on a clean machine.

1. **Stripe products provisioned.** Set `STRIPE_SECRET_KEY=sk_test_…`,
   run `pnpm setup:stripe`. Verify in the Stripe Dashboard that the
   `pilot_90d` and `enterprise_y1` products + prices exist and the
   `STRIPE_PRICE_PILOT_90D` env var the script emits is wired into
   the deployed app.
2. **Pilot checkout end-to-end.** Sign in to `app.panguard.ai`,
   click Start Pilot, fill in card `4242 4242 4242 4242`, any future
   expiry, any CVC, any ZIP. Confirm the success redirect lands on
   `/w/<slug>/billing?status=success`.
3. **Webhook → tier upgrade → license JWT minted.** Tail the deployed
   app's logs while completing step 2. Confirm `checkout.session.completed`
   is received, the workspace `tier` is updated to `pilot`, and a
   new row exists in `workspace_licenses` whose `jwt` decodes to
   `{ "tier": "pilot", "exp": <90d from now> }`.
4. **CLI device-code login + first event sync.** On a clean machine:
   `npx @panguard-ai/panguard@latest login`. Browser opens, approve,
   CLI prints "Logged in." Run `pga scan ~/some-skills-dir`; confirm
   the workspace dashboard shows the new endpoint within 5s.
5. **Attack event → Realtime → dashboard live update.** Trigger a
   known-malicious skill scan (`pga scan tests/security/fixtures/`).
   With the dashboard `/w/<slug>/events` tab open in another window,
   confirm the new event row appears without a manual refresh.

## Running

```bash
# Root-level (covers tests/e2e/*.playwright.ts on port 3100):
pnpm test:e2e

# Website (port 3000):
pnpm --filter @panguard-ai/website test:e2e

# App (port 3001), with live Supabase:
PLAYWRIGHT_HAS_SUPABASE=1 pnpm --filter @panguard-ai/app test:e2e

# First-time setup:
pnpm test:e2e:install   # installs chromium with system deps
```

## CI Prerequisites

For these specs to run in CI as-is, the runner needs:

- Node 20+ with `pnpm` 10 installed.
- `pnpm install` completed (so chromium binary is fetched alongside
  `@playwright/test`).
- `pnpm test:e2e:install` (or `npx playwright install --with-deps chromium`)
  to pull the browser binary on first run.
- Website spec only: the Next dev server boots automatically via the
  `webServer` block in `packages/website/playwright.config.ts`.
- App spec only: same auto-boot, but suites skip cleanly without
  `PLAYWRIGHT_HAS_SUPABASE`.
- Tier-gate spec only: `pga` on PATH. CI image must run
  `pnpm --filter panguard build` and either `pnpm link --global` or
  pass `PGA_BIN=$(pwd)/packages/panguard-cli/node_modules/.bin/pga`.
