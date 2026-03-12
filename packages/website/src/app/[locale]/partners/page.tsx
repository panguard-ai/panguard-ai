import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import PartnersContent from './PartnersContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('partners.title'),
    description: t('partners.description'),
    alternates: buildAlternates('/partners', params.locale),
  };
}

export default function PartnersPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <PartnersContent />
      </main>
      <Footer />
    </>
  );
}
