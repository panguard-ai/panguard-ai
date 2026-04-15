import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import type { Metadata } from 'next';
import ConsoleSidebar from './ConsoleSidebar';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: 'PanGuard Console',
    description: t('home.description'),
    alternates: buildAlternates('/console', params.locale),
  };
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ background: '#1A1614', color: '#F5F1E8' }}>
      <ConsoleSidebar />
      <main className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
        {children}
      </main>
    </div>
  );
}
