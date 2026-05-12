import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { Link } from '@/navigation';
import { GLOSSARY } from '@/data/glossary';
import { ArrowRight } from 'lucide-react';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  return {
    title: isZh
      ? 'AI Agent 安全術語表 — PanGuard AI'
      : 'AI Agent Security Glossary — PanGuard AI',
    description: isZh
      ? '什麼是 ATR? 什麼是 prompt injection? 什麼是 tool poisoning? AI agent 安全領域的核心術語,以技術精確、跨來源引用的方式定義。'
      : 'What is an ATR rule? What is prompt injection? What is tool poisoning? The core vocabulary of AI agent security, defined precisely and with cross-source citations.',
    alternates: buildAlternates('/glossary', params.locale),
  };
}

export default async function GlossaryIndexPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';

  const indexJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'PanGuard AI Security Glossary',
    description: isZh
      ? 'AI agent 安全領域的核心術語定義'
      : 'Core vocabulary of AI agent security',
    url: 'https://panguard.ai/glossary',
    hasDefinedTerm: GLOSSARY.map((entry) => ({
      '@type': 'DefinedTerm',
      name: entry.term,
      url: `https://panguard.ai/glossary/${entry.slug}`,
      description: entry.shortDefinition[isZh ? 'zh' : 'en'],
    })),
  };

  return (
    <>
      <JsonLd data={indexJsonLd} />
      <NavBar />
      <main id="main-content" className="min-h-screen bg-surface-0">
        <section className="pt-24 pb-12 px-5 sm:px-6">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-[11px] uppercase tracking-[0.15em] text-brand-sage font-semibold mb-4">
              {isZh ? '安全術語表' : 'SECURITY GLOSSARY'}
            </p>
            <h1 className="text-[clamp(28px,5vw,52px)] font-extrabold leading-[1.05] tracking-tight text-text-primary max-w-3xl">
              {isZh
                ? 'AI Agent 安全的核心術語'
                : 'The core vocabulary of AI agent security'}
            </h1>
            <p className="text-lg text-text-secondary mt-6 max-w-2xl leading-relaxed">
              {isZh
                ? '專業、技術精確、跨來源引用。每個詞條都連結到對應的 ATR 偵測規則、OWASP 對應、以及生產環境中的真實案例。'
                : 'Professional, technically precise, cross-source cited. Each entry links to the matching ATR detection rules, OWASP mapping, and real-world examples from production deployments.'}
            </p>
          </div>
        </section>

        <section className="pb-24 px-5 sm:px-6">
          <div className="max-w-[1100px] mx-auto grid sm:grid-cols-2 gap-4">
            {GLOSSARY.map((entry) => (
              <Link
                key={entry.slug}
                href={`/glossary/${entry.slug}`}
                className="block bg-surface-1 rounded-xl border border-border p-6 hover:border-brand-sage/40 transition-colors duration-200"
              >
                <h2 className="text-lg font-bold text-text-primary mb-2">{entry.term}</h2>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                  {entry.shortDefinition[isZh ? 'zh' : 'en']}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-sage mt-4 hover:gap-2.5 transition-all duration-200">
                  {isZh ? '完整定義' : 'Full definition'} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
