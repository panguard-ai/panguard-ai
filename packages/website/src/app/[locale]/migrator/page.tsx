import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { softwareApplicationSchema } from '@/lib/schema';
import MigratorDemo from './MigratorDemo';
import MigratorContent from './MigratorContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const isZh = params.locale === 'zh-TW';
  const title = isZh
    ? 'Sigma / YARA → ATR YAML 轉換器 — 開源、免費、瀏覽器即用'
    : 'Sigma to ATR YAML converter — open source, free';
  const description = isZh
    ? '貼上一條 Sigma 或 YARA 規則，立刻拿到 schema-valid 的 ATR YAML。免註冊，瀏覽器即時轉換。Community 永久免費；Pilot 加上 13 種來源格式與 EU AI Act 證據包。'
    : 'Paste a Sigma or YARA rule and get schema-valid ATR YAML back. No signup, runs in your browser. Community is free forever; Pilot adds 13 more input formats and an EU AI Act evidence pack.';
  return {
    title,
    description,
    alternates: buildAlternates('/migrator', params.locale),
    openGraph: {
      title,
      description,
      url: isZh ? 'https://panguard.ai/zh-TW/migrator' : 'https://panguard.ai/migrator',
      siteName: 'PanGuard AI',
      locale: isZh ? 'zh_TW' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function MigratorPage() {
  return (
    <>
      <JsonLd
        data={softwareApplicationSchema({
          name: 'PanGuard Migrator',
          description:
            'Converts legacy Sigma and YARA detection rules into ATR YAML for AI agent runtimes. Community version on npm (parsers + IR + CLI) is free under MIT. Enterprise adds 5-framework compliance auto-mapping, evidence packs, and ATR upstream contribution.',
          url: 'https://panguard.ai/migrator',
          category: 'DeveloperApplication',
          applicationSubCategory: 'Detection Rule Migration',
          pricing: 'mixed',
          version: '0.1.0',
        })}
      />
      <NavBar />
      <main id="main-content">
        {/* Live no-signup converter — D2/D3 surface */}
        <MigratorDemo />
        {/* Existing marketing copy (Enterprise pitch) lives below the demo */}
        <MigratorContent />
      </main>
      <Footer />
    </>
  );
}
