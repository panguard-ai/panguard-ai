import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import { STATS } from '@/lib/stats';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import GuardDocsContent from './GuardDocsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Panguard Guard — Documentation',
    description:
      'Real-time skill behavior monitoring with AI pipeline. Configure detection rules, response actions, and threat monitoring.',
    alternates: buildAlternates('/docs/guard', locale),
    openGraph: {
      title: 'Panguard Guard — Panguard AI Docs',
      description: `24/7 skill behavior monitoring: ${STATS.totalRulesDisplay} ATR detection rules, AI analysis, automated response.`,
    },
  };
}

export default function GuardDocsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <GuardDocsContent />
      </main>
      <Footer />
    </>
  );
}
