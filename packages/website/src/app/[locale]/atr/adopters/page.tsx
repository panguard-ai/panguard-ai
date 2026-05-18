import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import AdoptersContent from './AdoptersContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'ATR Adopters — Microsoft, Cisco, MISP, OWASP, Gen Digital',
    description:
      'Production deployments of ATR: 7 merged PRs across 6 ecosystems including Microsoft Agent Governance Toolkit, Cisco AI Defense, MISP (CIRCL), OWASP Agent-Security-Regression-Harness, and Gen Digital Sage. Plus 4 awesome-list inclusions.',
    alternates: buildAlternates('/atr/adopters', params.locale),
  };
}

export default function ATRAdoptersPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <AdoptersContent />
      </main>
      <Footer />
    </>
  );
}
