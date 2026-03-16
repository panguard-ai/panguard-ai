'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/navigation';
import { ArrowRight, Search, Shield, Cloud, Layers, Zap, Users, Lock, RefreshCw, Globe } from 'lucide-react';
import { STATS } from '@/lib/stats';

const ease = [0.22, 1, 0.36, 1] as const;

function ProductCard({
  icon: Icon,
  overline,
  title,
  description,
  features,
  stats,
  ctaText,
  ctaHref,
  delay,
}: {
  icon: React.ElementType;
  overline: string;
  title: string;
  description: string;
  features: Array<{ icon: React.ElementType; text: string }>;
  stats: Array<{ value: string; label: string }>;
  ctaText: string;
  ctaHref: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease }}
      className="bg-surface-1 border border-border rounded-2xl overflow-hidden hover:border-panguard-green/30 transition-colors"
    >
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-panguard-green/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-panguard-green" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-panguard-green font-bold">
              {overline}
            </p>
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          {description}
        </p>

        {/* Features */}
        <div className="space-y-2.5 mb-6">
          {features.map((f) => (
            <div key={f.text} className="flex items-start gap-2.5">
              <f.icon className="w-4 h-4 text-panguard-green shrink-0 mt-0.5" />
              <span className="text-xs text-text-secondary leading-relaxed">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-4 pt-4 border-t border-border">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-extrabold text-text-primary">{s.value}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="flex items-center justify-between px-6 sm:px-8 py-3.5 bg-surface-2/30 border-t border-border text-sm font-semibold text-panguard-green hover:bg-surface-2/60 transition-colors group"
      >
        {ctaText}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}

export default function ProductShowcase() {
  const t = useTranslations('home.productShowcase');

  return (
    <section className="relative px-5 sm:px-6 py-16 sm:py-24 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease }}
          className="text-center mb-12"
        >
          <p className="text-[11px] uppercase tracking-[0.15em] text-panguard-green font-semibold mb-3">
            {t('overline')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {t('title')}
          </h2>
          <p className="text-base text-text-secondary mt-3 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          <ProductCard
            icon={Search}
            overline={t('auditor.overline')}
            title={t('auditor.title')}
            description={t('auditor.desc')}
            features={[
              { icon: Layers, text: t('auditor.f1') },
              { icon: Lock, text: t('auditor.f2') },
              { icon: Zap, text: t('auditor.f3') },
            ]}
            stats={[
              { value: String(STATS.atrRules), label: t('auditor.s1') },
              { value: String(STATS.skillAuditChecks), label: t('auditor.s2') },
              { value: '<3s', label: t('auditor.s3') },
            ]}
            ctaText={t('auditor.cta')}
            ctaHref="/product/skill-auditor"
            delay={0}
          />

          <ProductCard
            icon={Shield}
            overline={t('guard.overline')}
            title={t('guard.title')}
            description={t('guard.desc')}
            features={[
              { icon: RefreshCw, text: t('guard.f1') },
              { icon: Layers, text: t('guard.f2') },
              { icon: Zap, text: t('guard.f3') },
            ]}
            stats={[
              { value: STATS.totalRulesDisplay, label: t('guard.s1') },
              { value: String(STATS.detectionLayers), label: t('guard.s2') },
              { value: String(STATS.responseActions), label: t('guard.s3') },
            ]}
            ctaText={t('guard.cta')}
            ctaHref="/product/guard"
            delay={0.1}
          />

          <ProductCard
            icon={Cloud}
            overline={t('cloud.overline')}
            title={t('cloud.title')}
            description={t('cloud.desc')}
            features={[
              { icon: Users, text: t('cloud.f1') },
              { icon: Globe, text: t('cloud.f2') },
              { icon: RefreshCw, text: t('cloud.f3') },
            ]}
            stats={[
              { value: String(STATS.ecosystem.atrRulesGenerated), label: t('cloud.s1') },
              { value: '1h', label: t('cloud.s2') },
              { value: 'MIT', label: t('cloud.s3') },
            ]}
            ctaText={t('cloud.cta')}
            ctaHref="/threat-cloud"
            delay={0.2}
          />
        </div>
      </div>
    </section>
  );
}
