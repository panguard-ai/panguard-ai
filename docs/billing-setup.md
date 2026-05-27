# Stripe Billing Setup

Zero-touch bootstrap of Stripe products + signing keys for PanGuard AI.

## Prerequisites

1. A Stripe account (test mode is enough; live mode wiring comes later).
2. `pnpm install` has already run (root).

## Three steps

### 1. Get a test-mode key

Stripe Dashboard → Developers → API keys → "Reveal test key" → copy the secret key that starts with `sk_test_`.

Export it in your shell:

```bash
export STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

### 2. Run the bootstrap script

```bash
pnpm setup:stripe
```

What this does:

- Refuses to run if you pass an `sk_live_*` key (script is test-mode only).
- Idempotent: re-running finds existing products by `metadata.panguard_canonical` and reuses their IDs (no duplicates).
- Creates two products in your Stripe account:
  - "PanGuard Pilot — 90-day Engineering Engagement" — recurring price $25,000 USD per month, 3 cycles.
  - "PanGuard Enterprise — Floor License" — recurring price $150,000 USD per month.
- Merges these env vars into `.env` (preserves all existing keys):
  - `STRIPE_PRICE_ID_PILOT`
  - `STRIPE_PRICE_ID_ENTERPRISE`
- If `LICENSE_SIGNING_KEY_PRIVATE_PEM` is missing, generates a fresh ed25519 keypair and writes both private (base64-encoded PKCS8) and public (base64-encoded SPKI) PEMs into `.env`. **Back the private PEM up somewhere safe — losing it invalidates every existing customer license JWT.**

Dry-run mode previews what would change without touching Stripe or `.env`:

```bash
pnpm setup:stripe:dry-run
```

### 3. Wire the webhook

For local development:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the `whsec_*` value the CLI prints and append it to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

For production: in Stripe Dashboard → Developers → Webhooks → Add endpoint, point at `https://app.panguard.ai/api/billing/webhook` and select these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the production endpoint's signing secret into your production env (Vercel project settings → Environment Variables).

## Verification

Once `.env` has all five keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, both price IDs, both license PEMs), the pricing page Pilot button should produce a working Stripe Checkout session end-to-end.

```bash
pnpm dev
# then open http://localhost:3000/pricing and click "Start Pilot"
```

You should land on a `checkout.stripe.com` page with the $25,000 / 90-day product loaded.

## Switching to live mode

When your Stripe account is approved for live mode:

1. Get the `sk_live_*` key from Stripe Dashboard.
2. Re-run `pnpm setup:stripe` against an `.env.production` file (set `STRIPE_SECRET_KEY=sk_live_*` first). The script will refuse to write to `.env` — copy the resulting env vars into your production env manually.
3. Recreate the products with `pnpm setup:stripe` pointed at the live key. The metadata-based idempotency does not span modes — test and live mode products are separate.
4. Update the webhook endpoint in Stripe Dashboard to point at production and grab the new `whsec_*`.

## Rotation

The ed25519 signing key only needs rotation if compromised. To rotate:

1. Generate a new keypair (`openssl genpkey -algorithm ed25519`).
2. Set the new public PEM as `NEXT_PUBLIC_LICENSE_PUBLIC_KEY_PEM`.
3. Keep the old private PEM as `LICENSE_SIGNING_KEY_PRIVATE_PEM_PREVIOUS` for a grace period (a follow-up will need to verify against both during transition; this is BLOCK F territory).
4. After the grace period (default 30 days), remove `LICENSE_SIGNING_KEY_PRIVATE_PEM_PREVIOUS`.

For routine ops, no rotation needed — the key signs JWTs, doesn't touch customer secrets.
</content>
</invoke>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "All decisions locked", "activeForm": "Decisions locked", "status": "completed"}, {"content": "WS1: Local Guard dashboard done (699/699 tests, HTML extracted, LLM CTAs gone, 6 SOC pages, tier gate)", "activeForm": "WS1 done", "status": "completed"}, {"content": "WS2: Cloud dashboard tier UI", "activeForm": "Running WS2", "status": "in_progress"}, {"content": "WS3: Supabase Realtime done (13/13 tests)", "activeForm": "WS3 done", "status": "completed"}, {"content": "WS4: Stripe bootstrap done (22/22 tests + docs/billing-setup.md written manually after agent timeout)", "activeForm": "WS4 done", "status": "completed"}, {"content": "WS5: panguard-manager fleet service", "activeForm": "Running WS5", "status": "in_progress"}, {"content": "After WS2+WS5: pnpm install + full typecheck + full test", "activeForm": "Pending integration", "status": "pending"}, {"content": "WS6 (最後): Playwright critical e2e", "activeForm": "Pending WS6", "status": "pending"}, {"content": "Manual ops: Supabase Pro + supabase db push (3 migrations) + TC restart v14 + Stripe test key + pnpm setup:stripe", "activeForm": "Pending manual ops", "status": "pending"}, {"content": "Watch tc-pr-back for fresh proposals", "activeForm": "Awaiting tc-pr-back", "status": "pending"}, {"content": "BLOCK F — friendly customer dry run + Stripe live mode", "activeForm": "Pending BLOCK F", "status": "pending"}]
