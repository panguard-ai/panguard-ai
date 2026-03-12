import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import TrustContent from './TrustContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('trust.title'),
    description: t('trust.description'),
    alternates: buildAlternates('/trust', params.locale),
  };
}

export default function TrustPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <TrustContent />
      </main>
      <Footer />
    </>
  );
}
