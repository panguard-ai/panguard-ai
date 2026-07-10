import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { datasetSchema, techArticleSchema } from '@/lib/schema';
import { STATS } from '@/lib/stats';
import EcosystemReportContent from './EcosystemReportContent';

/**
 * Metadata figures derive from the SAME reconciled scan total the page renders:
 * the sum of the severity breakdown. Keeps <title>/meta in lock-step with H1,
 * the stat band, and the Results tiles.
 */
const ECO = STATS.ecosystem;
const SCANNED_TOTAL =
  ECO.findingsClean +
  ECO.findingsCritical +
  ECO.findingsHigh +
  ECO.findingsMedium +
  ECO.findingsLow;
const FLAGGED_PERCENT = Math.round(
  ((SCANNED_TOTAL - ECO.findingsClean) / SCANNED_TOTAL) * 100
);
const SCANNED_DISPLAY = SCANNED_TOTAL.toLocaleString('en-US');
const TOOLS_DISPLAY = ECO.toolsExtracted.toLocaleString('en-US');

export const metadata: Metadata = {
  title: `We Scanned ${SCANNED_DISPLAY} MCP Packages. ${FLAGGED_PERCENT}% Had Security Issues. | PanGuard AI`,
  description: `A large-scale security audit of the MCP skill ecosystem. ${SCANNED_DISPLAY} packages scanned, ${TOOLS_DISPLAY} tool definitions extracted, ${FLAGGED_PERCENT}% flagged. Credential theft, prompt injection, and excessive permissions.`,
  openGraph: {
    title: `We Scanned ${SCANNED_DISPLAY} MCP Packages. ${FLAGGED_PERCENT}% Had Security Issues.`,
    description: `A large-scale security audit of the MCP skill ecosystem. ${SCANNED_DISPLAY} packages, ${TOOLS_DISPLAY} tools, ${FLAGGED_PERCENT}% flagged.`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: `We Scanned ${SCANNED_DISPLAY} MCP Packages. ${FLAGGED_PERCENT}% Had Security Issues.`,
    description: `A large-scale security audit of the MCP skill ecosystem. ${SCANNED_DISPLAY} packages, ${TOOLS_DISPLAY} tools, ${FLAGGED_PERCENT}% flagged.`,
  },
};

export default function EcosystemReportPage() {
  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: 'PanGuard MCP Ecosystem Scan (2026-03)',
            description: `Large-scale security audit of MCP (Model Context Protocol) packages on npm. ${ECO.entriesCrawled.toLocaleString('en-US')} entries crawled, ${SCANNED_DISPLAY} classified, ${TOOLS_DISPLAY} tool definitions extracted. ${FLAGGED_PERCENT}% of packages flagged with security findings (${ECO.findingsCritical} CRITICAL, ${ECO.findingsHigh.toLocaleString('en-US')} HIGH).`,
            url: 'https://panguard.ai/research/mcp-ecosystem-scan',
            datePublished: '2026-03-16',
            variableMeasured: [
              'package finding severity',
              'tool definition count',
              'postinstall script presence',
              'permission requirements',
            ],
            recordCount: SCANNED_TOTAL,
          }),
          techArticleSchema({
            headline: `We Scanned ${SCANNED_DISPLAY} MCP Packages. ${FLAGGED_PERCENT}% Had Security Issues.`,
            description:
              'A large-scale security audit of the MCP skill ecosystem. Methodology, severity distribution, and notable findings.',
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
