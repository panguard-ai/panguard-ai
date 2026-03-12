import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ProductMcpContent from './ProductMcpContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productMcp.title'),
    description: t('productMcp.description'),
    alternates: buildAlternates('/product/mcp', params.locale),
    openGraph: {
      title: t('productMcp.title'),
      description: t('productMcp.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductMcpPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ProductMcpContent />
      </main>
      <Footer />
    </>
  );
}
