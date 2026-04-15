import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
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
      <NavBar />
      <main id="main-content">
        <ScanReportContent />
      </main>
      <Footer />
    </>
  );
}
