import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

// Below-the-fold sections loaded lazily
const Evidence = dynamic(() => import('@/components/home/Evidence'));
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'));
const CTARoadmap = dynamic(() => import('@/components/home/CTARoadmap'));

export default function Home() {
  return (
    <>
      <NavBar />
      <RuleStatsProvider>
        <main id="main-content">
          <p id="definition" className="sr-only">
            Panguard AI provides the first Skills Audit for AI agents. It audits every skill before
            it runs, catches known threats with community ATR (Agent Threat Rules), catches unknown
            threats with AI analysis, and shares new rules to protect everyone. MIT licensed. Open
            source.
          </p>
          {/* 1. Hero: Scanner + stats + platform bar */}
          <ScannerHero />
          {/* 2. Evidence: Real ClawHub scan cases */}
          <Evidence />
          {/* 4. How It Works: Threat Crystallization + competitive comparison */}
          <HowItWorks />
          {/* 5. CTA + Mission + Roadmap */}
          <CTARoadmap />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
