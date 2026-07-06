import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

const RealIncidents = dynamic(() => import('@/components/home/RealIncidents'));
const PositioningSplit = dynamic(() => import('@/components/home/v4/PositioningSplit'));
const ProofBand = dynamic(() => import('@/components/home/v4/ProofBand'));
const ArchitectureBeat = dynamic(() => import('@/components/home/v4/ArchitectureBeat'));
const DemoShowcase = dynamic(() => import('@/components/home/DemoShowcase'));
const CrystallizeMission = dynamic(() => import('@/components/home/v4/CrystallizeMission'));
const PricingPreview = dynamic(() => import('@/components/home/PricingPreview'));
const FinalCta = dynamic(() => import('@/components/home/v4/FinalCta'));

/**
 * Homepage — researched 10-beat blueprint (2026-07-05):
 * hero(scanner+FX) → why-now band → positioning split → proof band
 * → architecture bento+table → demo → migrator → crystallization+mission
 * → pricing → final CTA. Classic arc: problem → solution → proof →
 * product → price → close. Each claim and stat appears exactly once.
 */
export default async function Home() {
  const t = await getTranslations('home');
  return (
    <>
      <NavBar />
      <RuleStatsProvider>
        <main id="main-content">
          <p id="definition" className="sr-only">
            {t('srDefinition')}
          </p>
          {/* 1. Hero — the scanner, with scan-beam / radar-ping / entrance FX */}
          <ScannerHero />
          {/* 2. Why now — real incidents, full-bleed accent band */}
          <RealIncidents />
          {/* 3. Positioning — one platform, both procurement gates (two-col) */}
          <PositioningSplit />
          {/* 4. Proof — single credibility band (adopters + verified stats) */}
          <ProofBand />
          {/* 5. Architecture — 7-layer bento + honest coverage table */}
          <ArchitectureBeat />
          {/* 6. Product visual — Guard dashboard */}
          <DemoShowcase />
          {/* 7. Threat crystallization + the one mission moment */}
          <CrystallizeMission />
          {/* 8. Pricing */}
          <PricingPreview />
          {/* 9. Close — install command + scan CTA */}
          <FinalCta />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
