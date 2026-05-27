/**
 * scripts/setup-stripe-test.ts
 *
 * Zero-touch bootstrap for Stripe TEST MODE products + prices, plus
 * ed25519 license-signing keypair generation. Run once after pulling
 * the repo; safe to re-run (idempotent on Stripe side, additive on
 * .env side).
 *
 * Usage:
 *   pnpm setup:stripe              # full run
 *   pnpm setup:stripe:dry-run      # print plan, write nothing, hit no APIs
 *
 * Hard guard rails:
 *   - REFUSES to run when STRIPE_SECRET_KEY is sk_live_*.
 *   - REFUSES to clobber existing .env keys; only appends or updates the
 *     specific keys this script owns.
 *   - Idempotent: looks up products by `metadata.panguard_canonical` before
 *     creating, so re-running does not produce duplicate products/prices.
 *
 * Exit codes:
 *   0  success
 *   1  invariant violation (missing/invalid STRIPE_SECRET_KEY)
 *   2  Stripe API error (network/auth)
 *   3  filesystem error writing .env
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';
import Stripe from 'stripe';

// ───────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────

export interface CanonicalProductSpec {
  /** Stable canonical id stored in product.metadata.panguard_canonical */
  readonly canonical: 'pilot' | 'enterprise';
  /** Display name on Stripe Dashboard + invoices */
  readonly name: string;
  /** Long-form description shown in Checkout */
  readonly description: string;
  /** Unit amount in the smallest currency unit (cents) */
  readonly unitAmountCents: number;
  /** ISO-4217 currency code */
  readonly currency: 'usd';
  /**
   * Recurring interval. We use 'month' so the existing
   * subscription-event-based webhook flow works. The Pilot SKU is sold as
   * a 90-day engagement; the sales motion is to cancel after the 3rd
   * invoice — encoded operationally, not in Stripe metadata.
   */
  readonly interval: 'month';
}

export interface SetupResult {
  readonly pilotProductId: string;
  readonly pilotPriceId: string;
  readonly enterpriseProductId: string;
  readonly enterprisePriceId: string;
  readonly created: {
    readonly pilot: boolean;
    readonly enterprise: boolean;
  };
}

export interface EnvUpdate {
  readonly key: string;
  readonly value: string;
}

// ───────────────────────────────────────────────────────────────────────
// Canonical product specs (single source of truth)
// ───────────────────────────────────────────────────────────────────────

export const PILOT_SPEC: CanonicalProductSpec = Object.freeze({
  canonical: 'pilot',
  name: 'PanGuard Pilot — 90-day Engineering Engagement',
  description:
    '90-day pilot engagement with PanGuard engineering. Billed monthly for 3 cycles; cancel at end of engagement.',
  unitAmountCents: 2_500_000, // $25,000.00
  currency: 'usd',
  interval: 'month',
});

export const ENTERPRISE_SPEC: CanonicalProductSpec = Object.freeze({
  canonical: 'enterprise',
  name: 'PanGuard Enterprise — Floor Tier Placeholder',
  description:
    'Enterprise placeholder product priced at the $150,000 floor. Real Enterprise deals are sales-led and ($150,000-$500,000); this SKU exists so Checkout can be exercised for the floor case.',
  unitAmountCents: 15_000_000, // $150,000.00
  currency: 'usd',
  interval: 'month',
});

// ───────────────────────────────────────────────────────────────────────
// Stripe operations
// ───────────────────────────────────────────────────────────────────────

/**
 * Validate that the supplied Stripe key is a test-mode key. We refuse to
 * even instantiate the client against a live key — this script must never
 * touch live mode.
 */
export function assertTestModeKey(key: string | undefined): asserts key is string {
  if (!key || key.length === 0) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Get a test-mode key from https://dashboard.stripe.com/test/apikeys and export it before running this script.'
    );
  }
  if (key.startsWith('sk_live_')) {
    throw new Error(
      'STRIPE_SECRET_KEY is a LIVE key (sk_live_*). This script refuses to run in live mode — live mode forbidden. Use a sk_test_* key.'
    );
  }
  if (!key.startsWith('sk_test_')) {
    throw new Error(
      `STRIPE_SECRET_KEY does not look like a Stripe test key (expected sk_test_* prefix, got ${key.slice(0, 7)}...). Refusing to proceed.`
    );
  }
}

