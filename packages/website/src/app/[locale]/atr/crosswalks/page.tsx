import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import CrosswalksContent from './CrosswalksContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'ATR Crosswalks — NIST AI RMF, OWASP, ISO 42001, MITRE ATLAS, SAFE-MCP, Five Eyes',
    description:
      'Mappings between ATR detection rules and the major AI governance frameworks. ATR is the executable detection layer that operationalizes policy frameworks at scan time.',
    alternates: buildAlternates('/atr/crosswalks', params.locale),
  };
}

export default function ATRCrosswalksPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <CrosswalksContent />
      </main>
      <Footer />
    </>
  );
}
