import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { softwareApplicationSchema } from '@/lib/schema';
import ProductGuardContent from './ProductGuardContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productGuard.title'),
    description: t('productGuard.description'),
    alternates: buildAlternates('/product/guard', params.locale),
    openGraph: {
      title: t('productGuard.title'),
      description: t('productGuard.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductGuardPage() {
  return (
    <>
      <JsonLd
        data={softwareApplicationSchema({
          name: 'PanGuard Guard',
          description:
            'Runtime enforcement engine. 4-agent pipeline (Detect, Analyze, Respond, Report) loads 419 ATR rules and enforces them on every MCP and skill event in real time. 11 configurable response actions including block, quarantine, kill, notify.',
          url: 'https://panguard.ai/product/guard',
          category: 'SecurityApplication',
          applicationSubCategory: 'Runtime Security',
          pricing: 'mixed',
        })}
      />
      <NavBar />
      <main id="main-content">
        <ProductGuardContent />
      </main>
      <Footer />
    </>
  );
}
