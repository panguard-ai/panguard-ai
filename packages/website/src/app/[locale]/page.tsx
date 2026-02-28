import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Panguard AI — AI-Powered Endpoint Security',
  description:
    'Protect your infrastructure with AI-driven threat detection, 24/7 monitoring, honeypots, and compliance reporting. Free tier available.',
  openGraph: {
    title: 'Panguard AI — AI-Powered Endpoint Security',
    description:
      'Protect your infrastructure with AI-driven threat detection, 24/7 monitoring, honeypots, and compliance reporting.',
    type: 'website',
    url: 'https://panguard.ai',
  },
};
import Hero from '@/components/home/Hero';
import WakeUpCall from '@/components/home/WakeUpCall';
import TheOldWay from '@/components/home/TheOldWay';
import TheShift from '@/components/home/TheShift';
import The3AMStory from '@/components/home/The3AMStory';
import SixLayers from '@/components/home/SixLayers';
import UseCases from '@/components/home/UseCases';
import TheEvidence from '@/components/home/TheEvidence';
import HomePricing from '@/components/home/HomePricing';
import FinalCTA from '@/components/home/FinalCTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <NavBar />
      <main>
        {/* 1. Hero */}
        <Hero />
        {/* 2. WakeUpCall — The reality of cyber threats */}
        <WakeUpCall />
        {/* 3. TheOldWay — DIY vs Outsource vs Panguard */}
        <TheOldWay />
        {/* 4. TheShift — Philosophy + Architecture */}
        <TheShift />
        {/* 5. The3AMStory — Without vs With Panguard */}
        <The3AMStory />
        {/* 6. SixLayers — 6 product cards */}
        <SixLayers />
        {/* 7. UseCases — 4 persona scenarios */}
        <UseCases />
        {/* 8. TheEvidence — Stats + Trust */}
        <TheEvidence />
        {/* 9. Pricing */}
        <HomePricing />
        {/* 10. FinalCTA */}
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
