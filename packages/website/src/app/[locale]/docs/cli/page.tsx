import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import CLIReferencePage from './CLIReferencePage';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'CLI Reference — Panguard AI',
    description:
      'Complete command reference for the Panguard CLI. Explore all 23 commands for scanning, protection, honeypots, reporting, and more.',
    alternates: buildAlternates('/docs/cli', locale),
    openGraph: {
      title: 'CLI Reference — Panguard AI',
      description:
        'Complete command reference for the Panguard CLI. Scanning, real-time protection, honeypots, compliance reports, and system utilities.',
    },
  };
}

export default function Page() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <CLIReferencePage />
      </main>
      <Footer />
    </>
  );
}
