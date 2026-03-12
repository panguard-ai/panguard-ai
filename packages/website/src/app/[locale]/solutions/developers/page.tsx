import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import DevelopersContent from './DevelopersContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('developers.title'),
    description: t('developers.description'),
    alternates: buildAlternates('/solutions/developers', params.locale),
  };
}

export default function DevelopersPage() {
  return <DevelopersContent />;
}
