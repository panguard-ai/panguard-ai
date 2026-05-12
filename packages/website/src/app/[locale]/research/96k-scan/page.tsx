import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { datasetSchema, techArticleSchema } from '@/lib/schema';
import ScanReportContent from './ScanReportContent';

export const metadata: Metadata = {
  title: '96,096 AI Agent Skills Scanned. 751 Were Malware. | ATR Research Report',
  description:
    'The largest security scan of AI agent skills ever conducted. 96,096 skills across OpenClaw, Hermes, Skills.sh, ClawHub. 751 confirmed malware from 3 coordinated attackers. C2 server, base64 reverse shells, password-protected zip payloads.',
  openGraph: {
    title: '96,096 AI Agent Skills Scanned. 751 Were Malware.',
    description:
      '3 coordinated attackers. 751 poisoned skills. Base64-encoded reverse shells. The largest AI agent security scan ever conducted.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: '96,096 AI Agent Skills Scanned. 751 Were Malware.',
    description: '3 coordinated attackers. 751 poisoned skills. Base64-encoded reverse shells.',
  },
};

export default function ScanReportPage() {
  return (
    <>
      <JsonLd
        data={[
          datasetSchema({
            name: 'PanGuard 96K AI Agent Skill Wild Scan (2026-04)',
            description:
              'Full ecosystem audit of AI agent skills. Crawled 96,096 entries across OpenClaw (56,503), ClawHub (36,378), Skills.sh (3,115), and a Hermes-protocol sample (100). Scanned 67,799 with parseable content. Result: 1,096 confirmed malicious skills, 11,324 total threats detected, 249 triple-threat packages (shell + network + filesystem access).',
            url: 'https://panguard.ai/research/96k-scan',
            datePublished: '2026-04-14',
            variableMeasured: [
              'skill threat verdict',
              'attack pattern category',
              'severity classification',
              'postinstall script presence',
            ],
            recordCount: 96096,
            doi: '10.5281/zenodo.19178002',
          }),
          techArticleSchema({
            headline: '96,096 AI Agent Skills Scanned. 751 Were Malware.',
            description:
              'The largest security scan of AI agent skills ever conducted. Methodology, raw findings, and reproducibility scripts.',
            url: 'https://panguard.ai/research/96k-scan',
            datePublished: '2026-04-14',
            dateModified: '2026-04-21',
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
