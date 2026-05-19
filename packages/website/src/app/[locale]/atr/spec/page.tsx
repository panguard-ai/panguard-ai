import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import SpecContent from './SpecContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'ATR Core Specification v1.0 — Agent Threat Rules',
    description:
      'The normative specification for the ATR rule format, evaluation semantics, identifier scheme, and three-tier conformance levels. Draft, RFC 2119 binding.',
    alternates: buildAlternates('/atr/spec', params.locale),
  };
}

export default function ATRSpecPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <SpecContent />
      </main>
      <Footer />
    </>
  );
}
