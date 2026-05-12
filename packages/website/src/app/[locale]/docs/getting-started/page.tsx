import type { Metadata } from 'next';
import { getNonce } from '@/lib/nonce';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { techArticleSchema } from '@/lib/schema';
import GettingStartedContent from './GettingStartedContent';

export const metadata: Metadata = {
  title: 'Getting Started — Panguard AI',
  description:
    'Install Panguard AI in under 2 minutes. Quick-start guide for CLI setup, first scan, and 24/7 monitoring.',
  openGraph: {
    title: 'Getting Started — Panguard AI',
    description: 'Install and configure Panguard AI endpoint security in minutes.',
  },
};

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Install Panguard AI',
  description:
    'Install Panguard AI endpoint security in under 2 minutes. One command for Linux, macOS, or Windows.',
  totalTime: 'PT2M',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Install Panguard CLI',
      text: 'Run the install script: curl -fsSL https://get.panguard.ai | bash',
      url: 'https://panguard.ai/docs/getting-started',
    },
    {
      '@type': 'HowToStep',
      name: 'Run your first scan',
      text: 'Execute panguard scan to perform a free 60-second security audit of your system.',
      url: 'https://panguard.ai/docs/getting-started',
    },
    {
      '@type': 'HowToStep',
      name: 'Enable 24/7 monitoring',
      text: 'Run panguard guard to activate the real-time AI protection agent.',
      url: 'https://panguard.ai/docs/getting-started',
    },
  ],
};

export default async function GettingStartedPage() {
  const nonce = await getNonce();

  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <JsonLd
        data={techArticleSchema({
          headline: 'Getting Started with PanGuard AI',
          description:
            'Install PanGuard AI in under 2 minutes. CLI setup, first scan, 24/7 monitoring, and Threat Cloud opt-in walkthrough.',
          url: 'https://panguard.ai/docs/getting-started',
          datePublished: '2026-01-01',
          dateModified: '2026-05-12',
          proficiencyLevel: 'Beginner',
          dependencies: 'Node.js 20+, macOS 12+ or Ubuntu 20.04+ or Windows 10+',
          programmingLanguage: 'TypeScript',
        })}
      />
      <NavBar />
      <main id="main-content">
        <GettingStartedContent />
      </main>
      <Footer />
    </>
  );
}
