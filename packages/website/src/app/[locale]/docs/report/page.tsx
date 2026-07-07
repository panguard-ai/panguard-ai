import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ReportDocsContent from './ReportDocsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Panguard Report — Documentation',
    description:
      'Generate compliance reports for ISO 27001, SOC 2, and Taiwan TCSA. Automated evidence collection with PDF export.',
    alternates: buildAlternates('/docs/report', locale),
    openGraph: {
      title: 'Panguard Report — Panguard AI Docs',
      description:
        'Automated compliance reporting: ISO 27001, SOC 2, TCSA. PDF export with AI-generated remediation steps.',
    },
  };
}

export default function ReportDocsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ReportDocsContent />
      </main>
      <Footer />
    </>
  );
}
