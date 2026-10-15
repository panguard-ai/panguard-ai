import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import { getNonce } from '@/lib/nonce';
import { Link } from '@/navigation';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import FadeInUp from '@/components/FadeInUp';
import SectionWrapper from '@/components/ui/SectionWrapper';
import JsonLdBreadcrumb from '@/components/seo/JsonLdBreadcrumb';
import BilingualArticle from '@/components/blog/BilingualArticle';
import { getAllPosts } from '@/lib/blog-store';
import { notFound } from 'next/navigation';

// Benchmark figures ATR has since withdrawn or narrowed. Posts stay as
// published; a dated correction is shown above any post that quotes them.
const WITHDRAWN_FIGURES =
  /65,000|65K benign|0\.24%|0\.48% FP|0\.2% (?:FP|false|誤報)|0\.20% FP|97% precision|97\.1%|97\.2%/;

const ERRATUM = {
  en: 'Some figures in this post have since been withdrawn or narrowed. The lane-based false-positive rates on a "65,000-sample benign gate" (about 0.24% enforce, about 9% hunt) were withdrawn on 2026-09-19: the sample count was mislabelled, the benign corpus contained real jailbreak samples until 2026-08-04, and the hunt figure cannot be reproduced. The SKILL.md precision and false-positive figures are in-sample, measured on the benign set the rules are tuned against. Recall figures are hunt-lane, and the garak figures are partly closed-book. The post is otherwise left as published.',
  zh: '本文的部分數字已撤回或需要加註。以「65,000 筆 benign gate」為名的分 lane 誤報率（enforce 約 0.24%、hunt 約 9%）已於 2026-09-19 撤回：樣本數標示錯誤、benign 語料在 2026-08-04 前混有真實越獄樣本，而 hunt 數字無法重現。SKILL.md 的 precision 與誤報率是樣本內數字，量測用的 benign 集合就是規則調校用的那一組。recall 都是 hunt lane 數字，garak 數字部分是 closed-book。除此之外，本文保留原樣。',
} as const;

/* ─── All blog pages are SSR to support dynamic JSON posts ─── */
export const dynamic = 'force-dynamic';

/* ─── Metadata ─── */

export async function generateMetadata(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  const allPosts = await getAllPosts();
  const post = allPosts.find((p) => p.slug === params.slug);
  if (!post) {
    return { title: t('blog.title'), description: t('blog.description') };
  }
  const url = `https://panguard.ai/blog/${params.slug}`;
  return {
    title: `${post.title} | Panguard AI Blog`,
    description: post.excerpt,
    alternates: buildAlternates(`/blog/${params.slug}`, params.locale),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url,
      siteName: 'Panguard AI',
      publishedTime: `${post.date}T00:00:00Z`,
      authors: [post.author],
      section: post.category,
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: ['/og-image.png'],
    },
  };
}

