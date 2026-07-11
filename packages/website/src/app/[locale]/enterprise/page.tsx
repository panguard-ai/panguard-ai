import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import EnterpriseContent from './EnterpriseContent';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const isZh = locale === 'zh-TW';
  return {
    title: isZh ? 'Enterprise、Migrator Pro 與主權級' : 'Enterprise, Migrator Pro & Sovereign',
    description: isZh
      ? '受監管 production agent、活的簽章合規證據、國家級離網部署與廠商 OEM 授權的完整規格。定價一律洽談。'
      : 'Full specification for regulated production agents, living signed compliance evidence, nation-scale airgap deployment, and vendor OEM licensing.',
    alternates: buildAlternates('/enterprise', locale),
  };
}

export default async function EnterprisePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  return (
    <>
      <NavBar />
      <main id="main-content">
        <EnterpriseContent />
      </main>
      <Footer />
    </>
  );
}
