import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ComplianceContent from './ComplianceContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('compliance.title'),
    description: t('compliance.description'),
    alternates: buildAlternates('/compliance', params.locale),
  };
}

export default function CompliancePage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ComplianceContent />
      </main>
      <Footer />
    </>
  );
}
