import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

// Below-the-fold sections loaded lazily
const EcosystemEvidence = dynamic(() => import('@/components/home/EcosystemEvidence'));
const ATRStandard = dynamic(() => import('@/components/home/ATRStandard'));
const ProductShowcase = dynamic(() => import('@/components/home/ProductShowcase'));
const CommunityFlywheel = dynamic(() => import('@/components/home/CommunityFlywheel'));
const GuardCTA = dynamic(() => import('@/components/home/GuardCTA'));
const FinalCTANew = dynamic(() => import('@/components/home/FinalCTANew'));

export default function Home() {
  return (
    <>
      <NavBar />
      <RuleStatsProvider>
        <main id="main-content">
          <p id="definition" className="sr-only">
            Panguard AI provides the first Skills Audit for AI agents. It audits every skill before
            it runs, catches known threats with community ATR + Sigma + YARA rules, catches unknown
            threats with AI analysis, and shares new rules to protect everyone. MIT licensed. Open
            source.
          </p>
          {/* 1. Problem + Scanner: AI agents have full access, zero security */}
          <ScannerHero />
          {/* 2. Evidence: We scanned 1,295 skills — here's what we found */}
          <EcosystemEvidence />
          {/* 3. Standard: ATR — the open audit standard for AI agents */}
          <ATRStandard />
          {/* 4. Products: Skill Auditor + Guard + Threat Cloud deep dive */}
          <ProductShowcase />
          {/* 5. Flywheel: Every scan makes the network safer */}
          <CommunityFlywheel />
          {/* 5. Guard: Done scanning? One command, 24/7 protection */}
          <GuardCTA />
          {/* 6. Final CTA + trust signals */}
          <FinalCTANew />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
