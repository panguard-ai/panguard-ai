'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { ShieldIcon } from '@/components/ui/BrandIcons';

const LAYERS = [
  { id: 1, name: 'Discover', status: '🟡' },
  { id: 2, name: 'Audit', status: '🟢' },
  { id: 3, name: 'Protect', status: '🟢' },
  { id: 4, name: 'Detect', status: '🟢' },
  { id: 5, name: 'Deceive', status: '🟢' },
  { id: 6, name: 'Respond', status: '🟢' },
  { id: 7, name: 'Govern', status: '🟡' },
];

export default function SecurityLayers() {
  const t = useTranslations('home.securityLayers');

  return (
    <SectionWrapper>
      <SectionTitle
        overline={t('overline')}
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <div className="max-w-4xl mx-auto mt-14">
        <div className="space-y-3">
          {LAYERS.map((layer, i) => (
            <FadeInUp key={layer.id} delay={i * 0.05}>
              <div className="bg-surface-2 rounded-lg border border-border p-4 flex items-center justify-between hover:border-brand-sage/50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-3xl font-extrabold text-text-muted w-12 text-center">
                    {layer.id}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{layer.name}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {t(`layers.${layer.id.toString()}.desc`)}
                    </p>
                  </div>
                </div>
                <div className="text-xl shrink-0">{layer.status}</div>
              </div>
            </FadeInUp>
          ))}
        </div>
        <FadeInUp delay={0.4}>
          <div className="mt-8 p-4 bg-brand-sage/5 rounded-lg border border-brand-sage/20">
            <p className="text-xs text-text-muted text-center">
              {t('note')}
            </p>
          </div>
        </FadeInUp>
      </div>
    </SectionWrapper>
  );
}
