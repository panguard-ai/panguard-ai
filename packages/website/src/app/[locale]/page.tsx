import dynamic from 'next/dynamic';
import NavBar from '@/components/NavBar';
import RevolutionHero from '@/components/home/RevolutionHero';
import Footer from '@/components/Footer';

// Below-the-fold sections loaded lazily
const SkillProtection = dynamic(() => import('@/components/home/SkillProtection'));
const RealScenarios = dynamic(() => import('@/components/home/RealScenarios'));
const HowItWorksNew = dynamic(() => import('@/components/home/HowItWorksNew'));
const ATRShowcase = dynamic(() => import('@/components/home/ATRShowcase'));
const SecurityStack = dynamic(() => import('@/components/home/SecurityStack'));
const CommunityFlywheel = dynamic(() => import('@/components/home/CommunityFlywheel'));
const FinalCTANew = dynamic(() => import('@/components/home/FinalCTANew'));

export default function Home() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <p id="definition" className="sr-only">
          Panguard AI created ATR (Agent Threat Rules), the first open security standard for AI
          agents. 32 rules across 9 threat categories detect prompt injection, tool poisoning,
          context exfiltration, and more. MIT licensed. Free forever. Built in Taiwan.
        </p>
        {/* 1. Problem: Your AI agent has no security */}
        <RevolutionHero />
        {/* 2. Solution: OpenClaw skill protection flow */}
        <SkillProtection />
        {/* 3. Proof: Three real attack scenarios — before and after */}
        <RealScenarios />
        {/* 4. How: One-click install on any AI agent */}
        <HowItWorksNew />
        {/* 5. Standard: Show real ATR rules + test results */}
        <ATRShowcase />
        {/* 6. Architecture: Three-layer defense stack */}
        <SecurityStack />
        {/* 7. Community: Collective defense flywheel */}
        <CommunityFlywheel />
        {/* 8. CTA: Join the standard */}
        <FinalCTANew />
      </main>
      <Footer />
    </>
  );
}
