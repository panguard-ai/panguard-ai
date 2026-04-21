import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EarlyAccessContent from './EarlyAccessContent';

export const metadata = {
  title: 'Team Tier Waitlist',
  description: 'Join the waitlist for PanGuard Team Tier, launching May 2026.',
};

export default function EarlyAccessPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <EarlyAccessContent />
      </main>
      <Footer />
    </>
  );
}
