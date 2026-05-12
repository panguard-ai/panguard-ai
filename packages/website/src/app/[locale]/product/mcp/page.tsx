import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { softwareApplicationSchema } from '@/lib/schema';
import ProductMcpContent from './ProductMcpContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('productMcp.title'),
    description: t('productMcp.description'),
    alternates: buildAlternates('/product/mcp', params.locale),
    openGraph: {
      title: t('productMcp.title'),
      description: t('productMcp.description'),
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function ProductMcpPage() {
  return (
    <>
      <JsonLd
        data={softwareApplicationSchema({
          name: 'PanGuard MCP Server',
          description:
            '12 panguard_* tools exposed over Model Context Protocol (MCP) for Claude Code, Cursor, OpenClaw, NemoClaw, and any MCP-compatible AI agent. Scan, audit, guard, alert, block — all callable as MCP tools.',
          url: 'https://panguard.ai/product/mcp',
          category: 'DeveloperApplication',
          applicationSubCategory: 'MCP Security Tools',
          pricing: 'free',
        })}
      />
      <NavBar />
      <main id="main-content">
        <ProductMcpContent />
      </main>
      <Footer />
    </>
  );
}
