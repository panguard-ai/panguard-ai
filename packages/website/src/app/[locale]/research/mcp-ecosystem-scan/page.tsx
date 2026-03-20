import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EcosystemReportContent from './EcosystemReportContent';

export const metadata: Metadata = {
  title: 'We Scanned 2,386 MCP Packages. 49% Had Security Issues. | PanGuard AI',
  description:
    'The first large-scale security audit of the MCP skill ecosystem. 2,386 packages scanned, 35,858 tool definitions extracted, 49% flagged. Credential theft, prompt injection, and excessive permissions.',
  openGraph: {
    title: 'We Scanned 2,386 MCP Packages. 49% Had Security Issues.',
    description:
      'The first large-scale security audit of the MCP skill ecosystem. 2,386 packages, 35,858 tools, 49% flagged.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'We Scanned 2,386 MCP Packages. 49% Had Security Issues.',
    description:
      'The first large-scale security audit of the MCP skill ecosystem. 2,386 packages, 35,858 tools, 49% flagged.',
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
