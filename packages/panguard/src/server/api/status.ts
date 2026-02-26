/**
 * GET /api/status - System status overview
 * Returns real module availability by checking Guard PID, Trap ports, and Chat config.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createConnection } from 'node:net';
import { PidFile } from '@openclaw/panguard-guard';
import { PANGUARD_VERSION } from '../../index.js';

/** Check if a port is listening on localhost */
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.setTimeout(300, () => { socket.destroy(); resolve(false); });
  });
}

/** Check if guard engine is running via PID file */
function checkGuardRunning(): boolean {
  const dataDir = process.env['PANGUARD_GUARD_DATA_DIR'] ?? join(homedir(), '.panguard-guard');
  const pidFile = new PidFile(dataDir);
  return pidFile.isRunning();
}

/** Check if any trap honeypot service is listening */
async function checkTrapRunning(): Promise<boolean> {
  const results = await Promise.all([checkPort(2222), checkPort(8080)]);
  return results.some(Boolean);
}

/** Check if any notification channel is configured via env vars */
function checkChatConfigured(): boolean {
  return !!(
    process.env['LINE_CHANNEL_ACCESS_TOKEN'] ||
    process.env['TELEGRAM_BOT_TOKEN'] ||
    process.env['SLACK_BOT_TOKEN'] ||
    process.env['SMTP_HOST'] ||
    process.env['WEBHOOK_ENDPOINT']
  );
}

export async function handleStatus(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const guardRunning = checkGuardRunning();
  const trapRunning = await checkTrapRunning();
  const chatConfigured = checkChatConfigured();

  const status = {
    version: PANGUARD_VERSION,
    modules: {
      scan: { name: 'PanguardScan', available: true, description: 'Security Scanner' },
      guard: { name: 'PanguardGuard', available: guardRunning, description: 'Real-time Monitor' },
      report: { name: 'PanguardReport', available: true, description: 'Compliance Reports' },
      chat: { name: 'PanguardChat', available: chatConfigured, description: 'Notifications' },
      trap: { name: 'PanguardTrap', available: trapRunning, description: 'Honeypot System' },
      threat: { name: 'ThreatCloud', available: true, description: 'Threat Intelligence' },
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, data: status }));
}
