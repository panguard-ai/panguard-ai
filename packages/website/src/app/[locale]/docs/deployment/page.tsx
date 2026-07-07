import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import DeploymentContent from './DeploymentContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  return {
    title: 'Multi-Endpoint Deployment — Panguard AI',
    description:
      'Batch install and manage Panguard across multiple servers using SSH, Ansible, or Threat Cloud.',
    alternates: buildAlternates('/docs/deployment', locale),
    openGraph: {
      title: 'Multi-Endpoint Deployment — Panguard AI',
      description: 'Deploy Panguard across your entire infrastructure with batch install guides.',
    },
  };
}

export default function DeploymentPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <DeploymentContent />
      </main>
      <Footer />
    </>
  );
}
