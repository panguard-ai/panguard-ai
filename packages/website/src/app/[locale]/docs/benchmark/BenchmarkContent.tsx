'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';

/* ────────────────────────  Constants  ──────────────────────────── */

const METHOD_KEYS = ['framework', 'testFiles', 'testCases', 'coverage', 'ci'] as const;
const PERF_COUNT = 6;
const FP_COUNT = 5;
const RESOURCE_COUNT = 4;
const BOUNDARY_COUNT = 8;

/* ────────────────────────  Helpers  ─────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-text-primary mb-6">{children}</h2>;
}

/* ════════════════════════  Component  ═════════════════════════ */

export default function BenchmarkContent() {
  const t = useTranslations('docs.benchmark');

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <SectionWrapper spacing="spacious">
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <Link
              href="/docs"
              className="text-sm text-text-muted hover:text-brand-sage transition-colors"
            >
              {t('backToDocs')}
            </Link>
            <h1 className="text-[clamp(32px,4vw,48px)] font-bold text-text-primary mt-4 leading-[1.1]">
              {t('title')}
            </h1>
            <p className="text-text-secondary mt-4 text-lg leading-relaxed">{t('subtitle')}</p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ───────────── A. Test Methodology ───────────── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <SectionHeading>{t('testMethodology')}</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {METHOD_KEYS.map((key) => (
                <div key={key} className="bg-surface-0 border border-border rounded-xl px-5 py-4">
                  <p className="text-xs uppercase tracking-wider text-text-muted mb-1">
                    {t(`methodLabel.${key}`)}
                  </p>
                  <p className="text-text-primary font-semibold text-lg">
                    {t(`methodValue.${key}`)}
                  </p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ───────────── B. Detection Performance ───────────── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <SectionHeading>{t('detectionPerformance')}</SectionHeading>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-text-muted font-medium">{t('metric')}</th>
                    <th className="pb-3 text-text-muted font-medium text-right">{t('latency')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: PERF_COUNT }, (_, i) => (
                    <tr key={i} className={i < PERF_COUNT - 1 ? 'border-b border-border/50' : ''}>
                      <td className="py-3 text-text-secondary">{t(`perf.${i}.name`)}</td>
                      <td className="py-3 text-text-primary font-mono text-right">
                        {t(`perf.${i}.latency`)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ───────────── C. False Positive Control ───────────── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <SectionHeading>{t('fpControl')}</SectionHeading>
            <ul className="space-y-3">
              {Array.from({ length: FP_COUNT }, (_, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-sage shrink-0" />
                  <span className="text-text-secondary text-sm leading-relaxed">
                    {t(`fp.${i}`)}
                  </span>
                </li>
              ))}
            </ul>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ───────────── D. Resource Consumption ───────────── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <SectionHeading>{t('resourceConsumption')}</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: RESOURCE_COUNT }, (_, i) => (
                <div key={i} className="bg-surface-1 border border-border rounded-xl px-5 py-4">
                  <p className="text-xs uppercase tracking-wider text-text-muted mb-1">
                    {t(`resource.${i}.name`)}
                  </p>
                  <p className="text-text-primary font-semibold">{t(`resource.${i}.value`)}</p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ───────────── E. What We Don't Do ───────────── */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto">
          <FadeInUp>
            <SectionHeading>{t('whatWeDontDo.title')}</SectionHeading>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              {t('whatWeDontDo.subtitle')}
            </p>

            <div className="space-y-4">
              {Array.from({ length: BOUNDARY_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="bg-surface-0 border border-amber-800/40 rounded-xl px-5 py-4"
                >
                  <p className="text-text-primary font-semibold text-sm">
                    {t(`boundaries.${i}.title`)}
                  </p>
                  <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                    {t(`boundaries.${i}.desc`)}
                  </p>
                </div>
              ))}
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* ───────────── CTA ───────────── */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-2xl font-bold text-text-primary mb-3">{t('cta.title')}</h2>
            <p className="text-text-secondary mb-8">{t('cta.subtitle')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/docs/getting-started"
                className="bg-brand-sage text-surface-0 rounded-full px-8 py-3.5 text-sm font-medium hover:bg-brand-sage-light transition-colors"
              >
                {t('cta.getStarted')}
              </Link>
              <Link
                href="/docs"
                className="border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-8 py-3.5 transition-all duration-200"
              >
                {t('cta.docs')}
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
