import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import AdvancedSetupContent from './AdvancedSetupContent';

export const metadata: Metadata = {
  title: 'Advanced Setup — Panguard AI',
  description:
    'Customize Panguard with your own ATR rules, air-gapped operation, and advanced configuration. Environment variables reference.',
  openGraph: {
    title: 'Advanced Setup — Panguard AI',
    description:
      'Customize Panguard: custom ATR rule directories, air-gapped operation, environment variables.',
  },
};

export default function AdvancedSetupPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <AdvancedSetupContent />
      </main>
      <Footer />
    </>
  );
}
