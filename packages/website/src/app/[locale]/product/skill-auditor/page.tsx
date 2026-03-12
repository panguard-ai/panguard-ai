import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import SkillAuditorProductContent from './SkillAuditorProductContent';

export const metadata: Metadata = {
  title: 'Skill Auditor — Pre-Install Security for AI Agent Skills',
  description:
    'The security layer that runs before your AI agent does. Scan OpenClaw, Claude, and MCP skills for prompt injection, tool poisoning, and hidden threats. 0-100 risk score in under 1 second.',
  openGraph: {
    title: 'Skill Auditor — Panguard AI',
    description:
      "Know before you install. Not after it's too late. Automated security scanning for AI agent skills.",
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function SkillAuditorProductPage() {
  return (
    <>
      <NavBar />
      <main id="main-content">
        <SkillAuditorProductContent />
      </main>
      <Footer />
    </>
  );
}
