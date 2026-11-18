import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { datasetSchema, techArticleSchema } from '@/lib/schema';
import { STATS } from '@/lib/stats';
import ScanReportContent from './ScanReportContent';

const WS = STATS.wildScan;
const SCANNED = WS.skillsScanned.toLocaleString('en-US');
const FLAGGED = WS.flagged.toLocaleString('en-US');
const ENGINE = `scan engine ${WS.engineVersion} (${WS.engineRules} ATR rules)`;
const HEADLINE = `${SCANNED} AI Agent Skills and MCP Servers Scanned, ${FLAGGED} Flagged (scan engine ${WS.engineVersion})`;

export const metadata: Metadata = {
  title: `AI Agent Skill Wild Scan (scan engine ${WS.engineVersion}): ${SCANNED} Scanned, ${FLAGGED} Flagged | ATR Research Report`,
  description: `April 2026 scan of ${SCANNED} AI agent skills and MCP servers from five public sources (OpenClaw, ClawHub, Skills.sh, Hermes Agent, and an MCP server crawl) with ${ENGINE}: ${FLAGGED} flagged. Payloads among them include base64 reverse shells, a C2 server and password-protected zip droppers. A flag is a rule match, not a confirmed verdict.`,
  openGraph: {
    title: HEADLINE,
    description: `April 2026 wild scan across five public sources with ${ENGINE}. A flag is a rule match, not a confirmed verdict.`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: HEADLINE,
    description: `April 2026 wild scan with ${ENGINE}. A flag is a rule match, not a confirmed verdict.`,
  },
};

export default function ScanReportPage() {
  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: 'PanGuard AI Agent Skill Wild Scan (2026-04)',
            description: `Scan of ${SCANNED} AI agent skills and MCP servers from five public sources (OpenClaw, ClawHub, Skills.sh, Hermes Agent, and an MCP server crawl of Glama, npm, GitHub, awesome-lists and mcp.so), run ${WS.scannedOn} with ${ENGINE}: ${FLAGGED} flagged. A flag is a rule match, not a confirmed-malicious verdict. The flagged-file list (paths and rule ids, no content) is data/full-scan-v2-2026-04-14.json in the agent-threat-rules repository.`,
            url: 'https://panguard.ai/research/96k-scan',
            datePublished: '2026-04-14',
            variableMeasured: ['ATR rule matches per skill', 'source registry'],
            recordCount: WS.skillsScanned,
          }),
          techArticleSchema({
            headline: HEADLINE,
            description:
              'April 2026 wild scan of AI agent skills and MCP servers across five public sources: the payloads found among flagged skills, and what the scan can and cannot tell you.',
            url: 'https://panguard.ai/research/96k-scan',
            datePublished: '2026-04-14',
            dateModified: '2026-10-16',
            proficiencyLevel: 'Expert',
          }),
        ]}
      />
      <NavBar />
      <main id="main-content">
        <ScanReportContent />
      </main>
      <Footer />
    </>
  );
}
