import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ChangelogContent from './ChangelogContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('changelog.title'),
    description: t('changelog.description'),
    alternates: buildAlternates('/changelog', params.locale),
  };
}

export default function ChangelogPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ChangelogContent />
      </main>
      <Footer />
    </>
  );
}
