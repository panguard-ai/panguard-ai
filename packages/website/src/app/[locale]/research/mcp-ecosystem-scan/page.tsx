import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EcosystemReportContent from './EcosystemReportContent';

export const metadata: Metadata = {
  title: 'We Scanned 1,295 MCP Skills. 2% Were Stealing Credentials. | PanGuard AI',
  description:
    'The first large-scale security audit of the MCP skill ecosystem. 1,295 skills scanned, 26 malicious found. Credential theft, prompt injection, and excessive permissions.',
  openGraph: {
    title: 'We Scanned 1,295 MCP Skills. 2% Were Stealing Credentials.',
    description: 'The first large-scale security audit of the MCP skill ecosystem.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'We Scanned 1,295 MCP Skills. 2% Were Stealing Credentials.',
    description: 'The first large-scale security audit of the MCP skill ecosystem.',
  },
};

export default function EcosystemReportPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <EcosystemReportContent />
      </main>
      <Footer />
    </>
  );
}
