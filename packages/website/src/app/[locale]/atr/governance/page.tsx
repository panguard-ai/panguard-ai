import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import GovernanceContent from './GovernanceContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'ATR Governance — Technical Steering Committee',
    description:
      'How ATR is governed: BDFL transitional authority, Technical Steering Committee structure, rule numbering authority, conflict-of-interest policy, and Enterprise Member program.',
    alternates: buildAlternates('/atr/governance', params.locale),
  };
}

export default function ATRGovernancePage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <GovernanceContent />
      </main>
      <Footer />
    </>
  );
}
