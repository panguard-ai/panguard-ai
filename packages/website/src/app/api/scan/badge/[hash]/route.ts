import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * GET /api/scan/badge/:hash.svg
 *
 * Returns an SVG badge showing the scan status of a skill.
 * Queries Threat Cloud to check if the skill hash is known
 * (whitelist = safe, blacklist = unsafe, unknown = not scanned).
 *
 * Embed in README:
 *   ![ATR Badge](https://panguard.ai/api/scan/badge/<contentHash>)
 */

const TC_ENDPOINT = process.env['THREAT_CLOUD_URL'] || 'https://tc.panguard.ai';

const ALLOWED_TC_ORIGINS = new Set([
  'https://tc.panguard.ai',
  // add other production TC origins here
]);

type BadgeStatus = 'safe' | 'warning' | 'critical' | 'unknown';

const STATUS_CONFIG: Record<BadgeStatus, { label: string; color: string }> = {
  safe: { label: 'Safe', color: '#2ED573' },
  warning: { label: 'Review', color: '#FFA502' },
  critical: { label: 'Critical', color: '#FF4757' },
  unknown: { label: 'Not Scanned', color: '#A09A94' },
};

function buildBadge(status: BadgeStatus): string {
  const prefix = 'ATR';
  const { label, color } = STATUS_CONFIG[status];
  const labelWidth = 30;
  const valueWidth = label.length * 7 + 16;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${prefix}: ${label}">
  <title>${prefix}: ${label}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${prefix}</text>
    <text x="${labelWidth / 2}" y="14">${prefix}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${label}</text>
  </g>
</svg>`;
}

async function lookupStatus(hash: string): Promise<BadgeStatus> {
  try {
    // Check blacklist first (skills with 3+ threat reports and high avg risk)
    const blacklistResp = await fetch(
      `${TC_ENDPOINT}/api/skill-blacklist?minReports=1&minAvgRisk=0`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (blacklistResp.ok) {
      const blacklistData = (await blacklistResp.json()) as {
        ok: boolean;
        data: Array<{ skillHash?: string; avgRiskScore?: number }>;
      };
      if (blacklistData.ok && Array.isArray(blacklistData.data)) {
        const match = blacklistData.data.find((s) => s.skillHash === hash);
        if (match) {
          const avgRisk = match.avgRiskScore ?? 0;
          if (avgRisk >= 70) return 'critical';
          if (avgRisk >= 40) return 'warning';
        }
      }
    }

    // Check whitelist (community-confirmed safe skills)
    const whitelistResp = await fetch(`${TC_ENDPOINT}/api/skill-whitelist`, {
      signal: AbortSignal.timeout(5000),
    });
    if (whitelistResp.ok) {
      const whitelistData = (await whitelistResp.json()) as {
        ok: boolean;
        data: Array<{ hash?: string; name?: string; confirmations?: number }>;
      };
      if (whitelistData.ok && Array.isArray(whitelistData.data)) {
        const match = whitelistData.data.find((s) => s.hash === hash);
        if (match && (match.confirmations ?? 0) >= 3) return 'safe';
      }
    }
  } catch {
    // TC unavailable — fall through to unknown
  }

  return 'unknown';
}

export async function GET(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const ip = getClientIP(request);
  if (!checkRateLimit(ip)) {
    // This endpoint is an <img> badge — return a valid SVG (not JSON) so the
    // image never breaks, while still skipping the upstream Threat Cloud
    // fan-out that the rate limit is meant to protect.
    return new NextResponse(buildBadge('unknown'), {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=60',
        'Retry-After': '60',
      },
    });
  }

  const { hash } = await params;
  const cleanHash = hash
    .replace(/\.svg$/, '')
    .replace(/[^a-f0-9]/gi, '')
    .slice(0, 64);

  if (!cleanHash || cleanHash.length < 8) {
    return new NextResponse(buildBadge('unknown'), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const status = await lookupStatus(cleanHash);

  return new NextResponse(buildBadge(status), {
    headers: {
      'Content-Type': 'image/svg+xml',
      // Cache for 30 minutes — balances freshness with performance
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