/**
 * Look up an existing product by canonical metadata so we never create
 * duplicates on re-runs. Uses Stripe's Search API which is async-indexed
 * (10-60s lag for newly created products) — for an immediate second-run
 * we also pass the in-process memory map via `freshlyCreated`.
 */
export async function findCanonicalProduct(
  stripe: Stripe,
  canonical: CanonicalProductSpec['canonical'],
  freshlyCreated: Map<string, Stripe.Product> = new Map()
): Promise<Stripe.Product | null> {
  if (freshlyCreated.has(canonical)) {
    return freshlyCreated.get(canonical) ?? null;
  }

  const search = await stripe.products.search({
    query: `metadata['panguard_canonical']:'${canonical}'`,
    limit: 1,
  });

  return search.data[0] ?? null;
}

/**
 * Find an existing active recurring price for a product that matches our
 * canonical amount + interval. Avoids creating a new price on every run
 * when the same product already has the right price attached.
 */
export async function findMatchingPrice(
  stripe: Stripe,
  productId: string,
  spec: CanonicalProductSpec
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  return (
    prices.data.find(
      (p) =>
        p.unit_amount === spec.unitAmountCents &&
        p.currency === spec.currency &&
        p.recurring?.interval === spec.interval
    ) ?? null
  );
}

/**
 * Ensure a canonical product + matching price exists. Returns the ids and
 * whether they were freshly created (false = found existing).
 */
export async function ensureProductAndPrice(
  stripe: Stripe,
  spec: CanonicalProductSpec,
  freshlyCreated: Map<string, Stripe.Product>
): Promise<{ productId: string; priceId: string; created: boolean }> {
  let product = await findCanonicalProduct(stripe, spec.canonical, freshlyCreated);
  let created = false;

  if (!product) {
    product = await stripe.products.create({
      name: spec.name,
      description: spec.description,
      metadata: {
        panguard_canonical: spec.canonical,
        panguard_managed_by: 'scripts/setup-stripe-test.ts',
      },
    });
    freshlyCreated.set(spec.canonical, product);
    created = true;
  }

  let price = await findMatchingPrice(stripe, product.id, spec);
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: spec.currency,
      unit_amount: spec.unitAmountCents,
      recurring: { interval: spec.interval },
      billing_scheme: 'per_unit',
      metadata: {
        panguard_canonical: spec.canonical,
        panguard_managed_by: 'scripts/setup-stripe-test.ts',
      },
    });
    created = true;
  }

  return { productId: product.id, priceId: price.id, created };
}

/**
 * Bootstrap both canonical SKUs. Returns ids + creation flags for both.
 */
export async function bootstrapStripeProducts(stripe: Stripe): Promise<SetupResult> {
  const memory = new Map<string, Stripe.Product>();

  const pilot = await ensureProductAndPrice(stripe, PILOT_SPEC, memory);
  const enterprise = await ensureProductAndPrice(stripe, ENTERPRISE_SPEC, memory);

  return Object.freeze({
    pilotProductId: pilot.productId,
    pilotPriceId: pilot.priceId,
    enterpriseProductId: enterprise.productId,
    enterprisePriceId: enterprise.priceId,
    created: Object.freeze({
      pilot: pilot.created,
      enterprise: enterprise.created,
    }),
  });
}

// ───────────────────────────────────────────────────────────────────────
// ed25519 license keypair
// ───────────────────────────────────────────────────────────────────────

export interface LicenseKeypair {
  readonly privatePemBase64: string;
  readonly publicPemBase64: string;
}

/**
 * Generate an ed25519 keypair, export both halves as base64-encoded PEMs
 * matching the format expected by packages/app/src/lib/license/sign.ts.
 */
export function generateLicenseKeypair(): LicenseKeypair {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');

  const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  const publicPem = publicKey.export({ format: 'pem', type: 'spki' });

  const privatePemStr = typeof privatePem === 'string' ? privatePem : privatePem.toString('utf8');
  const publicPemStr = typeof publicPem === 'string' ? publicPem : publicPem.toString('utf8');

  return Object.freeze({
    privatePemBase64: Buffer.from(privatePemStr, 'utf8').toString('base64'),
    publicPemBase64: Buffer.from(publicPemStr, 'utf8').toString('base64'),
  });
}

// ───────────────────────────────────────────────────────────────────────
// .env file merge
// ───────────────────────────────────────────────────────────────────────

