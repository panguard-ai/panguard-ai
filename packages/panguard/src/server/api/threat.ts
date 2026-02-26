/**
 * /api/threat/* - Threat intelligence endpoints
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * GET /api/threat/stats - Get threat intelligence statistics
 *
 * Returns sample stats for dashboard display.
 */
export function handleThreatStats(_req: IncomingMessage, res: ServerResponse): void {
  // Return demo stats (in production, would query ThreatCloudDB)
  const stats = {
    totalThreats: 1247,
    totalRules: 89,
    topAttackTypes: [
      { type: 'brute_force', count: 450, label: 'Brute Force' },
      { type: 'web_exploit', count: 312, label: 'Web Exploit' },
      { type: 'malware', count: 198, label: 'Malware' },
      { type: 'phishing', count: 156, label: 'Phishing' },
      { type: 'dos', count: 131, label: 'DoS' },
    ],
    topMitreTechniques: [
      { technique: 'T1110.001', name: 'Password Guessing', count: 230 },
      { technique: 'T1190', name: 'Exploit Public-Facing App', count: 189 },
      { technique: 'T1059', name: 'Command and Scripting', count: 156 },
      { technique: 'T1505.003', name: 'Web Shell', count: 98 },
      { technique: 'T1071', name: 'Application Layer Protocol', count: 87 },
    ],
    last24hThreats: 45,
    regionDistribution: [
      { region: 'APAC', count: 523 },
      { region: 'EMEA', count: 389 },
      { region: 'Americas', count: 335 },
    ],
  };

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, data: stats }));
}
