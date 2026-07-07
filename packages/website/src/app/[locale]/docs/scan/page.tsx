import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScanDocsContent from './ScanDocsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Panguard Scan — Documentation',
    description:
      'Run security audits with one command. Configure scans, interpret results, integrate with CI/CD, and automate with JSON output.',
    alternates: buildAlternates('/docs/scan', locale),
    openGraph: {
      title: 'Panguard Scan — Panguard AI Docs',
      description:
        'One-command security audits: infrastructure, code SAST, remote scanning, compliance reports.',
    },
  };
}

export default function ScanDocsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ScanDocsContent />
      </main>
      <Footer />
    </>
  );
}