/* ─── Helper ─── */

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ════════════════════════  Page Component  ═══════════════════════ */

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'blogPost' });
  const allPosts = await getAllPosts();

  // If user hits a -zh slug directly, redirect to the EN slug (ZH content is shown via toggle)
  const isZhSlug = params.slug.endsWith('-zh');
  const baseSlug = isZhSlug ? params.slug.replace(/-zh$/, '') : params.slug;

  const post =
    allPosts.find((p) => p.slug === baseSlug) ?? allPosts.find((p) => p.slug === params.slug);
  if (!post) {
    notFound();
  }

  const zhPost = allPosts.find((p) => p.slug === `${post.slug}-zh`) ?? null;

  const showZh = params.locale === 'zh-TW' || isZhSlug;
  const quotesWithdrawnFigures = [post.excerpt, ...(post.content ?? []), ...(zhPost?.content ?? [])]
    .filter(Boolean)
    .some((block) => WITHDRAWN_FIGURES.test(block));

  const nonce = await getNonce();

  const postUrl = `https://panguard.ai/blog/${post.slug}`;

  // Author resolution: a personal byline (Adam Lin) links to the Person
  // schema; a team/research byline is attributed to the Organization.
  const authorIsAdam = /adam/i.test(post.author);
  const authorBlock = authorIsAdam
    ? { '@id': 'https://panguard.ai/#person-adam' }
    : { '@id': 'https://panguard.ai/#org' };

  // articleBody / wordCount give answer engines a citable snippet + length
  // signal. Strip markdown from the prose blocks (skip headings, code, tables).
  const proseBlocks = (post.content ?? []).filter(
    (b) => !/^(#{1,6}\s|```|\||-\s|\*\s|---$)/.test(b.trim())
  );
  const articleBody = proseBlocks
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`_]/g, '')
    .trim();
  const wordCount = articleBody ? articleBody.split(/\s+/).length : undefined;

  const blogPostJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: `${post.date}T00:00:00Z`,
    dateModified: `${post.date}T00:00:00Z`,
    author: authorBlock,
    publisher: { '@id': 'https://panguard.ai/#org' },
    url: postUrl,
    image: 'https://panguard.ai/og-image.png',
    articleSection: post.category,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    keywords: post.category,
    inLanguage: params.locale === 'zh-TW' ? 'zh-TW' : 'en',
    ...(articleBody ? { articleBody: articleBody.slice(0, 2000) } : {}),
    ...(wordCount ? { wordCount } : {}),
  };

  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostJsonLd) }}
      />
      <JsonLdBreadcrumb
        nonce={nonce}
        items={[{ name: 'Blog', href: '/blog' }, { name: post.title }]}
      />
      <NavBar />
      <main id="main-content">
        {/* ───────────── Back Link ───────────── */}
        <section className="pt-24 pb-0 px-5 sm:px-6">
          <div className="max-w-[800px] mx-auto">
            <FadeInUp>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-brand-sage transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('backToBlog')}
              </Link>
            </FadeInUp>
          </div>
        </section>

        {/* ───────────── Post Header ───────────── */}
        <SectionWrapper spacing="default">
          <article className="max-w-[800px] mx-auto">
            <FadeInUp>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-brand-sage/10 text-brand-sage">
                {post.category}
              </span>
            </FadeInUp>

            <FadeInUp delay={0.05}>
              <h1 className="text-[clamp(24px,4vw,42px)] font-bold text-text-primary leading-[1.15] mt-5">
                {post.title}
              </h1>
            </FadeInUp>

            <FadeInUp delay={0.1}>
              <address className="not-italic flex flex-wrap items-center gap-5 mt-6 text-sm text-text-tertiary">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {authorIsAdam ? (
                    <Link
                      href="/about"
                      rel="author"
                      className="hover:text-brand-sage transition-colors"
                    >
                      {post.author}
                    </Link>
                  ) : (
                    <span itemProp="author">{post.author}</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.date}>{formatDate(post.date, params.locale)}</time>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readingTime}
                </span>
              </address>
            </FadeInUp>

            <FadeInUp delay={0.15}>
              <div className="border-t border-border mt-8 pt-8">
                <p className="text-lg text-text-secondary leading-relaxed">{post.excerpt}</p>
              </div>
            </FadeInUp>

            {quotesWithdrawnFigures ? (
              <FadeInUp delay={0.18}>
                <aside className="mt-8 rounded-xl border border-border bg-surface-1 p-5 text-sm leading-relaxed text-text-secondary">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-sage">
                    {showZh ? '更正 · 2026-10-16' : 'Correction · 2026-10-16'}
                  </p>
                  <p>
                    {showZh ? ERRATUM.zh : ERRATUM.en}{' '}
                    <Link href="/research/benchmarks" className="text-brand-sage underline">
                      {showZh ? '現行數字與限制' : 'Current figures and caveats'}
                    </Link>
                  </p>
                </aside>
              </FadeInUp>
            ) : null}

            {/* ───────────── Article Content or Coming Soon ───────────── */}
            {post.content ? (
              <FadeInUp delay={0.2}>
                <BilingualArticle
                  enPost={post}
                  zhPost={zhPost}
                  defaultLang={params.locale === 'zh-TW' || isZhSlug ? 'zh' : 'en'}
                />
              </FadeInUp>
            ) : (
              <FadeInUp delay={0.2}>
                <div className="mt-12 bg-surface-1 rounded-2xl border border-border p-8 text-center">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold mb-3">
                    {t('comingSoon')}
                  </p>
                  <h2 className="text-xl font-bold text-text-primary">
                    {t('fullArticleInProgress')}
                  </h2>
                  <p className="text-sm text-text-secondary mt-3 max-w-md mx-auto leading-relaxed">
                    {t('fullArticleDesc')}
                  </p>
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 bg-brand-sage text-surface-0 font-semibold rounded-full px-6 py-3 mt-6 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('browseAll')}
                  </Link>
                </div>
              </FadeInUp>
            )}
          </article>
        </SectionWrapper>
      </main>
      <Footer />
    </>
  );
}
