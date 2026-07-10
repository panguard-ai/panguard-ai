'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Eyebrow, SectionTitleV2, SectionV2 } from './v2/primitives';

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
    <SectionV2>
      <FadeInUp>
        <Eyebrow>{isZh ? '覆蓋度對比' : 'COVERAGE MAP'}</Eyebrow>
        <SectionTitleV2>
          {isZh ? (
            <>
              別人做單層，<span className="text-brand-sage">我們做整個堆疊</span>
            </>
          ) : (
            <>
              Every competitor covers 1-2 layers.{' '}
              <span className="text-brand-sage">We cover 6.</span>
            </>
          )}
        </SectionTitleV2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
          {isZh
            ? '7 層架構下的產業現況。PanGuard 是第一個 full-stack Agent Security Platform(ASP)。'
            : 'Industry reality across the 7-layer stack. PanGuard is the first full-stack Agent Security Platform (ASP).'}
        </p>
      </FadeInUp>

      <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-surface-1">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-left font-mono text-[10px] font-medium uppercase tracking-micro text-text-muted">
                  {isZh ? '平台' : 'Platform'}
                </th>
                {Array.from({ length: 7 }, (_, i) => (
                  <th
                    key={i + 1}
                    className="px-2 py-4 text-center font-mono text-[10px] font-medium uppercase tracking-micro text-text-muted"
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
                  className={
                    comp.highlight
                      ? 'border-t-2 border-t-brand-sage/40 bg-brand-sage/5'
                      : 'border-b border-border-subtle transition-colors hover:bg-surface-3/30'
                  }
                >
                  <td
                    className={`px-5 py-3.5 font-medium ${
                      comp.highlight ? 'text-brand-sage' : 'text-text-secondary'
                    }`}
                  >
                    {comp.name}
                  </td>
                  {Array.from({ length: 7 }, (_, i) => {
                    const layerNum = i + 1;
                    const covered = comp.layers.includes(layerNum);
                    return (
                      <td key={layerNum} className="px-2 py-3.5 text-center">
                        {covered ? (
                          <span className="font-mono text-sm text-brand-sage">✓</span>
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
      </div>

      <FadeInUp delay={0.3}>
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-text-muted">
          {isZh
            ? 'L1 Discover · L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond · L7 Govern。來源：各家官方文件與產品頁，2026-04 盤點。'
            : 'L1 Discover · L2 Audit · L3 Protect · L4 Detect · L5 Deceive · L6 Respond · L7 Govern. Source: official product docs, audited 2026-04.'}
        </p>
      </FadeInUp>
    </SectionV2>
  );
}
