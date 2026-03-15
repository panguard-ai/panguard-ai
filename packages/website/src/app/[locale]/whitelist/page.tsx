import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import WhitelistContent from './WhitelistContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('whitelist.title'),
    description: t('whitelist.description'),
    alternates: buildAlternates('/whitelist', params.locale),
  };
}

export default function WhitelistPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <WhitelistContent />
      </main>
      <Footer />
    </>
  );
}
