'use client';

import { useLocale } from 'next-intl';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import { Link } from '@/navigation';
import { ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { LAYERS, type Layer, type LayerStatus } from '@/lib/layers';

function StatusBadge({ status, isZh }: { status: LayerStatus; isZh: boolean }) {
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-brand-sage bg-brand-sage/10 border border-brand-sage/30 rounded-full px-3 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-sage" />
        {isZh ? '已出貨' : 'Shipped'}
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {isZh ? '部分' : 'Partial'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-text-muted bg-surface-3 border border-border rounded-full px-3 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      {isZh ? '缺口' : 'Gap'}
    </span>
  );
}

function SeverityBadge({
  severity,
  isZh,
}: {
  severity: 'critical' | 'high' | 'medium';
  isZh: boolean;
}) {
  const color =
    severity === 'critical'
      ? 'text-red-400 bg-red-400/10 border-red-400/30'
      : severity === 'high'
        ? 'text-orange-400 bg-orange-400/10 border-orange-400/30'
        : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
  const label = isZh
    ? severity === 'critical'
      ? '嚴重'
      : severity === 'high'
        ? '高'
        : '中'
    : severity.toUpperCase();
  return (
    <span
      className={`inline-flex items-center text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 border ${color}`}
    >
      {label}
    </span>
  );
}

export default function LayerDetailContent({ layer }: { layer: Layer }) {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  const pick = (b: { en: string; zh: string }) => (isZh ? b.zh : b.en);

  const prev = LAYERS.find((l) => l.id === layer.id - 1);
  const next = LAYERS.find((l) => l.id === layer.id + 1);

  return (
    <>
      {/* Back link */}
      <section className="pt-24 pb-0 px-5 sm:px-6">
        <div className="max-w-[900px] mx-auto">
          <Link
            href="/layers"
            className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-brand-sage transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isZh ? '回到 7 層架構' : 'Back to 7-layer architecture'}
          </Link>
        </div>
      </section>

      {/* Hero */}
      <section className="relative px-5 sm:px-6 pt-10 pb-16 border-b border-border">
        <div className="max-w-[900px] mx-auto">
          <FadeInUp>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold">
                {isZh ? `Layer ${layer.id} / 7 層架構` : `LAYER ${layer.id} OF 7`}
              </span>
              <StatusBadge status={layer.status} isZh={isZh} />
            </div>
            <h1 className="text-[clamp(28px,5vw,52px)] font-extrabold leading-[1.06] tracking-tight text-text-primary">
              {pick(layer.name)}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-lg sm:text-xl text-text-secondary mt-5 leading-relaxed">
              {pick(layer.tagline)}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <p className="text-sm font-mono text-brand-sage/80 mt-5 break-words">
              {pick(layer.proof)}
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* What */}
      <SectionWrapper>
        <div className="max-w-[800px] mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              {isZh ? '這一層做什麼' : 'WHAT THIS LAYER DOES'}
            </p>
            <p className="text-base sm:text-lg text-text-primary/90 leading-[1.75]">
              {pick(layer.what)}
            </p>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Why + How */}
      <SectionWrapper dark>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          <FadeInUp>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber-400 font-semibold mb-4">
                {isZh ? '為什麼需要' : 'WHY YOU NEED IT'}
              </p>
              <p className="text-[15px] text-text-secondary leading-[1.75]">{pick(layer.why)}</p>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                {isZh ? '技術做法' : 'HOW IT WORKS'}
              </p>
              <p className="text-[15px] text-text-secondary leading-[1.75]">{pick(layer.how)}</p>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Try it */}
      <SectionWrapper>
        <div className="max-w-[800px] mx-auto">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
              {isZh ? '立即試用' : 'TRY IT NOW'}
            </p>
            <p className="text-base text-text-secondary leading-relaxed mb-5">
              {pick(layer.tryIt.intro)}
            </p>
            {layer.tryIt.command && (
              <div className="bg-surface-1 border border-border rounded-xl p-4 sm:p-5 mb-5">
                <code className="block text-sm text-brand-sage font-mono select-all break-all">
                  {layer.tryIt.command}
                </code>
              </div>
            )}
            {layer.tryIt.href && (
              <Link
                href={layer.tryIt.href}
                className="inline-flex items-center gap-2 text-brand-sage font-semibold hover:text-brand-sage-light"
              >
                {isZh ? '了解更多' : 'Learn more'} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </FadeInUp>
        </div>
      </SectionWrapper>

      {/* Attacks caught */}
      {layer.attacks.length > 0 && (
        <SectionWrapper dark>
          <div className="max-w-[900px] mx-auto">
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-red-400 font-semibold mb-4">
                {isZh ? '這一層攔下的攻擊' : 'ATTACKS THIS LAYER CATCHES'}
              </p>
              <h2 className="text-[clamp(20px,3vw,32px)] font-bold text-text-primary">
                {isZh ? '具體威脅,具體對策' : 'Concrete threats, concrete controls'}
              </h2>
            </FadeInUp>
            <div className="mt-10 space-y-4">
              {layer.attacks.map((attack, i) => (
                <FadeInUp key={i} delay={0.05 * i}>
                  <div className="bg-surface-2 border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-base font-semibold text-text-primary">
                        {pick(attack.name)}
                      </h3>
                      <SeverityBadge severity={attack.severity} isZh={isZh} />
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {pick(attack.description)}
                    </p>
                  </div>
                </FadeInUp>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* Ecosystem */}
      {layer.ecosystem.length > 0 && (
        <SectionWrapper>
          <div className="max-w-[900px] mx-auto">
            <FadeInUp>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-4">
                {isZh ? '生態系整合' : 'ECOSYSTEM INTEGRATIONS'}
              </p>
              <h2 className="text-[clamp(20px,3vw,32px)] font-bold text-text-primary">
                {isZh ? '我們的規則已在其他平台跑' : 'Our rules already ship in other platforms'}
              </h2>
            </FadeInUp>
            <div className="mt-10 space-y-3">
              {layer.ecosystem.map((link, i) => (
                <FadeInUp key={i} delay={0.05 * i}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 bg-surface-2 border border-border rounded-xl p-5 hover:border-brand-sage/50 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-sage">{link.label}</p>
                      <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                        {pick(link.context)}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-text-muted shrink-0" />
                  </a>
                </FadeInUp>
              ))}
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* Prev / Next nav */}
      <SectionWrapper dark>
        <div className="max-w-[900px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/layers/${prev.slug}`}
                className="group bg-surface-2 border border-border rounded-xl p-5 hover:border-brand-sage/50 transition-all"
              >
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                  {isZh ? '上一層' : 'Previous layer'}
                </p>
                <p className="text-base font-semibold text-text-primary group-hover:text-brand-sage flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> L{prev.id} · {pick(prev.name)}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/layers/${next.slug}`}
                className="group bg-surface-2 border border-border rounded-xl p-5 hover:border-brand-sage/50 transition-all text-right"
              >
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                  {isZh ? '下一層' : 'Next layer'}
                </p>
                <p className="text-base font-semibold text-text-primary group-hover:text-brand-sage flex items-center justify-end gap-2">
                  L{next.id} · {pick(next.name)} <ArrowRight className="w-4 h-4" />
                </p>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper>
        <div className="max-w-[800px] mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,36px)] font-bold text-text-primary leading-[1.15]">
              {isZh
                ? '一家廠商覆蓋 7 層,不是 5 家合購'
                : 'One vendor, 7 layers — instead of 5 tools glued together'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Link
                href="/layers"
                className="inline-flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-6 py-3 transition-all"
              >
                {isZh ? '看所有 7 層' : 'See all 7 layers'} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all"
              >
                {isZh ? '看定價' : 'See pricing'} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
