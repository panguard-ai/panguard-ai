'use client';

import { useTranslations } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';

const COMPETITORS = [
  { name: 'Sage (GenDigital)', layers: [3] },
  { name: 'Rubrik SAGE', layers: [3, 4] },
  { name: 'Cisco AI Defense', layers: [2, 4] },
  { name: 'Microsoft AGT', layers: [2, 5] },
  { name: 'Straiker', layers: [4, 6] },
  { name: 'Apono', layers: [6, 7] },
  { name: 'PanGuard', layers: [1, 2, 3, 4, 5, 6], highlight: true },
];

export default function CoverageComparison() {
  const t = useTranslations('home.coverage');

  return (
    <SectionWrapper dark>
      <SectionTitle
        overline={t('overline')}
        title={t('title')}
        subtitle={t('subtitle')}
      />
      <div className="max-w-5xl mx-auto mt-14 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-text-primary">
                {t('platform')}
              </th>
              {Array.from({ length: 7 }, (_, i) => (
                <th
                  key={i + 1}
                  className="text-center py-3 px-2 font-semibold text-text-secondary text-xs uppercase"
                >
                  L{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETITORS.map((comp) => (
              <FadeInUp
                key={comp.name}
                delay={0}
              >
                <tr
                  className={`border-b border-border/50 hover:bg-surface-3/30 transition-colors ${
                    comp.highlight ? 'bg-brand-sage/5' : ''
                  }`}
                >
                  <td
                    className={`py-3 px-4 font-medium ${
                      comp.highlight
                        ? 'text-brand-sage'
                        : 'text-text-secondary'
                    }`}
                  >
                    {comp.name}
                  </td>
                  {Array.from({ length: 7 }, (_, i) => {
                    const layerNum = i + 1;
                    const covered = comp.layers.includes(layerNum);
                    return (
                      <td key={layerNum} className="text-center py-3 px-2">
                        {covered ? (
                          <span className="text-lg">✓</span>
                        ) : (
                          <span className="text-text-muted/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </FadeInUp>
            ))}
          </tbody>
        </table>
      </div>
      <FadeInUp delay={0.3}>
        <p className="text-xs text-text-muted text-center mt-6">
          {t('note')}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
