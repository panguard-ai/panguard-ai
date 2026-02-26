/**
 * /api/trap/* - Honeypot system endpoints
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * GET /api/trap/status - Get honeypot system status
 */
export function handleTrapStatus(_req: IncomingMessage, res: ServerResponse): void {
  // In production, would check TrapEngine state
  const status = {
    running: false,
    services: [
      { type: 'ssh', port: 2222, enabled: true, sessions: 0 },
      { type: 'http', port: 8080, enabled: true, sessions: 0 },
      { type: 'ftp', port: 2121, enabled: false, sessions: 0 },
      { type: 'telnet', port: 2323, enabled: false, sessions: 0 },
      { type: 'mysql', port: 3307, enabled: false, sessions: 0 },
      { type: 'redis', port: 6380, enabled: false, sessions: 0 },
      { type: 'smb', port: 4450, enabled: false, sessions: 0 },
      { type: 'rdp', port: 3390, enabled: false, sessions: 0 },
    ],
    statistics: {
      totalSessions: 0,
      activeSessions: 0,
      uniqueSourceIPs: 0,
      totalCredentialAttempts: 0,
      totalCommandsCaptured: 0,
    },
    recentProfiles: [],
  };

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, data: status }));
}
