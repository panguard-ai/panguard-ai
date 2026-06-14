import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import GuardDocsContent from './GuardDocsContent';

export const metadata: Metadata = {
  title: 'Panguard Guard — Documentation',
  description:
    'Inline skill behavior detection with AI pipeline. Configure detection rules, response actions, and threat monitoring.',
  openGraph: {
    title: 'Panguard Guard — Panguard AI Docs',
    description:
      'Inline skill behavior detection: 650+ ATR detection rules, AI analysis, automated response.',
  },
};

export default function GuardDocsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <GuardDocsContent />
      </main>
      <Footer />
    </>
  );
}