/**
 * Merge a set of {key,value} updates into the raw text of a .env file
 * WITHOUT clobbering existing unrelated lines, comments, or formatting.
 *
 * Behaviour:
 *   - If a key already exists (uncommented), its value is replaced.
 *   - If a key exists only as a commented-out hint (`# FOO=bar`), the
 *     comment line is preserved and a NEW uncommented line is appended.
 *   - If a key does not appear at all, it's appended at the end with a
 *     section header (only one header per run).
 *   - All other lines are returned verbatim.
 */
export function mergeEnv(existing: string, updates: readonly EnvUpdate[]): string {
  if (updates.length === 0) return existing;

  // Normalize trailing newline handling
  const trailingNewline = existing.length === 0 || existing.endsWith('\n');
  let body = existing;

  const lines = body.split('\n');
  const seen = new Set<string>();

  const updateMap = new Map<string, string>();
  for (const u of updates) updateMap.set(u.key, u.value);

  const rewritten = lines.map((line) => {
    // Match only uncommented lines: KEY=value (whitespace allowed around =)
    const m = /^([A-Z_][A-Z0-9_]*)\s*=/.exec(line);
    if (!m) return line;
    const key = m[1];
    if (!key) return line;
    if (!updateMap.has(key)) return line;
    seen.add(key);
    return `${key}=${updateMap.get(key) ?? ''}`;
  });

  body = rewritten.join('\n');

  const appendKeys = [...updateMap.keys()].filter((k) => !seen.has(k));
  if (appendKeys.length > 0) {
    const sep = trailingNewline ? '' : '\n';
    const header = '\n# ── Added by scripts/setup-stripe-test.ts ──────────────────────────\n';
    const block = appendKeys.map((k) => `${k}=${updateMap.get(k) ?? ''}`).join('\n');
    body = `${body}${sep}${header}${block}\n`;
  } else if (!trailingNewline) {
    body = `${body}\n`;
  }

  return body;
}

/**
 * Read .env from disk, returning '' if it doesn't exist. We don't fail —
 * the typical first run creates the file from scratch.
 */
export async function readEnvFile(path: string): Promise<string> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw err;
  }
}

/**
 * Atomic-ish write: write to .env.tmp then rename. Avoids a half-written
 * .env on Ctrl-C between fs.write events.
 */
export async function writeEnvFile(path: string, content: string): Promise<void> {
  const tmp = `${path}.tmp`;
  await fs.writeFile(tmp, content, { mode: 0o600 });
  await fs.rename(tmp, path);
}

// ───────────────────────────────────────────────────────────────────────
// Main entrypoint
// ───────────────────────────────────────────────────────────────────────

export interface MainArgs {
  readonly stripeFactory: (key: string) => Stripe;
  readonly envPath: string;
  readonly stripeSecretKey: string | undefined;
  readonly dryRun: boolean;
  readonly logger: Pick<Console, 'log' | 'warn' | 'error'>;
}

export interface MainResult {
  readonly setup: SetupResult | null;
  readonly licenseGenerated: boolean;
  readonly envUpdated: boolean;
  readonly dryRun: boolean;
}

/**
 * Pure-ish main: takes a Stripe factory + env path + secret key, returns
 * a structured result. The CLI wrapper at the bottom of this file passes
 * the real Stripe constructor and process.env values.
 */
