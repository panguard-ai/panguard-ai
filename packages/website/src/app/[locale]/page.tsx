import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import ScannerHero from '@/components/home/ScannerHero';
import { RuleStatsProvider } from '@/contexts/RuleStatsContext';

// Below-the-fold sections loaded lazily
const Evidence = dynamic(() => import('@/components/home/Evidence'));
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
