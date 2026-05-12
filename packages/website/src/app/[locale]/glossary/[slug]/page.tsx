import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import JsonLdBreadcrumb from '@/components/seo/JsonLdBreadcrumb';
import { Link } from '@/navigation';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { getGlossaryEntry, getRelatedEntries } from '@/data/glossary';
import { definedTermSchema, techArticleSchema } from '@/lib/schema';

// Dynamic rendering required because JsonLd reads the CSP nonce from headers().
// Removing generateStaticParams lets headers() work without DYNAMIC_SERVER_USAGE.

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const entry = getGlossaryEntry(params.slug);
  if (!entry) return { title: 'Not Found' };

  const isZh = params.locale === 'zh-TW';
  const desc = entry.shortDefinition[isZh ? 'zh' : 'en'];

  return {
    title: isZh
      ? `什麼是 ${entry.term}？ — PanGuard AI`
      : `What is ${entry.term}? — PanGuard AI`,
    description: desc,
    alternates: buildAlternates(`/glossary/${entry.slug}`, params.locale),
    openGraph: {
      title: isZh ? `什麼是 ${entry.term}？` : `What is ${entry.term}?`,
      description: desc,
      type: 'article',
    },
  };
}

export default async function GlossaryEntryPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await props.params;
  const entry = getGlossaryEntry(params.slug);
  if (!entry) notFound();

  const isZh = params.locale === 'zh-TW';
  const lang = isZh ? 'zh' : 'en';
  const url = `https://panguard.ai${isZh ? '/zh-TW' : ''}/glossary/${entry.slug}`;
  const related = getRelatedEntries(entry.slug);

  return (
    <>
      <JsonLd
        data={[
          definedTermSchema({
            name: entry.term,
            description: entry.shortDefinition[lang],
            url,
          }),
          techArticleSchema({
            headline: isZh ? `什麼是 ${entry.term}？` : `What is ${entry.term}?`,
            description: entry.shortDefinition[lang],
            url,
            datePublished: '2026-05-12',
            dateModified: entry.lastReviewed,
            proficiencyLevel: 'Beginner',
          }),
        ]}
      />
      <JsonLdBreadcrumb
        items={[
          { name: isZh ? '術語表' : 'Glossary', href: '/glossary' },
          { name: entry.term },
        ]}
      />
      <NavBar />
      <main id="main-content" className="min-h-screen bg-surface-0">
        <section className="pt-24 pb-12 px-5 sm:px-6">
          <div className="max-w-[820px] mx-auto">
            <Link
              href="/glossary"
              className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-brand-sage transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {isZh ? '返回術語表' : 'Back to Glossary'}
            </Link>

            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '安全術語' : 'SECURITY GLOSSARY'}
            </p>
            <h1 className="text-[clamp(26px,4.5vw,46px)] font-extrabold leading-[1.1] tracking-tight text-text-primary">
              {isZh ? `什麼是 ${entry.term}？` : `What is ${entry.term}?`}
            </h1>

            <div className="mt-8 p-5 rounded-xl border border-brand-sage/30 bg-brand-sage/5">
              <p className="text-[15px] text-text-primary leading-relaxed">
                {entry.shortDefinition[lang]}
              </p>
            </div>

            <article className="mt-10 space-y-6">
              {entry.longDefinition[lang].map((para, i) => (
                <p
                  key={i}
                  className="text-base text-text-secondary leading-[1.85]"
                  dangerouslySetInnerHTML={{
                    __html: para
                      .replace(
                        /\*\*([^*]+)\*\*/g,
                        '<strong class="text-text-primary font-semibold">$1</strong>',
                      )
                      .replace(/`([^`]+)`/g, '<code class="text-xs bg-surface-2 border border-border px-1.5 py-0.5 rounded font-mono">$1</code>'),
                  }}
                />
              ))}
            </article>

            {/* Quick facts grid */}
            <div className="mt-10 grid sm:grid-cols-2 gap-3">
              {entry.owaspMapping && (
                <div className="p-4 rounded-lg border border-border bg-surface-1">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                    OWASP
                  </p>
                  <p className="text-sm text-text-primary">{entry.owaspMapping}</p>
                </div>
              )}
              {entry.mitreMapping && (
                <div className="p-4 rounded-lg border border-border bg-surface-1">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                    MITRE
                  </p>
                  <p className="text-sm text-text-primary">{entry.mitreMapping}</p>
                </div>
              )}
              {entry.atrRules && entry.atrRules.length > 0 && (
                <div className="p-4 rounded-lg border border-border bg-surface-1 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">
                    {isZh ? '相關 ATR 規則' : 'Related ATR rules'}
                  </p>
                  <p className="text-sm text-text-primary font-mono">
                    {entry.atrRules.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* References */}
            {entry.references && entry.references.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-bold text-text-primary mb-4">
                  {isZh ? '參考來源' : 'References'}
                </h2>
                <ul className="space-y-2">
                  {entry.references.map((ref, i) => (
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
            )}

            {/* Related terms */}
            {related.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border">
                <h2 className="text-lg font-bold text-text-primary mb-4">
                  {isZh ? '相關術語' : 'Related terms'}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/glossary/${rel.slug}`}
                      className="block p-4 rounded-lg border border-border bg-surface-1 hover:border-brand-sage/40 transition-colors duration-200"
                    >
                      <p className="text-sm font-bold text-text-primary mb-1">{rel.term}</p>
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {rel.shortDefinition[lang]}
                      </p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-sage mt-2">
                        {isZh ? '了解更多' : 'Learn more'} <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Author byline (Princeton +41% citation lift) */}
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
              <time dateTime={entry.lastReviewed}>{entry.lastReviewed}</time>
            </address>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
