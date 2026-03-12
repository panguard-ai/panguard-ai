import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
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
      <NavBar />
      <main id="main-content">
        <ProductGuardContent />
      </main>
      <Footer />
    </>
  );
}
