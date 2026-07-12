import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import InstallHero from '@/components/home/InstallHero';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

const TheGap = dynamic(() => import('@/components/home/v2/TheGap'));
const RealIncidents = dynamic(() => import('@/components/home/RealIncidents'));
const Flywheel = dynamic(() => import('@/components/home/v2/Flywheel'));
const AtrRulebook = dynamic(() => import('@/components/home/v2/AtrRulebook'));
const ProofTerminal = dynamic(() => import('@/components/home/v2/ProofTerminal'));
const ProofBand = dynamic(() => import('@/components/home/v4/ProofBand'));
const ProtectProve = dynamic(() => import('@/components/home/v2/ProtectProve'));
const DemoShowcase = dynamic(() => import('@/components/home/DemoShowcase'));
const PricingPreview = dynamic(() => import('@/components/home/PricingPreview'));
const FinalCta = dynamic(() => import('@/components/home/v4/FinalCta'));

/**
 * Homepage — seed-deck narrative arc (2026-07-12), consumer voice.
 * hero(install) → 01 the gap (three eras, no shared standard)
 * → 02 why now (real incidents) → 03 defense accumulates faster (flywheel)
 * → 04 the rulebook exists: ATR (free, MIT) → 05 it runs (real catch)
 * → adoption proof band → 06 free rulebook vs audit-ready PanGuard
 * → dashboard visual → pricing (Community first) → install close.
 * Each claim and stat appears exactly once.
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
          {/* Hero — one-command install terminal (unchanged) */}
          <InstallHero />
          {/* 01. The gap — a brilliant new hire you handed the keys to */}
          <TheGap />
          {/* 02. Why now — real incidents, full-bleed accent band */}
          <RealIncidents />
          {/* 03. How defense wins — accumulate faster than attacks multiply */}
          <Flywheel />
          {/* 04. The rulebook exists — ATR, MIT, free forever */}
          <AtrRulebook />
          {/* 05. It runs — a real attack getting caught */}
          <ProofTerminal />
          {/* Adoption proof — adopters + verified stats */}
          <ProofBand />
          {/* 06. Two ways to run it — free rulebook vs audit-ready PanGuard */}
          <ProtectProve />
          {/* Product visual — Guard dashboard */}
          <DemoShowcase />
          {/* Pricing — Community first */}
          <PricingPreview />
          {/* Close — install command + scan CTA */}
          <FinalCta />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
