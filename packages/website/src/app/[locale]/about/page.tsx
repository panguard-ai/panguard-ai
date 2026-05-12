import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { ORGANIZATION_SCHEMA, PERSON_ADAM_SCHEMA } from '@/lib/schema';
import AboutContent from './AboutContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('about.title'),
    description: t('about.description'),
    alternates: buildAlternates('/about', params.locale),
  };
}

export default function AboutPage() {
  return (
    <>
      {/* Reinforce Organization + Person on /about — Google + LLM entity recognition
          benefit from seeing these schemas on the canonical about page, not just root. */}
      <JsonLd data={[ORGANIZATION_SCHEMA, PERSON_ADAM_SCHEMA]} />
      <NavBar />
      <main id="main-content">
        <AboutContent />
      </main>
      <Footer />
    </>
  );
}
