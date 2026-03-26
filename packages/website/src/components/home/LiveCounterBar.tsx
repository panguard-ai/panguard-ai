'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';

function CountUp({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;

    if (from === target || target === 0) {
      setCount(target);
      return;
    }

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const now = Date.now();
      if (now >= endTime) {
        setCount(target);
        return;
      }
      const progress = (now - startTime) / (duration * 1000);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(from + eased * (target - from)));
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    return () => {
      cancelled = true;
    };
  }, [target, duration]);

  return <>{count.toLocaleString()}</>;
}

function useNpmDownloads(): number {
  const [downloads, setDownloads] = useState(3_645);

  useEffect(() => {
    let cancelled = false;
    async function fetchDownloads() {
      try {
        const res = await fetch(
          'https://api.npmjs.org/downloads/point/2026-01-01:2099-12-31/@panguard-ai/panguard'
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.downloads) {
          setDownloads(data.downloads);
        }
      } catch {
        // Keep fallback
      }
    }
    void fetchDownloads();
    return () => { cancelled = true; };
  }, []);

  return downloads;
}

export default function LiveCounterBar() {
  const t = useTranslations('home.liveCounter');
  const eco = useEcosystemStats();
  const downloads = useNpmDownloads();

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-text-muted font-mono">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-sage animate-pulse" />
        <span>
          <span className="text-text-primary font-bold">
            <CountUp target={eco.skillsScanned} />
          </span>{' '}
          {t('scanned')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        <span>
          <span className="text-red-400 font-bold">
            <CountUp target={eco.threatsDetected} />
          </span>{' '}
          {t('threats')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          <span className="text-text-primary font-bold">
            <CountUp target={eco.atrRules} />
          </span>{' '}
          {t('rulesGenerated')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span>
          <span className="text-text-primary font-bold">
            <CountUp target={downloads} />
          </span>{' '}
          {t('downloads')}
        </span>
      </div>
    </div>
  );
}
