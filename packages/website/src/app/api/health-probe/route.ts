import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * /api/health-probe — server-side liveness probe of public Panguard services.
 *
 * Hits each upstream once per request, returns ok/degraded/outage per target.
 * Replaces the hardcoded /status array. Probe results are cached for 30s
 * (per Next.js fetch revalidate) so the page can poll without flooding
 * upstream services.
 *
 * Honest framing: this is a LIVENESS probe, not a contractual uptime
 * measurement. A real SLA-grade monitor (with historical retention,
 * regional vantage points, response-time tracking, status flapping
 * detection, incident postmortems) requires Better Uptime / Statuspage.io
 * or similar — tracked as GA blocker B3 follow-up.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PROBE_TIMEOUT_MS = 8000;

type ProbeStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

interface ProbeTarget {
  readonly key: string;
  readonly label: { readonly en: string; readonly 'zh-TW': string };
  readonly url: string;
  /** HTTP method to use. Defaults to GET. HEAD probes some endpoints faster
   *  and avoids transferring response bodies we never read. */
  readonly method?: 'GET' | 'HEAD';
  /** Expected HTTP status codes (inclusive). Anything else = degraded. */
  readonly expectStatus?: ReadonlyArray<number>;
}

const TARGETS: ReadonlyArray<ProbeTarget> = [
  {
    key: 'website',
    label: { en: 'panguard.ai website', 'zh-TW': 'panguard.ai 官網' },
    url: 'https://panguard.ai/',
    method: 'HEAD',
  },
  {
    key: 'threat-cloud',
    label: { en: 'Threat Cloud (tc.panguard.ai)', 'zh-TW': 'Threat Cloud (tc.panguard.ai)' },
    url: 'https://tc.panguard.ai/health',
    method: 'GET',
  },
  {
    key: 'app',
    label: { en: 'Customer app (app.panguard.ai)', 'zh-TW': '客戶端 app (app.panguard.ai)' },
    url: 'https://app.panguard.ai/',
    method: 'HEAD',
  },
  {
    key: 'npm-registry',
    label: { en: '@panguard-ai/panguard on npm', 'zh-TW': 'npm 上的 @panguard-ai/panguard' },
    url: 'https://registry.npmjs.org/@panguard-ai/panguard/latest',
    method: 'GET',
  },
  {
    key: 'atr-repo',
    label: { en: 'ATR (agent-threat-rules)', 'zh-TW': 'ATR (agent-threat-rules)' },
    url: 'https://raw.githubusercontent.com/Agent-Threat-Rule/agent-threat-rules/main/package.json',
    method: 'GET',
  },
];

interface ProbeResult {
  readonly key: string;
  readonly label: { readonly en: string; readonly 'zh-TW': string };
  readonly status: ProbeStatus;
  readonly httpStatus: number | null;
  readonly latencyMs: number | null;
  readonly checkedAt: string;
  readonly error?: string;
}

async function probeOne(target: ProbeTarget): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(target.url, {
      method: target.method ?? 'GET',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'panguard-status-probe/1.0' },
    });
    const latency = Date.now() - started;
    const expectOK = target.expectStatus ?? [200, 204, 301, 302, 304];
    const ok = expectOK.includes(res.status);
    return {
      key: target.key,
      label: target.label,
      status: ok ? 'operational' : 'degraded',
      httpStatus: res.status,
      latencyMs: latency,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      key: target.key,
      label: target.label,
      status: 'outage',
      httpStatus: null,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      error: msg.slice(0, 160),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const ip = getClientIP(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const results = await Promise.all(TARGETS.map(probeOne));
  const aggregate: ProbeStatus = results.every((r) => r.status === 'operational')
    ? 'operational'
    : results.some((r) => r.status === 'outage')
      ? 'outage'
      : 'degraded';

  return NextResponse.json(
    {
      aggregate,
      probedAt: new Date().toISOString(),
      results,
    },
    {
      headers: {
        // Allow CDN edge to cache the probe for 30s. Real-time UIs poll
        // every 30s; this keeps upstream probe traffic bounded.
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
