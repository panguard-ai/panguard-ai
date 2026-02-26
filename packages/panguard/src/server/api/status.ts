/**
 * GET /api/status - System status overview
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { PANGUARD_VERSION } from '../../index.js';

export function handleStatus(_req: IncomingMessage, res: ServerResponse): void {
  const status = {
    version: PANGUARD_VERSION,
    modules: {
      scan: { name: 'PanguardScan', available: true, description: 'Security Scanner' },
      guard: { name: 'PanguardGuard', available: true, description: 'Real-time Monitor' },
      report: { name: 'PanguardReport', available: true, description: 'Compliance Reports' },
      chat: { name: 'PanguardChat', available: true, description: 'Notifications' },
      trap: { name: 'PanguardTrap', available: true, description: 'Honeypot System' },
      threat: { name: 'ThreatCloud', available: true, description: 'Threat Intelligence' },
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, data: status }));
}
