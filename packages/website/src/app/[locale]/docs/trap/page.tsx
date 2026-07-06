import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import TrapDocsContent from './TrapDocsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Panguard Trap — Documentation',
    description:
      'Deploy honeypot services to detect and profile attackers. SSH, HTTP, and DNS decoys with automatic threat intelligence.',
    alternates: buildAlternates('/docs/trap', locale),
    openGraph: {
      title: 'Panguard Trap — Panguard AI Docs',
      description: 'Honeypot deployment, attacker profiling, and threat intelligence feeds.',
    },
  };
}

export default function TrapDocsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <TrapDocsContent />
      </main>
      <Footer />
    </>
  );
}
