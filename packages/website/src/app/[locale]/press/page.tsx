import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import PressContent from './PressContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('press.title'),
    description: t('press.description'),
    alternates: buildAlternates('/press', params.locale),
  };
}

export default function PressPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <PressContent />
      </main>
      <Footer />
    </>
  );
}
