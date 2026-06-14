import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import MissionBand from '@/components/home/MissionBand';
import RegulatedIndustriesPositioning from '@/components/home/RegulatedIndustriesPositioning';
import SecurityLayers from '@/components/home/SecurityLayers';
import LiveStats from '@/components/home/LiveStats';
import CoverageComparison from '@/components/home/CoverageComparison';
import PricingPreview from '@/components/home/PricingPreview';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

const SocialProof = dynamic(() => import('@/components/home/SocialProof'));
const DemoShowcase = dynamic(() => import('@/components/home/DemoShowcase'));
const RealIncidents = dynamic(() => import('@/components/home/RealIncidents'));
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'));
const FlywheelModel = dynamic(() => import('@/components/home/FlywheelModel'));
const CTARoadmap = dynamic(() => import('@/components/home/CTARoadmap'));

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
          {/* 1. Hero — install-first (positioning + free install CTA) */}
          <ScannerHero />
          {/* 2. Business model: the flywheel (standard spreads -> detection obligation -> proof product) */}
          <FlywheelModel />
          {/* 3. Mission band */}
          <MissionBand />
          {/* 4. How It Works: install -> scan -> sensor */}
          <HowItWorks />
          {/* 5. Live Stats */}
          <LiveStats />
          {/* 6. Social proof: Cisco, OWASP, live metrics */}
          <SocialProof />
          {/* 7. 7-layer Security Architecture */}
          <SecurityLayers />
          {/* 8. Coverage Comparison vs Competitors */}
          <CoverageComparison />
          {/* 9. Real CVE Incidents */}
          <RealIncidents />
          {/* 10. Product demo: Guard dashboard screenshots */}
          <DemoShowcase />
          {/* 11. Regulated industries / compliance — enterprise leg, below the fold */}
          <RegulatedIndustriesPositioning />
          {/* 12. Pricing Preview */}
          <PricingPreview />
          {/* 13. CTA + Mission */}
          <CTARoadmap />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
