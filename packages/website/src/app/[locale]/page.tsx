import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import MissionBand from '@/components/home/MissionBand';
import RegulatedIndustriesPositioning from '@/components/home/RegulatedIndustriesPositioning';
import SecurityLayers from '@/components/home/SecurityLayers';
import LiveStats from '@/components/home/LiveStats';
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
          {/* 1. Hero — product-first (what you get + free install CTA) */}
          <ScannerHero />
          {/* 2. How It Works: install -> scan -> guard (concrete onboarding, before philosophy) */}
          <HowItWorks />
          {/* 3. Business model: the flywheel (standard spreads -> detection obligation -> proof product) */}
          <FlywheelModel />
          {/* 4. Mission band */}
          <MissionBand />
          {/* 5. Live Stats */}
          <LiveStats />
          {/* 6. Social proof: Cisco, Microsoft, live metrics */}
          <SocialProof />
          {/* 7. 7-layer Security Architecture (single canonical layer section) */}
          <SecurityLayers />
          {/* 8. Real CVE Incidents + wild-scan finding */}
          <RealIncidents />
          {/* 9. Product demo: Guard dashboard screenshots */}
          <DemoShowcase />
          {/* 10. Regulated industries / compliance — enterprise leg, below the fold */}
          <RegulatedIndustriesPositioning />
          {/* 11. Pricing Preview */}
          <PricingPreview />
          {/* 12. CTA + Mission */}
          <CTARoadmap />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
