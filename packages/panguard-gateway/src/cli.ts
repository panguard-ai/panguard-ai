#!/usr/bin/env node
/**
 * panguard-gateway: run the Open Responses gateway from environment settings.
 *
 *   PANGUARD_GATEWAY_UPSTREAM=https://provider.example/v1 panguard-gateway
 *
 * @module @panguard-ai/panguard-gateway/cli
 */

import { configFromEnv } from './config.js';
import { startGateway } from './gateway.js';

const HELP = `panguard-gateway — Open Responses gateway with ATR checks

Environment:
  PANGUARD_GATEWAY_UPSTREAM         provider base URL incl. version path (required)
  PANGUARD_GATEWAY_HOST / _PORT     listen address (default 127.0.0.1:8790)
  PANGUARD_GATEWAY_LANE             hunt | alert | enforce (default hunt)
  PANGUARD_GATEWAY_FAIL_MODE        closed | open (default closed)
  PANGUARD_GATEWAY_BLOCK_STYLE      refusal | incomplete (default refusal)
  PANGUARD_GATEWAY_REQUEST_MODE     rewrite | reject (default rewrite)
  PANGUARD_GATEWAY_BINDING          flag | reject (default flag)
  PANGUARD_GATEWAY_TEXT_WINDOW      characters between text checks (default 256)
  PANGUARD_GATEWAY_TEXT_HOLDBACK    characters held until checked (default 0)
  PANGUARD_GATEWAY_EVAL_TIMEOUT_MS  hard deadline per evaluation (default 2000)
  PANGUARD_GATEWAY_WORKERS          ATR worker threads (default 1)
  PANGUARD_GATEWAY_AUDIT_LOG        audit chain path, or "off"
  PANGUARD_GATEWAY_BLOCKLIST        Guard blocklist path
  PANGUARD_GATEWAY_FORWARD_HEADERS  extra request headers to forward, comma-separated
`;

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  const config = configFromEnv();
  const gateway = await startGateway(config);
  process.stdout.write(
    `panguard-gateway listening on ${gateway.url}/v1/responses -> ${config.upstream} ` +
      `(lane ${config.lane}, ${gateway.rules.runtime} rules, fail-${config.policy.failMode}, ` +
      `block ${config.policy.blockStyle})\n`
  );
  const stop = (): void => {
    gateway.close().then(
      () => process.exit(0),
      () => process.exit(1)
    );
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch((err: unknown) => {
  process.stderr.write(`panguard-gateway: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
