import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import AdvancedSetupContent from './AdvancedSetupContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Advanced Setup — Panguard AI',
    description:
      'Enhance Panguard with Ollama (local LLM) and advanced configuration. Environment variables reference.',
    alternates: buildAlternates('/docs/advanced-setup', locale),
    openGraph: {
      title: 'Advanced Setup — Panguard AI',
      description:
        'Enhance Panguard with optional integrations: Ollama local LLM, environment variables.',
    },
  };
}

export default function AdvancedSetupPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <AdvancedSetupContent />
      </main>
      <Footer />
    </>
  );
}

// force fresh rebuild: clear stale i18n build-cache artifact (2026-07-10)
