import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import StatusContent from './StatusContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('status.title'),
    description: t('status.description'),
    alternates: buildAlternates('/status', params.locale),
  };
}

export default function StatusPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <StatusContent />
      </main>
      <Footer />
    </>
  );
}
