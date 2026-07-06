import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ChatDocsContent from './ChatDocsContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Panguard Chat — Documentation',
    description:
      'AI-powered security notifications via Telegram, Slack, LINE, Email, and Webhook. Natural language threat alerts and daily summaries.',
    alternates: buildAlternates('/docs/chat', locale),
    openGraph: {
      title: 'Panguard Chat — Panguard AI Docs',
      description:
        'Security notifications in plain language. Connect Telegram, Slack, LINE, or Email in minutes.',
    },
  };
}

export default function ChatDocsPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <ChatDocsContent />
      </main>
      <Footer />
    </>
  );
}
