import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import { pricingApplicationSchema } from '@/lib/schema';
import JsonLd from '@/components/seo/JsonLd';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import PricingContent from './PricingContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'metadata.pricing' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/pricing', locale),
    openGraph: {
      type: 'website',
      locale: locale === 'zh-TW' ? 'zh_TW' : 'en_US',
      url:
        locale === 'zh-TW'
          ? 'https://panguard.ai/zh-TW/pricing'
          : 'https://panguard.ai/pricing',
      siteName: 'Panguard AI',
      title: t('title'),
      description: t('description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={pricingApplicationSchema()} />
      <NavBar />
      <main id="main-content">
        <PricingContent />
      </main>
      <Footer />
    </>
  );
}
