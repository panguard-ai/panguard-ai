'use client';

import { useLocale } from 'next-intl';
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
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <SectionWrapper dark>
      <SectionTitle
        overline={isZh ? '覆蓋度對比' : 'COVERAGE MAP'}
        title={
          isZh ? '別人做單層,我們做整個堆疊' : 'Every competitor covers 1-2 layers. We cover 6.'
        }
        subtitle={
          isZh
            ? '7 層架構下的產業現況。PanGuard 是第一個 full-stack Agent Security Platform(ASP)。'
            : 'Industry reality across the 7-layer stack. PanGuard is the first full-stack Agent Security Platform (ASP).'
        }
      />
      <div className="max-w-5xl mx-auto mt-14 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-text-primary">
                {isZh ? '平台' : 'Platform'}
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
              <tr
                key={comp.name}
                className={`border-b border-border/50 hover:bg-surface-3/30 transition-colors ${
                  comp.highlight ? 'bg-brand-sage/5' : ''
                }`}
              >
                <td
                  className={`py-3 px-4 font-medium ${
                    comp.highlight ? 'text-brand-sage' : 'text-text-secondary'
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
                        <span className="text-lg text-brand-sage">✓</span>
                      ) : (
                        <span className="text-text-muted/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FadeInUp delay={0.3}>
        <p className="text-xs text-text-muted text-center mt-6 max-w-3xl mx-auto">
          {isZh
            ? 'L1 Discover · L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond · L7 Govern。來源:各家官方文件與產品頁,2026-04 盤點。'
            : 'L1 Discover · L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond · L7 Govern. Source: official product docs, audited 2026-04.'}
        </p>
      </FadeInUp>
    </SectionWrapper>
  );
}
