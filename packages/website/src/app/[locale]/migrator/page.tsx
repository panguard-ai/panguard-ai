import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import MigratorContent from './MigratorContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'PanGuard Migrator — Sigma/YARA → ATR YAML with EU AI Act compliance',
    description:
      'Convert legacy Sigma and YARA detection rules into ATR YAML for AI agents in one command, with EU AI Act audit pack, OWASP Agentic Top 10 mapping, and live activation demo.',
    alternates: buildAlternates('/migrator', params.locale),
  };
}

export default function MigratorPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <MigratorContent />
      </main>
      <Footer />
    </>
  );
}
