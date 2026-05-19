/**
 * Fleet status HTTP handler
 * Fleet 狀態 HTTP 處理器
 *
 * @module @panguard-ai/panguard-manager/api/status
 */

import type { ServerResponse } from 'node:http';
import type { FleetAggregator } from '../aggregator.js';
import { newRequestId, ok } from './respond.js';

export interface StatusApiDeps {
  readonly aggregator: FleetAggregator;
  readonly startedAtMs: number;
}

/** GET /api/status / 取得 fleet 彙整狀態 */
export function handleStatus(res: ServerResponse, deps: StatusApiDeps): void {
  const request_id = newRequestId();
  const summary = deps.aggregator.getFleetSummary();
  ok(
    res,
    {
      summary,
      uptime_seconds: Math.floor((Date.now() - deps.startedAtMs) / 1000),
    },
    request_id
  );
}

/** GET /healthz / 健康檢查 */
export function handleHealth(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: 'panguard-manager' }));
}
