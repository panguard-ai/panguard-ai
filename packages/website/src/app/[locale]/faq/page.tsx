import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import { getNonce } from '@/lib/nonce';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import FAQContent from './FAQContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('faq.title'),
    description: t('faq.description'),
    alternates: buildAlternates('/faq', params.locale),
    openGraph: {
      title: t('faq.title'),
      description: t('faq.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default async function FAQPage() {
  const t = await getTranslations('faqPage');
  const nonce = await getNonce();

  // JSON-LD for SEO
  const faqCategories = ['security', 'detection', 'privacy', 'deployment', 'general'] as const;
  const itemsPerCategory: Record<string, number> = {
    security: 4,
    detection: 4,
    privacy: 3,
    deployment: 3,
    general: 3,
  };

  const allQuestions = faqCategories.flatMap((cat) =>
    Array.from({ length: itemsPerCategory[cat] ?? 0 }, (_, i) => ({
      '@type': 'Question' as const,
      name: t(`${cat}.q${i + 1}.q`),
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: t(`${cat}.q${i + 1}.a`),
      },
    }))
  );

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQuestions,
  };

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <NavBar />
      <main id="main-content">
        <FAQContent />
      </main>
      <Footer />
    </>
  );
}
