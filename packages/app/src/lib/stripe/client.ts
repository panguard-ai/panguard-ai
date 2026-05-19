/**
 * Server-only Stripe client factory.
 *
 * Reads STRIPE_SECRET_KEY from the environment and instantiates a typed
 * Stripe SDK client. Never import this file from a Client Component — the
 * secret key would leak into the browser bundle.
 *
 * The pinned `apiVersion` is the latest stable at the time of writing. When
 * the Stripe team publishes a new GA version, bump this string and re-test
 * the checkout + webhook handlers; do NOT auto-upgrade by leaving it blank.
 *
 * `typescript: true` opts into Stripe's strictly-typed request/response
 * shapes — important because Checkout Session params and Webhook event
 * payloads have variant unions that the JS-mode types collapse to `any`.
 */

import Stripe from 'stripe';

let cached: Stripe | null = null;

/**
 * Returns a process-wide singleton Stripe client. We cache the instance
 * because `new Stripe(...)` allocates an internal HTTP agent and we don't
 * want to leak sockets on every route invocation under load.
 *
 * Throws a clear error when STRIPE_SECRET_KEY is missing so the failure
 * surfaces at first use (not at silent 500s deep inside the checkout flow).
 */
export function getStripe(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.length === 0) {
    throw new Error(
      '[panguard/app] STRIPE_SECRET_KEY is not set — billing routes unavailable. ' +
        'Set it via the Stripe Dashboard once the account is approved.'
    );
  }

  cached = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
    appInfo: {
      name: 'panguard-ai',
      url: 'https://panguard.ai',
    },
  });

  return cached;
}
