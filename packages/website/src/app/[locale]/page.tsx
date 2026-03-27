import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

const RealIncidents = dynamic(() => import('@/components/home/RealIncidents'));
const WhyPanguard = dynamic(() => import('@/components/home/WhyPanguard'));
const HowItWorks = dynamic(() => import('@/components/home/HowItWorks'));
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
          {/* 1. Fear Hero: Scanner + stats + platform bar */}
          <ScannerHero />
          {/* 2. Real CVE Incidents */}
          <RealIncidents />
          {/* 3. Why PanGuard: 3 Pillars + competitive table */}
          <WhyPanguard />
          {/* 4. How It Works: Threat Crystallization */}
          <HowItWorks />
          {/* 5. CTA + Mission */}
          <CTARoadmap />
        </main>
      </RuleStatsProvider>
      <Footer />
    </>
  );
}
