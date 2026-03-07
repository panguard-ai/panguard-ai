import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import BenchmarkContent from './BenchmarkContent';

export const metadata: Metadata = {
  title: 'Benchmark & Capability Boundaries — Panguard AI',
  description:
    'Panguard AI performance benchmarks, detection latency, resource consumption, and transparent capability boundaries.',
  openGraph: {
    title: 'Benchmark & Capability Boundaries — Panguard AI',
    description:
      'Detection performance data, false positive control, resource usage, and what Panguard AI does not do.',
  },
};

export default function BenchmarkPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <BenchmarkContent />
      </main>
      <Footer />
    </>
  );
}
