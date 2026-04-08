import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import { getNonce } from '@/lib/nonce';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import HowItWorksContent from './HowItWorksContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('howItWorks.title'),
    description: t('howItWorks.description'),
    alternates: buildAlternates('/how-it-works', params.locale),
    openGraph: {
      title: t('howItWorks.title'),
      description: t('howItWorks.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How Panguard AI Protects Your Servers',
  description:
    'Panguard uses a three-stage security pipeline with a three-tier AI funnel to detect, analyze, and respond to threats in real time.',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Detect',
      text: 'Rule-based scanning with 108 ATR (Agent Threat Rules) catches known AI agent threats locally -- prompt injection, tool poisoning, credential exfiltration.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Analyze',
      text: 'Behavioral AI analyzes suspicious patterns using local models (Ollama) or cloud AI for advanced correlation.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Respond',
      text: 'Automated threat response isolates compromised processes, blocks malicious IPs, and quarantines files.',
    },
  ],
};

export default async function HowItWorksPage() {
  const nonce = await getNonce();

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <NavBar />
      <main id="main-content">
        <HowItWorksContent />
      </main>
      <Footer />
    </>
  );
}
