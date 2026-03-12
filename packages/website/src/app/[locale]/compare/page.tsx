import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import CompareContent from './CompareContent';

export const metadata: Metadata = {
  title: 'Panguard vs Alternatives — Compare AI Security Solutions',
  description:
    'See how Panguard compares to manual audits, traditional SIEM, and running unprotected. Feature-by-feature comparison for AI-era endpoint security.',
  openGraph: {
    title: 'Panguard vs Alternatives — Panguard AI',
    description:
      'Feature-by-feature comparison: Panguard vs manual audits, SIEM, and no protection.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function ComparePage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <CompareContent />
      </main>
      <Footer />
    </>
  );
}
