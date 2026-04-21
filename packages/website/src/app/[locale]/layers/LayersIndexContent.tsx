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

export default function LayersIndexContent() {
  const locale = useLocale();
  const isZh = locale === 'zh-TW';

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[48vh] flex items-center px-5 sm:px-6 lg:px-[120px] py-16 sm:py-24 border-b border-border overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-brand-sage/5 rounded-full blur-[200px] pointer-events-none" />
        <div className="max-w-[1100px] mx-auto relative text-center w-full">
          <FadeInUp>
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '7 層代理安全架構' : '7-LAYER AGENT SECURITY'}
            </p>
            <h1 className="text-[clamp(28px,5vw,56px)] font-extrabold leading-[1.06] tracking-tight text-text-primary max-w-3xl mx-auto">
              {isZh ? (
                <>
                  每一層都是 <span className="text-brand-sage">真實買家的真實功能</span>
                </>
              ) : (
                <>
                  Every layer is a{' '}
                  <span className="text-brand-sage">real buyer, real function</span>
                </>
              )}
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
              {isZh
                ? '其他廠商只覆蓋 1-2 層。PanGuard 今天覆蓋 5 層(L2-L6),L1 Discover 2026 Q2 上線,L7 Govern Q2/Q3 上線。誠實標 gap,不假打勾。'
                : 'Most vendors cover 1-2 layers. PanGuard ships 5 layers today (L2-L6), with L1 Discover in Q2 2026 and L7 Govern Q2/Q3 2026. We mark the gaps openly — no fake checkmarks.'}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-8 inline-flex items-center gap-3 bg-surface-2 border border-border rounded-full px-5 py-2">
              <span className="text-xs font-semibold text-text-muted">
                {isZh ? '5 / 7 已上線' : '5 of 7 shipped'}
              </span>
              <span className="text-text-muted/50">·</span>
              <span className="text-xs font-semibold text-amber-400">
                {isZh ? '1 部分 · 1 缺口' : '1 partial · 1 gap'}
              </span>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* 7 layer cards */}
      <SectionWrapper>
        <div className="max-w-5xl mx-auto space-y-4">
          {LAYERS.map((layer, i) => {
            const name = isZh ? layer.name.zh : layer.name.en;
            const tagline = isZh ? layer.tagline.zh : layer.tagline.en;
            const why = isZh ? layer.why.zh : layer.why.en;
            const proofShort = isZh ? layer.proofShort.zh : layer.proofShort.en;
            return (
              <FadeInUp key={layer.id} delay={i * 0.04}>
                <Link
                  href={`/layers/${layer.slug}`}
                  className={`block bg-surface-2 rounded-xl border p-6 sm:p-7 transition-all duration-200 hover:border-brand-sage/50 hover:bg-surface-3/40 ${
                    layer.status === 'shipped'
                      ? 'border-border'
                      : layer.status === 'partial'
                        ? 'border-amber-400/20'
                        : 'border-border/50 opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-5">
                    <div className="text-4xl sm:text-5xl font-extrabold text-text-muted w-14 text-center tabular-nums shrink-0">
                      {layer.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-semibold text-text-primary">
                          {name}
                        </h2>
                        <div className="flex items-center gap-2.5">
                          <StatusBadge status={layer.status} isZh={isZh} />
                          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand-sage" />
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mt-2 leading-relaxed">{tagline}</p>
                      <p className="text-xs text-text-muted mt-3 leading-relaxed line-clamp-2">
                        {why}
                      </p>
                      <p className="text-[11px] font-mono text-brand-sage/80 mt-3 break-words">
                        {proofShort}
                      </p>
                    </div>
                  </div>
                </Link>
              </FadeInUp>
            );
          })}
        </div>
      </SectionWrapper>

      {/* CTA */}
      <SectionWrapper dark>
        <div className="max-w-3xl mx-auto text-center">
          <FadeInUp>
            <h2 className="text-[clamp(20px,3vw,36px)] font-bold text-text-primary leading-[1.15]">
              {isZh
                ? '一次買齊 7 層,比買 5 家省 40%'
                : 'Get all 7 layers for ~40% less than 5 vendors'}
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="text-text-secondary mt-5 leading-relaxed">
              {isZh
                ? 'F500 CISO 今天為單層廠商付 $400-600K/年(Lakera + Apono + Straiker + Cisco bundle)。PanGuard 7 層整合 $250K/年。節省費用的同時,拿掉 vendor fatigue 與整合成本。'
                : "F500 CISOs today pay $400-600K/yr across single-layer vendors (Lakera + Apono + Straiker + Cisco bundle). PanGuard's 7-layer consolidation lands at $250K/yr — cheaper plus no vendor fatigue plus one SOC to train."}
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <a
                href="https://github.com/panguard-ai/panguard-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-brand-sage font-semibold rounded-full px-6 py-3 transition-all"
              >
                {isZh ? '先試 Community 版' : 'Start with Community'}{' '}
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 hover:bg-brand-sage-light transition-all"
              >
                {isZh ? '看 Enterprise 定價' : 'Enterprise pricing'}{' '}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInUp>
        </div>
      </SectionWrapper>
    </>
  );
}
