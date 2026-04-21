import { getTranslations } from 'next-intl/server';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import PricingContent from './PricingContent';

export const metadata = {
  title: 'Pricing',
  description: 'PanGuard pricing plans for community, team, business, and enterprise.',
};

export default async function PricingPage() {
  const t = await getTranslations('pricing');
  return (
    <>
      <NavBar />
      <main id="main-content">
        <PricingContent />
      </main>
      <Footer />
    </>
  );
}
