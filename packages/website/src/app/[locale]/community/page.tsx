import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { buildAlternates } from '@/lib/seo';
import LeaderboardContent from './LeaderboardContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  return {
    title: 'Community | PanGuard',
    description:
      'PanGuard community leaderboard. See who is contributing to collective AI agent security.',
    alternates: buildAlternates('/community', params.locale),
  };
}

export default function CommunityPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <LeaderboardContent />
      </main>
      <Footer />
    </>
  );
}
