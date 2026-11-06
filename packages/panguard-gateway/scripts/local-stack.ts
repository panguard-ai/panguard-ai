/**
 * Local stack for the official conformance run: the mock provider plus a
 * gateway in front of it, with the real ATR worker pool. Prints one JSON line
 * with both URLs, then serves until interrupted.
 *
 *   node --import tsx scripts/local-stack.ts
 *
 * Environment: PORT (gateway port, default 0 = any), BLOCK_STYLE, TEXT_HOLDBACK,
 * LANE, AUDIT_LOG (default: audit off).
 */

import { resolveConfig, type BlockStyle } from '../src/config.js';
import { startGateway } from '../src/gateway.js';
import { startMockUpstream } from '../tests/fixtures/mock-upstream.js';

const env = process.env;
const mock = await startMockUpstream();
const gateway = await startGateway(
  resolveConfig({
    upstream: mock.url,
    port: Number(env['PORT'] ?? 0),
    lane: (env['LANE'] as 'hunt' | 'alert' | 'enforce' | undefined) ?? 'hunt',
    auditLog: env['AUDIT_LOG'] ?? null,
    policy: {
      blockStyle: (env['BLOCK_STYLE'] as BlockStyle | undefined) ?? 'refusal',
      text: { holdback: Number(env['TEXT_HOLDBACK'] ?? 0) },
    },
    // A machine's own Guard blocklist must not change conformance results.
    evaluation: { blocklistPath: '/nonexistent/panguard-gateway-blocklist.json' },
  })
);
process.stdout.write(
  `${JSON.stringify({ gateway: gateway.url, upstream: mock.url, rules: gateway.rules })}\n`
);

const stop = (): void => {
  void Promise.all([gateway.close(), mock.close()]).finally(() => process.exit(0));
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
