'use client';

import { useState, useEffect } from 'react';

/**
 * Live Threat Cloud registry counts. Every count is null until Threat Cloud
 * answers, and stays null if it does not: the site never substitutes a stored
 * snapshot for a live number, so an unreachable Threat Cloud reads as
 * unavailable instead of as old figures presented as current.
 */
export interface EcosystemStats {
  /** loading until the first answer (or cached result); unavailable when Threat Cloud fails. */
  status: 'loading' | 'live' | 'unavailable';
  skillsScanned: number | null;
  threatsDetected: number | null;
  whitelistedSkills: number | null;
  blacklistedSkills: number | null;
}

type Payload = Record<string, unknown>;

const CACHE_KEY = 'panguard-ecosystem-stats-v2';
const CACHE_TTL = 60_000; // 60 seconds (ecosystem data changes frequently)

const TC_URL = process.env.NEXT_PUBLIC_THREAT_CLOUD_URL ?? 'https://tc.panguard.ai';

const NO_COUNTS: Omit<EcosystemStats, 'status'> = {
  skillsScanned: null,
  threatsDetected: null,
  whitelistedSkills: null,
  blacklistedSkills: null,
};

interface CachedData {
  data: EcosystemStats;
  timestamp: number;
}

function getFromCache(): EcosystemStats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedData;
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCache(data: EcosystemStats): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // sessionStorage full or unavailable
  }
}

/** A non-negative finite number, or null for anything else. */
function toCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** The `data` object of a Threat Cloud `{ ok, data }` envelope, or null. */
async function readData(res: Response | null): Promise<Payload | null> {
  if (!res?.ok) return null;
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: unknown } | null;
  return json?.ok && json.data !== null && typeof json.data === 'object'
    ? (json.data as Payload)
    : null;
}

/** Display helper: a count with thousands separators, or an em dash when unknown. */
export function formatCount(value: number | null): string {
  return value === null ? '—' : value.toLocaleString();
}

/**
 * Fetches live registry counts from Threat Cloud /api/metrics + /api/stats.
 * Re-fetches at most every 60 seconds per session.
 */
export function useEcosystemStats(): EcosystemStats {
  const [stats, setStats] = useState<EcosystemStats>({ status: 'loading', ...NO_COUNTS });

  useEffect(() => {
    const cached = getFromCache();
    if (cached) {
      setStats(cached);
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      const [metricsRes, statsRes] = await Promise.all([
        fetch(`${TC_URL}/api/metrics`).catch(() => null),
        fetch(`${TC_URL}/api/stats`).catch(() => null),
      ]);
      const [metrics, registry] = await Promise.all([readData(metricsRes), readData(statsRes)]);
      if (cancelled) return;
      if (!metrics && !registry) {
        setStats({ status: 'unavailable', ...NO_COUNTS });
        return;
      }

      const next: EcosystemStats = {
        status: 'live',
        skillsScanned: toCount(metrics?.['totalSkillsScanned']),
        threatsDetected: toCount(metrics?.['totalThreatsDetected']),
        whitelistedSkills: toCount(metrics?.['whitelistedSkills']),
        blacklistedSkills: toCount(
          registry?.['skillBlacklistTotal'] ?? metrics?.['blacklistedSkills']
        ),
      };
      setStats(next);
      setCache(next);
    }

    fetchStats().catch(() => {
      if (!cancelled) setStats({ status: 'unavailable', ...NO_COUNTS });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
