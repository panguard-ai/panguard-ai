import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { definedTermSchema, techArticleSchema } from '@/lib/schema';
import { STATS } from '@/lib/stats';
import ATRContent from './ATRContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('atr.title'),
    description: t('atr.description'),
    alternates: buildAlternates('/atr', params.locale),
  };
}

export default function ATRPage() {
  return (
    <>
      <JsonLd
        data={[
          definedTermSchema({
            name: 'Agent Threat Rules (ATR)',
            description: `Open detection standard for AI agent security threats. ${STATS.atrRules} YAML-based rules across 10 threat categories, mapped to OWASP Agentic Top 10 (10/10 covered), MITRE ATLAS, and NIST AI RMF. MIT licensed. ATR rules merged upstream as maintainer-accepted contributions (not vendor endorsements): Cisco AI Defense skill-scanner rule packs, in production (PR #99); Microsoft AGT community-rules examples (PR #1277); MISP; and OWASP ASRH.`,
            url: 'https://panguard.ai/atr',
            termCode: 'ATR',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: 'agent-threat-rules',
            description:
              'Open source detection rule standard for AI agent security threats. YAML rule format, rules merged upstream into multiple maintainer repos as accepted contributions (not vendor endorsements), MIT licensed.',
            codeRepository: 'https://github.com/Agent-Threat-Rule/agent-threat-rules',
            programmingLanguage: 'YAML',
            license: 'https://opensource.org/licenses/MIT',
            url: 'https://panguard.ai/atr',
            version: STATS.atrVersion,
          },
          techArticleSchema({
            headline: 'Agent Threat Rules — the open detection standard for AI agents',
            description:
              'How ATR works: YAML rule schema, OWASP Agentic Top 10 mapping, three detection layers, threat crystallization pipeline, and reproducible benchmarks.',
            url: 'https://panguard.ai/atr',
            datePublished: '2026-01-01',
            dateModified: STATS.lastUpdated,
            proficiencyLevel: 'Beginner',
            programmingLanguage: 'YAML',
          }),
        ]}
      />
      <NavBar />
      <main id="main-content">
        <ATRContent />
      </main>
      <Footer />
    </>
  );
}
