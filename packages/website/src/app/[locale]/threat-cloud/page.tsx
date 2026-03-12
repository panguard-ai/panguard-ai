import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ThreatCloudContent from './ThreatCloudContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('threatCloud.title'),
    description: t('threatCloud.description'),
    alternates: buildAlternates('/threat-cloud', params.locale),
  };
}

export default function ThreatCloudPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ThreatCloudContent />
      </main>
      <Footer />
    </>
  );
}
