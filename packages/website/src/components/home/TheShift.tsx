'use client';

import { useTranslations } from 'next-intl';
import SectionWrapper from '../ui/SectionWrapper';
import FadeInUp from '../FadeInUp';

export default function TheShift() {
  const t = useTranslations('home.theShift');

  const layers = [
    { key: 'layer1' as const },
    { key: 'layer2' as const },
    { key: 'layer3' as const },
    { key: 'layer4' as const },
    { key: 'layer5' as const },
  ];

  return (
    <SectionWrapper dark>
      {/* Blinking cursor top */}
      <FadeInUp>
        <div className="flex items-center gap-2 text-brand-sage font-mono text-sm mb-8">
          <span className="inline-block w-2 h-4 bg-brand-sage animate-pulse" />
          <span>{t('cursor')}</span>
        </div>
      </FadeInUp>

      {/* Philosophy manifesto */}
      <FadeInUp delay={0.1}>
        <div className="max-w-3xl">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-text-primary leading-tight">
            {t('title')}
          </h2>
          <p className="text-xl text-text-secondary mt-6 leading-relaxed">
            {t('philosophy')}
          </p>
        </div>
      </FadeInUp>

      {/* Architecture block */}
      <FadeInUp delay={0.2}>
        <div className="mt-14 border-l-4 border-brand-sage pl-8 max-w-3xl">
          <h3 className="text-xl font-bold text-text-primary mb-6">{t('architectureTitle')}</h3>
          <div className="space-y-4">
            {layers.map((l, i) => (
              <div key={l.key} className="flex items-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-sage/10 border border-brand-sage/20 flex items-center justify-center text-sm font-bold text-brand-sage">
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-text-primary font-semibold text-sm">
                    {t(`${l.key}.title`)}
                  </h4>
                  <p className="text-text-secondary text-sm mt-1 leading-relaxed">
                    {t(`${l.key}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeInUp>

      {/* AI funnel concept */}
      <FadeInUp delay={0.3}>
        <div className="mt-12 max-w-3xl">
          <h3 className="text-xl font-bold text-text-primary mb-4">{t('funnelTitle')}</h3>
          <div className="grid grid-cols-3 gap-4">
            {(['funnel1', 'funnel2', 'funnel3'] as const).map((key) => (
              <div key={key} className="bg-surface-0 rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-extrabold text-brand-sage">{t(`${key}.percent`)}</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{t(`${key}.title`)}</p>
                <p className="text-xs text-text-tertiary mt-1">{t(`${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInUp>

      {/* Collective defense */}
      <FadeInUp delay={0.35}>
        <div className="mt-12 max-w-3xl">
          <h3 className="text-xl font-bold text-text-primary mb-3">{t('collectiveTitle')}</h3>
          <p className="text-text-secondary leading-relaxed">{t('collectiveDesc')}</p>
        </div>
      </FadeInUp>

      {/* Closing statement */}
      <FadeInUp delay={0.4}>
        <p className="text-2xl lg:text-3xl font-extrabold text-brand-sage text-center mt-16 text-glow-sage">
          {t('closing')}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
