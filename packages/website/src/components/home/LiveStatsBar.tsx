'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import FadeInUp from '@/components/FadeInUp';
import { useEcosystemStats } from '@/hooks/useEcosystemStats';
import { STATS } from '@/lib/stats';
import { useEffect, useRef, useState } from 'react';

function CountUp({ target, duration = 1.5 }: { readonly target: number; readonly duration?: number }) {
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

interface StatItem {
  readonly value: number;
  readonly labelKey: string;
  readonly color: string;
  readonly suffix?: string;
}

export default function LiveStatsBar() {
  const t = useTranslations('home.liveStatsBar');
  const eco = useEcosystemStats();

  const items: readonly StatItem[] = [
    {
      value: eco.skillsScanned,
      labelKey: 'scanned',
      color: 'text-text-primary',
      suffix: '+',
    },
    {
      value: STATS.ecosystem.findingsCritical,
      labelKey: 'critical',
      color: 'text-red-400',
    },
    {
      value: eco.atrRules,
      labelKey: 'rules',
      color: 'text-panguard-green',
    },
    {
      value: eco.threatsDetected,
      labelKey: 'crystallized',
      color: 'text-text-primary',
    },
  ];

  return (
    <section className="relative px-5 sm:px-6 py-10 sm:py-14 border-t border-border/30 bg-surface-1/30">
      <div className="max-w-4xl mx-auto">
        <FadeInUp>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {items.map((item) => (
              <motion.div
                key={item.labelKey}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <p className={`text-3xl sm:text-4xl font-extrabold ${item.color} tabular-nums`}>
                  <CountUp target={item.value} />
                  {item.suffix ?? ''}
                </p>
                <p className="text-xs sm:text-sm text-text-muted mt-1 uppercase tracking-wider font-medium">
                  {t(item.labelKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </FadeInUp>

        {/* OWASP badge */}
        <FadeInUp delay={0.2}>
          <p className="text-center text-sm text-text-secondary mt-6 font-medium">
            {t('owaspBadge')}
          </p>
        </FadeInUp>
      </div>
    </section>
  );
}
