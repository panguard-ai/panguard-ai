import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import BlacklistContent from './BlacklistContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('blacklist.title'),
    description: t('blacklist.description'),
    alternates: buildAlternates('/blacklist', params.locale),
  };
}

export default function BlacklistPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <BlacklistContent />
      </main>
      <Footer />
    </>
  );
}
