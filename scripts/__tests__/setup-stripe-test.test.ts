/**
 * scripts/__tests__/setup-stripe-test.test.ts
 *
 * Mock-driven unit tests for the Stripe bootstrap script. Validates:
 *   1. assertTestModeKey refuses live keys
 *   2. assertTestModeKey refuses missing keys
 *   3. assertTestModeKey accepts test keys
 *   4. mergeEnv preserves unrelated keys and updates targeted keys
 *   5. mergeEnv adds new keys without clobbering or duplicating
 *   6. bootstrapStripeProducts creates products + prices on first run
 *   7. bootstrapStripeProducts is idempotent on second run
 *   8. main() refuses live keys and surfaces error message
 *   9. generateLicenseKeypair returns valid base64-encoded PEMs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import {
  assertTestModeKey,
  bootstrapStripeProducts,
  ensureProductAndPrice,
  generateLicenseKeypair,
  main,
  mergeEnv,
  PILOT_SPEC,
  ENTERPRISE_SPEC,
  readEnvFile,
} from '../setup-stripe-test';

// ───────────────────────────────────────────────────────────────────────
// Stripe mock factory
// ───────────────────────────────────────────────────────────────────────

interface MockProductRecord {
  id: string;
  metadata: Record<string, string>;
  name: string;
  description: string | null;
}

interface MockPriceRecord {
  id: string;
  product: string;
  currency: string;
  unit_amount: number;
  recurring: { interval: string } | null;
  active: boolean;
}

interface MockStripeState {
  products: MockProductRecord[];
  prices: MockPriceRecord[];
  searchCalls: number;
  createProductCalls: number;
  createPriceCalls: number;
}

function makeMockStripe(state: MockStripeState) {
  return {
    products: {
      search: vi.fn(async ({ query }: { query: string }) => {
        state.searchCalls += 1;
        const m = /metadata\['panguard_canonical'\]:'([^']+)'/.exec(query);
        const canonical = m ? m[1] : null;
        const hit = state.products.find(
          (p) => canonical !== null && p.metadata.panguard_canonical === canonical
        );
        return { data: hit ? [hit] : [] };
      }),
      create: vi.fn(
        async (params: {
          name: string;
          description: string;
          metadata: Record<string, string>;
        }) => {
          state.createProductCalls += 1;
          const id = `prod_test_${params.metadata.panguard_canonical}_${state.createProductCalls}`;
          const product: MockProductRecord = {
            id,
            metadata: { ...params.metadata },
            name: params.name,
            description: params.description,
          };
          state.products.push(product);
          return product;
        }
      ),
    },
    prices: {
      list: vi.fn(async ({ product }: { product: string }) => {
        const matches = state.prices.filter((p) => p.product === product && p.active);
        return { data: matches };
      }),
      create: vi.fn(
        async (params: {
          product: string;
          currency: string;
          unit_amount: number;
          recurring: { interval: string };
        }) => {
          state.createPriceCalls += 1;
          const id = `price_test_${params.product}_${state.createPriceCalls}`;
          const price: MockPriceRecord = {
            id,
            product: params.product,
            currency: params.currency,
            unit_amount: params.unit_amount,
            recurring: { ...params.recurring },
            active: true,
          };
          state.prices.push(price);
          return price;
        }
      ),
    },
  };
}

function freshState(): MockStripeState {
  return {
    products: [],
    prices: [],
    searchCalls: 0,
    createProductCalls: 0,
    createPriceCalls: 0,
  };
}

function silentLogger(): Pick<Console, 'log' | 'warn' | 'error'> {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

async function makeTempEnvPath(initial?: string): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'panguard-setup-test-'));
  const path = join(dir, '.env');
  if (initial !== undefined) {
    await fs.writeFile(path, initial, 'utf8');
  }
  return path;
}

// ───────────────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────────────

describe('assertTestModeKey', () => {
  it('refuses live keys with explicit "live mode forbidden" message', () => {
    expect(() => assertTestModeKey('sk_live_abc')).toThrow(/live mode forbidden/);
  });

  it('refuses missing keys', () => {
    expect(() => assertTestModeKey(undefined)).toThrow(/STRIPE_SECRET_KEY is not set/);
    expect(() => assertTestModeKey('')).toThrow(/STRIPE_SECRET_KEY is not set/);
  });

  it('accepts well-formed sk_test_* keys', () => {
    expect(() => assertTestModeKey('sk_test_abc123')).not.toThrow();
  });

  it('refuses unrecognised key prefixes', () => {
    expect(() => assertTestModeKey('rk_live_abc')).toThrow(/does not look like a Stripe test key/);
  });
});

describe('mergeEnv', () => {
  it('preserves unrelated existing keys exactly', () => {
    const existing = 'EXISTING_KEY=value\nOTHER_KEY=other\n';
    const merged = mergeEnv(existing, [{ key: 'STRIPE_PRICE_ID_PILOT', value: 'price_test_pilot' }]);

    expect(merged).toContain('EXISTING_KEY=value');
    expect(merged).toContain('OTHER_KEY=other');
    expect(merged).toContain('STRIPE_PRICE_ID_PILOT=price_test_pilot');
  });

  it('does not duplicate keys on second run — updates in place', () => {
    const existing = 'STRIPE_PRICE_ID_PILOT=price_old\nEXISTING_KEY=value\n';
    const merged = mergeEnv(existing, [{ key: 'STRIPE_PRICE_ID_PILOT', value: 'price_new' }]);

    const occurrences = (merged.match(/STRIPE_PRICE_ID_PILOT=/g) ?? []).length;
    expect(occurrences).toBe(1);
    expect(merged).toContain('STRIPE_PRICE_ID_PILOT=price_new');
    expect(merged).not.toContain('STRIPE_PRICE_ID_PILOT=price_old');
    expect(merged).toContain('EXISTING_KEY=value');
  });

  it('preserves comments and creates a single appended block for new keys', () => {
    const existing = '# Important comment\nEXISTING_KEY=value';
    const merged = mergeEnv(existing, [
      { key: 'STRIPE_PRICE_ID_PILOT', value: 'price_test_pilot' },
      { key: 'STRIPE_PRICE_ID_ENTERPRISE', value: 'price_test_enterprise' },
    ]);

    expect(merged).toContain('# Important comment');
    expect(merged).toContain('EXISTING_KEY=value');
    expect(merged).toContain('STRIPE_PRICE_ID_PILOT=price_test_pilot');
    expect(merged).toContain('STRIPE_PRICE_ID_ENTERPRISE=price_test_enterprise');
    // Single managed-block header
    expect(merged.match(/Added by scripts\/setup-stripe-test\.ts/g)).toHaveLength(1);
  });

  it('handles empty input — creates a fresh file body', () => {
    const merged = mergeEnv('', [{ key: 'FOO', value: 'bar' }]);
    expect(merged).toContain('FOO=bar');
  });

  it('does not touch commented-out hint lines', () => {
    const existing = '# STRIPE_PRICE_ID_PILOT=price_hint\nOTHER=ok\n';
    const merged = mergeEnv(existing, [{ key: 'STRIPE_PRICE_ID_PILOT', value: 'price_real' }]);

    expect(merged).toContain('# STRIPE_PRICE_ID_PILOT=price_hint');
    expect(merged).toContain('STRIPE_PRICE_ID_PILOT=price_real');
  });
});

describe('bootstrapStripeProducts', () => {
  it('creates pilot + enterprise products and prices on first run', async () => {
    const state = freshState();
    const stripe = makeMockStripe(state);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await bootstrapStripeProducts(stripe as any);

    expect(state.createProductCalls).toBe(2);
    expect(state.createPriceCalls).toBe(2);
    expect(result.created.pilot).toBe(true);
    expect(result.created.enterprise).toBe(true);
    expect(result.pilotProductId).toMatch(/^prod_test_pilot/);
    expect(result.pilotPriceId).toMatch(/^price_test_/);
    expect(result.enterpriseProductId).toMatch(/^prod_test_enterprise/);
    expect(result.enterprisePriceId).toMatch(/^price_test_/);
  });

  it('is idempotent on second run — no duplicate creates', async () => {
    const state = freshState();
    const stripe = makeMockStripe(state);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const first = await bootstrapStripeProducts(stripe as any);
    expect(state.createProductCalls).toBe(2);
    expect(state.createPriceCalls).toBe(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const second = await bootstrapStripeProducts(stripe as any);
    expect(state.createProductCalls).toBe(2); // unchanged
    expect(state.createPriceCalls).toBe(2); // unchanged
    expect(second.pilotProductId).toBe(first.pilotProductId);
    expect(second.pilotPriceId).toBe(first.pilotPriceId);
    expect(second.enterpriseProductId).toBe(first.enterpriseProductId);
    expect(second.enterprisePriceId).toBe(first.enterprisePriceId);
    expect(second.created.pilot).toBe(false);
    expect(second.created.enterprise).toBe(false);
  });

  it('reuses an existing product but creates a missing price', async () => {
    const state = freshState();
    // Pre-seed a product without the matching price
    state.products.push({
      id: 'prod_preexisting_pilot',
      metadata: { panguard_canonical: 'pilot' },
      name: PILOT_SPEC.name,
      description: PILOT_SPEC.description,
    });
    const stripe = makeMockStripe(state);

    const memory = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await ensureProductAndPrice(stripe as any, PILOT_SPEC, memory);

    expect(out.productId).toBe('prod_preexisting_pilot');
    expect(out.priceId).toMatch(/^price_test_prod_preexisting_pilot_/);
    expect(state.createProductCalls).toBe(0);
    expect(state.createPriceCalls).toBe(1);
  });
});

describe('main() — top-level integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses live keys with exit-worthy error', async () => {
    const envPath = await makeTempEnvPath('');
    await expect(
      main({
        stripeFactory: () => {
          throw new Error('stripeFactory should not be called for live key');
        },
        envPath,
        stripeSecretKey: 'sk_live_abcdef',
        dryRun: false,
        logger: silentLogger(),
      })
    ).rejects.toThrow(/live mode forbidden/);
  });

  it('writes STRIPE_PRICE_ID_PILOT + STRIPE_PRICE_ID_ENTERPRISE into .env preserving existing keys', async () => {
    const envPath = await makeTempEnvPath('EXISTING_KEY=value\nLICENSE_SIGNING_KEY_PRIVATE_PEM=already_set\n');
    const state = freshState();

    const result = await main({
      stripeFactory: () => makeMockStripe(state) as unknown as import('stripe').default,
      envPath,
      stripeSecretKey: 'sk_test_abc',
      dryRun: false,
      logger: silentLogger(),
    });

    expect(result.setup).not.toBeNull();
    expect(result.envUpdated).toBe(true);
    expect(result.licenseGenerated).toBe(false); // pre-existing key respected

    const contents = await fs.readFile(envPath, 'utf8');
    expect(contents).toContain('EXISTING_KEY=value');
    expect(contents).toMatch(/STRIPE_PRICE_ID_PILOT=price_test_/);
    expect(contents).toMatch(/STRIPE_PRICE_ID_ENTERPRISE=price_test_/);
    expect(contents).toContain('LICENSE_SIGNING_KEY_PRIVATE_PEM=already_set');
    // Only one occurrence of the pilot key (no clobber, no dup)
    const pilotCount = (contents.match(/^STRIPE_PRICE_ID_PILOT=/gm) ?? []).length;
    expect(pilotCount).toBe(1);
  });

  it('generates an ed25519 keypair when none is present in .env', async () => {
    const envPath = await makeTempEnvPath(''); // missing license key
    const state = freshState();

    const result = await main({
      stripeFactory: () => makeMockStripe(state) as unknown as import('stripe').default,
      envPath,
      stripeSecretKey: 'sk_test_abc',
      dryRun: false,
      logger: silentLogger(),
    });

    expect(result.licenseGenerated).toBe(true);
    const contents = await fs.readFile(envPath, 'utf8');
    expect(contents).toMatch(/^LICENSE_SIGNING_KEY_PRIVATE_PEM=[A-Za-z0-9+/=]+$/m);
    expect(contents).toMatch(/^NEXT_PUBLIC_LICENSE_PUBLIC_KEY_PEM=[A-Za-z0-9+/=]+$/m);
  });

  it('dry-run mode hits no Stripe API and writes nothing', async () => {
    const envPath = await makeTempEnvPath('EXISTING_KEY=value\n');
    const before = await fs.readFile(envPath, 'utf8');

    const result = await main({
      stripeFactory: () => {
        throw new Error('stripeFactory must not be called in dry-run');
      },
      envPath,
      stripeSecretKey: 'sk_test_abc',
      dryRun: true,
      logger: silentLogger(),
    });

    expect(result.dryRun).toBe(true);
    expect(result.setup).toBeNull();
    expect(result.envUpdated).toBe(false);

    const after = await fs.readFile(envPath, 'utf8');
    expect(after).toBe(before);
  });
});

describe('generateLicenseKeypair', () => {
  it('produces base64-encoded PKCS8 + SPKI PEMs that decode to expected PEM headers', () => {
    const kp = generateLicenseKeypair();

    const priv = Buffer.from(kp.privatePemBase64, 'base64').toString('utf8');
    const pub = Buffer.from(kp.publicPemBase64, 'base64').toString('utf8');

    expect(priv).toContain('-----BEGIN PRIVATE KEY-----');
    expect(priv).toContain('-----END PRIVATE KEY-----');
    expect(pub).toContain('-----BEGIN PUBLIC KEY-----');
    expect(pub).toContain('-----END PUBLIC KEY-----');
  });

  it('produces different keypairs on each call (sanity check on entropy source)', () => {
    const kp1 = generateLicenseKeypair();
    const kp2 = generateLicenseKeypair();
    expect(kp1.privatePemBase64).not.toBe(kp2.privatePemBase64);
    expect(kp1.publicPemBase64).not.toBe(kp2.publicPemBase64);
  });
});

describe('readEnvFile', () => {
  it('returns empty string when file does not exist', async () => {
    const ghost = join(tmpdir(), `panguard-ghost-${randomBytes(8).toString('hex')}`);
    const result = await readEnvFile(ghost);
    expect(result).toBe('');
  });

  it('returns file contents when file exists', async () => {
    const envPath = await makeTempEnvPath('FOO=bar\n');
    const result = await readEnvFile(envPath);
    expect(result).toBe('FOO=bar\n');
  });
});

describe('canonical specs (compile-time invariants surfaced as runtime asserts)', () => {
  it('PILOT_SPEC is the agreed $25,000 USD / month SKU', () => {
    expect(PILOT_SPEC.unitAmountCents).toBe(2_500_000);
    expect(PILOT_SPEC.currency).toBe('usd');
    expect(PILOT_SPEC.interval).toBe('month');
    expect(PILOT_SPEC.canonical).toBe('pilot');
  });

  it('ENTERPRISE_SPEC is the agreed $150,000 USD / month floor SKU', () => {
    expect(ENTERPRISE_SPEC.unitAmountCents).toBe(15_000_000);
    expect(ENTERPRISE_SPEC.currency).toBe('usd');
    expect(ENTERPRISE_SPEC.interval).toBe('month');
    expect(ENTERPRISE_SPEC.canonical).toBe('enterprise');
  });
});
