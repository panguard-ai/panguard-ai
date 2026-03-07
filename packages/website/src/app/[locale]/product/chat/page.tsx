import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ProductChatContent from './ProductChatContent';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productChat.title'),
    description: t('productChat.description'),
    alternates: buildAlternates('/product/chat', params.locale),
    openGraph: {
      title: t('productChat.title'),
      description: t('productChat.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductChatPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ProductChatContent />
      </main>
      <Footer />
    </>
  );
}
