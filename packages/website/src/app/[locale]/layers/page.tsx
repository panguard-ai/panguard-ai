import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import LayersIndexContent from './LayersIndexContent';

export const metadata = {
  title: '7-Layer Agent Security Architecture',
  description:
    'The 7 layers AI agents need: Discover, Audit, Protect, Detect, Deceive, Respond, Govern. What each layer does, why you need it, and what PanGuard ships today.',
};

export default function LayersIndexPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <LayersIndexContent />
      </main>
      <Footer />
    </>
  );
}
