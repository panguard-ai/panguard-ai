import { getTranslations } from 'next-intl/server';
import { buildAlternates } from '@/lib/seo';
import SMBContent from './SMBContent';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'metadata' });
  return {
    title: t('smb.title'),
    description: t('smb.description'),
    alternates: buildAlternates('/solutions/smb', params.locale),
  };
}

export default function SMBPage() {
  return <SMBContent />;
}
