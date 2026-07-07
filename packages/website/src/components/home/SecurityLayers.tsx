'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import { LAYERS, type LayerStatus } from '@/lib/layers';
import { Eyebrow, SectionTitleV2, SectionV2 } from './v2/primitives';

function StatusBadge({ status, isZh }: { status: LayerStatus; isZh: boolean }) {
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-sage/30 bg-brand-sage/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-micro text-brand-sage">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-sage" />
        {isZh ? '已出貨' : 'Shipped'}
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-micro text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {isZh ? '部分' : 'Partial'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-3 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-micro text-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
      {isZh ? '缺口' : 'Gap'}
    </span>
  );
}

/** Shipped layers read as solid cards; planned/partial layers get the dashed provisional border. */
const cardBorderByStatus: Record<LayerStatus, string> = {
  shipped: 'border-border hover:border-border-hover',
  partial: 'border-provisional border-amber-400/30 hover:border-amber-400/50',
  gap: 'border-provisional border-border opacity-80 hover:border-border-hover hover:opacity-100',
};

export default function SecurityLayers() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const pick = (b: { en: string; zh: string }) => (isZh ? b.zh : b.en);

  return (
    <SectionV2>
      <FadeInUp>
        <Eyebrow>{isZh ? '7 層代理安全架構' : '7-LAYER AGENT SECURITY'}</Eyebrow>
        <SectionTitleV2>
          {isZh ? (
            <>
              AI agent 防禦<span className="text-brand-sage">不是單點產品</span>
            </>
          ) : (
            <>
              Agent defense is <span className="text-brand-sage">not a single product</span>
            </>
          )}
        </SectionTitleV2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
          {isZh
            ? '5 層今天已上線(L2 稽核 / L3 防護 / L4 偵測 / L5 誘捕 / L6 反應)。L1 探索與 L7 治理規劃中,不承諾日期。我們標 gap,不假打勾。'
            : '5 layers ship today (L2 Audit / L3 Protect / L4 Detect / L5 Deceive / L6 Respond). L1 Discover and L7 Govern are planned — no dates promised. We mark the gaps openly — no fake checkmarks.'}
        </p>
      </FadeInUp>

      <div className="mt-14 max-w-4xl space-y-3">
        {LAYERS.map((layer, i) => (
          <FadeInUp key={layer.id} delay={i * 0.04}>
            <Link
              href={`/layers/${layer.slug}`}
              className={`lift group block rounded-2xl border bg-surface-1 p-6 transition-colors duration-300 ease-out-quint ${cardBorderByStatus[layer.status]}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 shrink-0 text-center font-mono text-2xl font-medium tabular-nums text-text-muted sm:text-3xl">
                  {layer.id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-text-primary transition-colors group-hover:text-brand-sage">
                      {pick(layer.name)}
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <StatusBadge status={layer.status} isZh={isZh} />
                      <ArrowRight className="h-3.5 w-3.5 text-text-muted transition-colors group-hover:text-brand-sage" />
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    {pick(layer.tagline)}
                  </p>
                  <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-text-muted">
                    {pick(layer.why)}
                  </p>
                  <p className="mt-2.5 break-words font-mono text-[11px] text-brand-sage/80">
                    {pick(layer.proofShort)}
                  </p>
                </div>
              </div>
            </Link>
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.5}>
        <div className="mt-10 max-w-4xl rounded-2xl border border-brand-sage/20 bg-brand-sage/5 p-5">
          <p className="text-xs leading-relaxed text-text-secondary">
            {isZh ? (
              <>
                每層可點擊看詳細:攻擊案例、技術作法、benchmark、生態系整合 ·{' '}
                <Link href="/layers" className="font-semibold text-brand-sage hover:underline">
                  看完整 7 層架構
                </Link>
              </>
            ) : (
              <>
                Click any layer for attack examples, architecture, benchmarks, ecosystem links ·{' '}
                <Link href="/layers" className="font-semibold text-brand-sage hover:underline">
                  See full 7-layer architecture
                </Link>
              </>
            )}
          </p>
        </div>
      </FadeInUp>
    </SectionV2>
  );
}
