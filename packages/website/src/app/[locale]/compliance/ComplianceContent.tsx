'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { ShieldIcon, ScanIcon } from '@/components/ui/BrandIcons';
import { STATS } from '@/lib/stats';

/* ─── OWASP data from stats.ts (single source of truth) ─── */
const owaspCategories = STATS.owaspAgentic.categories;
const TOTAL_MAPPINGS = STATS.owaspAgentic.totalMappings;

/* ═══════════════════════════════════════════════════════════════════
   Compliance Content — OWASP Agentic Top 10 Coverage
   ═══════════════════════════════════════════════════════════════════ */
export default function ComplianceContent() {
  const t = useTranslations('compliance');

  return (
    <>
      {/* -- Hero -- */}
      <section className="relative min-h-[50vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-28 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1200px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {t('overline')}
            </p>
            <h1 className="text-[clamp(24px,4.5vw,56px)] font-extrabold leading-[1.08] tracking-tight text-text-primary max-w-3xl mx-auto">
              {t('title')} <span className="text-brand-sage">{t('titleHighlight')}</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-text-secondary max-w-xl mx-auto mt-6 leading-relaxed">
              {t('subtitle')}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <div className="inline-flex items-center gap-2 bg-brand-sage/10 border border-brand-sage/20 rounded-full px-6 py-2.5">
                <ShieldIcon size={18} className="text-brand-sage" />
                <span className="text-sm font-bold text-brand-sage">10 / 10</span>
                <span className="text-sm text-text-secondary">{t('hero.badge')}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-surface-2 border border-border rounded-full px-6 py-2.5">
                <span className="text-sm font-bold text-text-primary">{STATS.atrRules}</span>
                <span className="text-sm text-text-secondary">{t('hero.rulesBadge')}</span>
              </div>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.3}>
            <div className="mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                {t('hero.cta')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* -- What is OWASP Agentic Top 10 -- */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              {t('what.overline')}
            </p>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
              {t('what.title')}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">{t('what.desc')}</p>
            <p className="text-text-secondary mt-4 leading-relaxed">{t('what.desc2')}</p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* -- 10/10 Coverage Grid -- */}
      <SectionWrapper dark>
        <SectionTitle
          overline={t('coverage.overline')}
          title={t('coverage.title')}
          subtitle={t('coverage.subtitle')}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-14">
          {owaspCategories.map((cat, i) => (
            <FadeInUp key={cat.id} delay={i * 0.04}>
              <div className="bg-surface-2 rounded-xl border border-border p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold text-brand-sage">{cat.id}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      cat.strength === 'STRONG'
                        ? 'bg-brand-sage/10 text-brand-sage'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {cat.strength}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary leading-snug flex-1">
                  {t(`coverage.${cat.id}.name`)}
                </p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-2xl font-extrabold text-text-primary">{cat.rules}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">
                    {t('coverage.rulesLabel')}
                  </p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
        <FadeInUp delay={0.5}>
          <p className="text-center text-sm text-text-muted mt-8">
            {t('coverage.note', { total: TOTAL_MAPPINGS })}
          </p>
        </FadeInUp>
      </SectionWrapper>

      {/* -- Ecosystem Evidence -- */}
      <SectionWrapper>
        <SectionTitle
          overline={t('evidence.overline')}
          title={t('evidence.title')}
          subtitle={t('evidence.subtitle')}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {(['scanned', 'findings', 'critical', 'tripleThreat'] as const).map((key, i) => {
            const values: Record<string, number> = {
              scanned: STATS.ecosystem.skillsScanned,
              findings: STATS.ecosystem.packagesWithFindings,
              critical: STATS.ecosystem.findingsCritical,
              tripleThreat: STATS.ecosystem.tripleThreat,
            };
            return (
              <FadeInUp key={key} delay={i * 0.08}>
                <div className="bg-surface-1 rounded-xl border border-border p-6 text-center">
                  <p className="text-3xl font-extrabold text-text-primary">
                    {values[key]?.toLocaleString()}
                  </p>
                  <p className="text-sm text-text-secondary mt-2">{t(`evidence.${key}`)}</p>
                </div>
              </FadeInUp>
            );
          })}
        </div>
        <FadeInUp delay={0.4}>
          <div className="mt-10 bg-surface-2 rounded-xl border border-border p-6 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <ScanIcon size={20} className="text-brand-sage shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {t('evidence.breakdownTitle')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                  {(
                    [
                      ['critical', STATS.ecosystem.findingsCritical],
                      ['high', STATS.ecosystem.findingsHigh],
                      ['medium', STATS.ecosystem.findingsMedium],
                      ['low', STATS.ecosystem.findingsLow],
                    ] as const
                  ).map(([severity, count]) => (
                    <div key={severity}>
                      <p className="text-lg font-bold text-text-primary">{count}</p>
                      <p className="text-[11px] text-text-muted uppercase tracking-wider">
                        {t(`evidence.severity.${severity}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeInUp>
      </SectionWrapper>

      {/* -- Why OWASP Agentic, not traditional -- */}
      <SectionWrapper dark>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                {t('why.overline')}
              </p>
              <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary leading-[1.1]">
                {t('why.title')}
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <p className="text-text-secondary mt-5 leading-relaxed">{t('why.desc')}</p>
            </FadeInUp>
          </div>
          <FadeInUp delay={0.15}>
            <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">
                  {t('why.comparisonTitle')}
                </span>
              </div>
              <div className="divide-y divide-border">
                {(['sigmaYara', 'owaspLlm', 'owaspAgentic'] as const).map((key) => (
                  <div
                    key={key}
                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-surface-3/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {t(`why.${key}.name`)}
                      </p>
                      <p className="text-[11px] text-text-muted">{t(`why.${key}.focus`)}</p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        key === 'owaspAgentic'
                          ? 'bg-brand-sage/10 text-brand-sage'
                          : 'bg-surface-3 text-text-muted'
                      }`}
                    >
                      {t(`why.${key}.atrCoverage`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* -- CTA -- */}
      <SectionWrapper>
        <div className="text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,40px)] font-bold text-text-primary">
              {t('cta.title')}
            </h2>
            <p className="text-text-secondary mt-3 max-w-lg mx-auto">{t('cta.desc')}</p>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="mt-8 bg-surface-2 rounded-xl border border-border p-4 max-w-md mx-auto">
              <code className="text-sm text-brand-sage font-mono">
                npm install -g @panguard-ai/panguard
              </code>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/atr"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
              >
                {t('cta.cta1')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://panguard.ai"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                {t('cta.cta2')}
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
