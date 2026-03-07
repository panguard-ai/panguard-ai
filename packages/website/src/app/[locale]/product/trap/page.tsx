import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ProductTrapContent from './ProductTrapContent';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productTrap.title'),
    description: t('productTrap.description'),
    alternates: buildAlternates('/product/trap', params.locale),
    openGraph: {
      title: t('productTrap.title'),
      description: t('productTrap.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductTrapPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ProductTrapContent />
      </main>
      <Footer />
    </>
  );
}