export async function main(args: MainArgs): Promise<MainResult> {
  const { stripeFactory, envPath, stripeSecretKey, dryRun, logger } = args;

  assertTestModeKey(stripeSecretKey);

  logger.log('[setup-stripe] Mode:', dryRun ? 'DRY RUN' : 'EXECUTE');
  logger.log('[setup-stripe] Stripe key prefix:', stripeSecretKey.slice(0, 12) + '...');
  logger.log('[setup-stripe] .env target:', envPath);

  let setup: SetupResult | null = null;
  let licenseGenerated = false;
  const updates: EnvUpdate[] = [];

  if (dryRun) {
    logger.log('[setup-stripe] DRY RUN — would ensure these products exist:');
    logger.log(
      `  - ${PILOT_SPEC.canonical}: ${PILOT_SPEC.name} @ $${(PILOT_SPEC.unitAmountCents / 100).toLocaleString()}/${PILOT_SPEC.interval}`
    );
    logger.log(
      `  - ${ENTERPRISE_SPEC.canonical}: ${ENTERPRISE_SPEC.name} @ $${(ENTERPRISE_SPEC.unitAmountCents / 100).toLocaleString()}/${ENTERPRISE_SPEC.interval}`
    );
    logger.log(
      '[setup-stripe] DRY RUN — would write STRIPE_PRICE_ID_PILOT / STRIPE_PRICE_ID_ENTERPRISE to',
      envPath
    );
    return Object.freeze({ setup: null, licenseGenerated: false, envUpdated: false, dryRun: true });
  }

  const stripe = stripeFactory(stripeSecretKey);
  setup = await bootstrapStripeProducts(stripe);

  updates.push({ key: 'STRIPE_PRICE_ID_PILOT', value: setup.pilotPriceId });
  updates.push({ key: 'STRIPE_PRICE_ID_ENTERPRISE', value: setup.enterprisePriceId });

  // License keypair: only if not already present in .env
  const existingEnv = await readEnvFile(envPath);
  const hasPrivateKey = /^LICENSE_SIGNING_KEY_PRIVATE_PEM=.+$/m.test(existingEnv);
  if (!hasPrivateKey) {
    const kp = generateLicenseKeypair();
    updates.push({ key: 'LICENSE_SIGNING_KEY_PRIVATE_PEM', value: kp.privatePemBase64 });
    updates.push({ key: 'NEXT_PUBLIC_LICENSE_PUBLIC_KEY_PEM', value: kp.publicPemBase64 });
    licenseGenerated = true;
    logger.warn(
      '[setup-stripe] Generated new ed25519 keypair. Back up the private PEM somewhere safe; losing it invalidates ALL existing customer license JWTs.'
    );
  } else {
    logger.log(
      '[setup-stripe] LICENSE_SIGNING_KEY_PRIVATE_PEM already set — leaving keypair untouched.'
    );
  }

  const merged = mergeEnv(existingEnv, updates);
  await writeEnvFile(envPath, merged);

  // Summary
  logger.log('');
  logger.log('[setup-stripe] Summary:');
  logger.log(
    `  ${setup.created.pilot ? 'Created' : 'Found existing'} PILOT product (${setup.pilotProductId}, price ${setup.pilotPriceId}, $${(PILOT_SPEC.unitAmountCents / 100).toLocaleString()}/${PILOT_SPEC.interval} — sales motion cancels after cycle 3)`
  );
  logger.log(
    `  ${setup.created.enterprise ? 'Created' : 'Found existing'} ENTERPRISE floor product (${setup.enterpriseProductId}, price ${setup.enterprisePriceId}, $${(ENTERPRISE_SPEC.unitAmountCents / 100).toLocaleString()}/${ENTERPRISE_SPEC.interval} floor — real Enterprise is sales-led $150K–$500K)`
  );
  logger.log(`  Wrote ${updates.length} keys to ${envPath}`);
  logger.log('');
  logger.log('[setup-stripe] Next steps:');
  logger.log('  1. In another terminal, run:');
  logger.log('       stripe listen --forward-to localhost:3000/api/billing/webhook');
  logger.log(
    '     and copy the webhook signing secret it prints into STRIPE_WEBHOOK_SECRET in .env.'
  );
  logger.log('  2. Start the dev server: pnpm dev');
  logger.log('  3. Trigger a test checkout via the pricing CTA.');
  logger.log('');

  return Object.freeze({
    setup,
    licenseGenerated,
    envUpdated: updates.length > 0,
    dryRun: false,
  });
}

// ───────────────────────────────────────────────────────────────────────
// CLI wrapper — only runs when invoked as a script (not when imported by tests)
// ───────────────────────────────────────────────────────────────────────

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  try {
    const here = fileURLToPath(import.meta.url);
    return resolve(process.argv[1]) === resolve(here);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const dryRun = process.argv.includes('--dry-run');
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '..', '.env');

  main({
    stripeFactory: (key) =>
      new Stripe(key, {
        apiVersion: '2025-02-24.acacia',
        typescript: true,
        appInfo: { name: 'panguard-ai-setup', url: 'https://panguard.ai' },
      }),
    envPath,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    dryRun,
    logger: console,
  })
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[setup-stripe] FAILED:', msg);
      // Map error kinds to exit codes
      if (/STRIPE_SECRET_KEY|live mode forbidden|test key/.test(msg)) process.exit(1);
      if (/ENOENT|EACCES|EPERM/.test(msg)) process.exit(3);
      process.exit(2);
    });
}

// Compile-time check: keep tests honest. unused-but-exported sentinel.
void existsSync;
