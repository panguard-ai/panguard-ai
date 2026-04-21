'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import SectionTitle from '@/components/ui/SectionTitle';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { LAYERS, type LayerStatus } from '@/lib/layers';

function StatusBadge({ status, isZh }: { status: LayerStatus; isZh: boolean }) {
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
        {isZh ? '已出貨' : 'Shipped'}
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {isZh ? '部分' : 'Partial'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-muted bg-surface-3 border border-border rounded-full px-2.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      {isZh ? '缺口' : 'Gap'}
    </span>
  );
}

export default function SecurityLayers() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const pick = (b: { en: string; zh: string }) => (isZh ? b.zh : b.en);

  return (
    <SectionWrapper>
      <SectionTitle
        overline={isZh ? '7 層代理安全架構' : '7-LAYER AGENT SECURITY'}
        title={isZh ? 'AI agent 防禦不是單點產品' : 'Agent defense is not a single product'}
        subtitle={
          isZh
            ? '5 層今天已上線(L2 稽核 / L3 防護 / L4 偵測 / L5 誘捕 / L6 反應)。L1 探索 2026 Q2 補,L7 治理 Q2/Q3 補完。我們標 gap,不假打勾。'
            : '5 layers ship today (L2 Audit / L3 Protect / L4 Detect / L5 Deceive / L6 Respond). L1 Discover lands Q2 2026, L7 Govern Q2/Q3 2026. We mark the gaps openly — no fake checkmarks.'
        }
      />
      <div className="max-w-4xl mx-auto mt-14">
        <div className="space-y-3">
          {LAYERS.map((layer, i) => (
            <FadeInUp key={layer.id} delay={i * 0.04}>
              <Link
                href={`/layers/${layer.slug}`}
                className={`group block bg-surface-2 rounded-lg border p-5 transition-colors ${
                  layer.status === 'shipped'
                    ? 'border-border hover:border-brand-sage/50'
                    : layer.status === 'partial'
                      ? 'border-amber-400/20 hover:border-amber-400/40'
                      : 'border-border/50 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl font-extrabold text-text-muted w-10 text-center tabular-nums shrink-0">
                    {layer.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-text-primary group-hover:text-brand-sage transition-colors">
                        {pick(layer.name)}
                      </h3>
                      <div className="flex items-center gap-2.5">
                        <StatusBadge status={layer.status} isZh={isZh} />
                        <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-sage transition-colors" />
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                      {pick(layer.tagline)}
                    </p>
                    <p className="text-xs text-text-muted mt-2.5 leading-relaxed line-clamp-2">
                      {pick(layer.why)}
                    </p>
                    <p className="text-[11px] font-mono text-brand-sage/80 mt-2.5 break-words">
                      {pick(layer.proofShort)}
                    </p>
                  </div>
                </div>
              </Link>
            </FadeInUp>
          ))}
        </div>
        <FadeInUp delay={0.5}>
          <div className="mt-8 p-4 bg-brand-sage/5 rounded-lg border border-brand-sage/20 text-center">
            <p className="text-xs text-text-secondary">
              {isZh ? (
                <>
                  每層可點擊看詳細:攻擊案例、技術作法、benchmark、生態系整合 ·{' '}
                  <Link href="/layers" className="text-brand-sage font-semibold hover:underline">
                    看完整 7 層架構
                  </Link>
                </>
              ) : (
                <>
                  Click any layer for attack examples, architecture, benchmarks, ecosystem links ·{' '}
                  <Link href="/layers" className="text-brand-sage font-semibold hover:underline">
                    See full 7-layer architecture
                  </Link>
                </>
              )}
            </p>
          </div>
        </FadeInUp>
      </div>
    </SectionWrapper>
  );
}
