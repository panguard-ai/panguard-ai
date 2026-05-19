import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import CiteContent from './CiteContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'How to Cite ATR — BibTeX, APA, Chicago, CITATION.cff',
    description:
      'Citation formats for academic and policy work: BibTeX, APA, Chicago, IEEE, plus the Zenodo DOI and machine-readable CITATION.cff entry.',
    alternates: buildAlternates('/atr/cite', params.locale),
  };
}

export default function ATRCitePage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <CiteContent />
      </main>
      <Footer />
    </>
  );
}
