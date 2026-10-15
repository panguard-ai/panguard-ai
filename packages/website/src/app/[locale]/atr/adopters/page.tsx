import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import AdoptersContent from './AdoptersContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'ATR Adopters — Microsoft, Cisco, MISP, OWASP, Gen Digital',
    description:
      'Maintainer-accepted ATR contributions, not vendor endorsements: merged PRs in Microsoft Agent Governance Toolkit examples, the open-source Cisco AI Defense skill-scanner, MISP (CIRCL), OWASP Agent-Security-Regression-Harness and Gen Digital Sage, plus awesome-list inclusions.',
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
