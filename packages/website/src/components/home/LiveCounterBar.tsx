'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';

function CountUp({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    function tick() {
      const now = Date.now();
      if (now >= endTime) {
        setCount(target);
        return;
      }
      const progress = (now - startTime) / (duration * 1000);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return <>{count.toLocaleString()}</>;
}

export default function LiveCounterBar() {
  const t = useTranslations('home.liveCounter');
  const eco = useEcosystemStats();

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
    </div>
  );
}
