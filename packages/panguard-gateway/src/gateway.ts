/**
 * Assembles the gateway: ATR worker pool, verdict cache, ledger, audit chain,
 * and the HTTP + WebSocket server.
 *
 * @module @panguard-ai/panguard-gateway/gateway
 */

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { ChainAuditSink, NO_AUDIT, type AuditSink } from './audit.js';
import type { GatewayConfig } from './config.js';
import { CachingEvaluator } from './evaluation-cache.js';
import { WorkerEvaluatorPool, type Evaluator } from './evaluator-pool.js';
import { createHttpHandler, originAllowed } from './http-handler.js';
import type { JsonObject } from './json.js';
import { VerdictLedger } from './ledger.js';
import type { GatewayServices } from './services.js';
import type { RuleCounts } from './worker/protocol.js';
import { OPEN_RESPONSES_SPEC, type EvaluatedWith } from './verdict-field.js';
import { WsSession } from './ws-session.js';

export interface Gateway {
  readonly url: string;
  readonly port: number;
  readonly rules: RuleCounts;
  readonly ledger: VerdictLedger;
  readonly audit: AuditSink;
  health(): JsonObject;
  close(): Promise<void>;
}

export interface GatewayOverrides {
  /** Replaces the ATR worker pool (tests run deterministic evaluators). */
  readonly evaluator?: Evaluator;
}

export async function startGateway(
  config: GatewayConfig,
  overrides: GatewayOverrides = {}
): Promise<Gateway> {
  const pool = overrides.evaluator
    ? undefined
    : new WorkerEvaluatorPool({
        lane: config.lane,
        maxScanChars: config.evaluation.maxScanChars,
        size: config.evaluation.workers,
        timeoutMs: config.evaluation.timeoutMs,
        ...(config.evaluation.blocklistPath !== undefined
          ? { blocklistPath: config.evaluation.blocklistPath }
          : {}),
      });
  const rules: RuleCounts = pool ? await pool.start() : { runtime: 0, toolDefinitions: 0 };
  const evaluatedWith: EvaluatedWith = {
    agent_threat_rules: pool ? pool.getAtrVersion() : 'external',
    lane: config.lane,
    open_responses: OPEN_RESPONSES_SPEC,
  };
  try {
    const audit =
      config.auditLog === null
        ? NO_AUDIT
        : await ChainAuditSink.open(config.auditLog, evaluatedWith, config.auditKey);
    const services: GatewayServices = {
      config,
      evaluator: new CachingEvaluator(overrides.evaluator ?? pool!),
      ledger: new VerdictLedger(config.ledger),
      audit,
      evaluatedWith,
    };
    const health = (): JsonObject => {
      const evaluator = pool?.stats();
      return {
        // No live ATR worker means every check fails (and fails closed by default).
        status: evaluator && evaluator.alive === 0 ? 'degraded' : 'ok',
        evaluated_with: evaluatedWith,
        rules,
        policy: config.policy,
        ledger_responses: services.ledger.size(),
        evaluator: evaluator ?? 'external',
      };
    };
    const server = createServer(createHttpHandler(services, health));
    const sockets = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
      const path = new URL(req.url ?? '/', 'http://gateway').pathname.replace(/\/+$/, '');
      if (path !== '/v1/responses') {
        socket.destroy();
        return;
      }
      if (!originAllowed(req.headers.origin, config.allowedOrigins)) {
        // A web page may open a WebSocket to any host; only allowed origins get one here.
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      sockets.handleUpgrade(req, socket, head, (client) => new WsSession(client, req, services));
    });
    const port = await listen(server, config.port, config.host);
    return {
      url: `http://${config.host}:${port}`,
      port,
      rules,
      ledger: services.ledger,
      audit,
      health,
      close: async () => {
        for (const client of sockets.clients) client.terminate();
        sockets.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        server.closeAllConnections();
        await pool?.close();
      },
    };
  } catch (err) {
    await pool?.close();
    throw err;
  }
}

function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve((server.address() as AddressInfo).port);
    });
  });
}
