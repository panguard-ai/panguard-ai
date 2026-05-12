import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { softwareApplicationSchema } from '@/lib/schema';
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
      <JsonLd
        data={softwareApplicationSchema({
          name: 'PanGuard Skill Auditor',
          description:
            'Pre-install security gate for AI agent skills. 8-check pipeline catches prompt injection, tool poisoning, hidden capabilities, supply-chain signals, excessive permissions, and behavior-description mismatches before any skill runs.',
          url: 'https://panguard.ai/product/skill-auditor',
          category: 'SecurityApplication',
          applicationSubCategory: 'Pre-Install Skill Audit',
          pricing: 'mixed',
        })}
      />
      <NavBar />
      <main id="main-content">
        <SkillAuditorProductContent />
      </main>
      <Footer />
    </>
  );
}
