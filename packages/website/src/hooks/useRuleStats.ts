'use client';

import { useState, useEffect } from 'react';
import { STATS } from '@/lib/stats';

interface RuleStats {
  sigmaRules: number;
  yaraRules: number;
  atrRules: number;
  totalRules: number;
  lastSync: string | null;
}

const CACHE_KEY = 'panguard-rule-stats';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface CachedData {
  data: RuleStats;
  timestamp: number;
}

function getFromCache(): RuleStats | null {
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

function setCache(data: RuleStats): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // sessionStorage full or unavailable
  }
}

/** Static fallback values from stats.ts (used during SSR and before fetch completes) */
const FALLBACK: RuleStats = {
  sigmaRules: STATS.sigmaRules,
  yaraRules: STATS.yaraRules,
  atrRules: STATS.atrRules,
  totalRules: STATS.totalRules,
  lastSync: STATS.lastUpdated,
};

/**
 * Fetches live rule counts from /api/threat-intel/stats every 6 hours.
 * Falls back to static STATS values during SSR or on error.
 */
export function useRuleStats(): RuleStats {
  const [stats, setStats] = useState<RuleStats>(FALLBACK);

  useEffect(() => {
    const cached = getFromCache();
    if (cached) {
      setStats(cached);
      return;
    }

    let cancelled = false;

    fetch('/api/threat-intel/stats')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const live: RuleStats = {
          sigmaRules: data.sigma?.total ?? FALLBACK.sigmaRules,
          yaraRules: data.yara?.definitions ?? data.yara?.total ?? FALLBACK.yaraRules,
          atrRules: STATS.atrRules, // ATR is maintained manually
          totalRules: (data.sigma?.total ?? 0) + (data.yara?.total ?? 0),
          lastSync: data.lastSync ?? FALLBACK.lastSync,
        };
        setStats(live);
        setCache(live);
      })
      .catch(() => {
        // Keep fallback values on error
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
