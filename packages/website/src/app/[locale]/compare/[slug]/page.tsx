import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import JsonLdBreadcrumb from '@/components/seo/JsonLdBreadcrumb';
import { Link } from '@/navigation';
import { ArrowLeft, Check, Minus, ExternalLink } from 'lucide-react';
import { getComparison } from '@/data/compare';
import { techArticleSchema } from '@/lib/schema';

// Dynamic rendering required because JsonLd reads the CSP nonce from headers().

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const c = getComparison(params.slug);
  if (!c) return { title: 'Not Found' };
  const isZh = params.locale === 'zh-TW';
  return {
    title: c.title[isZh ? 'zh' : 'en'],
    description: c.oneLiner[isZh ? 'zh' : 'en'],
    alternates: buildAlternates(`/compare/${c.slug}`, params.locale),
    openGraph: {
      title: c.title[isZh ? 'zh' : 'en'],
      description: c.oneLiner[isZh ? 'zh' : 'en'],
      type: 'article',
    },
  };
}

const winnerCellClass: Record<'atr' | 'other' | 'tie' | 'context', string> = {
  atr: 'text-brand-sage font-semibold',
  other: 'text-text-secondary',
  tie: 'text-text-tertiary',
  context: 'text-amber-400',
};

export default async function ComparePage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await props.params;
  const c = getComparison(params.slug);
  if (!c) notFound();

  const isZh = params.locale === 'zh-TW';
  const lang = isZh ? 'zh' : 'en';
  const url = `https://panguard.ai${isZh ? '/zh-TW' : ''}/compare/${c.slug}`;

  return (
    <>
      <JsonLd
        data={techArticleSchema({
          headline: c.title[lang],
          description: c.oneLiner[lang],
          url,
          datePublished: '2026-05-12',
          dateModified: c.lastReviewed,
          proficiencyLevel: 'Beginner',
        })}
      />
      <JsonLdBreadcrumb
        items={[
          { name: isZh ? '比較' : 'Compare', href: '/compare' },
          { name: `${c.atrLabel} vs ${c.otherLabel}` },
        ]}
      />
      <NavBar />
      <main id="main-content" className="min-h-screen bg-surface-0">
        <section className="pt-24 pb-12 px-5 sm:px-6">
          <div className="max-w-[920px] mx-auto">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-brand-sage transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {isZh ? '返回比較總覽' : 'Back to Compare'}
            </Link>

            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '誠實比較' : 'HONEST COMPARISON'}
            </p>
            <h1 className="text-[clamp(26px,4.5vw,46px)] font-extrabold leading-[1.1] tracking-tight text-text-primary">
              {c.title[lang]}
            </h1>

            <div className="mt-8 p-5 rounded-xl border border-brand-sage/30 bg-brand-sage/5">
              <p className="text-[15px] text-text-primary leading-relaxed">{c.oneLiner[lang]}</p>
            </div>

            <article className="mt-10 space-y-6">
              {c.framing[lang].map((para, i) => (
                <p key={i} className="text-base text-text-secondary leading-[1.85]">
                  {para}
                </p>
              ))}
            </article>

            {/* Feature comparison table */}
            <div className="mt-12">
              <h2 className="text-xl font-bold text-text-primary mb-4">
                {isZh ? '功能比較' : 'Feature comparison'}
              </h2>
              <div className="bg-surface-1 rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-0 border-b border-border bg-surface-2">
                  <div className="px-5 py-3 text-xs font-semibold text-text-secondary">
                    {isZh ? '面向' : 'Feature'}
                  </div>
                  <div className="px-5 py-3 text-xs font-semibold text-brand-sage text-center">
                    {c.atrLabel}
                  </div>
                  <div className="px-5 py-3 text-xs font-semibold text-text-secondary text-center">
                    {c.otherLabel}
                  </div>
                </div>
                {c.rows.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[1.4fr_1fr_1fr] gap-0 ${i < c.rows.length - 1 ? 'border-b border-border/50' : ''}`}
                  >
                    <div className="px-5 py-3 text-sm text-text-primary font-medium">
                      {row.feature}
                    </div>
                    <div className={`px-5 py-3 text-xs text-center ${winnerCellClass[row.winner === 'atr' ? 'atr' : row.winner === 'tie' ? 'tie' : 'other']}`}>
                      {row.atr}
                    </div>
                    <div className={`px-5 py-3 text-xs text-center ${winnerCellClass[row.winner === 'other' ? 'atr' : row.winner === 'tie' ? 'tie' : 'other']}`}>
                      {row.other}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-3 italic">
                {isZh
                  ? '綠色標示哪一方在該面向較強。「context」(琥珀色) 表示「依情境而定,兩者皆可」。'
                  : 'Green highlights which side is stronger for that feature. "context" (amber) means "depends on use case, neither wins overall".'}
              </p>
            </div>

            {/* When to choose each */}
            <div className="mt-12 grid sm:grid-cols-2 gap-5">
              <div className="p-6 rounded-xl border border-brand-sage/30 bg-brand-sage/5">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-brand-sage" />
                  <h3 className="text-base font-bold text-brand-sage">
                    {isZh ? `什麼時候選 ${c.atrLabel}` : `When to choose ${c.atrLabel}`}
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{c.chooseAtr[lang]}</p>
              </div>
              <div className="p-6 rounded-xl border border-border bg-surface-1">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-text-tertiary" />
                  <h3 className="text-base font-bold text-text-primary">
                    {isZh ? `什麼時候選 ${c.otherLabel}` : `When to choose ${c.otherLabel}`}
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{c.chooseOther[lang]}</p>
              </div>
            </div>

            {/* Bottom line */}
            <div className="mt-10 p-6 rounded-xl border border-border bg-surface-2">
              <h3 className="text-base font-bold text-text-primary mb-3">
                {isZh ? '結論' : 'Bottom line'}
              </h3>
              <p className="text-sm text-text-secondary leading-[1.85]">{c.bottomLine[lang]}</p>
            </div>

            {/* References */}
            <div className="mt-10">
              <h2 className="text-lg font-bold text-text-primary mb-4">
                {isZh ? '參考來源' : 'References'}
              </h2>
              <ul className="space-y-2">
                {c.references.map((ref, i) => (
                  <li key={i}>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-sage hover:underline inline-flex items-center gap-1.5"
                    >
                      {ref.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Author byline */}
            <address className="not-italic mt-12 pt-8 border-t border-border flex items-center gap-3 text-sm text-text-tertiary">
              <span>{isZh ? '審稿' : 'Reviewed by'}</span>
              <Link
                href="/about"
                rel="author"
                className="text-brand-sage hover:underline font-semibold"
              >
                Adam Lin
              </Link>
              <span className="text-text-muted">·</span>
              <span>{isZh ? '最後審查' : 'Last reviewed'}</span>
              <time dateTime={c.lastReviewed}>{c.lastReviewed}</time>
            </address>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
