import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import CLIReferencePage from './CLIReferencePage';

export const metadata: Metadata = {
  title: 'CLI Reference — Panguard AI',
  description:
    'Complete command reference for the Panguard CLI. Explore all 21 commands for scanning, protection, honeypots, reporting, and more.',
  openGraph: {
    title: 'CLI Reference — Panguard AI',
    description:
      'Complete command reference for the Panguard CLI. Scanning, real-time protection, honeypots, compliance reports, and system utilities.',
  },
};

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
