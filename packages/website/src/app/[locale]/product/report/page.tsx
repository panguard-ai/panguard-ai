import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ComingSoonContent from '@/components/product/ComingSoonContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productReport.title'),
    description: t('productReport.description'),
    alternates: buildAlternates('/product/report', params.locale),
    openGraph: {
      title: t('productReport.title'),
      description: t('productReport.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductReportPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ComingSoonContent productKey="report" />
      </main>
      <Footer />
    </>
  );
}
