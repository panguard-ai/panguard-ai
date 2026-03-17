'use client';

import { useState, useEffect } from 'react';
import { STATS } from '@/lib/stats';

export interface EcosystemStats {
  skillsScanned: number;
  threatsDetected: number;
  agentsProtected: number;
  atrRules: number;
  whitelistedSkills: number;
  blacklistedSkills: number;
  sources: {
    bulk: { skills: number; findings: number };
    cli: { skills: number; findings: number; devices: number };
    web: { skills: number; findings: number };
  };
  lastUpdated: string;
}

const CACHE_KEY = 'panguard-ecosystem-stats';
const CACHE_TTL = 60_000; // 60 seconds (ecosystem data changes frequently)

const TC_URL = process.env.NEXT_PUBLIC_THREAT_CLOUD_URL ?? 'https://tc.panguard.ai';

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

/** Static fallback from stats.ts (SSR and before fetch) */
const FALLBACK: EcosystemStats = {
  skillsScanned: STATS.ecosystem.skillsScanned,
  threatsDetected: STATS.ecosystem.maliciousFound,
  agentsProtected: 0,
  atrRules: STATS.atrRules,
  whitelistedSkills: 0,
  blacklistedSkills: 0,
  sources: {
    bulk: { skills: STATS.ecosystem.skillsScanned, findings: STATS.ecosystem.maliciousFound },
    cli: { skills: 0, findings: 0, devices: 0 },
    web: { skills: 0, findings: 0 },
  },
  lastUpdated: STATS.lastUpdated,
};

/**
 * Fetches live ecosystem metrics from Threat Cloud /api/metrics + /api/stats.
 * Updates every 60 seconds. Falls back to static STATS on error.
 */
export function useEcosystemStats(): EcosystemStats {
  const [stats, setStats] = useState<EcosystemStats>(FALLBACK);

  useEffect(() => {
    const cached = getFromCache();
    if (cached) {
      setStats(cached);
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      try {
        // Fetch both endpoints in parallel
        const [metricsRes, statsRes] = await Promise.all([
          fetch(`${TC_URL}/api/metrics`).catch(() => null),
          fetch(`${TC_URL}/api/stats`).catch(() => null),
        ]);

        if (cancelled) return;

        let live = { ...FALLBACK };

        // /api/metrics -- scan event aggregation
        if (metricsRes?.ok) {
          const metricsJson = await metricsRes.json() as {
            ok: boolean;
            data?: {
              totalSkillsScanned: number;
              totalAgentsProtected: number;
              totalThreatsDetected: number;
              totalAtrRules: number;
              sources: EcosystemStats['sources'];
              lastUpdated: string;
            };
          };
          if (metricsJson.ok && metricsJson.data) {
            const m = metricsJson.data;
            live.skillsScanned = Math.max(m.totalSkillsScanned, FALLBACK.skillsScanned);
            live.agentsProtected = m.totalAgentsProtected;
            live.threatsDetected = Math.max(m.totalThreatsDetected, FALLBACK.threatsDetected);
            live.atrRules = Math.max(m.totalAtrRules, FALLBACK.atrRules);
            live.sources = m.sources;
            live.lastUpdated = m.lastUpdated;
          }
        }

        // /api/stats -- skill blacklist/whitelist + proposal counts
        if (statsRes?.ok) {
          const statsJson = await statsRes.json() as {
            ok: boolean;
            data?: {
              skillBlacklistTotal?: number;
              skillThreatsTotal?: number;
              proposalStats?: { pending: number; confirmed: number; total: number };
            };
          };
          if (statsJson.ok && statsJson.data) {
            live.blacklistedSkills = statsJson.data.skillBlacklistTotal ?? 0;
            // Use skillThreatsTotal as rough whitelist proxy if no direct count
            const proposalConfirmed = statsJson.data.proposalStats?.confirmed ?? 0;
            live.atrRules = Math.max(live.atrRules, FALLBACK.atrRules + proposalConfirmed);
          }
        }

        setStats(live);
        setCache(live);
      } catch {
        // Keep fallback
      }
    }

    void fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
