import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { datasetSchema, techArticleSchema } from '@/lib/schema';
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
      <JsonLd
        data={[
          datasetSchema({
            name: 'PanGuard MCP Ecosystem Scan (2026-03)',
            description:
              'Large-scale security audit of MCP (Model Context Protocol) packages on npm. 2,769 packages crawled, 2,386 with parseable content, 35,858 tool definitions extracted. 49% of packages flagged with security findings (182 CRITICAL, 1,124 HIGH).',
            url: 'https://panguard.ai/research/mcp-ecosystem-scan',
            datePublished: '2026-03-16',
            variableMeasured: [
              'package finding severity',
              'tool definition count',
              'postinstall script presence',
              'permission requirements',
            ],
            recordCount: 2769,
          }),
          techArticleSchema({
            headline: 'We Scanned 2,386 MCP Packages. 49% Had Security Issues.',
            description:
              'The first large-scale security audit of the MCP skill ecosystem. Methodology, severity distribution, and notable findings.',
            url: 'https://panguard.ai/research/mcp-ecosystem-scan',
            datePublished: '2026-03-16',
            proficiencyLevel: 'Expert',
          }),
        ]}
      />
      <NavBar />
      <main id="main-content">
        <EcosystemReportContent />
      </main>
      <Footer />
    </>
  );
}
