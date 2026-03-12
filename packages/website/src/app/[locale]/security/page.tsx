import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import SecurityContent from './SecurityContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('security.title'),
    description: t('security.description'),
    alternates: buildAlternates('/security', params.locale),
  };
}

export default function SecurityPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <SecurityContent />
      </main>
      <Footer />
    </>
  );
}
