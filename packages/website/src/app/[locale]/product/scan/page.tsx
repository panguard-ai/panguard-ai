import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { softwareApplicationSchema } from '@/lib/schema';
import ProductScanContent from './ProductScanContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productScan.title'),
    description: t('productScan.description'),
    alternates: buildAlternates('/product/scan', params.locale),
    openGraph: {
      title: t('productScan.title'),
      description: t('productScan.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductScanPage() {
  return (
    <>
      <JsonLd
        data={softwareApplicationSchema({
          name: 'PanGuard Scan',
          description:
            '60-second security audit for AI agent skills and MCP packages. Sigma + YARA + 419 ATR rules. SARIF 2.1.0 export. Static plus optional LLM second opinion.',
          url: 'https://panguard.ai/product/scan',
          category: 'SecurityApplication',
          applicationSubCategory: 'AI Skill Auditor',
          pricing: 'mixed',
        })}
      />
      <NavBar />
      <main id="main-content">
        <ProductScanContent />
      </main>
      <Footer />
    </>
  );
}
