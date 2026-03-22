import { NextResponse } from 'next/server';

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

const TC_ENDPOINT =
  process.env['NEXT_PUBLIC_THREAT_CLOUD_URL'] || 'https://tc.panguard.ai';

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
        data: Array<{ skill_hash?: string; avg_risk_score?: number }>;
      };
      if (blacklistData.ok && Array.isArray(blacklistData.data)) {
        const match = blacklistData.data.find(
          (s) => s.skill_hash === hash
        );
        if (match) {
          const avgRisk = match.avg_risk_score ?? 0;
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
        data: Array<{ fingerprint_hash?: string; status?: string }>;
      };
      if (whitelistData.ok && Array.isArray(whitelistData.data)) {
        const match = whitelistData.data.find(
          (s) => s.fingerprint_hash === hash
        );
        if (match && match.status === 'confirmed') return 'safe';
      }
    }
  } catch {
    // TC unavailable — fall through to unknown
  }

  return 'unknown';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
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
