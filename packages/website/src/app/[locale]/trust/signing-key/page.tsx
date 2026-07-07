import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import SigningKeyContent from './SigningKeyContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('trustSigningKey.title'),
    description: t('trustSigningKey.description'),
    alternates: buildAlternates('/trust/signing-key', params.locale),
  };
}

export default function SigningKeyPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <SigningKeyContent />
      </main>
      <Footer />
    </>
  );
}
