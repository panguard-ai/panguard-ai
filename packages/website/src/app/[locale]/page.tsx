import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import RegulatedIndustriesPositioning from '@/components/home/RegulatedIndustriesPositioning';
import SecurityLayers from '@/components/home/SecurityLayers';
import LiveStats from '@/components/home/LiveStats';
import CoverageComparison from '@/components/home/CoverageComparison';
import PricingPreview from '@/components/home/PricingPreview';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

const SocialProof = dynamic(() => import('@/components/home/SocialProof'));
const DemoShowcase = dynamic(() => import('@/components/home/DemoShowcase'));
const RealIncidents = dynamic(() => import('@/components/home/RealIncidents'));
const WhyPanguard = dynamic(() => import('@/components/home/WhyPanguard'));
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'));
const CTARoadmap = dynamic(() => import('@/components/home/CTARoadmap'));
const DetectionHeritageBridge = dynamic(
  () => import('@/components/home/DetectionHeritageBridge'),
);

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
          {/* 1. Scanner Hero */}
          <ScannerHero />
          {/* 1.5. Regulated Industries Positioning (Built on ATR + Two-Track + Migrator + 5-Framework Compliance) */}
          <RegulatedIndustriesPositioning />
          {/* 1.7. Detection Heritage Bridge — 15 legacy formats → ATR + sovereign AI angle */}
          <DetectionHeritageBridge />
          {/* 2. 7-layer Security Architecture */}
          <SecurityLayers />
          {/* 3. Live Stats */}
          <LiveStats />
          {/* 4. Social proof: Cisco, OWASP, live metrics */}
          <SocialProof />
          {/* 5. Real CVE Incidents */}
          <RealIncidents />
          {/* 6. Coverage Comparison vs Competitors */}
          <CoverageComparison />
          {/* 7. Product demo: Guard dashboard screenshots */}
          <DemoShowcase />
          {/* 8. How It Works: Threat Crystallization */}
          <HowItWorks />
          {/* 9. Pricing Preview */}
          <PricingPreview />
          {/* 10. CTA + Mission */}
          <CTARoadmap />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
