'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import { Link } from '@/navigation';
import { ArrowRight } from 'lucide-react';
import {
  LAYERS,
  getLayersShipped,
  type Layer,
  type LayerStatus,
  type Bilingual,
} from '@/lib/layers';
import { STATS } from '@/lib/stats';
import { CardKicker, CardV2, Eyebrow, SectionTitleV2, SectionV2 } from '../v2/primitives';

/**
 * BEAT 5 — Architecture: 7-layer bento + honest competitor coverage table.
 * Merges SecurityLayers.tsx and CoverageComparison.tsx into one beat and
 * reconciles their contradiction: 5 layers ship today, L7 is partial,
 * L1 is planned — the table no longer claims "we cover 6" nor checks L1.
 */

const TOTAL_LAYERS = LAYERS.length;

/**
 * L7's tagline in layers.ts says "4-framework" while STATS ships
 * STATS.complianceFrameworkList (7 named frameworks). Drop the count here
 * and name the frameworks on the card instead of hardcoding a number.
 */
const TAGLINE_OVERRIDES: Record<number, Bilingual> = {
  7: { en: 'AIAM + compliance reporting', zh: 'AIAM + 合規報告' },
};

/** Bento spans — 2 cols on mobile, packed 4-col bento on md (3 rows vs 7 stacked rows). */
const BENTO_SPANS: Record<number, string> = {
  1: 'col-span-2 md:col-span-1',
  2: 'col-span-2 md:col-span-2 md:row-span-2',
  3: 'col-span-1 md:col-span-1',
  4: 'col-span-1 md:col-span-1',
  5: 'col-span-1 md:col-span-1',
  6: 'col-span-1 md:col-span-1',
  7: 'col-span-2 md:col-span-3',
};

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

/** Shipped = solid CardV2; L7 partial = dashed + amber accent; L1 gap = dashed muted. */
function cardStatusClasses(status: LayerStatus): { provisional: boolean; className: string } {
  if (status === 'partial') {
    return {
      provisional: true,
      className: '!border-amber-400/30 group-hover:!border-amber-400/50',
    };
  }
  if (status === 'gap') {
    return {
      provisional: true,
      className: 'opacity-80 transition-opacity group-hover:opacity-100',
    };
  }
  return { provisional: false, className: 'group-hover:border-border-hover' };
}

function LayerCard({ layer, isZh }: { layer: Layer; isZh: boolean }) {
  const pick = (b: Bilingual) => (isZh ? b.zh : b.en);
  const big = layer.id === 2;
  const tagline = TAGLINE_OVERRIDES[layer.id] ?? layer.tagline;
  const { provisional, className } = cardStatusClasses(layer.status);

  return (
    <Link href={`/layers/${layer.slug}`} className="group block h-full">
      <CardV2
        provisional={provisional}
        className={`flex h-full flex-col transition-colors duration-300 ease-out-quint ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-2xl font-medium tabular-nums text-text-muted">
            {layer.id}
          </span>
          <div className="flex items-center gap-2">
            <StatusBadge status={layer.status} isZh={isZh} />
            <ArrowRight className="h-3.5 w-3.5 text-text-muted transition-colors group-hover:text-brand-sage" />
          </div>
        </div>
        <h3 className="mt-3 text-base font-semibold text-text-primary transition-colors group-hover:text-brand-sage">
          {pick(layer.name)}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{pick(tagline)}</p>
        {big && (
          <p className="mt-2.5 line-clamp-4 text-xs leading-relaxed text-text-muted">
            {pick(layer.why)}
          </p>
        )}
        {layer.id === 7 && (
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-text-muted">
            {STATS.complianceFrameworkList.join(' · ')}
          </p>
        )}
        <p className="mt-auto break-words pt-2.5 font-mono text-[11px] text-brand-sage/80">
          {pick(layer.proofShort)}
        </p>
        {big && layer.tryIt.command && (
          <p className="mt-3 rounded-lg border border-border-subtle bg-surface-0 px-3 py-2 font-mono text-[11px] text-text-secondary">
            $ {layer.tryIt.command}
          </p>
        )}
      </CardV2>
    </Link>
  );
}

export default function ArchitectureBeat() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';
  const shippedCount = getLayersShipped().length;

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
            ? `${shippedCount} 層今天已上線（L2 稽核 / L3 防護 / L4 偵測 / L5 誘捕 / L6 反應）。L7 治理部分上線，L1 探索規劃中，不承諾日期。`
            : `${shippedCount} layers ship today (L2 Audit / L3 Protect / L4 Detect / L5 Deceive / L6 Respond). L7 Govern is partially shipped; L1 Discover is planned — no dates promised.`}
        </p>
      </FadeInUp>

      <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
        {LAYERS.map((layer, i) => (
          <FadeInUp key={layer.id} delay={i * 0.04} className={`h-full ${BENTO_SPANS[layer.id]}`}>
            <LayerCard layer={layer} isZh={isZh} />
          </FadeInUp>
        ))}
      </div>

      <FadeInUp delay={0.3}>
        <p className="mt-6 text-xs leading-relaxed text-text-muted">
          {isZh ? (
            <>
              每層可點擊看詳細：攻擊案例、技術作法、benchmark、生態系整合 ·{' '}
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
      </FadeInUp>

      <FadeInUp delay={0.35}>
        <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-border bg-surface-0/50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="max-w-2xl font-display text-xl font-bold leading-snug tracking-tight text-text-primary sm:text-2xl">
            {isZh ? (
              <>
                點工具各守一層。
                <span className="text-brand-sage">
                  我們出貨 {TOTAL_LAYERS} 層中的 {shippedCount} 層
                </span>
                ，缺口照標，不假打勾。
              </>
            ) : (
              <>
                Point tools each guard one layer.{' '}
                <span className="text-brand-sage">
                  We ship {shippedCount} of {TOTAL_LAYERS}
                </span>{' '}
                — and mark the gaps openly.
              </>
            )}
          </p>
          <Link
            href="/layers"
            className="lift shrink-0 self-start rounded-xl border border-border px-5 py-2.5 font-semibold text-text-primary transition-colors duration-300 ease-out-quint hover:border-border-hover hover:bg-surface-1 sm:self-auto"
          >
            {isZh ? '看完整架構' : 'See the full stack'}
          </Link>
        </div>
      </FadeInUp>
    </SectionV2>
  );
}
